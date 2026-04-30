import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function parseEmails(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export async function POST(req: NextRequest) {
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

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
    const { data: existingDraft } = await supabase.from('message_drafts').select('case_id').eq('id', id).single()
    if (!existingDraft) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existingDraft.case_id) {
      const { data: sc } = await supabase.from('shipment_cases').select('operator_id').eq('id', existingDraft.case_id).single()
      if (sc && sc.operator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: existingDraft } = await supabase.from('message_drafts').select('case_id').eq('id', id).single()
  if (!existingDraft) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existingDraft.case_id) {
    const { data: sc } = await supabase.from('shipment_cases').select('operator_id').eq('id', existingDraft.case_id).single()
    if (sc && sc.operator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('message_drafts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
