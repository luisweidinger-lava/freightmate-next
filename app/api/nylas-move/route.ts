import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

// POST /api/nylas-move
// Body: { messageId: string, folder: 'TRASH' | 'SPAM' }
// Moves an email in Gmail via Nylas v3 PUT /messages/{id}
// Always returns 200 — the caller updates Supabase independently

export async function POST(req: NextRequest) {
  const apiKey    = process.env.NYLAS_API_KEY
  const nylasBase = process.env.NYLAS_API_BASE ?? 'https://api.us.nylas.com'

  if (!apiKey) {
    return Response.json({ error: 'Nylas not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_users').select('mailbox_id').eq('id', user.id).single()
  const { data: mailbox } = await supabase
    .from('mailboxes').select('nylas_grant_id').eq('id', appUser!.mailbox_id).single()
  const grantId = mailbox?.nylas_grant_id
  if (!grantId) return Response.json({ error: 'No Nylas grant for this user' }, { status: 500 })

  const { messageId, folder } = await req.json()
  if (!messageId || !folder) {
    return Response.json({ error: 'messageId and folder are required' }, { status: 400 })
  }

  const nylasFolder = folder === 'SPAM' ? 'SPAM' : 'TRASH'

  try {
    const res = await fetch(
      `${nylasBase}/v3/grants/${grantId}/messages/${messageId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folders: [nylasFolder] }),
      }
    )
    if (!res.ok) {
      const errText = await res.text()
      console.error('[nylas-move] Nylas error:', res.status, errText)
    }
  } catch (err) {
    console.error('[nylas-move] Fetch error:', err)
  }

  return Response.json({ ok: true })
}
