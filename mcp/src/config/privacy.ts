/**
 * Privacy rules — define which fields are allowed to leave your infrastructure
 * when data is passed to external AI providers.
 *
 * Fields in `redact` are stripped from tool responses before any AI sees them.
 * Fields in `allowed_to_ai` are the only fields forwarded to AI models.
 *
 * Update this file to tighten or relax controls without touching tool logic.
 */

export interface PrivacyRule {
  allowed_to_ai: string[]
  redact: string[]
}

export const PRIVACY_RULES: Record<string, PrivacyRule> = {
  shipment_cases: {
    allowed_to_ai: [
      'id', 'ref_number', 'status', 'priority', 'tags',
      'item_desc', 'weight_kg', 'dimensions', 'origin', 'destination',
      'urgency', 'rate_amount', 'rate_currency', 'transit_days',
      'flight_date', 'created_at', 'updated_at',
    ],
    redact: [
      'client_email', 'client_name',  // PII — client identity
      'case_token', 'label_storage_path',
    ],
  },

  email_messages: {
    allowed_to_ai: [
      'id', 'direction', 'subject', 'body_preview',
      'message_type', 'workflow_step', 'folder',
      'has_attachments', 'created_at',
    ],
    redact: [
      'sender_email', 'recipient_email', 'cc',  // PII
      'body_text',                               // full body — use body_preview instead
      'nylas_message_id', 'nylas_thread_id',
    ],
  },

  thread_summaries: {
    // Summaries are AI-generated from your own system — safe to pass back to AI
    allowed_to_ai: [
      'id', 'case_id', 'channel_type', 'summary_text', 'tone',
      'open_questions', 'promises_made', 'unresolved_issues',
      'communication_risks', 'message_count', 'updated_at',
    ],
    redact: [],
  },

  contacts: {
    allowed_to_ai: ['id', 'persona', 'company_name', 'company_domain', 'is_validated'],
    redact: ['email', 'display_name', 'notes'],  // PII
  },
}

/**
 * Apply privacy rules to a single record.
 * If no rule exists for the table, the record is returned as-is.
 */
export function applyPrivacy(
  table: string,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const rule = PRIVACY_RULES[table]
  if (!rule) return record

  const filtered: Record<string, unknown> = {}
  for (const key of rule.allowed_to_ai) {
    if (key in record) filtered[key] = record[key]
  }
  return filtered
}

/**
 * Apply privacy rules to an array of records.
 */
export function applyPrivacyList(
  table: string,
  records: Record<string, unknown>[],
): Record<string, unknown>[] {
  return records.map(r => applyPrivacy(table, r))
}
