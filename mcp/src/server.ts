/**
 * FreightMate MCP Server
 * ──────────────────────
 * An in-app AI gateway that exposes FreightMate's Supabase data as controlled
 * MCP tools. Sits between AI features and external providers. Enforces
 * field-level privacy rules so PII never leaves your infrastructure uncontrolled.
 *
 * Transport: Streamable HTTP (MCP spec 2025-03-26)
 * Dev:  cd mcp && npm run dev    (port 3001)
 * Prod: deploy to fly.io / Railway / any Node.js host
 *
 * Required env vars (copy from Next.js .env.local):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MCP_SERVER_SECRET          (shared with Next.js /api/mcp-gateway)
 *   N8N_DRAFT_WEBHOOK_URL      (WF5 webhook URL)
 *   N8N_SEND_WEBHOOK_URL       (WF6 approve-and-send webhook URL)
 *   N8N_WEBHOOK_SECRET
 *   PORT                       (optional, default 3001)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createClient } from '@supabase/supabase-js'
import { createServer, IncomingMessage, ServerResponse } from 'node:http'

import { registerCaseTools }  from './tools/cases.js'
import { registerEmailTools } from './tools/emails.js'
import { registerDraftTools } from './tools/drafts.js'

// ── Env ───────────────────────────────────────────────────────────────────────

const PORT        = parseInt(process.env.PORT || '3001', 10)
const SERVER_SECRET = process.env.MCP_SERVER_SECRET || ''

const SUPABASE_URL  = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

// ── Supabase client ───────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── MCP Server factory ────────────────────────────────────────────────────────

function createMcpServer() {
  const server = new McpServer({
    name: 'freightmate-gateway',
    version: '0.1.0',
  })

  const toolRegistrar = {
    tool: (
      name: string,
      description: string,
      schema: object,
      handler: (args: Record<string, unknown>) => Promise<unknown>,
    ) => {
      server.tool(name, description, schema, async (args) => {
        const result = await handler(args as Record<string, unknown>)
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        }
      })
    },
  }

  registerCaseTools(toolRegistrar, supabase)
  registerEmailTools(toolRegistrar, supabase)
  registerDraftTools(toolRegistrar, supabase, {
    draftWebhookUrl:   process.env.N8N_DRAFT_WEBHOOK_URL    || process.env.N8N_WF5DRAFT_URL || '',
    webhookSecret:     process.env.N8N_WEBHOOK_SECRET        || '',
    approveWebhookUrl: process.env.N8N_SEND_WEBHOOK_URL      || '',
  })

  return server
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)

  // Health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', server: 'freightmate-mcp', version: '0.1.0' }))
    return
  }

  // Auth — require Bearer MCP_SERVER_SECRET (if configured)
  if (SERVER_SECRET) {
    const auth = req.headers.authorization || ''
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== SERVER_SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }
  }

  // MCP endpoint
  if (url.pathname === '/mcp' || url.pathname === '/') {
    const mcpServer = createMcpServer()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    })

    res.on('close', () => {
      transport.close()
      mcpServer.close()
    })

    try {
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res, await readBody(req))
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(err) }))
      }
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString()
      try { resolve(raw ? JSON.parse(raw) : undefined) }
      catch { resolve(undefined) }
    })
    req.on('error', reject)
  })
}

httpServer.listen(PORT, () => {
  console.log(`\n🚀 FreightMate MCP Server running on http://localhost:${PORT}`)
  console.log(`   Health:   GET  http://localhost:${PORT}/health`)
  console.log(`   MCP:      POST http://localhost:${PORT}/mcp`)
  console.log(`   Auth:     ${SERVER_SECRET ? 'Bearer token required' : 'OPEN (set MCP_SERVER_SECRET to secure)'}`)
  console.log(`   Supabase: ${SUPABASE_URL}\n`)
})
