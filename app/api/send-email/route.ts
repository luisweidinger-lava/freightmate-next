import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// ── Nylas send pipeline ────────────────────────────────────────────────────────
// POST /v3/grants/{NYLAS_GRANT_ID}/messages/send
// Authorization: Bearer {NYLAS_API_KEY}
// Only used for manual compose / reply / forward from InlineCompose or ComposePanel.
// AI draft sends go through n8n WF6 → Nylas (separate pipeline).

export async function POST(req: NextRequest) {
  const apiKey    = process.env.NYLAS_API_KEY
  const nylasBase = process.env.NYLAS_API_BASE ?? 'https://api.us.nylas.com'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!apiKey) {
    return Response.json({ error: 'NYLAS_API_KEY not configured' }, { status: 500 })
  }
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Resolve calling user's Nylas grant
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_users').select('mailbox_id').eq('id', user.id).single()
  const { data: mailbox } = await supabase
    .from('mailboxes').select('nylas_grant_id').eq('id', appUser!.mailbox_id).single()
  const grantId  = mailbox?.nylas_grant_id
  const mailboxId = appUser!.mailbox_id
  if (!grantId) return Response.json({ error: 'No Nylas grant for this user' }, { status: 500 })

  const { to, cc, bcc, subject, body, replyToNylasMessageId, case_id, channel_id, create_channel_label, create_channel_type } = await req.json()

  // If caller requests a new channel, create it before sending
  let resolvedChannelId: string | null = channel_id ?? null
  if (case_id && !channel_id && (create_channel_label || create_channel_type) && to) {
    const supabaseForChannel = supabase
    const { data: existing } = await supabaseForChannel
      .from('case_channels')
      .select('position')
      .eq('case_id', case_id)
      .order('position', { ascending: false })
      .limit(1)
    const nextPosition = ((existing?.[0]?.position ?? -1) as number) + 1
    const type  = create_channel_type ?? 'other'
    const label = create_channel_label ?? null

    if (type === 'client' || type === 'vendor') {
      // Upsert to avoid duplicates if a real channel already appeared via real-time
      const { data: ch } = await supabaseForChannel
        .from('case_channels')
        .upsert(
          { case_id, channel_type: type, party_email: to, label, position: nextPosition, cc_emails: cc ?? [], message_count: 0 },
          { onConflict: 'case_id,channel_type' }
        )
        .select('id')
        .single()
      resolvedChannelId = ch?.id ?? null
    } else {
      const { data: newChannel } = await supabaseForChannel
        .from('case_channels')
        .insert({
          case_id,
          channel_type: 'other',
          party_email:  to,
          label,
          position:     nextPosition,
          cc_emails:    cc ?? [],
          message_count: 0,
        })
        .select('id')
        .single()
      resolvedChannelId = newChannel?.id ?? null
    }
  }

  const nylasBody: Record<string, unknown> = {
    to:      [{ email: to }],
    subject,
    body,
  }
  if (cc?.length)  nylasBody.cc  = (cc as string[]).map(e => ({ email: e }))
  if (bcc?.length) nylasBody.bcc = (bcc as string[]).map(e => ({ email: e }))
  // Only set reply_to_message_id for real Nylas IDs. Synthetic local_/draft_ IDs cannot
  // be resolved by Nylas and would cause a 400 "Invalid id value" from the Gmail provider.
  if (replyToNylasMessageId &&
      !replyToNylasMessageId.startsWith('local_') &&
      !replyToNylasMessageId.startsWith('draft_')) {
    nylasBody.reply_to_message_id = replyToNylasMessageId
  }

  const res = await fetch(`${nylasBase}/v3/grants/${grantId}/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(nylasBody),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[send-email] Nylas error:', res.status, err)
    return Response.json({ error: err }, { status: res.status })
  }

  const sent = await res.json()
  const nylas_message_id = sent.data?.id ?? null

  // Record sent message in Supabase
  await supabase.from('email_messages').insert({
    nylas_message_id,
    nylas_thread_id:  sent.data?.thread_id ?? null,
    folder:           'sent',
    direction:        'outbound',
    subject,
    body_text:        body,
    body_preview:     (body as string).slice(0, 200),
    sender_email:     sent.data?.from?.[0]?.email ?? null,
    recipient_email:  to,
    cc:               cc ?? [],
    is_read:          true,
    is_starred:       false,
    has_attachments:  false,
    is_processed:     true,
    case_id:          case_id ?? null,
    channel_id:       resolvedChannelId,
    created_at:       new Date().toISOString(),
    visibility:       'internal',
    mailbox_id:       mailboxId,
  })

  return Response.json({ ok: true, nylas_message_id })
}
