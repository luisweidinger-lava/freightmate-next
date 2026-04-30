import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabaseAuth = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 })

  const supabase = createClient(supabaseUrl, serviceKey)

  const { emailId, refNumber, channelType, label, nylasThreadId, senderEmail } = await req.json()

  if (!emailId || !refNumber?.trim() || !channelType) {
    return Response.json({ error: 'emailId, refNumber, and channelType are required' }, { status: 400 })
  }

  const { data: caseData } = await supabase
    .from('shipment_cases')
    .select('id')
    .eq('ref_number', refNumber.trim())
    .maybeSingle()

  if (!caseData) {
    return Response.json({ error: `No case found with Ref ${refNumber.trim()}` }, { status: 404 })
  }

  let channelId: string | null = null

  if (channelType === 'other') {
    const { data: ch, error } = await supabase
      .from('case_channels')
      .insert({
        case_id: caseData.id,
        channel_type: 'other',
        party_email: senderEmail || '',
        label: label ?? null,
        nylas_thread_id: nylasThreadId || null,
      })
      .select('id')
      .single()
    if (error || !ch) return Response.json({ error: 'Could not create channel' }, { status: 500 })
    channelId = ch.id
  } else {
    const { data: ch, error } = await supabase
      .from('case_channels')
      .upsert(
        {
          case_id: caseData.id,
          channel_type: channelType,
          party_email: senderEmail || '',
          nylas_thread_id: nylasThreadId || null,
        },
        { onConflict: 'case_id,channel_type' }
      )
      .select('id')
      .single()
    if (error || !ch) return Response.json({ error: 'Could not upsert channel' }, { status: 500 })
    channelId = ch.id
  }

  const { error: updateError } = await supabase
    .from('email_messages')
    .update({ case_id: caseData.id, channel_id: channelId, is_processed: true })
    .eq('id', emailId)

  if (updateError) return Response.json({ error: 'Could not link email to case' }, { status: 500 })

  return Response.json({ ok: true, caseId: caseData.id, channelId })
}
