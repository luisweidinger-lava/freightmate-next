import { NextRequest } from 'next/server'

// ── Nylas send pipeline ────────────────────────────────────────────────────────
// POST /v3/grants/{NYLAS_GRANT_ID}/messages/send
// Authorization: Bearer {NYLAS_API_KEY}
// Only used for manual compose / reply / forward.
// AI draft sends go through n8n WF6 → Nylas (separate pipeline).

export async function POST(_req: NextRequest) {
  return Response.json(
    { error: 'Outbound email is disabled in manual Gmail mode. Send mail directly from Gmail.' },
    { status: 409 }
  )
}
