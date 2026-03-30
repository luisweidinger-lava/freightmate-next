import { SupabaseClient } from '@supabase/supabase-js'
import { applyPrivacyList } from '../config/privacy.js'

export function registerEmailTools(
  server: { tool: (name: string, description: string, schema: object, handler: (args: Record<string, unknown>) => Promise<unknown>) => void },
  supabase: SupabaseClient,
) {
  // ── get_thread ──────────────────────────────────────────────────────────────
  server.tool(
    'get_thread',
    'Get the email thread for a case channel. Returns messages with PII and full body redacted — only subject, preview, direction, and timestamps are returned.',
    {
      type: 'object',
      required: ['case_id'],
      properties: {
        case_id:      { type: 'string', description: 'The case UUID' },
        channel_type: { type: 'string', enum: ['client', 'vendor'], description: 'Which thread to fetch' },
        limit:        { type: 'number', description: 'Max messages (default 20)' },
      },
    },
    async (args) => {
      let query = supabase
        .from('email_messages')
        .select('*')
        .eq('case_id', args.case_id)
        .order('created_at', { ascending: true })
        .limit((args.limit as number) || 20)

      if (args.channel_type) {
        // Join via case_channels to filter by channel_type
        const { data: channels } = await supabase
          .from('case_channels')
          .select('id')
          .eq('case_id', args.case_id)
          .eq('channel_type', args.channel_type)

        const channelIds = (channels || []).map((c: { id: string }) => c.id)
        if (channelIds.length > 0) {
          query = query.in('channel_id', channelIds)
        }
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      return {
        messages: applyPrivacyList('email_messages', (data || []) as Record<string, unknown>[]),
        count: data?.length ?? 0,
        _privacy: 'sender_email, recipient_email, cc, and body_text redacted. Use body_preview for AI context.',
      }
    },
  )

  // ── get_thread_summary ──────────────────────────────────────────────────────
  server.tool(
    'get_thread_summary',
    'Get the AI-generated rolling summary for a case thread. Includes tone, open questions, risks, and promises made.',
    {
      type: 'object',
      required: ['case_id'],
      properties: {
        case_id:      { type: 'string', description: 'The case UUID' },
        channel_type: { type: 'string', enum: ['client', 'vendor'], description: 'Which thread summary to fetch' },
      },
    },
    async (args) => {
      let query = supabase
        .from('thread_summaries')
        .select('*')
        .eq('case_id', args.case_id)

      if (args.channel_type) query = query.eq('channel_type', args.channel_type)

      const { data, error } = await query.maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return { summary: null }

      return {
        summary: applyPrivacyList('thread_summaries', [data as Record<string, unknown>])[0],
      }
    },
  )
}
