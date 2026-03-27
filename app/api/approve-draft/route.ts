import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const n8nUrl    = process.env.N8N_SEND_URL
  const secret    = process.env.N8N_WEBHOOK_SECRET

  if (!n8nUrl || !secret) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const body = await req.json()

  const res = await fetch(n8nUrl, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'X-AxisLog-Key': secret,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: text }, { status: res.status })
  }

  return NextResponse.json({ ok: true })
}
