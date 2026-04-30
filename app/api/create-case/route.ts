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

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) return Response.json({ error: 'User has no org' }, { status: 400 })

  const {
    refNumber,
    senderEmail,
    senderType,   // 'client' | 'vendor' | 'other'
    label,        // only for senderType === 'other'
    emailId,
    nylasThreadId,
  } = await req.json()

  if (!refNumber?.trim() || !emailId) {
    return Response.json({ error: 'refNumber and emailId are required' }, { status: 400 })
  }

  // 1. Create the case
  const { data: newCase, error: caseError } = await supabase
    .from('shipment_cases')
    .insert({ ref_number: refNumber.trim(), client_email: senderEmail || '', status: 'new', operator_id: user.id })
    .select()
    .single()

  if (caseError || !newCase) {
    return Response.json({ error: caseError?.message || 'Could not create case — check Ref is unique' }, { status: 400 })
  }

  // 2. Upsert contact + org row for client/vendor
  if (senderType === 'client' || senderType === 'vendor') {
    const { data: contact } = await supabase
      .from('contacts')
      .upsert(
        { email: senderEmail || '', display_name: null, persona: senderType,
          is_validated: true, needs_review: false,
          owner_user_id: user.id, org_id: profile.org_id, visibility_scope: 'org' },
        { onConflict: 'email' }
      )
      .select()
      .single()

    if (contact) {
      if (senderType === 'client') {
        await supabase
          .from('clients')
          .upsert({ contact_id: contact.id, email: senderEmail || '', is_active: true }, { onConflict: 'contact_id' })
      } else {
        await supabase
          .from('vendors')
          .upsert({ contact_id: contact.id, name: senderEmail || '', email: senderEmail || '', default_mode: 'air', is_active: true }, { onConflict: 'contact_id' })
      }
    }
  }

  // 3. Create channel
  let channelId: string | null = null
  if (senderType === 'other') {
    const { data: ch } = await supabase
      .from('case_channels')
      .insert({ case_id: newCase.id, channel_type: 'other', party_email: senderEmail || '', label: label ?? null, nylas_thread_id: nylasThreadId || null })
      .select('id')
      .single()
    channelId = ch?.id ?? null
  } else {
    const { data: ch } = await supabase
      .from('case_channels')
      .upsert(
        { case_id: newCase.id, channel_type: senderType, party_email: senderEmail || '', nylas_thread_id: nylasThreadId || null },
        { onConflict: 'case_id,channel_type' }
      )
      .select('id')
      .single()
    channelId = ch?.id ?? null
  }

  if (!channelId) {
    return Response.json({ error: 'Could not create channel' }, { status: 500 })
  }

  // 4. Link email to case + channel
  await supabase
    .from('email_messages')
    .update({ case_id: newCase.id, channel_id: channelId, is_processed: true })
    .eq('id', emailId)

  return Response.json({ ok: true, caseId: newCase.id, refNumber: newCase.ref_number })
}
