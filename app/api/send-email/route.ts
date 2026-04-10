import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Nylas send pipeline ────────────────────────────────────────────────────────
// POST /v3/grants/{NYLAS_GRANT_ID}/messages/send
// Authorization: Bearer {NYLAS_API_KEY}
// Only used for manual compose / reply / forward from InlineCompose or ComposePanel.
// AI draft sends go through n8n WF6 → Nylas (separate pipeline).

export async function POST(req: NextRequest) {
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

  const { to, cc, bcc, subject, body, replyToNylasMessageId, case_id, channel_id } = await req.json()

  const nylasBody: Record<string, unknown> = {
    to:      [{ email: to }],
    subject,
    body,
  }
  if (cc?.length)  nylasBody.cc  = (cc as string[]).map(e => ({ email: e }))
  if (bcc?.length) nylasBody.bcc = (bcc as string[]).map(e => ({ email: e }))
  // reply_to_message_id omitted: Nylas/Gmail returns "Invalid id value" for certain message IDs;
  // Gmail threads automatically via the Re: subject prefix, so this is not needed for correct threading.

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
  const supabase = createClient(supabaseUrl, supabaseKey)
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
    channel_id:       channel_id ?? null,
    created_at:       new Date().toISOString(),
    visibility:       'internal',
  })

  return Response.json({ ok: true, nylas_message_id })
}
