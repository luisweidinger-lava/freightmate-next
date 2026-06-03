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

  const { emailId } = await req.json()

  if (!emailId) {
    return Response.json({ error: 'emailId is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('email_messages')
    .update({ case_id: null, channel_id: null, is_processed: false })
    .eq('id', emailId)

  if (error) return Response.json({ error: 'Could not unlink email' }, { status: 500 })

  return Response.json({ ok: true })
}
