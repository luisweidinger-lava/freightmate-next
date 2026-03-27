export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── Supabase DB shape ───────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      shipment_cases:  { Row: ShipmentCase }
      email_messages:  { Row: EmailMessage }
      case_channels:   { Row: CaseChannel }
      draft_tasks:     { Row: DraftTask }
      message_drafts:  { Row: MessageDraft }
      thread_summaries:{ Row: ThreadSummary }
      shipment_facts:  { Row: ShipmentFact }
      shipment_events: { Row: ShipmentEvent }
      contacts:        { Row: Contact }
      case_contacts:   { Row: CaseContact }
      mailboxes:       { Row: Mailbox }
      vendors:         { Row: Vendor }
      shipments:       { Row: Shipment }
    }
  }
}

// ─── Row types ───────────────────────────────────────────────────────────────

export interface ShipmentCase {
  id:                 string
  case_code:          string        // internal only — never show to user
  ref_number:         string | null // "Ref 123456" — the human identifier
  mailbox_id:         string | null
  vendor_id:          string | null
  status:             CaseStatus
  priority:           'low' | 'normal' | 'high' | 'urgent'
  tags:               string[]
  client_email:       string
  client_name:        string | null
  item_desc:          string | null
  weight_kg:          number | null
  dimensions:         string | null
  origin:             string | null
  destination:        string | null
  urgency:            string | null
  rate_amount:        number | null
  rate_currency:      string
  transit_days:       number | null
  flight_date:        string | null
  label_storage_path: string | null
  shipment_id:        string | null
  last_outbound_at:   string | null
  case_token:         string | null
  created_at:         string
  updated_at:         string
}

export type CaseStatus =
  | 'new'
  | 'vendor_requested'
  | 'quote_received'
  | 'quote_sent'
  | 'client_confirmed'
  | 'vendor_confirmed'
  | 'label_received'
  | 'booked'
  | 'in_transit'
  | 'delivered'
  | 'closed'

export interface EmailMessage {
  id:               string
  case_id:          string | null
  channel_id:       string | null
  mailbox_id:       string | null
  direction:        'inbound' | 'outbound'
  sender_email:     string | null
  sender_persona:   string | null
  recipient_email:  string | null
  cc:               string[] | null
  subject:          string | null
  body_text:        string | null
  body_preview:     string | null
  message_type:     string | null
  workflow_step:    number | null
  visibility:       string
  folder:           'inbox' | 'sent' | 'spam' | 'drafts' | 'bin'
  is_starred:       boolean
  is_read:          boolean
  nylas_message_id: string
  nylas_thread_id:  string | null
  has_attachments:  boolean
  is_processed:     boolean
  processing_error: string | null
  created_at:       string
}

export interface CaseChannel {
  id:              string
  case_id:         string
  channel_type:    'client' | 'vendor'
  party_email:     string
  nylas_thread_id: string | null
  cc_emails:       string[]
  last_message_at: string | null
  message_count:   number
  created_at:      string
}

export interface DraftTask {
  id:               string
  case_id:          string
  channel_type:     'client' | 'vendor'
  trigger_event_id: string | null
  draft_type:       string
  status:           'pending' | 'generating' | 'ready' | 'approved' | 'sent' | 'rejected' | 'failed'
  priority:         number
  created_at:       string
}

export interface MessageDraft {
  id:                string
  draft_task_id:     string | null
  case_id:           string | null
  channel_type:      'client' | 'vendor' | null
  recipient_email:   string | null
  subject:           string | null
  body_text:         string | null
  version:           number
  model_used:        string | null
  prompt_tokens:     number | null
  completion_tokens: number | null
  latency_ms:        number | null
  manager_notes:     string | null
  approved_by:       string | null
  approved_at:       string | null
  rejected_at:       string | null
  sent_at:           string | null
  nylas_message_id:  string | null
  created_at:        string
  updated_at:        string
}

export interface ThreadSummary {
  id:                    string
  case_id:               string
  channel_type:          'client' | 'vendor'
  summary_text:          string | null
  tone:                  'neutral' | 'tense' | 'urgent' | 'positive'
  open_questions:        string[]
  promises_made:         string[]
  unresolved_issues:     string[]
  communication_risks:   string[]
  last_message_included: string | null
  message_count:         number
  model_used:            string | null
  input_tokens:          number | null
  output_tokens:         number | null
  updated_at:            string
}

export interface ShipmentFact {
  id:           string
  case_id:      string
  fact_type:    string
  value:        string
  confidence:   number
  source_msg:   string | null
  extracted_by: string
  confirmed:    boolean
  created_at:   string
  updated_at:   string
}

export interface ShipmentEvent {
  id:           string
  case_id:      string | null
  event_type:   string
  payload:      Json
  triggered_by: string | null
  error_detail: string | null
  created_at:   string
}

export interface Contact {
  id:             string
  email:          string
  display_name:   string | null
  persona:        'client' | 'vendor' | 'coordinator' | 'internal' | 'general'
  company_name:   string | null
  company_domain: string | null
  is_validated:   boolean
  needs_review:   boolean
  notes:          string | null
  created_at:     string
}

export interface CaseContact {
  id:           string
  case_id:      string
  email:        string
  persona:      string
  display_name: string | null
  is_primary:   boolean
  created_at:   string
}

export interface Mailbox {
  id:             string
  name:           string
  email_address:  string
  provider:       string
  nylas_grant_id: string | null
  is_active:      boolean
  created_at:     string
}

export interface Vendor {
  id:           string
  name:         string
  email:        string
  default_mode: string
  is_active:    boolean
  created_at:   string
}

export interface Shipment {
  id:                 string
  case_id:            string | null
  tracking_no:        string | null
  current_status:     string
  label_storage_path: string | null
  status_updated_at:  string
  created_at:         string
  updated_at:         string
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export const STATUS_STEPS: { key: CaseStatus; label: string }[] = [
  { key: 'new',               label: 'New'             },
  { key: 'vendor_requested',  label: 'Vendor Req.'     },
  { key: 'quote_received',    label: 'Quote Rcvd'      },
  { key: 'quote_sent',        label: 'Quote Sent'      },
  { key: 'client_confirmed',  label: 'Client Conf.'    },
  { key: 'vendor_confirmed',  label: 'Vendor Conf.'    },
  { key: 'label_received',    label: 'Label Rcvd'      },
  { key: 'booked',            label: 'Booked'          },
  { key: 'in_transit',        label: 'In Transit'      },
  { key: 'delivered',         label: 'Delivered'       },
  { key: 'closed',            label: 'Closed'          },
]

export const PERSONA_COLORS: Record<string, string> = {
  client:      'text-blue-600 bg-blue-50',
  vendor:      'text-orange-600 bg-orange-50',
  coordinator: 'text-purple-600 bg-purple-50',
  internal:    'text-gray-600 bg-gray-100',
  general:     'text-gray-500 bg-gray-50',
  unknown:     'text-red-500 bg-red-50',
}
