/**
 * FreightMate — Demo seed script
 * Run: npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 * All inserts are idempotent (upsert on stable IDs) — safe to re-run.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ─── Stable seed IDs ──────────────────────────────────────────────────────────

const IDS = {
  // Mailbox
  mailbox: 'aaaaaaaa-0000-0000-0000-000000000001',

  // Contacts (clients)
  contact_globaltech:  'cccccccc-0001-0000-0000-000000000001',
  contact_meridian:    'cccccccc-0002-0000-0000-000000000001',
  contact_pacific:     'cccccccc-0003-0000-0000-000000000001',

  // Contacts (vendors)
  contact_skybridge:   'cccccccc-0004-0000-0000-000000000001',
  contact_atlas:       'cccccccc-0005-0000-0000-000000000001',
  contact_euroexpress: 'cccccccc-0006-0000-0000-000000000001',

  // Clients
  client_globaltech:   'cccccccc-0001-1111-0000-000000000001',
  client_meridian:     'cccccccc-0002-1111-0000-000000000001',
  client_pacific:      'cccccccc-0003-1111-0000-000000000001',

  // Vendors
  vendor_skybridge:    'cccccccc-0004-2222-0000-000000000001',
  vendor_atlas:        'cccccccc-0005-2222-0000-000000000001',
  vendor_euroexpress:  'cccccccc-0006-2222-0000-000000000001',

  // Cases
  case_354830: 'dddddddd-0001-0000-0000-000000000001', // vendor_requested / urgent
  case_354831: 'dddddddd-0002-0000-0000-000000000001', // quote_received / high
  case_354832: 'dddddddd-0003-0000-0000-000000000001', // quote_sent / normal
  case_354833: 'dddddddd-0004-0000-0000-000000000001', // client_confirmed / high
  case_354834: 'dddddddd-0005-0000-0000-000000000001', // in_transit / normal
  case_354835: 'dddddddd-0006-0000-0000-000000000001', // new / low
  case_354836: 'dddddddd-0007-0000-0000-000000000001', // delivered / normal

  // Channels (per case × channel_type)
  channel_354830_client: 'eeeeeeee-0001-0001-0000-000000000001',
  channel_354830_vendor: 'eeeeeeee-0001-0002-0000-000000000001',
  channel_354831_client: 'eeeeeeee-0002-0001-0000-000000000001',
  channel_354831_vendor: 'eeeeeeee-0002-0002-0000-000000000001',
  channel_354832_client: 'eeeeeeee-0003-0001-0000-000000000001',
  channel_354833_client: 'eeeeeeee-0004-0001-0000-000000000001',
  channel_354834_client: 'eeeeeeee-0005-0001-0000-000000000001',
  channel_354834_vendor: 'eeeeeeee-0005-0002-0000-000000000001',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function hoursAgo(n: number) {
  const d = new Date()
  d.setHours(d.getHours() - n)
  return d.toISOString()
}

async function upsert(table: string, rows: Record<string, unknown>[], conflict = 'id') {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict })
  if (error) {
    console.error(`  ✗ ${table}:`, error.message)
  } else {
    console.log(`  ✓ ${table} (${rows.length} rows)`)
  }
}

// ─── Seed data ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 FreightMate — seeding demo data...\n')

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

  // ── Contacts ──────────────────────────────────────────────────────────────────
  await upsert('contacts', [
    {
      id: IDS.contact_globaltech, email: 'trade@globaltech-trading.com',
      display_name: 'Marcus Hendriks', persona: 'client',
      company_name: 'GlobalTech Trading LLC', company_domain: 'globaltech-trading.com',
      is_validated: true, needs_review: false, created_at: daysAgo(20),
    },
    {
      id: IDS.contact_meridian, email: 'logistics@meridian-imports.de',
      display_name: 'Sabine Koch', persona: 'client',
      company_name: 'Meridian Imports GmbH', company_domain: 'meridian-imports.de',
      is_validated: true, needs_review: false, created_at: daysAgo(18),
    },
    {
      id: IDS.contact_pacific, email: 'ops@pacific-cargo.com',
      display_name: 'James Lim', persona: 'client',
      company_name: 'Pacific Cargo Solutions', company_domain: 'pacific-cargo.com',
      is_validated: true, needs_review: false, created_at: daysAgo(15),
    },
    {
      id: IDS.contact_skybridge, email: 'bookings@skybridgefreight.com',
      display_name: 'Anna Petrova', persona: 'vendor',
      company_name: 'SkyBridge Freight Co.', company_domain: 'skybridgefreight.com',
      is_validated: true, needs_review: false, created_at: daysAgo(25),
    },
    {
      id: IDS.contact_atlas, email: 'quotes@atlaslogistics.net',
      display_name: 'Daniel Müller', persona: 'vendor',
      company_name: 'Atlas Logistics International', company_domain: 'atlaslogistics.net',
      is_validated: true, needs_review: false, created_at: daysAgo(22),
    },
    {
      id: IDS.contact_euroexpress, email: 'cargo@euroexpress.eu',
      display_name: 'Sophie Leclerc', persona: 'vendor',
      company_name: 'Euro Express Cargo', company_domain: 'euroexpress.eu',
      is_validated: true, needs_review: false, created_at: daysAgo(19),
    },
  ])

  // ── Clients ───────────────────────────────────────────────────────────────────
  await upsert('clients', [
    { id: IDS.client_globaltech, contact_id: IDS.contact_globaltech, email: 'trade@globaltech-trading.com', display_name: 'Marcus Hendriks', company_name: 'GlobalTech Trading LLC', is_active: true, created_at: daysAgo(20) },
    { id: IDS.client_meridian,   contact_id: IDS.contact_meridian,   email: 'logistics@meridian-imports.de', display_name: 'Sabine Koch', company_name: 'Meridian Imports GmbH', is_active: true, created_at: daysAgo(18) },
    { id: IDS.client_pacific,    contact_id: IDS.contact_pacific,    email: 'ops@pacific-cargo.com', display_name: 'James Lim', company_name: 'Pacific Cargo Solutions', is_active: true, created_at: daysAgo(15) },
  ])

  // ── Vendors ───────────────────────────────────────────────────────────────────
  await upsert('vendors', [
    { id: IDS.vendor_skybridge,   contact_id: IDS.contact_skybridge,   name: 'SkyBridge Freight Co.',         email: 'bookings@skybridgefreight.com', default_mode: 'email', is_active: true, created_at: daysAgo(25) },
    { id: IDS.vendor_atlas,       contact_id: IDS.contact_atlas,       name: 'Atlas Logistics International', email: 'quotes@atlaslogistics.net',     default_mode: 'email', is_active: true, created_at: daysAgo(22) },
    { id: IDS.vendor_euroexpress, contact_id: IDS.contact_euroexpress, name: 'Euro Express Cargo',            email: 'cargo@euroexpress.eu',          default_mode: 'email', is_active: true, created_at: daysAgo(19) },
  ])

  // ── Shipment cases ────────────────────────────────────────────────────────────
  await upsert('shipment_cases', [
    {
      id: IDS.case_354830, ref_number: '354830', mailbox_id: IDS.mailbox,
      vendor_id: IDS.vendor_skybridge,
      status: 'vendor_requested', priority: 'urgent',
      tags: ['express', 'fragile'],
      client_email: 'trade@globaltech-trading.com', client_name: 'Marcus Hendriks',
      item_desc: 'Industrial sensors (fragile)', weight_kg: 340, dimensions: '120x80x60cm',
      origin: 'Shanghai', destination: 'Hamburg',
      urgency: 'Client requires delivery by end of month',
      rate_currency: 'EUR',
      created_at: daysAgo(3), updated_at: hoursAgo(2),
    },
    {
      id: IDS.case_354831, ref_number: '354831', mailbox_id: IDS.mailbox,
      vendor_id: IDS.vendor_atlas,
      status: 'quote_received', priority: 'high',
      tags: ['oversized'],
      client_email: 'logistics@meridian-imports.de', client_name: 'Sabine Koch',
      item_desc: 'Automotive components', weight_kg: 1200, dimensions: '240x120x100cm',
      origin: 'Frankfurt', destination: 'New York',
      urgency: 'High — production line waiting',
      rate_amount: 4850, rate_currency: 'USD', transit_days: 12,
      created_at: daysAgo(5), updated_at: hoursAgo(6),
    },
    {
      id: IDS.case_354832, ref_number: '354832', mailbox_id: IDS.mailbox,
      vendor_id: IDS.vendor_euroexpress,
      status: 'quote_sent', priority: 'normal',
      tags: [],
      client_email: 'ops@pacific-cargo.com', client_name: 'James Lim',
      item_desc: 'Electronics — consumer goods', weight_kg: 220, dimensions: '90x60x50cm',
      origin: 'Singapore', destination: 'Rotterdam',
      rate_amount: 2100, rate_currency: 'EUR', transit_days: 18,
      created_at: daysAgo(7), updated_at: hoursAgo(18),
    },
    {
      id: IDS.case_354833, ref_number: '354833', mailbox_id: IDS.mailbox,
      vendor_id: IDS.vendor_skybridge,
      status: 'client_confirmed', priority: 'high',
      tags: ['confirmed'],
      client_email: 'trade@globaltech-trading.com', client_name: 'Marcus Hendriks',
      item_desc: 'Lab equipment', weight_kg: 580, dimensions: '150x90x70cm',
      origin: 'Dubai', destination: 'London',
      rate_amount: 3200, rate_currency: 'GBP', transit_days: 8,
      flight_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      created_at: daysAgo(10), updated_at: hoursAgo(30),
    },
    {
      id: IDS.case_354834, ref_number: '354834', mailbox_id: IDS.mailbox,
      vendor_id: IDS.vendor_atlas,
      status: 'in_transit', priority: 'normal',
      tags: ['in-transit'],
      client_email: 'logistics@meridian-imports.de', client_name: 'Sabine Koch',
      item_desc: 'Textiles — bulk order', weight_kg: 2400, dimensions: '300x150x120cm',
      origin: 'Hong Kong', destination: 'Los Angeles',
      rate_amount: 6500, rate_currency: 'USD', transit_days: 21,
      created_at: daysAgo(18), updated_at: hoursAgo(48),
    },
    {
      id: IDS.case_354835, ref_number: '354835', mailbox_id: IDS.mailbox,
      vendor_id: null,
      status: 'new', priority: 'low',
      tags: [],
      client_email: 'ops@pacific-cargo.com', client_name: 'James Lim',
      item_desc: 'Office furniture', weight_kg: 800,
      origin: 'Berlin', destination: 'Tokyo',
      rate_currency: 'EUR',
      created_at: daysAgo(1), updated_at: hoursAgo(1),
    },
    {
      id: IDS.case_354836, ref_number: '354836', mailbox_id: IDS.mailbox,
      vendor_id: IDS.vendor_euroexpress,
      status: 'delivered', priority: 'normal',
      tags: ['delivered'],
      client_email: 'trade@globaltech-trading.com', client_name: 'Marcus Hendriks',
      item_desc: 'Medical supplies', weight_kg: 150, dimensions: '60x40x30cm',
      origin: 'Amsterdam', destination: 'Chicago',
      rate_amount: 1800, rate_currency: 'USD', transit_days: 10,
      created_at: daysAgo(25), updated_at: daysAgo(2),
    },
  ])

  // ── Case channels ──────────────────────────────────────────────────────────────
  await upsert('case_channels', [
    { id: IDS.channel_354830_client, case_id: IDS.case_354830, channel_type: 'client', party_email: 'trade@globaltech-trading.com',     nylas_thread_id: null, cc_emails: [], message_count: 3, created_at: daysAgo(3) },
    { id: IDS.channel_354830_vendor, case_id: IDS.case_354830, channel_type: 'vendor', party_email: 'bookings@skybridgefreight.com',     nylas_thread_id: null, cc_emails: [], message_count: 2, created_at: daysAgo(3) },
    { id: IDS.channel_354831_client, case_id: IDS.case_354831, channel_type: 'client', party_email: 'logistics@meridian-imports.de',     nylas_thread_id: null, cc_emails: [], message_count: 4, created_at: daysAgo(5) },
    { id: IDS.channel_354831_vendor, case_id: IDS.case_354831, channel_type: 'vendor', party_email: 'quotes@atlaslogistics.net',          nylas_thread_id: null, cc_emails: [], message_count: 3, created_at: daysAgo(5) },
    { id: IDS.channel_354832_client, case_id: IDS.case_354832, channel_type: 'client', party_email: 'ops@pacific-cargo.com',              nylas_thread_id: null, cc_emails: [], message_count: 2, created_at: daysAgo(7) },
    { id: IDS.channel_354833_client, case_id: IDS.case_354833, channel_type: 'client', party_email: 'trade@globaltech-trading.com',       nylas_thread_id: null, cc_emails: [], message_count: 3, created_at: daysAgo(10) },
    { id: IDS.channel_354834_client, case_id: IDS.case_354834, channel_type: 'client', party_email: 'logistics@meridian-imports.de',      nylas_thread_id: null, cc_emails: [], message_count: 5, created_at: daysAgo(18) },
    { id: IDS.channel_354834_vendor, case_id: IDS.case_354834, channel_type: 'vendor', party_email: 'quotes@atlaslogistics.net',           nylas_thread_id: null, cc_emails: [], message_count: 4, created_at: daysAgo(18) },
  ], 'id')

  // ── Email messages ──────────────────────────────────────────────────────────────

  const emails = [
    // Case 354830 — Client thread
    {
      id: 'ffffffff-0001-0001-0001-000000000001', case_id: IDS.case_354830, channel_id: IDS.channel_354830_client,
      mailbox_id: IDS.mailbox, direction: 'inbound', folder: 'inbox',
      sender_email: 'trade@globaltech-trading.com', sender_persona: 'client',
      recipient_email: 'freightmate58@gmail.com',
      subject: 'URGENT — Freight quote request for Shipment 354830',
      body_text: `Dear FreightMate,\n\nI hope this message finds you well. We urgently require air freight for the following shipment:\n\n• Origin: Shanghai, China\n• Destination: Hamburg, Germany\n• Weight: 340 kg\n• Dimensions: 120×80×60 cm\n• Contents: Industrial sensors (fragile handling required)\n\nDeadline: we need delivery confirmed before end of month. Our production line is dependent on this equipment arriving on time.\n\nPlease advise on the earliest available flight and your best rate.\n\nBest regards,\nMarcus Hendriks\nGlobalTech Trading LLC`,
      body_preview: 'We urgently require air freight for the following shipment: Shanghai → Hamburg, 340kg sensors.',
      is_read: true, is_starred: false, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354830_c1_${Date.now()}`,
      created_at: daysAgo(3),
    },
    {
      id: 'ffffffff-0001-0001-0001-000000000002', case_id: IDS.case_354830, channel_id: IDS.channel_354830_client,
      mailbox_id: IDS.mailbox, direction: 'outbound', folder: 'sent',
      sender_email: 'freightmate58@gmail.com', sender_persona: 'coordinator',
      recipient_email: 'trade@globaltech-trading.com',
      subject: 'Re: URGENT — Freight quote request for Shipment 354830',
      body_text: `Dear Marcus,\n\nThank you for reaching out. We have received your request and are actively sourcing the best available rate with our carrier partners.\n\nWe will revert with a full quote within 24 hours. In the meantime, could you confirm whether the sensors require any special documentation (e.g., MSDS, lithium battery declaration)?\n\nBest regards,\nFreightMate Operations`,
      body_preview: 'Thank you for reaching out. We are actively sourcing the best rate and will revert within 24 hours.',
      is_read: true, is_starred: false, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354830_c2_${Date.now()}`,
      created_at: hoursAgo(48),
    },
    {
      id: 'ffffffff-0001-0001-0001-000000000003', case_id: IDS.case_354830, channel_id: IDS.channel_354830_client,
      mailbox_id: IDS.mailbox, direction: 'inbound', folder: 'inbox',
      sender_email: 'trade@globaltech-trading.com', sender_persona: 'client',
      recipient_email: 'freightmate58@gmail.com',
      subject: 'Re: URGENT — Freight quote request for Shipment 354830',
      body_text: `Hi,\n\nNo special documentation needed — these are standard industrial sensors with no hazardous material classification.\n\nPlease do expedite. We are really pressed on time here.\n\nThanks,\nMarcus`,
      body_preview: 'No special documentation needed. Please do expedite — we are really pressed on time.',
      is_read: true, is_starred: true, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354830_c3_${Date.now()}`,
      created_at: hoursAgo(36),
    },
    // Case 354830 — Vendor thread
    {
      id: 'ffffffff-0001-0002-0001-000000000001', case_id: IDS.case_354830, channel_id: IDS.channel_354830_vendor,
      mailbox_id: IDS.mailbox, direction: 'outbound', folder: 'sent',
      sender_email: 'freightmate58@gmail.com', sender_persona: 'coordinator',
      recipient_email: 'bookings@skybridgefreight.com',
      subject: 'Rate Request — SHA→HAM, 340kg, Ref 354830',
      body_text: `Hi Anna,\n\nWe need a rate for the following urgent shipment:\n\n• Route: Shanghai (SHA) → Hamburg (HAM)\n• Weight: 340 kg\n• Dimensions: 120×80×60 cm\n• Commodity: Industrial sensors\n• Requested delivery: within 10 days\n\nPlease provide your best rate and available departure dates.\n\nMany thanks,\nFreightMate Operations`,
      body_preview: 'We need a rate for an urgent shipment: SHA → HAM, 340kg industrial sensors, delivery within 10 days.',
      is_read: true, is_starred: false, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354830_v1_${Date.now()}`,
      created_at: hoursAgo(60),
    },
    {
      id: 'ffffffff-0001-0002-0001-000000000002', case_id: IDS.case_354830, channel_id: IDS.channel_354830_vendor,
      mailbox_id: IDS.mailbox, direction: 'inbound', folder: 'inbox',
      sender_email: 'bookings@skybridgefreight.com', sender_persona: 'vendor',
      recipient_email: 'freightmate58@gmail.com',
      subject: 'Re: Rate Request — SHA→HAM, 340kg, Ref 354830',
      body_text: `Hello,\n\nThank you for the enquiry. We can offer the following:\n\n• Route: SHA → FRA → HAM\n• Rate: EUR 2,850 all-in\n• Transit time: 7–9 days\n• Next departure: Thursday 03 Apr\n• Flight: CA937 + LH cargo interline\n\nPlease confirm at your earliest convenience as space on Thursday's flight is limited.\n\nBest regards,\nAnna Petrova\nSkyBridge Freight Co.`,
      body_preview: 'We can offer EUR 2,850 all-in, 7–9 days transit, next departure Thursday 03 Apr.',
      is_read: false, is_starred: false, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354830_v2_${Date.now()}`,
      created_at: hoursAgo(2),
    },
    // Case 354831 — Client thread
    {
      id: 'ffffffff-0002-0001-0001-000000000001', case_id: IDS.case_354831, channel_id: IDS.channel_354831_client,
      mailbox_id: IDS.mailbox, direction: 'inbound', folder: 'inbox',
      sender_email: 'logistics@meridian-imports.de', sender_persona: 'client',
      recipient_email: 'freightmate58@gmail.com',
      subject: 'Freight enquiry — automotive components, FRA→JFK, Ref 354831',
      body_text: `Good morning,\n\nWe need to ship a large batch of automotive components from Frankfurt to New York. Details below:\n\n• Weight: 1,200 kg\n• Dimensions: 240×120×100 cm (oversized)\n• Commodity: Automotive components — no hazmat\n• Required arrival: within 15 days\n\nPlease advise on options — we are open to sea/air depending on rate and transit.\n\nKind regards,\nSabine Koch\nMeridian Imports GmbH`,
      body_preview: 'We need to ship 1,200kg of automotive components from Frankfurt to New York within 15 days.',
      is_read: true, is_starred: false, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354831_c1_${Date.now()}`,
      created_at: daysAgo(5),
    },
    {
      id: 'ffffffff-0002-0001-0001-000000000002', case_id: IDS.case_354831, channel_id: IDS.channel_354831_client,
      mailbox_id: IDS.mailbox, direction: 'outbound', folder: 'sent',
      sender_email: 'freightmate58@gmail.com',
      recipient_email: 'logistics@meridian-imports.de',
      subject: 'Re: Freight enquiry — automotive components, FRA→JFK, Ref 354831',
      body_text: `Dear Sabine,\n\nThank you for the enquiry. We are obtaining quotes from our carrier network. Given the dimensions, we will explore both air charter options and sea LCL to find the most cost-effective solution within your timeline.\n\nExpect our quote by tomorrow EOD.\n\nBest,\nFreightMate Operations`,
      body_preview: 'Thank you. We are obtaining quotes and will revert with options by tomorrow EOD.',
      is_read: true, is_starred: false, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354831_c2_${Date.now()}`,
      created_at: daysAgo(4),
    },
    // Case 354834 — Client thread (in transit updates)
    {
      id: 'ffffffff-0005-0001-0001-000000000001', case_id: IDS.case_354834, channel_id: IDS.channel_354834_client,
      mailbox_id: IDS.mailbox, direction: 'inbound', folder: 'inbox',
      sender_email: 'logistics@meridian-imports.de', sender_persona: 'client',
      recipient_email: 'freightmate58@gmail.com',
      subject: 'Re: Shipment 354834 — transit update request',
      body_text: `Hi,\n\nCould you please provide an update on the current location of our shipment? We have not received any tracking information in the past 3 days and our warehouse is asking.\n\nThank you,\nSabine`,
      body_preview: 'Could you please provide an update on the current location of our shipment?',
      is_read: true, is_starred: false, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354834_c1_${Date.now()}`,
      created_at: daysAgo(2),
    },
    {
      id: 'ffffffff-0005-0001-0001-000000000002', case_id: IDS.case_354834, channel_id: IDS.channel_354834_client,
      mailbox_id: IDS.mailbox, direction: 'outbound', folder: 'sent',
      sender_email: 'freightmate58@gmail.com',
      recipient_email: 'logistics@meridian-imports.de',
      subject: 'Re: Shipment 354834 — transit update',
      body_text: `Dear Sabine,\n\nApologies for the delay in communication. Your shipment is currently in Los Angeles port, cleared customs yesterday, and is expected to reach the final delivery point within 2–3 business days.\n\nTracking reference: ATLAS-HKG-LAX-2025-0334\n\nWe will notify you once out for delivery.\n\nBest regards,\nFreightMate Operations`,
      body_preview: 'Your shipment is in Los Angeles, cleared customs, expected delivery within 2–3 business days.',
      is_read: true, is_starred: false, has_attachments: false, is_processed: true,
      nylas_message_id: `seed_msg_354834_c2_${Date.now()}`,
      created_at: daysAgo(1),
    },
  ]

  await upsert('email_messages', emails)

  // ── Message drafts (AI drafts awaiting approval) ──────────────────────────────
  await upsert('message_drafts', [
    {
      id: 'gggggggg-0001-0001-0001-000000000001',
      draft_task_id: null, case_id: IDS.case_354830, channel_type: 'client',
      recipient_email: 'trade@globaltech-trading.com',
      subject: 'Re: URGENT — Freight quote request for Shipment 354830',
      body_text: `Dear Marcus,\n\nThank you for the additional confirmation. We now have a quote from our partner SkyBridge Freight Co.:\n\n• Route: SHA → FRA → HAM\n• Rate: EUR 2,850 all-in\n• Transit time: 7–9 business days\n• Next available departure: Thursday, 3 April\n\nGiven your timeline, I would recommend confirming this booking today to secure space on Thursday's flight, as capacity is limited.\n\nPlease reply with your approval and we will immediately issue the booking confirmation.\n\nBest regards,\nFreightMate Operations`,
      version: 1, model_used: 'gpt-4o-mini',
      prompt_tokens: 420, completion_tokens: 180, latency_ms: 2100,
      created_at: hoursAgo(1), updated_at: hoursAgo(1),
    },
  ])

  // ── Thread summaries ───────────────────────────────────────────────────────────
  await upsert('thread_summaries', [
    {
      id: 'hhhhhhhh-0001-0000-0000-000000000001',
      case_id: IDS.case_354830, channel_type: 'client',
      summary_text: 'Client Marcus Hendriks (GlobalTech Trading) requests urgent air freight for 340kg of industrial sensors from Shanghai to Hamburg. No hazmat documentation required. Client is under time pressure due to production dependency. We have confirmed we are sourcing quotes and will revert. A competitive quote of EUR 2,850 (7-9 days) has been obtained from SkyBridge. Awaiting client approval to book.',
      tone: 'urgent',
      open_questions: [
        'Client has not yet approved the EUR 2,850 quote from SkyBridge',
        'Thursday departure space is limited — urgency to confirm today',
      ],
      promises_made: [
        'We will revert with a full quote within 24 hours (fulfilled)',
        'We will notify once booking is confirmed',
      ],
      unresolved_issues: [],
      communication_risks: [
        'Flight space on Thursday is limited — delay in client approval may lose the booking',
        'Client expressed urgency multiple times — response time must remain short',
      ],
      message_count: 3, model_used: 'gpt-4o-mini',
      input_tokens: 640, output_tokens: 220,
      updated_at: hoursAgo(1),
    },
    {
      id: 'hhhhhhhh-0005-0000-0000-000000000001',
      case_id: IDS.case_354834, channel_type: 'client',
      summary_text: 'Shipment of 2,400kg textiles from Hong Kong to Los Angeles is in transit. Client Sabine Koch requested a status update after 3 days without tracking information. We confirmed the shipment cleared US customs in LA and is expected for final delivery within 2-3 business days. Tracking reference ATLAS-HKG-LAX-2025-0334 was provided.',
      tone: 'neutral',
      open_questions: [
        'Final delivery confirmation has not yet been received from Atlas Logistics',
      ],
      promises_made: [
        'We will notify client once shipment is out for delivery',
      ],
      unresolved_issues: [],
      communication_risks: [],
      message_count: 2, model_used: 'gpt-4o-mini',
      input_tokens: 380, output_tokens: 140,
      updated_at: daysAgo(1),
    },
  ], 'case_id,channel_type')

  console.log('\n✅ Seed complete. Open the app to see live data.\n')
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
