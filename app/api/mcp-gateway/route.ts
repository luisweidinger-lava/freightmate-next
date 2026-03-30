import { NextRequest, NextResponse } from 'next/server'

/**
 * /api/mcp-gateway
 * ─────────────────
 * Proxy route that forwards requests to the FreightMate MCP server.
 * Adds the MCP_SERVER_SECRET Bearer token so the MCP server can authenticate.
 *
 * Used by: n8n workflows (instead of direct Supabase calls) and future in-app
 * AI features that need privacy-controlled data access.
 *
 * Env vars required:
 *   MCP_SERVER_URL     e.g. http://localhost:3001  (or your deployed MCP server)
 *   MCP_SERVER_SECRET  shared secret between this proxy and the MCP server
 */

export async function POST(req: NextRequest) {
  const mcpUrl    = process.env.MCP_SERVER_URL
  const mcpSecret = process.env.MCP_SERVER_SECRET

  if (!mcpUrl) {
    return NextResponse.json(
      { error: 'MCP_SERVER_URL is not configured' },
      { status: 500 },
    )
  }

  const body = await req.text()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (mcpSecret) {
    headers['Authorization'] = `Bearer ${mcpSecret}`
  }

  try {
    const upstream = await fetch(`${mcpUrl}/mcp`, {
      method: 'POST',
      headers,
      body,
    })

    const responseBody = await upstream.text()

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (err) {
    console.error('[mcp-gateway] Failed to reach MCP server:', err)
    return NextResponse.json(
      { error: 'MCP server unreachable', detail: String(err) },
      { status: 502 },
    )
  }
}
