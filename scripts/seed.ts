/**
 * FreightMate — Seed script
 * Run: npx tsx scripts/seed.ts
 *
 * Seeds exactly ONE fully operational case: Ref 123456
 * All existing mock data is deleted first.
 *
 * NOTE: No fake email_messages are seeded. Real emails populate via the Sync
 * button once actual Gmail messages are exchanged between the 3 accounts.
 * Seeding fake nylas_message_id values caused ghost data that persisted
 * alongside real emails and could not be overwritten by sync.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ─── Stable IDs ───────────────────────────────────────────────────────────────

const IDS = {
  mailbox:         'aaaaaaaa-0000-0000-0000-000000000001',
  contact_client:  'cccccccc-0001-0000-0000-000000000001',
  contact_vendor:  'cccccccc-0002-0000-0000-000000000001',
  contact_coord:   'cccccccc-0003-0000-0000-000000000001',
  client:          'cccccccc-0001-1111-0000-000000000001',
  vendor:          'cccccccc-0002-2222-0000-000000000001',
  case:            'dddddddd-0001-0000-0000-000000000001',
  channel_client:  'eeeeeeee-0001-0001-0000-000000000001',
  channel_vendor:  'eeeeeeee-0001-0002-0000-000000000001',
  summary_client:  'bbbbbbbb-0001-cc00-0000-000000000001',
  summary_vendor:  'bbbbbbbb-0001-dd00-0000-000000000001',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

async function del(table: string) {
  const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) console.error(`  ✗ delete ${table}:`, error.message)
  else       console.log(`  ✓ cleared ${table}`)
}

async function upsert(table: string, rows: Record<string, unknown>[], conflict = 'id') {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict })
  if (error) console.error(`  ✗ ${table}:`, error.message)
  else       console.log(`  ✓ ${table} (${rows.length} row${rows.length === 1 ? '' : 's'})`)
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('\n🗑️  Cleaning existing data...\n')
  // Delete in dependency order (children first)
  await del('message_drafts')
  await del('draft_tasks')
  await del('thread_summaries')
  await del('shipment_events')
  await del('shipment_facts')
  await del('email_messages')
  await del('case_channels')
  await del('shipment_cases')
  await del('case_contacts')
  await del('clients')
  await del('vendors')
  await del('contacts')
  await del('mailboxes')
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 Seeding Case Ref 123456...\n')

  const flightDate = daysFromNow(3)

  // ── Mailbox ──────────────────────────────────────────────────────────────────
  await upsert('mailboxes', [{
    id:             IDS.mailbox,
    name:           'FreightMate Operations',
    email_address:  'freightmate58@gmail.com',
    provider:       'google',
    nylas_grant_id: '0d720d76-fc61-4d5a-a99a-5961a35ba54e',
    is_active:      true,
    created_at:     daysAgo(30),
  }])

  // ── Contacts ─────────────────────────────────────────────────────────────────
  await upsert('contacts', [
    {
      id: IDS.contact_client, email: 'freightmate57@gmail.com',
      display_name: 'Sarah Mitchell', persona: 'client',
      company_name: 'Hartmann Logistics GmbH', company_domain: 'hartmann-logistics.de',
      is_validated: true, needs_review: false, created_at: daysAgo(10),
    },
    {
      id: IDS.contact_vendor, email: 'freightmate59@gmail.com',
      display_name: 'Klaus Weber', persona: 'vendor',
      company_name: 'Apex Cargo GmbH', company_domain: 'apex-cargo.de',
      is_validated: true, needs_review: false, created_at: daysAgo(10),
    },
    {
      id: IDS.contact_coord, email: 'freightmate58@gmail.com',
      display_name: 'FreightMate Operations', persona: 'coordinator',
      company_name: null, company_domain: null,
      is_validated: true, needs_review: false, created_at: daysAgo(30),
    },
  ])

  // ── Client + Vendor records ───────────────────────────────────────────────────
  await upsert('clients', [{
    id: IDS.client, contact_id: IDS.contact_client,
    email: 'freightmate57@gmail.com',
    display_name: 'Sarah Mitchell',
    company_name: 'Hartmann Logistics GmbH',
    notes: null, is_active: true, created_at: daysAgo(10),
  }])

  await upsert('vendors', [{
    id: IDS.vendor, contact_id: IDS.contact_vendor,
    name: 'Apex Cargo GmbH',
    email: 'freightmate59@gmail.com',
    default_mode: 'email', is_active: true, created_at: daysAgo(10),
  }])

  // ── Shipment case ─────────────────────────────────────────────────────────────
  await upsert('shipment_cases', [{
    id:            IDS.case,
    ref_number:    '123456',
    case_code:     'CASE-20260331-0001',
    mailbox_id:    IDS.mailbox,
    vendor_id:     IDS.vendor,
    status:        'client_confirmed',
    priority:      'high',
    tags:          ['confirmed', 'air-freight'],
    client_email:  'freightmate57@gmail.com',
    client_name:   'Sarah Mitchell',
    item_desc:     'Precision measurement instruments',
    weight_kg:     285,
    dimensions:    '110×70×55cm',
    origin:        'Frankfurt (FRA)',
    destination:   'Chicago O\'Hare (ORD)',
    urgency:       'Client requires delivery within 10 days',
    rate_amount:   3200,
    rate_currency: 'EUR',
    transit_days:  5,
    flight_date:   flightDate,
    created_at:    daysAgo(5),
    updated_at:    daysAgo(1),
  }])

  // ── Case channels ─────────────────────────────────────────────────────────────
  // nylas_thread_id is intentionally left as a placeholder — it will be updated
  // by WF1 when real Gmail threads are matched to this case.
  await upsert('case_channels', [
    {
      id:              IDS.channel_client,
      case_id:         IDS.case,
      channel_type:    'client',
      party_email:     'freightmate57@gmail.com',
      nylas_thread_id: null,
      cc_emails:       [],
      message_count:   0,
      created_at:      daysAgo(5),
    },
    {
      id:              IDS.channel_vendor,
      case_id:         IDS.case,
      channel_type:    'vendor',
      party_email:     'freightmate59@gmail.com',
      nylas_thread_id: null,
      cc_emails:       [],
      message_count:   0,
      created_at:      daysAgo(4),
    },
  ])

  // ── Thread summaries ──────────────────────────────────────────────────────────
  await upsert('thread_summaries', [
    {
      id:                    IDS.summary_client,
      case_id:               IDS.case,
      channel_type:          'client',
      summary_text:          'Client Sarah Mitchell (Hartmann Logistics GmbH) placed an urgent air freight request for 285kg precision instruments from Frankfurt to Chicago O\'Hare, required within 10 days. No hazmat. We sourced a quote from Apex Cargo (EUR 3,200, LH8400, 5-day transit) and forwarded it to the client. Client has now approved and confirmed the booking. Invoicing address provided: accounts@hartmann-logistics.de.',
      tone:                  'positive',
      open_questions:        ['Booking confirmation from vendor still pending — awaiting AWB number'],
      promises_made:         ['We will send a booking confirmation once the carrier confirms', 'Delivery within 5 business days of departure'],
      unresolved_issues:     [],
      communication_risks:   [],
      last_message_included: null,
      message_count:         0,
      model_used:            'claude-sonnet-4-6',
      input_tokens:          820,
      output_tokens:         240,
      updated_at:            daysAgo(1),
    },
    {
      id:                    IDS.summary_vendor,
      case_id:               IDS.case,
      channel_type:          'vendor',
      summary_text:          'We requested a rate from Apex Cargo GmbH (Klaus Weber) for FRA→ORD, 285kg precision instruments. Apex quoted EUR 3,200 all-in for flight LH8400 departing in 3 days, with 5-day transit. Client has since approved — a booking confirmation draft is awaiting approval to send to Apex.',
      tone:                  'positive',
      open_questions:        ['Booking confirmation not yet sent to vendor'],
      promises_made:         [],
      unresolved_issues:     [],
      communication_risks:   ['Space on LH8400 is limited — booking confirmation should be sent promptly'],
      last_message_included: null,
      message_count:         0,
      model_used:            'claude-sonnet-4-6',
      input_tokens:          540,
      output_tokens:         160,
      updated_at:            daysAgo(1),
    },
  ], 'case_id,channel_type')

  // ── Shipment facts ─────────────────────────────────────────────────────────────
  const facts = [
    { fact_type: 'external_ref', value: '123456' },  // enables WF1 Tier 2 matching
    { fact_type: 'origin',       value: 'Frankfurt (FRA), Germany' },
    { fact_type: 'destination',  value: 'Chicago O\'Hare (ORD), USA' },
    { fact_type: 'weight',       value: '285 kg' },
    { fact_type: 'dimensions',   value: '110 × 70 × 55 cm' },
    { fact_type: 'commodity',    value: 'Precision measurement instruments (no hazmat)' },
    { fact_type: 'rate',         value: 'EUR 3,200 all-in (LH8400)' },
    { fact_type: 'flight_date',  value: flightDate },
    { fact_type: 'carrier',      value: 'Apex Cargo GmbH / Lufthansa Cargo LH8400' },
  ]

  await upsert('shipment_facts', facts.map((f, i) => ({
    id:           `fa123456-${String(i + 1).padStart(4, '0')}-0000-0000-000000000001`,
    case_id:      IDS.case,
    fact_type:    f.fact_type,
    value:        f.value,
    confidence:   1.0,
    source_msg:   null,
    extracted_by: 'seed',
    confirmed:    true,
    created_at:   daysAgo(4),
    updated_at:   daysAgo(4),
  })))

  // ── Shipment events ───────────────────────────────────────────────────────────
  await upsert('shipment_events', [
    {
      id:           'e1234560-0001-0000-0000-000000000001',
      case_id:      IDS.case,
      event_type:   'case_created',
      payload:      { ref: '123456', status: 'new' },
      triggered_by: 'seed',
      created_at:   daysAgo(5),
    },
    {
      id:           'e1234560-0002-0000-0000-000000000001',
      case_id:      IDS.case,
      event_type:   'quote_received',
      payload:      { vendor: 'Apex Cargo GmbH', rate: 3200, currency: 'EUR', flight: 'LH8400' },
      triggered_by: 'seed',
      created_at:   daysAgo(3),
    },
    {
      id:           'e1234560-0003-0000-0000-000000000001',
      case_id:      IDS.case,
      event_type:   'client_confirmed',
      payload:      { approved_by: 'Sarah Mitchell', invoice_email: 'accounts@hartmann-logistics.de' },
      triggered_by: 'seed',
      created_at:   daysAgo(1),
    },
  ])
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 FreightMate seed — Ref 123456\n')
  await cleanup()
  await seed()
  console.log('\n✅ Seed complete. email_messages is empty — populate via Sync button.\n')
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
