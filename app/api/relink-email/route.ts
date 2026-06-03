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

  const { emailId, newCaseId, oldChannelId, senderEmail, nylasThreadId } = await req.json()

  if (!emailId || !newCaseId) {
    return Response.json({ error: 'emailId and newCaseId are required' }, { status: 400 })
  }

  // Carry channel_type forward from the existing channel
  let channelType: 'client' | 'vendor' | 'other' = 'other'
  let channelLabel: string | null = null

  if (oldChannelId) {
    const { data: oldCh } = await supabase
      .from('case_channels')
      .select('channel_type, label')
      .eq('id', oldChannelId)
      .maybeSingle()
    if (oldCh?.channel_type) {
      channelType = oldCh.channel_type as 'client' | 'vendor' | 'other'
      channelLabel = oldCh.label ?? null
    }
  }

  // Upsert channel on the new case
  let newChannelId: string

  if (channelType === 'other') {
    const { data: ch, error } = await supabase
      .from('case_channels')
      .insert({
        case_id: newCaseId,
        channel_type: 'other',
        party_email: senderEmail || '',
        label: channelLabel,
        nylas_thread_id: nylasThreadId || null,
      })
      .select('id')
      .single()
    if (error || !ch) return Response.json({ error: 'Could not create channel' }, { status: 500 })
    newChannelId = ch.id
  } else {
    const { data: ch, error } = await supabase
      .from('case_channels')
      .upsert(
        {
          case_id: newCaseId,
          channel_type: channelType,
          party_email: senderEmail || '',
          nylas_thread_id: nylasThreadId || null,
        },
        { onConflict: 'case_id,channel_type' }
      )
      .select('id')
      .single()
    if (error || !ch) return Response.json({ error: 'Could not upsert channel' }, { status: 500 })
    newChannelId = ch.id
  }

  // Re-link the email to the new case + channel
  const { error: updateError } = await supabase
    .from('email_messages')
    .update({ case_id: newCaseId, channel_id: newChannelId, is_processed: true })
    .eq('id', emailId)

  if (updateError) return Response.json({ error: 'Could not re-link email' }, { status: 500 })

  // Decrement old channel message_count
  if (oldChannelId) {
    const { data: oldCh } = await supabase
      .from('case_channels')
      .select('message_count')
      .eq('id', oldChannelId)
      .maybeSingle()
    if (oldCh && (oldCh.message_count ?? 0) > 0) {
      await supabase
        .from('case_channels')
        .update({ message_count: oldCh.message_count - 1 })
        .eq('id', oldChannelId)
    }
  }

  return Response.json({ ok: true, newCaseId, newChannelId })
}
