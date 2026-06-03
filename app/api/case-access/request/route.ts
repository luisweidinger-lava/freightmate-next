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

  // Validate caller is a manager
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { case_id } = await req.json()
  if (!case_id) return NextResponse.json({ error: 'case_id required' }, { status: 400 })

  // Fetch the case to get its operator_id
  const { data: caseData } = await admin.from('shipment_cases').select('operator_id').eq('id', case_id).single()
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  if (!caseData.operator_id) return NextResponse.json({ error: 'Case has no assigned operator' }, { status: 400 })
  if (caseData.operator_id === user.id) return NextResponse.json({ error: 'Cannot request access to own case' }, { status: 400 })

  // Upsert: if previously revoked, reset to pending
  const { data, error } = await admin
    .from('case_access_grants')
    .upsert({
      case_id,
      manager_id:   user.id,
      operator_id:  caseData.operator_id,
      status:       'pending',
      requested_at: new Date().toISOString(),
      resolved_at:  null,
    }, { onConflict: 'case_id,manager_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grant_id: data.id })
}
