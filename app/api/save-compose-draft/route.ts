import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function parseEmails(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export async function POST(req: NextRequest) {
  const { id, to, cc, bcc, subject, body } = await req.json()

  const payload = {
    recipient_email: to?.trim()  || null,
    subject:         subject?.trim() || null,
    body_text:       body        || null,
    cc_emails:       cc  ? parseEmails(cc)  : [],
    bcc_emails:      bcc ? parseEmails(bcc) : [],
    draft_task_id:   null,
    updated_at:      new Date().toISOString(),
  }

  if (id) {
    const { data, error } = await supabase
      .from('message_drafts')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data.id })
  }

  const { data, error } = await supabase
    .from('message_drafts')
    .insert({ ...payload, version: 1 })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase.from('message_drafts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
