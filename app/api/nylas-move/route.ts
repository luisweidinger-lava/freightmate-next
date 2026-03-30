import { NextRequest } from 'next/server'

// POST /api/nylas-move
// Body: { messageId: string, folder: 'TRASH' | 'SPAM' }
// Moves an email in Gmail via Nylas v3 PUT /messages/{id}
// Always returns 200 — the caller updates Supabase independently

export async function POST(req: NextRequest) {
  const apiKey    = process.env.NYLAS_API_KEY
  const grantId   = process.env.NYLAS_GRANT_ID
  const nylasBase = process.env.NYLAS_API_BASE ?? 'https://api.us.nylas.com'

  if (!apiKey || !grantId) {
    return Response.json({ error: 'Nylas not configured' }, { status: 500 })
  }

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
