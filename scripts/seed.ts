/**
 * FreightMate — Seed script
 * Run: npx tsx scripts/seed.ts
 *
 * Seeds exactly ONE fully operational case: Ref 123456
 * All existing mock data is deleted first.
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
  draft_task:      'ffffffff-0001-dddd-0000-000000000001',
  draft:           'ffffffff-0001-eeee-0000-000000000001',
  summary_client:  'bbbbbbbb-0001-cc00-0000-000000000001',
  summary_vendor:  'bbbbbbbb-0001-dd00-0000-000000000001',
}

// Email message IDs — stable so upsert is idempotent (valid UUIDs)
const MSG = {
  c1: 'a0000001-c100-0000-1234-560000000001',
  c2: 'a0000002-c200-0000-1234-560000000001',
  c3: 'a0000003-c300-0000-1234-560000000001',
  c4: 'a0000004-c400-0000-1234-560000000001',
  c5: 'a0000005-c500-0000-1234-560000000001',
  v1: 'a0000006-b100-0000-1234-560000000001',
  v2: 'a0000007-b200-0000-1234-560000000001',
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
    flight_date:   daysFromNow(3),
    created_at:    daysAgo(5),
    updated_at:    daysAgo(1),
  }])

  // ── Case channels ─────────────────────────────────────────────────────────────
  await upsert('case_channels', [
    {
      id:              IDS.channel_client,
      case_id:         IDS.case,
      channel_type:    'client',
      party_email:     'freightmate57@gmail.com',
      nylas_thread_id: 'thread-123456-client',
      cc_emails:       [],
      message_count:   5,
      created_at:      daysAgo(5),
    },
    {
      id:              IDS.channel_vendor,
      case_id:         IDS.case,
      channel_type:    'vendor',
      party_email:     'freightmate59@gmail.com',
      nylas_thread_id: 'thread-123456-vendor',
      cc_emails:       [],
      message_count:   2,
      created_at:      daysAgo(4),
    },
  ])

  // ── Email messages ─────────────────────────────────────────────────────────────
  const flightDate = daysFromNow(3)

  await upsert('email_messages', [

    // ── Client channel: 5 messages ──────────────────────────────────────────────

    // 1. Client enquiry (inbound, Day -5)
    {
      id:                MSG.c1,
      case_id:           IDS.case,
      channel_id:        IDS.channel_client,
      mailbox_id:        IDS.mailbox,
      direction:         'inbound',
      folder:            'inbox',
      sender_email:      'freightmate57@gmail.com',
      sender_persona:    'client',
      recipient_email:   'freightmate58@gmail.com',
      subject:           'Urgent freight request — FRA → ORD, Ref 123456',
      body_text:         `Dear FreightMate,

I hope this message finds you well.

We urgently need to arrange air freight for the following shipment:

• Origin: Frankfurt Airport (FRA), Germany
• Destination: Chicago O'Hare (ORD), USA
• Commodity: Precision measurement instruments
• Weight: 285 kg
• Dimensions: 110 × 70 × 55 cm
• Required delivery: within 10 days

These instruments are needed for a production calibration at our Chicago facility. Any delay will impact the production schedule.

Please advise on the earliest available routing and your best rate.

Best regards,
Sarah Mitchell
Hartmann Logistics GmbH`,
      body_preview:      'We urgently need to arrange air freight — FRA to ORD, 285kg precision instruments, delivery within 10 days.',
      cc:                null,
      nylas_message_id:  MSG.c1,
      nylas_thread_id:   'thread-123456-client',
      is_read:           true,
      is_starred:        false,
      has_attachments:   false,
      is_processed:      true,
      created_at:        daysAgo(5),
    },

    // 2. Coordinator acknowledgement (outbound, Day -4)
    {
      id:                MSG.c2,
      case_id:           IDS.case,
      channel_id:        IDS.channel_client,
      mailbox_id:        IDS.mailbox,
      direction:         'outbound',
      folder:            'sent',
      sender_email:      'freightmate58@gmail.com',
      sender_persona:    'coordinator',
      recipient_email:   'freightmate57@gmail.com',
      subject:           'Re: Urgent freight request — FRA → ORD, Ref 123456',
      body_text:         `Dear Sarah,

Thank you for reaching out. We have registered your request under reference 123456.

We are immediately reaching out to our carrier partners to secure the best available routing and rate for FRA → ORD. Given the timeline, we will prioritise this.

Could you please confirm: are there any hazardous materials or special handling requirements for these instruments?

We will revert with a full quote within 24 hours.

Best regards,
FreightMate Operations`,
      body_preview:      'Thank you. We have registered your request (Ref 123456) and are sourcing rates. Will revert within 24h.',
      cc:                null,
      nylas_message_id:  MSG.c2,
      nylas_thread_id:   'thread-123456-client',
      is_read:           true,
      is_starred:        false,
      has_attachments:   false,
      is_processed:      true,
      created_at:        daysAgo(4),
    },

    // 3. Client confirms no hazmat (inbound, Day -4, later)
    {
      id:                MSG.c3,
      case_id:           IDS.case,
      channel_id:        IDS.channel_client,
      mailbox_id:        IDS.mailbox,
      direction:         'inbound',
      folder:            'inbox',
      sender_email:      'freightmate57@gmail.com',
      sender_persona:    'client',
      recipient_email:   'freightmate58@gmail.com',
      subject:           'Re: Urgent freight request — FRA → ORD, Ref 123456',
      body_text:         `Hi,

No hazardous materials. These are standard electronic measuring instruments — no lithium batteries, no restrictions.

Please do expedite. Our production window is narrow and we really need this to move.

Thanks,
Sarah`,
      body_preview:      'No hazardous materials — standard electronic instruments. Please expedite.',
      cc:                null,
      nylas_message_id:  MSG.c3,
      nylas_thread_id:   'thread-123456-client',
      is_read:           true,
      is_starred:        false,
      has_attachments:   false,
      is_processed:      true,
      created_at:        daysAgo(4),
    },

    // 4. Coordinator forwards quote (outbound, Day -2)
    {
      id:                MSG.c4,
      case_id:           IDS.case,
      channel_id:        IDS.channel_client,
      mailbox_id:        IDS.mailbox,
      direction:         'outbound',
      folder:            'sent',
      sender_email:      'freightmate58@gmail.com',
      sender_persona:    'coordinator',
      recipient_email:   'freightmate57@gmail.com',
      subject:           'Re: Urgent freight request — FRA → ORD, Ref 123456',
      body_text:         `Dear Sarah,

We have obtained a quote from our carrier partner Apex Cargo GmbH for your shipment:

• Route: Frankfurt (FRA) → Chicago O'Hare (ORD) via LH8400
• Rate: EUR 3,200 all-in (freight + fuel + security surcharge)
• Transit time: 5 business days
• Estimated departure: ${flightDate}
• Estimated arrival: within 5 days of departure

Space on this flight is limited. To secure the booking, we would need your confirmation today.

Please reply with your approval and we will immediately issue the booking confirmation to the carrier.

Best regards,
FreightMate Operations`,
      body_preview:      'Quote from Apex Cargo: EUR 3,200 all-in, 5 days transit, flight LH8400. Please confirm to secure space.',
      cc:                null,
      nylas_message_id:  MSG.c4,
      nylas_thread_id:   'thread-123456-client',
      is_read:           true,
      is_starred:        false,
      has_attachments:   false,
      is_processed:      true,
      created_at:        daysAgo(2),
    },

    // 5. Client accepts (inbound, Day -1) — handover point
    {
      id:                MSG.c5,
      case_id:           IDS.case,
      channel_id:        IDS.channel_client,
      mailbox_id:        IDS.mailbox,
      direction:         'inbound',
      folder:            'inbox',
      sender_email:      'freightmate57@gmail.com',
      sender_persona:    'client',
      recipient_email:   'freightmate58@gmail.com',
      subject:           'Re: Urgent freight request — FRA → ORD, Ref 123456',
      body_text:         `Hi,

Approved. Please proceed with the booking on LH8400.

For invoicing purposes, please address the invoice to:
Hartmann Logistics GmbH
Accounts Payable: accounts@hartmann-logistics.de
VAT: DE 123 456 789

Looking forward to your booking confirmation.

Best,
Sarah Mitchell`,
      body_preview:      'Approved. Please proceed with LH8400 booking. Invoice to accounts@hartmann-logistics.de.',
      cc:                null,
      nylas_message_id:  MSG.c5,
      nylas_thread_id:   'thread-123456-client',
      is_read:           false,
      is_starred:        true,
      has_attachments:   false,
      is_processed:      true,
      created_at:        daysAgo(1),
    },

    // ── Vendor channel: 2 messages ──────────────────────────────────────────────

    // 6. Rate request to vendor (outbound, Day -4)
    {
      id:                MSG.v1,
      case_id:           IDS.case,
      channel_id:        IDS.channel_vendor,
      mailbox_id:        IDS.mailbox,
      direction:         'outbound',
      folder:            'sent',
      sender_email:      'freightmate58@gmail.com',
      sender_persona:    'coordinator',
      recipient_email:   'freightmate59@gmail.com',
      subject:           'Rate request — FRA → ORD, 285kg, Ref 123456',
      body_text:         `Hi Klaus,

Please provide a rate for the following urgent shipment:

• Route: Frankfurt (FRA) → Chicago O'Hare (ORD)
• Commodity: Precision measurement instruments (no hazmat)
• Weight: 285 kg
• Dimensions: 110 × 70 × 55 cm
• Required departure: within 4 days

Please quote all-in and advise available departure dates.

Many thanks,
FreightMate Operations`,
      body_preview:      'Rate request: FRA → ORD, 285kg precision instruments, departure within 4 days. Please quote all-in.',
      cc:                null,
      nylas_message_id:  MSG.v1,
      nylas_thread_id:   'thread-123456-vendor',
      is_read:           true,
      is_starred:        false,
      has_attachments:   false,
      is_processed:      true,
      created_at:        daysAgo(4),
    },

    // 7. Vendor quote (inbound, Day -3)
    {
      id:                MSG.v2,
      case_id:           IDS.case,
      channel_id:        IDS.channel_vendor,
      mailbox_id:        IDS.mailbox,
      direction:         'inbound',
      folder:            'inbox',
      sender_email:      'freightmate59@gmail.com',
      sender_persona:    'vendor',
      recipient_email:   'freightmate58@gmail.com',
      subject:           'Re: Rate request — FRA → ORD, 285kg, Ref 123456',
      body_text:         `Hello,

Thank you for the enquiry. We can offer the following:

• Route: FRA → ORD via LH8400 (Lufthansa Cargo)
• Rate: EUR 3,200 all-in (includes freight, fuel surcharge, security fee)
• Transit time: 5 business days door-to-door
• Available departure: ${flightDate}
• Space: available, but recommend confirming by tomorrow

Please confirm at your earliest convenience to secure the allocation.

Best regards,
Klaus Weber
Apex Cargo GmbH`,
      body_preview:      'Quote: EUR 3,200 all-in, LH8400, 5 days transit. Departure available, confirm by tomorrow.',
      cc:                null,
      nylas_message_id:  MSG.v2,
      nylas_thread_id:   'thread-123456-vendor',
      is_read:           true,
      is_starred:        false,
      has_attachments:   false,
      is_processed:      true,
      created_at:        daysAgo(3),
    },

  ])

  // ── Draft task: booking confirmation to vendor ─────────────────────────────────
  await upsert('draft_tasks', [{
    id:           IDS.draft_task,
    case_id:      IDS.case,
    channel_type: 'vendor',
    draft_type:   'booking_confirmation',
    status:       'ready',
    priority:     1,
    created_at:   daysAgo(1),
  }])

  // ── AI message draft ──────────────────────────────────────────────────────────
  await upsert('message_drafts', [{
    id:               IDS.draft,
    draft_task_id:    IDS.draft_task,
    case_id:          IDS.case,
    channel_type:     'vendor',
    recipient_email:  'freightmate59@gmail.com',
    subject:          'Booking Confirmation — FRA → ORD, LH8400, Ref 123456',
    body_text:        `Dear Klaus,

I am pleased to confirm that our client has approved the booking.

Please proceed with the reservation on LH8400 for the following shipment:

• Reference: 123456
• Route: Frankfurt (FRA) → Chicago O'Hare (ORD)
• Flight: LH8400
• Departure: ${flightDate}
• Commodity: Precision measurement instruments
• Weight: 285 kg
• Dimensions: 110 × 70 × 55 cm

Please send the booking confirmation, AWB number, and any cut-off times to this email address.

For invoicing, please send your invoice to: freightmate58@gmail.com

Thank you for your quick turnaround.

Best regards,
FreightMate Operations`,
    version:          1,
    model_used:       'claude-sonnet-4-6',
    prompt_tokens:    680,
    completion_tokens: 195,
    latency_ms:       1840,
    created_at:       daysAgo(1),
    updated_at:       daysAgo(1),
  }])

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
      last_message_included: MSG.c5,
      message_count:         5,
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
      last_message_included: MSG.v2,
      message_count:         2,
      model_used:            'claude-sonnet-4-6',
      input_tokens:          540,
      output_tokens:         160,
      updated_at:            daysAgo(1),
    },
  ], 'case_id,channel_type')

  // ── Shipment facts ─────────────────────────────────────────────────────────────
  const facts = [
    { fact_type: 'origin',      value: 'Frankfurt (FRA), Germany' },
    { fact_type: 'destination', value: 'Chicago O\'Hare (ORD), USA' },
    { fact_type: 'weight',      value: '285 kg' },
    { fact_type: 'dimensions',  value: '110 × 70 × 55 cm' },
    { fact_type: 'commodity',   value: 'Precision measurement instruments (no hazmat)' },
    { fact_type: 'rate',        value: 'EUR 3,200 all-in (LH8400)' },
    { fact_type: 'flight_date', value: flightDate },
    { fact_type: 'carrier',     value: 'Apex Cargo GmbH / Lufthansa Cargo LH8400' },
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
  console.log('\n✅ Seed complete. Open /cases/123456 to see the case.\n')
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
