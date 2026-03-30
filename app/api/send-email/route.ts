import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// ── Nylas send pipeline ────────────────────────────────────────────────────────
// POST /v3/grants/{NYLAS_GRANT_ID}/messages/send
// Authorization: Bearer {NYLAS_API_KEY}
// Only used for manual compose / reply / forward.
// AI draft sends go through n8n WF6 → Nylas (separate pipeline).

export async function POST(req: NextRequest) {
  const apiKey   = process.env.NYLAS_API_KEY
  const grantId  = process.env.NYLAS_GRANT_ID
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

  if (!to || !subject) {
    return Response.json({ error: 'to and subject are required' }, { status: 400 })
  }

  // Normalise to/cc/bcc — accept string or string[]
  function toEmailList(val: string | string[] | undefined | null) {
    if (!val) return []
    const arr = Array.isArray(val) ? val : val.split(',').map(s => s.trim())
    return arr.filter(Boolean).map(email => ({ email }))
  }

  const toList  = toEmailList(to)
  const ccList  = toEmailList(cc)
  const bccList = toEmailList(bcc)

  if (toList.length === 0) {
    return Response.json({ error: 'At least one recipient is required' }, { status: 400 })
  }

  // ── 1. Send via Nylas ──────────────────────────────────────────────────────
  const nylasBody: Record<string, unknown> = {
    subject,
    body: body || '',
    to: toList,
  }
  if (ccList.length)  nylasBody.cc  = ccList
  if (bccList.length) nylasBody.bcc = bccList
  if (replyToNylasMessageId) nylasBody.reply_to_message_id = replyToNylasMessageId

  const nylasRes = await fetch(
    `${nylasBase}/v3/grants/${grantId}/messages/send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nylasBody),
    }
  )

  if (!nylasRes.ok) {
    const errText = await nylasRes.text()
    console.error('[send-email] Nylas error:', nylasRes.status, errText)
    return Response.json(
      { error: `Nylas send failed (${nylasRes.status}): ${errText}` },
      { status: 502 }
    )
  }

  const sent = await nylasRes.json()
  // Nylas v3 response: { request_id, data: { id, thread_id, ... } }
  // Fall back to a local UUID if Nylas returns unexpected structure,
  // so the Supabase insert always succeeds even before the NOT NULL migration.
  const nylasMessageId = sent?.data?.id ?? `local_${randomUUID()}`
  const nylasThreadId  = sent?.data?.thread_id ?? null

  // ── 2. Persist to Supabase ─────────────────────────────────────────────────
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { error: dbError } = await supabase.from('email_messages').insert({
    folder:             'sent',
    direction:          'outbound',
    subject,
    body_text:          body || '',
    body_preview:       (body || '').slice(0, 200),
    recipient_email:    toList[0]?.email ?? null,
    cc:                 ccList.map(a => a.email),
    sender_email:       'freightmate58@gmail.com',
    is_read:            true,
    has_attachments:    false,
    nylas_message_id:   nylasMessageId,
    nylas_thread_id:    nylasThreadId,
    ...(case_id    && { case_id }),
    ...(channel_id && { channel_id }),
  })

  if (dbError) {
    // Email was sent — log and continue, don't fail the request
    console.error('[send-email] Supabase insert error (email was sent):', dbError)
  }

  return Response.json({ ok: true, nylas_message_id: nylasMessageId })
}
