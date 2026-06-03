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

  const { case_id, manager_id } = await req.json()
  if (!case_id || !manager_id) {
    return NextResponse.json({ error: 'case_id and manager_id required' }, { status: 400 })
  }
  if (manager_id === user.id) {
    return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 })
  }

  // Verify caller owns the case
  const { data: caseData } = await admin
    .from('shipment_cases').select('operator_id').eq('id', case_id).single()
  if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  if (caseData.operator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Upsert directly as granted — upgrades any existing pending/revoked grant
  const { data, error } = await admin
    .from('case_access_grants')
    .upsert({
      case_id,
      manager_id,
      operator_id:  user.id,
      status:       'granted',
      requested_at: new Date().toISOString(),
      resolved_at:  new Date().toISOString(),
    }, { onConflict: 'case_id,manager_id' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grant_id: data.id })
}
