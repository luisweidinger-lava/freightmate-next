import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { draft_task_id, case_id, channel_type, draft_type } = await req.json()

    if (!draft_task_id || !case_id || !channel_type) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch case row — we need mailbox_id and case context
    const { data: caseRow, error: caseError } = await supabase
      .from('shipment_cases')
      .select('id, mailbox_id, operator_id, ref_number, client_name, client_email, origin, destination, status, item_desc, rate_amount, rate_currency')
      .eq('id', case_id)
      .single()

    if (caseError || !caseRow?.mailbox_id) {
      throw new Error('No mailbox_id found for case_id: ' + case_id)
    }
    if (caseRow.operator_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load thread summary for context
    const { data: summary } = await supabase
      .from('thread_summaries')
      .select('summary_text, open_questions, promises_made')
      .eq('case_id', case_id)
      .eq('channel_type', channel_type)
      .maybeSingle()

    // Load last 3 messages from this channel
    const { data: recentMessages } = await supabase
      .from('email_messages')
      .select('direction, sender_email, subject, body_text, created_at')
      .eq('case_id', case_id)
      .order('created_at', { ascending: false })
      .limit(3)

    // Load recipient from case_contacts
    const { data: contacts } = await supabase
      .from('case_contacts')
      .select('email, display_name, persona')
      .eq('case_id', case_id)
      .eq('persona', channel_type)
      .limit(1)

    const recipient = contacts?.[0]
    const messages = (recentMessages ?? []).reverse()

    const contextBlock = [
      `Case: ${caseRow.ref_number ?? case_id}`,
      `Route: ${caseRow.origin ?? '?'} → ${caseRow.destination ?? '?'}`,
      `Status: ${caseRow.status}`,
      caseRow.item_desc ? `Cargo: ${caseRow.item_desc}` : null,
      caseRow.rate_amount ? `Rate: ${caseRow.rate_currency} ${caseRow.rate_amount}` : null,
      summary?.summary_text ? `\nThread summary:\n${summary.summary_text}` : null,
      summary?.open_questions?.length ? `Open questions: ${summary.open_questions.join('; ')}` : null,
      messages.length > 0
        ? `\nRecent messages:\n${messages.map(m =>
            `[${m.direction}] ${m.sender_email}: ${m.subject ?? '(no subject)'}\n${(m.body_text ?? '').slice(0, 300)}`
          ).join('\n\n')}`
        : null,
    ].filter(Boolean).join('\n')

    const systemPrompt = `You are an expert freight coordinator drafting professional emails on behalf of a shipment coordinator.
Write concise, professional emails. Match the tone to the context. Do not add unnecessary pleasantries.
Respond ONLY with a JSON object: { "subject": "...", "body": "..." }`

    const userPrompt = `Draft a ${draft_type ?? 'reply'} email to the ${channel_type} (${recipient?.email ?? 'unknown recipient'}).

Context:
${contextBlock}

Return JSON only: { "subject": "...", "body": "..." }`

    const apiKey = process.env.ANTHROPIC_API_KEY

    let subject          = ''
    let bodyText         = ''
    let modelUsed: string | null        = null
    let promptTokens: number | null     = null
    let completionTokens: number | null = null
    let latencyMs: number | null        = null

    if (apiKey) {
      const startMs    = Date.now()
      const claudeRes  = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 1024,
          system:     systemPrompt,
          messages:   [{ role: 'user', content: userPrompt }],
        }),
      })

      if (!claudeRes.ok) {
        throw new Error(`Claude API error: ${claudeRes.status} ${await claudeRes.text()}`)
      }

      const claudeData = await claudeRes.json()
      latencyMs        = Date.now() - startMs
      const rawText    = claudeData.content?.[0]?.text ?? ''
      modelUsed        = claudeData.model ?? 'claude-sonnet-4-6'
      promptTokens     = claudeData.usage?.input_tokens  ?? null
      completionTokens = claudeData.usage?.output_tokens ?? null

      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        const parsed = JSON.parse(jsonMatch?.[0] ?? rawText)
        subject  = parsed.subject ?? ''
        bodyText = parsed.body    ?? ''
      } catch {
        bodyText = rawText
      }
    }

    const { data: draft, error: insertError } = await supabase
      .from('message_drafts')
      .insert({
        draft_task_id,
        case_id,
        mailbox_id:        caseRow.mailbox_id,
        channel_type,
        recipient_email:   recipient?.email ?? caseRow.client_email ?? null,
        subject,
        body_text:         bodyText,
        version:           1,
        model_used:        modelUsed,
        prompt_tokens:     promptTokens,
        completion_tokens: completionTokens,
        latency_ms:        latencyMs,
        updated_at:        new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) throw new Error(insertError.message)

    return NextResponse.json({ ok: true, draft_id: draft.id })
  } catch (err) {
    console.error('[draft-reply]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
