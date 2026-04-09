import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Manual inbox sync ──────────────────────────────────────────────────────────
// Fetches recent messages from Nylas and upserts them into email_messages.
// Used for manual "Sync from Gmail" until n8n WF1 is active.
// Also works as a credential test — 401 here means the API key is invalid.

export async function POST(_req: NextRequest) {
  const apiKey    = process.env.NYLAS_API_KEY
  const grantId   = process.env.NYLAS_GRANT_ID
  const nylasBase = process.env.NYLAS_API_BASE ?? 'https://api.us.nylas.com'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!apiKey || !grantId) {
    return Response.json({ error: 'NYLAS_API_KEY or NYLAS_GRANT_ID not configured' }, { status: 500 })
  }
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ── 1. Delete synthetic mail artifacts first ──────────────────────────────
  const syntheticIdPrefixes = ['local_', 'draft_']
  let deletedMock = 0

  for (const prefix of syntheticIdPrefixes) {
    const { error: deleteError, count } = await supabase
      .from('email_messages')
      .delete({ count: 'exact' })
      .like('nylas_message_id', `${prefix}%`)

    if (deleteError) {
      console.error('[nylas-sync] Supabase mock cleanup error:', deleteError)
      return Response.json({ error: deleteError.message }, { status: 500 })
    }

    deletedMock += count ?? 0
  }

  // ── 2. Fetch Gmail folders in parallel ────────────────────────────────────
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  const base = `${nylasBase}/v3/grants/${grantId}/messages?limit=50&fields=standard`

  const folderQueries = [
    { key: 'INBOX', url: `${base}&in=INBOX` },
    { key: 'SENT', url: `${base}&in=SENT` },
    { key: 'SPAM', url: `${base}&in=SPAM` },
    { key: 'TRASH', url: `${base}&in=TRASH` },
  ] as const

  const folderResponses = await Promise.all(
    folderQueries.map(async ({ key, url }) => {
      const response = await fetch(url, { headers })
      return { key, response }
    })
  )

  const failedFolder = folderResponses.find(({ response }) => !response.ok)
  if (failedFolder) {
    const errText = await failedFolder.response.text()
    console.error(`[nylas-sync] Nylas ${failedFolder.key} error:`, failedFolder.response.status, errText)
    return Response.json(
      { error: `Nylas sync failed (${failedFolder.response.status}): ${errText}` },
      { status: 502 }
    )
  }

  const payloads = await Promise.all(folderResponses.map(({ response }) => response.json()))
  const allMsgs = payloads.flatMap(payload => payload.data ?? [])
  // Dedup by Nylas message ID (inbox + sent can overlap in some providers)
  const messages: NylasMessage[] = [...new Map(allMsgs.map(m => [m.id, m])).values()]

  // ── 3. Map to email_messages rows ──────────────────────────────────────────
  const rows = messages.map(msg => {
    const folder = mapNylasFolder(msg.folders ?? [])

    return {
      nylas_message_id: msg.id,
      nylas_thread_id:  msg.thread_id ?? null,
      folder,
      direction:        folder === 'sent' ? 'outbound' : 'inbound',
      subject:          msg.subject ?? null,
      body_text:        msg.body ?? null,
      body_preview:     msg.snippet ?? (msg.body ?? '').slice(0, 200),
      sender_email:     msg.from?.[0]?.email ?? null,
      recipient_email:  msg.to?.[0]?.email ?? null,
      cc:               (msg.cc ?? []).map((a: NylasAddress) => a.email).filter(Boolean),
      is_read:          !msg.unread,
      is_starred:       msg.starred ?? false,
      has_attachments:  (msg.attachments?.length ?? 0) > 0,
      // is_processed is intentionally omitted — set only during triage, not overwritten on sync
      created_at:       msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
      visibility:       'internal',
    }
  })

  // ── 4. Upsert current Gmail state ──────────────────────────────────────────
  let upserted = 0
  if (rows.length > 0) {
    const { error, count } = await supabase
      .from('email_messages')
      .upsert(rows, { onConflict: 'nylas_message_id', count: 'exact' })

    if (error) {
      console.error('[nylas-sync] Supabase upsert error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    upserted = count ?? rows.length
  }

  // ── 5. Move stale rows to bin when Gmail no longer has them ───────────────
  const { data: existingRows, error: existingError } = await supabase
    .from('email_messages')
    .select('id, folder, nylas_message_id, case_id')
    .not('nylas_message_id', 'like', 'local_%')
    .not('nylas_message_id', 'like', 'draft_%')

  if (existingError) {
    console.error('[nylas-sync] Supabase existing rows fetch error:', existingError)
    return Response.json({ error: existingError.message }, { status: 500 })
  }

  const liveIds = new Set(rows.map(row => row.nylas_message_id))
  const staleRows = (existingRows ?? []).filter(row =>
    !liveIds.has(row.nylas_message_id) && row.folder !== 'bin'
  )

  // Case-linked stale: move to bin — preserve email for case history
  let movedToBin = 0
  const staleCaseLinkedIds = staleRows.filter(r => r.case_id !== null).map(r => r.id)
  if (staleCaseLinkedIds.length > 0) {
    const { error: staleError, count } = await supabase
      .from('email_messages')
      .update({ folder: 'bin', is_starred: false }, { count: 'exact' })
      .in('id', staleCaseLinkedIds)

    if (staleError) {
      console.error('[nylas-sync] Supabase stale (case-linked) update error:', staleError)
      return Response.json({ error: staleError.message }, { status: 500 })
    }
    movedToBin = count ?? staleCaseLinkedIds.length
  }

  // Unlinked stale: hard delete — no case, no business value, just ghost inbox clutter
  let deletedStale = 0
  const staleUnlinkedIds = staleRows.filter(r => r.case_id === null).map(r => r.id)
  if (staleUnlinkedIds.length > 0) {
    const { error: deleteError, count } = await supabase
      .from('email_messages')
      .delete({ count: 'exact' })
      .in('id', staleUnlinkedIds)

    if (deleteError) {
      console.error('[nylas-sync] Supabase stale (unlinked) delete error:', deleteError)
      return Response.json({ error: deleteError.message }, { status: 500 })
    }
    deletedStale = count ?? staleUnlinkedIds.length
  }

  return Response.json({
    synced: rows.length,
    upserted,
    moved_to_bin: movedToBin,
    deleted_stale: deletedStale,
    deleted_mock: deletedMock,
  })
}

function mapNylasFolder(folders: string[]): 'inbox' | 'sent' | 'spam' | 'drafts' | 'bin' {
  const upperFolders = folders.map(folder => folder.toUpperCase())
  if (upperFolders.some(folder => folder.includes('SPAM') || folder.includes('JUNK'))) return 'spam'
  if (upperFolders.some(folder => folder.includes('TRASH') || folder.includes('BIN'))) return 'bin'
  if (upperFolders.some(folder => folder.includes('DRAFT'))) return 'drafts'
  if (upperFolders.some(folder => folder.includes('SENT'))) return 'sent'
  return 'inbox'
}

interface NylasAddress {
  email: string
  name?: string
}

interface NylasMessage {
  id: string
  thread_id?: string
  subject?: string
  body?: string
  snippet?: string
  from?: NylasAddress[]
  to?: NylasAddress[]
  cc?: NylasAddress[]
  folders?: string[]
  date?: number
  unread?: boolean
  starred?: boolean
  attachments?: unknown[]
}
