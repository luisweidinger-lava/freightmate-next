import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.N8N_SUMMARY_WEBHOOK_URL
  const secret     = process.env.N8N_WEBHOOK_SECRET

  if (!webhookUrl || !secret) {
    return NextResponse.json({ error: 'Summary webhook not configured' }, { status: 500 })
  }

  const body = await req.json()

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'X-AxisLog-Key': secret,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status })
  }

  return NextResponse.json({ ok: true })
}
