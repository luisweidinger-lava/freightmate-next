import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Outbound email stub ───────────────────────────────────────────────────────
// Currently inserts a row into email_messages (folder: 'sent') as a mock.
// TODO: Wire to Nylas REST API → POST /v3/grants/{grant_id}/messages/send
// with Bearer token from NYLAS_API_KEY env var.

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { to, cc, subject, body, replyToMessageId } = await req.json()

  if (!to || !subject) {
    return Response.json({ error: 'to and subject are required' }, { status: 400 })
  }

  const { error } = await supabase.from('email_messages').insert({
    folder:             'sent',
    direction:          'outbound',
    subject:            subject,
    body_text:          body || '',
    body_preview:       (body || '').slice(0, 200),
    recipient_email:    to,
    cc:                 cc ? [cc] : [],
    sender_email:       'freightmate58@gmail.com',
    is_read:            true,
    has_attachments:    false,
    reply_to_message_id: replyToMessageId || null,
  })

  if (error) {
    console.error('[send-email] Supabase insert error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
