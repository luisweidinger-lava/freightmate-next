import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { grant_id, note } = await req.json()
  if (!grant_id) return NextResponse.json({ error: 'grant_id required' }, { status: 400 })

  // Fetch grant and verify caller is the operator or the requesting manager
  const { data: grant } = await admin.from('case_access_grants').select('*').eq('id', grant_id).single()
  if (!grant) return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  if (grant.operator_id !== user.id && grant.manager_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const update: Record<string, unknown> = { status: 'revoked', resolved_at: new Date().toISOString() }
  if (note) update.notes = note

  const { error } = await admin
    .from('case_access_grants')
    .update(update)
    .eq('id', grant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
