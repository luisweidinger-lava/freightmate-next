import { SupabaseClient } from '@supabase/supabase-js'

export function registerDraftTools(
  server: { tool: (name: string, description: string, schema: object, handler: (args: Record<string, unknown>) => Promise<unknown>) => void },
  supabase: SupabaseClient,
  env: { draftWebhookUrl: string; webhookSecret: string; approveWebhookUrl: string },
) {
  // ── list_pending_drafts ─────────────────────────────────────────────────────
  server.tool(
    'list_pending_drafts',
    'List AI-generated message drafts that are awaiting approval. Optionally filter by case.',
    {
      type: 'object',
      properties: {
        case_id: { type: 'string', description: 'Filter by case UUID (optional)' },
      },
    },
    async (args) => {
      let query = supabase
        .from('message_drafts')
        .select('id, case_id, channel_type, subject, body_text, version, created_at, updated_at')
        .is('sent_at', null)
        .is('rejected_at', null)
        .order('created_at', { ascending: false })

      if (args.case_id) query = query.eq('case_id', args.case_id)

      const { data, error } = await query
      if (error) throw new Error(error.message)

      // Redact recipient_email from draft data — return subject and body for AI to review
      return { drafts: data || [], count: data?.length ?? 0 }
    },
  )

  // ── request_draft ───────────────────────────────────────────────────────────
  server.tool(
    'request_draft',
    'Trigger AI draft generation for a case channel (calls n8n WF5).',
    {
      type: 'object',
      required: ['case_id', 'channel_type'],
      properties: {
        case_id:      { type: 'string', description: 'The case UUID' },
        channel_type: { type: 'string', enum: ['client', 'vendor'] },
        channel_id:   { type: 'string', description: 'The case_channels.id (optional but recommended)' },
      },
    },
    async (args) => {
      if (!env.draftWebhookUrl || !env.webhookSecret) {
        throw new Error('N8N_DRAFT_WEBHOOK_URL or N8N_WEBHOOK_SECRET not configured')
      }

      const res = await fetch(env.draftWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AxisLog-Key': env.webhookSecret,
        },
        body: JSON.stringify({
          case_id:      args.case_id,
          channel_type: args.channel_type,
          channel_id:   args.channel_id || null,
        }),
      })

      if (!res.ok) {
        throw new Error(`WF5 webhook error: ${res.status} ${await res.text()}`)
      }

      return { ok: true, message: 'Draft generation triggered — draft will appear in message_drafts within ~60s' }
    },
  )

  // ── approve_draft ───────────────────────────────────────────────────────────
  server.tool(
    'approve_draft',
    'Approve an AI draft for sending. Calls the approve-draft webhook which triggers WF6.',
    {
      type: 'object',
      required: ['draft_id'],
      properties: {
        draft_id: { type: 'string', description: 'The message_drafts.id to approve' },
      },
    },
    async (args) => {
      if (!env.approveWebhookUrl || !env.webhookSecret) {
        throw new Error('N8N_SEND_WEBHOOK_URL or N8N_WEBHOOK_SECRET not configured')
      }

      const res = await fetch(env.approveWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AxisLog-Key': env.webhookSecret,
        },
        body: JSON.stringify({
          draft_id:   args.draft_id,
          manager_id: 'mcp_gateway',
        }),
      })

      if (!res.ok) {
        throw new Error(`Approve webhook error: ${res.status} ${await res.text()}`)
      }

      return { ok: true, message: 'Draft approved and queued for sending via WF6' }
    },
  )
}
