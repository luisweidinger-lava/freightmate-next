import { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Nylas webhook receiver — WF1 trigger
 *
 * GET  /api/nylas-webhook  — responds to Nylas challenge when registering the webhook URL
 * POST /api/nylas-webhook  — validates HMAC signature, forwards to n8n WF1
 *
 * Required env vars:
 *   NYLAS_CLIENT_SECRET    — from Nylas dashboard (used to verify HMAC)
 *   N8N_WF1_WEBHOOK_URL    — n8n WF1 webhook trigger URL
 *   N8N_WEBHOOK_SECRET     — X-AxisLog-Key header value
 *
 * Nylas dashboard setup:
 *   Webhooks → add URL: https://<your-domain>/api/nylas-webhook
 *   Events: message.created, message.updated
 */

export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get('challenge')
  if (challenge) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('OK', { status: 200 })
}

export async function POST(req: NextRequest) {
  const clientSecret = process.env.NYLAS_CLIENT_SECRET
  const n8nUrl       = process.env.N8N_WF1_WEBHOOK_URL
  const n8nSecret    = process.env.N8N_WEBHOOK_SECRET

  if (!clientSecret || !n8nUrl || !n8nSecret) {
    return new Response('Webhook not configured', { status: 500 })
  }

  const rawBody = await req.text()
  const sig     = req.headers.get('x-nylas-signature') ?? ''

  // Verify Nylas HMAC-SHA256 signature
  const expected = createHmac('sha256', clientSecret).update(rawBody).digest('hex')

  let sigBuf: Buffer
  let expBuf: Buffer
  try {
    sigBuf = Buffer.from(sig, 'hex')
    expBuf = Buffer.from(expected, 'hex')
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  if (sigBuf.length === 0 || sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Forward to n8n WF1
  try {
    await fetch(n8nUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-AxisLog-Key': n8nSecret,
      },
      body: rawBody,
    })
  } catch (err) {
    console.error('[nylas-webhook] Failed to forward to n8n:', err)
    // Still return 200 to Nylas — we don't want Nylas to retry on n8n errors
  }

  return new Response('OK', { status: 200 })
}
