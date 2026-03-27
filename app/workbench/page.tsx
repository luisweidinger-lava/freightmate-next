import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Server component — queries latest active case and redirects to its workbench view
export default async function WorkbenchPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && key) {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('shipment_cases')
      .select('ref_number, id')
      .not('status', 'in', '("closed","delivered")')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (data?.ref_number) redirect(`/cases/${data.ref_number}`)
    if (data?.id)         redirect(`/cases/${data.id}`)
  }

  redirect('/cases')
}
