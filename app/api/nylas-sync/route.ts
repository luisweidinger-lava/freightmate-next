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

  // ── 1. Fetch INBOX + SENT in parallel ─────────────────────────────────────
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  const base = `${nylasBase}/v3/grants/${grantId}/messages?limit=50&fields=standard`

  const [inboxRes, sentRes] = await Promise.all([
    fetch(`${base}&in=INBOX`, { headers }),
    fetch(`${base}&in=SENT`,  { headers }),
  ])

  if (!inboxRes.ok) {
    const errText = await inboxRes.text()
    console.error('[nylas-sync] Nylas INBOX error:', inboxRes.status, errText)
    return Response.json(
      { error: `Nylas sync failed (${inboxRes.status}): ${errText}` },
      { status: 502 }
    )
  }

  const inboxJson = await inboxRes.json()
  const sentJson  = sentRes.ok ? await sentRes.json() : { data: [] }

  const allMsgs = [...(inboxJson.data ?? []), ...(sentJson.data ?? [])]
  // Dedup by Nylas message ID (inbox + sent can overlap in some providers)
  const messages: NylasMessage[] = [...new Map(allMsgs.map(m => [m.id, m])).values()]

  if (messages.length === 0) {
    return Response.json({ synced: 0 })
  }

  // ── 2. Map to email_messages rows ──────────────────────────────────────────
  const rows = messages.map(msg => {
    const folders: string[] = msg.folders ?? []
    let folder: 'inbox' | 'sent' | 'spam' | 'drafts' | 'bin' = 'inbox'
    if (folders.some(f => f.toUpperCase().includes('SENT')))   folder = 'sent'
    else if (folders.some(f => f.toUpperCase().includes('SPAM') || f.toUpperCase().includes('JUNK'))) folder = 'spam'
    else if (folders.some(f => f.toUpperCase().includes('TRASH') || f.toUpperCase().includes('BIN'))) folder = 'bin'
    else if (folders.some(f => f.toUpperCase().includes('DRAFT'))) folder = 'drafts'

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
      is_processed:     false,
      created_at:       msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
      visibility:       'internal',
    }
  })

  // ── 3. Upsert into Supabase ────────────────────────────────────────────────
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { error, count } = await supabase
    .from('email_messages')
    .upsert(rows, { onConflict: 'nylas_message_id', count: 'exact' })

  if (error) {
    console.error('[nylas-sync] Supabase upsert error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ synced: rows.length, upserted: count })
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
