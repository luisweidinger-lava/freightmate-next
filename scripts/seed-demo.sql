-- ============================================================
-- FreightMate — Demo seed v2
-- Run in Supabase SQL editor (service role) or via psql.
-- Creates 4 realistic freight cases for client demo.
-- All cases tagged '__demo' for safe teardown.
--
-- TEARDOWN: run scripts/unseed-demo.sql
-- ============================================================

BEGIN;

-- ============================================================
-- CLEANUP: wipe all application data, preserve auth/org setup
-- (auth.users · profiles · organisations · mailboxes · app_users)
-- ============================================================
DELETE FROM case_access_grants;
DELETE FROM thread_summaries;
DELETE FROM message_drafts;
DELETE FROM draft_tasks;
DELETE FROM shipment_events;
DELETE FROM case_contacts;
DELETE FROM email_messages;
DELETE FROM case_channels;
DELETE FROM shipment_cases;
DELETE FROM manager_team_members;
DELETE FROM clients;
DELETE FROM vendors;
DELETE FROM contacts;
DELETE FROM onboarding_events;
DELETE FROM onboarding_jobs;

DO $$
DECLARE
  -- ── Runtime IDs (resolved from existing data) ──────────────
  v_op_id   uuid;
  v_op2_id  uuid;  -- second operator (e.g. freightmate61), may be NULL
  v_mgr_id  uuid;
  v_mbx_id  uuid;
  v_org_id  uuid;

  -- ── Contact IDs ─────────────────────────────────────────────
  v_con_miriam   uuid := gen_random_uuid();
  v_con_phyllis  uuid := gen_random_uuid();
  v_con_thomas   uuid := gen_random_uuid();
  v_con_grace    uuid := gen_random_uuid();
  v_con_daniel   uuid := gen_random_uuid();
  v_con_hassan   uuid := gen_random_uuid();
  v_con_james    uuid := gen_random_uuid();
  v_con_rania    uuid := gen_random_uuid();

  -- ── Client / Vendor record IDs ──────────────────────────────
  v_client_gha       uuid := gen_random_uuid();
  v_client_hartmann  uuid := gen_random_uuid();
  v_vendor_tgl       uuid := gen_random_uuid();
  v_vendor_nistar    uuid := gen_random_uuid();
  v_vendor_afrikargo uuid := gen_random_uuid();

  -- ── Case IDs ────────────────────────────────────────────────
  v_case_490428 uuid := gen_random_uuid();
  v_case_782351 uuid := gen_random_uuid();
  v_case_661209 uuid := gen_random_uuid();
  v_case_554107 uuid := gen_random_uuid();

  -- ── Channel IDs ─────────────────────────────────────────────
  v_ch_490428_cli uuid := gen_random_uuid();
  v_ch_490428_ven uuid := gen_random_uuid();
  v_ch_782351_cli uuid := gen_random_uuid();
  v_ch_782351_ven uuid := gen_random_uuid();
  v_ch_661209_cli uuid := gen_random_uuid();
  v_ch_661209_ven uuid := gen_random_uuid();
  v_ch_554107_cli uuid := gen_random_uuid();
  v_ch_554107_ven uuid := gen_random_uuid();

  -- ── Draft / Task IDs ────────────────────────────────────────
  v_draft_task_1 uuid := gen_random_uuid();
  v_draft_1      uuid := gen_random_uuid();

  -- ── Thread summary IDs ──────────────────────────────────────
  v_ts_490428_cli uuid := gen_random_uuid();
  v_ts_490428_ven uuid := gen_random_uuid();

  -- ── Manager case IDs (5 cases owned by manager) ─────────────
  v_m1 uuid := gen_random_uuid();
  v_m2 uuid := gen_random_uuid();
  v_m3 uuid := gen_random_uuid();
  v_m4 uuid := gen_random_uuid();
  v_m5 uuid := gen_random_uuid();
  -- Channel IDs (cli=client, ven=vendor, qt=quoting team)
  v_m1_cli uuid := gen_random_uuid(); v_m1_ven uuid := gen_random_uuid(); v_m1_qt uuid := gen_random_uuid();
  v_m2_cli uuid := gen_random_uuid(); v_m2_ven uuid := gen_random_uuid(); v_m2_qt uuid := gen_random_uuid();
  v_m3_cli uuid := gen_random_uuid(); v_m3_ven uuid := gen_random_uuid(); v_m3_qt uuid := gen_random_uuid();
  v_m4_cli uuid := gen_random_uuid(); v_m4_ven uuid := gen_random_uuid(); v_m4_qt uuid := gen_random_uuid();
  v_m5_cli uuid := gen_random_uuid(); v_m5_ven uuid := gen_random_uuid(); v_m5_qt uuid := gen_random_uuid();

BEGIN
  -- ── Resolve environment IDs ──────────────────────────────────
  SELECT id INTO v_op_id  FROM profiles WHERE role = 'operator' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_op2_id FROM profiles WHERE role = 'operator' AND id <> v_op_id ORDER BY created_at LIMIT 1;
  SELECT id INTO v_mgr_id FROM profiles WHERE role = 'manager'  ORDER BY created_at LIMIT 1;
  SELECT id INTO v_mbx_id FROM mailboxes                         ORDER BY created_at LIMIT 1;
  SELECT id INTO v_org_id FROM organisations                     ORDER BY created_at LIMIT 1;

  IF v_op_id IS NULL THEN
    RAISE EXCEPTION 'No operator profile found. Create the operator user first.';
  END IF;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation found. Onboarding must be completed first.';
  END IF;

  RAISE NOTICE 'Seeding demo data for operator: %', v_op_id;
  RAISE NOTICE 'Second operator (may be null): %', v_op2_id;

  -- ══════════════════════════════════════════════════════════════
  -- CONTACTS (CRM)
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO contacts
    (id, email, display_name, persona, company_name, company_domain,
     is_validated, needs_review, notes,
     visibility_scope, owner_user_id, org_id)
  VALUES
    (v_con_miriam,
     'miriam.okonkwo@gha-international.org',
     'Miriam Okonkwo', 'client',
     'Global Humanitarian Alliance', 'gha-international.org',
     true, false,
     'Logistics coordinator — South Sudan & Sudan operations. Primary contact for GHA shipments.',
     'org', v_op_id, v_org_id),

    (v_con_phyllis,
     'phyllis.njenga@gha-international.org',
     'Phyllis Njenga', 'client',
     'Global Humanitarian Alliance', 'gha-international.org',
     true, false,
     'Area Support Manager, Gedaref, Sudan. Approves logistics requests for Sudan region.',
     'org', v_op_id, v_org_id),

    (v_con_rania,
     'rania.guleid@gha-international.org',
     'Rania Guleid', 'coordinator',
     'Global Humanitarian Alliance', 'gha-international.org',
     true, false,
     'Head of Support, GHA Sudan Country Office. Escalation contact for customs issues.',
     'org', v_op_id, v_org_id),

    (v_con_thomas,
     'thomas.mueller@hartmann-logistics.de',
     'Thomas Müller', 'client',
     'Hartmann Logistics GmbH', 'hartmann-logistics.de',
     true, false,
     'Key account client. Automotive and industrial freight, primarily FRA hub. Responds quickly.',
     'org', v_op_id, v_org_id),

    (v_con_grace,
     'grace.wachira@transglobelogistics.com',
     'Grace Wachira', 'vendor',
     'TransGlobe Logistics', 'transglobelogistics.com',
     true, false,
     'Logistics Operations Coordinator – Africa. Main point of contact for all Africa-region moves.',
     'org', v_op_id, v_org_id),

    (v_con_daniel,
     'daniel.osei@transglobelogistics.com',
     'Daniel Osei', 'vendor',
     'TransGlobe Logistics', 'transglobelogistics.com',
     true, false,
     'Sudan desk at TransGlobe. Handles on-the-ground coordination in Khartoum and Malakal.',
     'org', v_op_id, v_org_id),

    (v_con_hassan,
     'hfarouk@nilestarlogistics.com',
     'Hassan Al Farouk', 'vendor',
     'NileStar Logistics', 'nilestarlogistics.com',
     true, false,
     'Sudan Partner at NileStar. Handles cross-border and air cargo from Port Sudan.',
     'org', v_op_id, v_org_id),

    (v_con_james,
     'james.kimani@afrikargo.com',
     'James Kimani', 'vendor',
     'AfriKargo Express', 'afrikargo.com',
     true, false,
     'East & West Africa freight desk. Competitive rates on HAM-DXB and European corridors.',
     'org', v_op_id, v_org_id);

  -- ══════════════════════════════════════════════════════════════
  -- CLIENTS
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO clients
    (id, contact_id, email, display_name, company_name, notes, is_active)
  VALUES
    (v_client_gha,
     v_con_miriam,
     'miriam.okonkwo@gha-international.org',
     'Miriam Okonkwo',
     'Global Humanitarian Alliance',
     'NGO client. Multiple active cases in Sudan/South Sudan corridor. Requires HAC customs coordination.',
     true),

    (v_client_hartmann,
     v_con_thomas,
     'thomas.mueller@hartmann-logistics.de',
     'Thomas Müller',
     'Hartmann Logistics GmbH',
     'German forwarding agent. Automotive, industrial, and pharma cargo. Premium SLA client.',
     true);

  -- ══════════════════════════════════════════════════════════════
  -- VENDORS
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO vendors
    (id, contact_id, name, email, default_mode, is_active)
  VALUES
    (v_vendor_tgl,
     v_con_grace,
     'TransGlobe Logistics',
     'grace.wachira@transglobelogistics.com',
     'email',
     true),

    (v_vendor_nistar,
     v_con_hassan,
     'NileStar Air Cargo',
     'hfarouk@nilestarlogistics.com',
     'email',
     true),

    (v_vendor_afrikargo,
     v_con_james,
     'AfriKargo Express',
     'james.kimani@afrikargo.com',
     'email',
     true);

  -- ══════════════════════════════════════════════════════════════
  -- SHIPMENT CASES
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO shipment_cases
    (id, case_code, ref_number, mailbox_id, vendor_id, status, priority, tags,
     client_email, client_name, item_desc,
     weight_kg, origin, destination,
     rate_amount, rate_currency,
     operator_id, created_at, updated_at)
  VALUES
    -- 490428 — GHA relocation, Sudan (vendor_requested, high priority)
    (v_case_490428,
     'DEMO-001', '490428',
     v_mbx_id, v_vendor_tgl,
     'vendor_requested', 'high', ARRAY['__demo'],
     'miriam.okonkwo@gha-international.org',
     'Global Humanitarian Alliance',
     'Office furniture and ICT equipment (28 boxes financial documents, servers, monitors)',
     640,
     'Malakal, South Sudan',
     'Al Jazirah, Sudan',
     NULL, 'USD',
     v_op_id,
     NOW() - INTERVAL '11 days',
     NOW() - INTERVAL '1 day'),

    -- 782351 — Hartmann FRA→ORD automotive parts (in_transit, normal)
    (v_case_782351,
     'DEMO-002', '782351',
     v_mbx_id, v_vendor_nistar,
     'in_transit', 'normal', ARRAY['__demo'],
     'thomas.mueller@hartmann-logistics.de',
     'Hartmann Logistics GmbH',
     'Automotive press-fit components — 18 cartons on 2 pallets',
     1240,
     'Frankfurt am Main (FRA)',
     'Chicago O''Hare (ORD)',
     4800.00, 'EUR',
     v_op_id,
     NOW() - INTERVAL '6 days',
     NOW() - INTERVAL '12 hours'),

    -- 661209 — GHA HAM→DXB project equipment (quote_sent, normal)
    (v_case_661209,
     'DEMO-003', '661209',
     v_mbx_id, v_vendor_afrikargo,
     'quote_sent', 'normal', ARRAY['__demo'],
     'phyllis.njenga@gha-international.org',
     'Global Humanitarian Alliance',
     'Field survey equipment — 3 pallets (total 420 kg, 2.1 cbm)',
     420,
     'Hamburg (HAM)',
     'Dubai (DXB)',
     NULL, 'USD',
     v_op_id,
     NOW() - INTERVAL '4 days',
     NOW() - INTERVAL '2 days'),

    -- 554107 — Hartmann NBO→LHR pharma (client_confirmed, urgent)
    (v_case_554107,
     'DEMO-004', '554107',
     v_mbx_id, v_vendor_tgl,
     'client_confirmed', 'urgent', ARRAY['__demo'],
     'thomas.mueller@hartmann-logistics.de',
     'Hartmann Logistics GmbH',
     'Pharmaceutical samples — temperature controlled 2–8 °C, 180 kg',
     180,
     'Nairobi (NBO)',
     'London Heathrow (LHR)',
     3200.00, 'GBP',
     v_op_id,
     NOW() - INTERVAL '3 days',
     NOW() - INTERVAL '6 hours');

  -- ══════════════════════════════════════════════════════════════
  -- CASE CHANNELS (client + vendor per case)
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO case_channels
    (id, case_id, channel_type, party_email, label, position,
     nylas_thread_id, cc_emails, last_message_at, message_count)
  VALUES
    -- 490428
    (v_ch_490428_cli, v_case_490428, 'client',
     'miriam.okonkwo@gha-international.org', 'GHA — Miriam Okonkwo', 1,
     NULL, ARRAY['phyllis.njenga@gha-international.org', 'rania.guleid@gha-international.org'],
     NOW() - INTERVAL '1 day', 4),

    (v_ch_490428_ven, v_case_490428, 'vendor',
     'grace.wachira@transglobelogistics.com', 'TransGlobe — Grace Wachira', 2,
     NULL, ARRAY['daniel.osei@transglobelogistics.com'],
     NOW() - INTERVAL '1 day', 5),

    -- 782351
    (v_ch_782351_cli, v_case_782351, 'client',
     'thomas.mueller@hartmann-logistics.de', 'Hartmann — Thomas Müller', 1,
     NULL, ARRAY[]::text[],
     NOW() - INTERVAL '12 hours', 5),

    (v_ch_782351_ven, v_case_782351, 'vendor',
     'hfarouk@nilestarlogistics.com', 'NileStar — Hassan Al Farouk', 2,
     NULL, ARRAY[]::text[],
     NOW() - INTERVAL '12 hours', 4),

    -- 661209
    (v_ch_661209_cli, v_case_661209, 'client',
     'phyllis.njenga@gha-international.org', 'GHA — Phyllis Njenga', 1,
     NULL, ARRAY['rania.guleid@gha-international.org'],
     NOW() - INTERVAL '2 days', 4),

    (v_ch_661209_ven, v_case_661209, 'vendor',
     'james.kimani@afrikargo.com', 'AfriKargo — James Kimani', 2,
     NULL, ARRAY[]::text[],
     NOW() - INTERVAL '2 days', 3),

    -- 554107
    (v_ch_554107_cli, v_case_554107, 'client',
     'thomas.mueller@hartmann-logistics.de', 'Hartmann — Thomas Müller', 1,
     NULL, ARRAY[]::text[],
     NOW() - INTERVAL '6 hours', 4),

    (v_ch_554107_ven, v_case_554107, 'vendor',
     'grace.wachira@transglobelogistics.com', 'TransGlobe — Grace Wachira', 2,
     NULL, ARRAY[]::text[],
     NOW() - INTERVAL '6 hours', 3);

  -- ══════════════════════════════════════════════════════════════
  -- EMAIL MESSAGES — Case 490428 — Malakal → Al Jazirah
  -- ══════════════════════════════════════════════════════════════

  -- [1] Client inbound: initial request
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_cli, v_mbx_id,
    'inbound', 'miriam.okonkwo@gha-international.org', 'client',
    'freightmate58@gmail.com',
    ARRAY['phyllis.njenga@gha-international.org'],
    'GHA Malakal to Al Jazirah Job//490428',
    E'Dear Team,\n\nPlease arrange the movement of GHA office furniture and ICT equipment from our Malakal office to Al Jazirah. A full packing list is attached for reference (28 boxes in total — financial documents, two servers, and monitors).\n\nTotal estimated weight is approximately 640 kg. Our field representative, Ibrahim Osman, will be present on-site at the Malakal end to supervise loading and sign off on the inventory check.\n\nPlease confirm receipt of this request and let us know the expected timeline and any documentation requirements.\n\nBest regards,\nMiriam Okonkwo\nLogistics Coordinator, GHA South Sudan',
    'Dear Team, please arrange movement of GHA office furniture and ICT equipment from our Malakal office to Al Jazirah. PL attached. Our rep Ibrahim Osman will be on-site to supervise loading.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0001', true, true,
    NOW() - INTERVAL '11 days'
  );

  -- [2] Outbound to vendor: quote request
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_ven, v_mbx_id,
    'outbound', 'freightmate58@gmail.com', 'internal',
    'grace.wachira@transglobelogistics.com',
    ARRAY['daniel.osei@transglobelogistics.com'],
    'RE: GHA Malakal to Al Jazirah Job//490428 — Rate Request',
    E'Dear Grace,\n\nI hope this message finds you well. We have received a shipment request from our client, the Global Humanitarian Alliance, and would like to request a quotation from TransGlobe for the following:\n\n- Cargo: Office furniture and ICT equipment (servers, monitors, document boxes)\n- Total weight: approximately 640 kg\n- Origin: Malakal, South Sudan\n- Destination: Al Jazirah, Sudan\n- Border crossing: Renk/Kosti\n- Special notes: Client requires the shipment to cross the border at Renk/Kosti. A GHA supervisor will be present for loading at origin.\n\nCould you please provide your best rate for road transport along this route, along with an estimated transit time and any customs/HAC documentation requirements?\n\nWe would appreciate a response by end of day tomorrow.\n\nKind regards',
    'Dear Grace, please provide a quotation for road transport of approx. 640 kg office furniture and ICT equipment from Malakal (South Sudan) to Al Jazirah (Sudan). Client requires border crossing via Renk/Kosti.',
    'email', 'all', 'sent', false, true,
    'demo-msg-0002', false, true,
    NOW() - INTERVAL '11 days' + INTERVAL '2 hours'
  );

  -- [3] Vendor inbound: loading confirmed
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_ven, v_mbx_id,
    'inbound', 'grace.wachira@transglobelogistics.com', 'vendor',
    'freightmate58@gmail.com',
    ARRAY[]::text[],
    'RE: GHA Malakal — Truck Loaded',
    E'Hi,\n\nPlease note that our truck has been loaded and departed Malakal yesterday morning. The driver is travelling through a remote corridor with no mobile network coverage — we expect communications to be unavailable until he reaches the Renk/Kosti border crossing area.\n\nWe anticipate arrival at the border later today, subject to road conditions. Daniel from our Sudan desk is monitoring and will update you as soon as we have a status update from the driver.\n\nBest,\nGrace Wachira\nTransGlobe Logistics',
    'Hi, note that truck loaded and left Malakal yesterday morning. Traveling across a dead zone — no network coverage until border crossing. We expect arrival at Renk/Kosti border later today.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0003', false, true,
    NOW() - INTERVAL '9 days'
  );

  -- [4] Vendor inbound: HAC issue
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_ven, v_mbx_id,
    'inbound', 'grace.wachira@transglobelogistics.com', 'vendor',
    'freightmate58@gmail.com',
    ARRAY['daniel.osei@transglobelogistics.com'],
    'RE: GHA Malakal — HAC Clearance Issue',
    E'Dear Team,\n\nWe have encountered a significant problem at the border. The Humanitarian Aid Commission (HAC) at Kosti has informed our driver that they cannot process this clearance, as the movement of goods from South Sudan into Sudan is classified as an international import — which falls outside HAC''s mandate.\n\nGHA will be required to follow the standard Ministry of Finance (MoF) and Sudan Customs import procedure to clear the cargo. This includes formal import documentation, a customs declaration, and approval from MoF before release.\n\nThe truck has been waiting at the border since Monday. If we do not receive instructions shortly, further delays will begin to accrue detention charges. Please advise on next steps urgently.\n\nDaniel is on-site and can assist with any paperwork once GHA provides the required authority letters.\n\nRegards,\nGrace Wachira\nTransGlobe Logistics',
    'HAC informed this issue is beyond their mandate as this is an import from another country. GHA has to follow the normal import procedure through MoF and Sudan Customs. Truck has been waiting since Monday — further delay will incur detention charges.',
    'email', 'all', 'inbox', true, true,
    'demo-msg-0004', false, true,
    NOW() - INTERVAL '6 days'
  );

  -- [5] Client inbound: GHA reply on HAC
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_cli, v_mbx_id,
    'inbound', 'phyllis.njenga@gha-international.org', 'client',
    'freightmate58@gmail.com',
    ARRAY['miriam.okonkwo@gha-international.org'],
    'RE: GHA Malakal — HAC Clearance Issue',
    E'Dear Team,\n\nThank you for the update. We understand the situation at the border.\n\nGiven that the truck is incurring costs by waiting, we believe the most feasible course of action is to move the equipment back to Malakal while we ensure all administrative and customs documentation is completed properly before attempting the crossing again.\n\nIn order for us to prepare the MoF application, could you please provide:\n1. The complete list of documents required by the Ministry of Finance and Sudan Customs\n2. An estimated timeline for processing, once documents are submitted\n3. Any cost implications (duties, fees) that GHA should budget for\n\nWe will escalate internally to get the necessary authority letters prepared as quickly as possible.\n\nBest regards,\nPhyllis Njenga\nArea Support Manager, Gedaref — GHA Sudan',
    'Thank you for the update. With the truck incurring costs, the feasible option is to move the equipment back to Malakal and ensure all admin is completed before moving again. Please provide MoF/Customs requirements, expected timeline, and cost implications.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0005', false, true,
    NOW() - INTERVAL '4 days'
  );

  -- [6] Outbound to client: status update
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_cli, v_mbx_id,
    'outbound', 'freightmate58@gmail.com', 'internal',
    'phyllis.njenga@gha-international.org',
    ARRAY['miriam.okonkwo@gha-international.org'],
    'RE: GHA Malakal — Next Steps',
    E'Dear Phyllis,\n\nThank you for your prompt response. We have been in contact with TransGlobe regarding your questions.\n\nKey points to confirm:\n\n1. Cost implications: TransGlobe has confirmed there are no fees associated with preparing the MoF/HAC application documentation. The only additional costs will be any detention charges already accrued while the truck waited at the border — TransGlobe is compiling the exact figure and will send it shortly.\n\n2. Document requirements: TransGlobe''s Sudan desk (Daniel Osei) will send the full MoF document checklist directly to us today, which we will forward to you immediately upon receipt.\n\n3. Timeline: Once GHA submits the completed application letters to MoF, TransGlobe estimates the process typically takes 5–10 working days. We recommend beginning the application preparation in parallel.\n\nWe strongly recommend proceeding without delay to minimise further detention charges.\n\nKind regards',
    'Dear Phyllis, we have confirmed with TransGlobe that no cost implications exist for the MoF/HAC application. Timeline depends on how quickly GHA prepares the application letters. We recommend proceeding immediately to minimise detention charges.',
    'email', 'all', 'sent', false, true,
    'demo-msg-0006', false, true,
    NOW() - INTERVAL '3 days'
  );

  -- ══════════════════════════════════════════════════════════════
  -- EMAIL MESSAGES — Case 782351 — FRA → ORD (in_transit)
  -- ══════════════════════════════════════════════════════════════

  -- [1] Client inbound: booking request
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_cli, v_mbx_id,
    'inbound', 'thomas.mueller@hartmann-logistics.de', 'client',
    'freightmate58@gmail.com', ARRAY[]::text[],
    'Air Freight Request — Ref 782351 — FRA to ORD',
    E'Hello,\n\nWe require air freight arrangements for the following shipment:\n\n- Commodity: Automotive press-fit components (non-DGR)\n- Packaging: 18 cartons on 2 pallets\n- Total weight: 1,240 kg\n- Dimensions: approx. 1.8 cbm\n- Origin: Hartmann Logistics GmbH warehouse, Frankfurt Airport (FRA)\n- Destination: Midwest Auto Parts, Chicago O''Hare (ORD)\n- Cargo ready: Thursday this week\n- Required: Earliest available flight\n\nConsignee details:\nMidwest Auto Parts Inc.\n4820 W. 168th Street, Tinley Park, IL 60477\nContact: Mark Kowalski, +1 708 555 0144\n\nPlease confirm availability and rate by Wednesday so we can instruct the warehouse.\n\nBest regards,\nThomas Müller\nHartmann Logistics GmbH',
    'Please arrange air freight for 18 cartons automotive press-fit components, 2 pallets, 1,240 kg. Shipment ready at FRA warehouse by Thursday. Consignee: Midwest Auto Parts, Chicago. We need earliest available flight.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0101', true, true,
    NOW() - INTERVAL '6 days'
  );

  -- [2] Outbound to vendor: space request
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_ven, v_mbx_id,
    'outbound', 'freightmate58@gmail.com', 'internal',
    'hfarouk@nilestarlogistics.com', ARRAY[]::text[],
    'Space Request FRA-ORD — 1,240 kg / 2 Pallets — Ref 782351',
    E'Dear Hassan,\n\nI hope you are well. We have a space request for the below and would appreciate your best rate and availability:\n\n- Route: FRA – ORD\n- Weight: 1,240 kg / 2 pallets (approx. 1.8 cbm)\n- Cargo ready: Thursday at FRA warehouse\n- Commodity: Automotive components, non-DGR\n- Shipper: Hartmann Logistics GmbH, Frankfurt\n- Consignee: Midwest Auto Parts, Chicago O''Hare\n\nClient requires earliest possible departure. Please advise on available flights and all-in rate (including fuel and security surcharges). We need to confirm by Wednesday COB.\n\nThank you.',
    'Dear Hassan, please quote for 1,240 kg / 2 pallets FRA–ORD. Cargo ready Thursday. Shipper: Hartmann Logistics GmbH, Frankfurt. Consignee: Midwest Auto Parts, Chicago. Commodity: automotive components, no DGR.',
    'email', 'all', 'sent', false, true,
    'demo-msg-0102', false, true,
    NOW() - INTERVAL '6 days' + INTERVAL '3 hours'
  );

  -- [3] Vendor inbound: rate confirmation
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_ven, v_mbx_id,
    'inbound', 'hfarouk@nilestarlogistics.com', 'vendor',
    'freightmate58@gmail.com', ARRAY[]::text[],
    'RE: Space Request FRA-ORD — Rate Confirmed',
    E'Dear,\n\nThank you for the enquiry. We are pleased to confirm space on the following flight:\n\nFlight: LH8400\nRoute: FRA – ORD\nDeparture: Friday, 06:10 local\nRate: EUR 4,800 all-in (inclusive of fuel surcharge, security fee, and screening)\n\nThe AWB will be issued immediately upon written acceptance. Cargo cut-off at FRA warehouse is Thursday 18:00.\n\nPlease confirm by COB Thursday to secure the allocation. We will require a completed HAWB draft and shipper SLI at the same time.\n\nBest regards,\nHassan Al Farouk\nNileStar Logistics',
    'Confirmed space LH8400 FRA-ORD departing Friday 0610. Rate EUR 4,800 all-in (incl. fuel surcharge, security). AWB will be issued on acceptance. Please confirm by COB Thursday.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0103', false, true,
    NOW() - INTERVAL '5 days'
  );

  -- [4] Outbound to client: quote forwarded
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_cli, v_mbx_id,
    'outbound', 'freightmate58@gmail.com', 'internal',
    'thomas.mueller@hartmann-logistics.de', ARRAY[]::text[],
    'RE: Ref 782351 — Air Freight Quote FRA-ORD',
    E'Dear Thomas,\n\nGood news — we have secured space for your shipment. Details below:\n\nFlight: LH8400 (Lufthansa Cargo)\nRoute: Frankfurt (FRA) to Chicago O''Hare (ORD)\nDeparture: Friday, 06:10 FRA local time\nAll-in rate: EUR 4,800 for 1,240 kg / 2 pallets\n(Includes fuel surcharge, security, and screening — no additional charges)\n\nCargo cut-off at the FRA warehouse is Thursday at 18:00. We will require the shipper SLI and HAWB draft by Thursday 15:00 at the latest.\n\nPlease confirm acceptance by COB Thursday to hold the allocation. We will proceed with AWB issuance and booking confirmation immediately upon your go-ahead.\n\nKind regards',
    'Dear Thomas, we have secured space on LH8400 (FRA-ORD, Friday 0610). All-in rate EUR 4,800 for 1,240 kg / 2 pallets. AWB issued on confirmation. Please confirm by COB Thursday to hold the space.',
    'email', 'all', 'sent', false, true,
    'demo-msg-0104', false, true,
    NOW() - INTERVAL '5 days' + INTERVAL '1 hour'
  );

  -- [5] Vendor inbound: AWB issued, cargo departed
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_ven, v_mbx_id,
    'inbound', 'hfarouk@nilestarlogistics.com', 'vendor',
    'freightmate58@gmail.com', ARRAY[]::text[],
    'AWB Issued — Ref 782351 — LH8400 FRA/ORD',
    E'Dear,\n\nPlease be advised that the air waybill has been issued and cargo has departed FRA as planned.\n\nAWB: 020-12345678\nFlight: LH8400\nDeparted: FRA 06:10 today\nETA: Chicago O''Hare (ORD) — Saturday, 14:30 local time\n\nA tracking link is attached to this email. We recommend confirming delivery arrangements with the consignee (Midwest Auto Parts) ahead of arrival.\n\nPlease do not hesitate to contact us if you need anything further.\n\nBest regards,\nHassan Al Farouk\nNileStar Logistics',
    'AWB 020-12345678 issued. Cargo departed FRA on LH8400 as planned. ETA Chicago O''Hare Saturday 1430 local. Tracking link attached. Confirm delivery with consignee.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0105', true, true,
    NOW() - INTERVAL '12 hours'
  );

  -- ══════════════════════════════════════════════════════════════
  -- EMAIL MESSAGES — Case 661209 — HAM → DXB (quote_sent)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_case_661209, v_ch_661209_cli, v_mbx_id,
     'inbound', 'phyllis.njenga@gha-international.org', 'client',
     'freightmate58@gmail.com', ARRAY['rania.guleid@gha-international.org'],
     'URGENT — Field Equipment Shipment HAM to DXB — Ref 661209',
     E'Dear Team,\n\nWe have an urgent request. GHA is deploying a field mission to the region next week and requires the following equipment to arrive in Dubai no later than Friday.\n\nShipment details:\n- Cargo: Field survey equipment (3 pallets)\n- Weight: 420 kg\n- Volume: 2.1 cbm\n- Origin: Hamburg (HAM)\n- Destination: Dubai (DXB)\n- Required delivery: End of next week (Friday at the latest)\n\nThe equipment will be collected by our logistics partner in Dubai and transported onward overland. Timing is critical to the mission schedule.\n\nPlease advise on the earliest available flight and rate. Speed of response is appreciated.\n\nKind regards,\nPhyllis Njenga\nArea Support Manager — GHA Sudan',
     'Please arrange immediate air freight for 3 pallets field survey equipment, 420 kg / 2.1 cbm, Hamburg to Dubai. Required delivery by end of next week for mission deployment. Please advise earliest flight and rate.',
     'email', 'all', 'inbox', true, true,
     'demo-msg-0201', false, true,
     NOW() - INTERVAL '4 days'),

    (gen_random_uuid(), v_case_661209, v_ch_661209_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'james.kimani@afrikargo.com', ARRAY[]::text[],
     'Rate Request — HAM-DXB — 420 kg 3 Pallets — Ref 661209',
     E'Dear James,\n\nI hope you are well. We have an urgent request from one of our NGO clients and need your fastest quote on the below:\n\n- Route: HAM – DXB\n- Weight: 420 kg\n- Volume: 2.1 cbm (3 pallets)\n- Commodity: Field survey equipment, non-DGR\n- Origin: Hamburg Airport (HAM)\n- Destination: Dubai (DXB)\n- Required delivery: Friday next week (hard deadline — mission critical)\n\nPlease advise on the earliest available flight, all-in rate, and cut-off times. We need to revert to the client by tomorrow morning.\n\nThank you.',
     'Dear James, please quote for 3 pallets, 420 kg / 2.1 cbm, HAM–DXB. Cargo: field survey equipment, not DGR. Client needs delivery by Friday next week. What is the earliest available flight?',
     'email', 'all', 'sent', false, true,
     'demo-msg-0202', false, true,
     NOW() - INTERVAL '4 days' + INTERVAL '2 hours'),

    (gen_random_uuid(), v_case_661209, v_ch_661209_ven, v_mbx_id,
     'inbound', 'james.kimani@afrikargo.com', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Rate Request HAM-DXB — AfriKargo Quote',
     E'Hi,\n\nThank you for the enquiry. Please find our quote below:\n\nRoute: HAM – DXB\nRate: USD 2.85/kg all-in (minimum 250 kg applies)\nEstimated total: USD 1,197 for 420 kg\nTransit: 3–4 days via Emirates (EK)\nNext available space: Tuesday, EK054\nCut-off: Monday, 12:00 noon (HAM warehouse)\n\nPlease note this allocation is subject to availability and must be confirmed by Monday 12:00 at the latest. We can issue the booking confirmation and AWB draft upon written acceptance.\n\nLet me know if you need anything else.\n\nBest,\nJames Kimani\nAfriKargo Express',
     'Rate confirmed: USD 2.85/kg all-in (min 250 kg). Transit 3–4 days via EK. Next available space: Tuesday EK054. Please confirm by Monday 1200 to secure allocation.',
     'email', 'all', 'inbox', false, true,
     'demo-msg-0203', false, true,
     NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), v_case_661209, v_ch_661209_cli, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'phyllis.njenga@gha-international.org', ARRAY['rania.guleid@gha-international.org'],
     'RE: Ref 661209 — Quote HAM-DXB — USD 2.85/kg',
     E'Dear Phyllis,\n\nWe have received a quote from our vendor AfriKargo Express. Details below:\n\nRoute: HAM – DXB\nFlight: EK054 (Tuesday departure)\nRate: USD 2.85/kg all-in\nEstimated total for 420 kg: USD 1,197\nEstimated transit: 3–4 days (delivery Thursday/Friday)\n\nThis meets your Friday delivery requirement with some margin. The rate is all-inclusive (fuel, security, handling).\n\nIMPORTANT: We must confirm by Monday noon (HAM time) to secure the allocation. Could you please let us know your decision as soon as possible so we can proceed with the booking?\n\nKind regards',
     'Dear Phyllis, we have received a quote from AfriKargo: USD 2.85/kg all-in for 420 kg = USD 1,197. Departure Tuesday on EK054, delivery Thursday/Friday. Please confirm by Monday noon to hold the space.',
     'email', 'all', 'sent', false, true,
     'demo-msg-0204', false, true,
     NOW() - INTERVAL '2 days');

  -- ══════════════════════════════════════════════════════════════
  -- EMAIL MESSAGES — Case 554107 — NBO → LHR (client_confirmed)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_case_554107, v_ch_554107_cli, v_mbx_id,
     'inbound', 'thomas.mueller@hartmann-logistics.de', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'Cold Chain Shipment NBO-LHR — Ref 554107',
     E'Hello,\n\nWe require temperature-controlled air freight for the following pharmaceutical shipment:\n\n- Commodity: Pharmaceutical samples (no DGR classification)\n- Temperature requirement: 2–8 °C maintained throughout transit\n- Weight: 180 kg\n- Origin: AfroPharma Ltd, Nairobi (NBO)\n- Destination: BioMedica UK, Heathrow (LHR)\n- Contact at origin: Dr. Aisha Mwangi, +254 722 800 123\n- Contact at destination: Sarah Jennings, BioMedica, +44 20 8759 4400\n\nA temperature data logger must accompany the shipment and a temperature excursion report must be provided upon delivery.\n\nPlease advise on availability, rate, and next available cold-chain flight.\n\nBest regards,\nThomas Müller\nHartmann Logistics GmbH',
     'Please arrange temperature-controlled air freight for pharmaceutical samples, 180 kg, Nairobi to London. Temp requirement: 2–8 °C throughout. Shipper: AfroPharma Ltd, Nairobi. Consignee: BioMedica UK, Heathrow.',
     'email', 'all', 'inbox', false, true,
     'demo-msg-0301', false, true,
     NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), v_case_554107, v_ch_554107_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'grace.wachira@transglobelogistics.com', ARRAY[]::text[],
     'Rate Request — NBO-LHR — Cold Chain 180 kg — Ref 554107',
     E'Dear Grace,\n\nWe have a cold-chain pharmaceutical shipment and need your best quote:\n\n- Route: NBO – LHR\n- Weight: 180 kg\n- Commodity: Pharmaceutical samples, 2–8 °C controlled\n- Shipper: AfroPharma Ltd, Nairobi (contact: Dr. Aisha Mwangi)\n- Consignee: BioMedica UK, Heathrow\n- Special requirement: Temperature data logger + excursion report on delivery\n\nWhat is your next available cold-chain capacity on NBO–LHR, and what is the all-in rate? Timing is reasonably urgent.\n\nThank you.',
     'Dear Grace, please quote for 180 kg temp-controlled (2–8 °C) pharmaceutical cargo NBO–LHR. Shipper in Nairobi. Consignee at LHR. What is your next available cold-chain capacity and rate?',
     'email', 'all', 'sent', false, true,
     'demo-msg-0302', false, true,
     NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),

    (gen_random_uuid(), v_case_554107, v_ch_554107_ven, v_mbx_id,
     'inbound', 'grace.wachira@transglobelogistics.com', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Cold Chain NBO-LHR — Rate Confirmed',
     E'Hi,\n\nThank you for the enquiry. We are pleased to confirm availability as follows:\n\nFlight: KQ101 (Kenya Airways)\nRoute: NBO – LHR\nDeparture: Thursday (next week)\nRate: GBP 3,200 all-in for 180 kg\n\nOur cold-chain protocol guarantees full 2–8 °C custody from collection at AfroPharma''s Nairobi facility through to delivery at BioMedica UK. A calibrated temperature data logger is included, and a full temperature excursion report will be issued within 24 hours of delivery.\n\nPlease confirm acceptance by Wednesday to secure the booking. We will require contact details for the shipper and SLI at confirmation.\n\nBest regards,\nGrace Wachira\nTransGlobe Logistics',
     'Hi, confirmed rate GBP 3,200 all-in for 180 kg on KQ101 (NBO-LHR) departing Thursday. Full cold-chain custody maintained. Temperature log provided on delivery. Please confirm by Wednesday to book.',
     'email', 'all', 'inbox', false, true,
     'demo-msg-0303', false, true,
     NOW() - INTERVAL '2 days'),

    (gen_random_uuid(), v_case_554107, v_ch_554107_cli, v_mbx_id,
     'inbound', 'thomas.mueller@hartmann-logistics.de', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Ref 554107 — Confirmed — Please Proceed',
     E'Hello,\n\nThank you for arranging this so quickly. GBP 3,200 is within our approved budget for this shipment — please go ahead and confirm the booking with TransGlobe for KQ101 on Thursday.\n\nA few additional requests:\n- Please send the AWB number to us as soon as it is issued\n- Kindly send the cold-chain handling instructions directly to Dr. Aisha Mwangi at AfroPharma (aisha.mwangi@afropharma.ke)\n- BioMedica will need at least 24 hours notice before the estimated delivery time\n\nThank you for your efficient handling of this case.\n\nBest regards,\nThomas Müller\nHartmann Logistics GmbH',
     'Rate confirmed. GBP 3,200 is within budget. Please go ahead and book KQ101 on Thursday. Please send AWB and temperature log instructions to our Nairobi shipper contact.',
     'email', 'all', 'inbox', false, true,
     'demo-msg-0304', false, true,
     NOW() - INTERVAL '6 hours');

  -- ══════════════════════════════════════════════════════════════
  -- CASE CONTACTS
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO case_contacts
    (id, case_id, email, persona, display_name, is_primary)
  VALUES
    (gen_random_uuid(), v_case_490428,
     'miriam.okonkwo@gha-international.org', 'client', 'Miriam Okonkwo', true),

    (gen_random_uuid(), v_case_782351,
     'thomas.mueller@hartmann-logistics.de', 'client', 'Thomas Müller', true),

    (gen_random_uuid(), v_case_661209,
     'phyllis.njenga@gha-international.org', 'client', 'Phyllis Njenga', true),

    (gen_random_uuid(), v_case_554107,
     'thomas.mueller@hartmann-logistics.de', 'client', 'Thomas Müller', true);

  -- ══════════════════════════════════════════════════════════════
  -- SHIPMENT EVENTS
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO shipment_events
    (id, case_id, event_type, payload, triggered_by, created_at)
  VALUES
    (gen_random_uuid(), v_case_490428,
     'status_changed',
     '{"from": "new", "to": "vendor_requested"}'::jsonb,
     'operator', NOW() - INTERVAL '10 days'),

    (gen_random_uuid(), v_case_782351,
     'status_changed',
     '{"from": "booked", "to": "in_transit", "awb": "020-12345678"}'::jsonb,
     'operator', NOW() - INTERVAL '12 hours'),

    (gen_random_uuid(), v_case_661209,
     'status_changed',
     '{"from": "quote_received", "to": "quote_sent"}'::jsonb,
     'operator', NOW() - INTERVAL '2 days'),

    (gen_random_uuid(), v_case_554107,
     'status_changed',
     '{"from": "quote_sent", "to": "client_confirmed"}'::jsonb,
     'operator', NOW() - INTERVAL '6 hours');

  -- ══════════════════════════════════════════════════════════════
  -- DRAFT TASK + MESSAGE DRAFT
  -- Case 490428 — vendor reply re MoF procedure, awaiting approval
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO draft_tasks
    (id, case_id, channel_type, trigger_event_id, draft_type, status, priority)
  VALUES
    (v_draft_task_1, v_case_490428, 'vendor', NULL, 'vendor_follow_up', 'ready', 1);

  INSERT INTO message_drafts
    (id, draft_task_id, case_id, channel_type, recipient_email, subject, body_text,
     cc_emails, bcc_emails, version, model_used,
     approved_at, sent_at, created_at, updated_at)
  VALUES
    (v_draft_1,
     v_draft_task_1,
     v_case_490428,
     'vendor',
     'grace.wachira@transglobelogistics.com',
     'RE: GHA Malakal — MoF/Customs Procedure — Next Steps',
     E'Dear Grace,\n\nThank you for confirming there are no cost implications for the MoF/HAC application.\n\nGHA has agreed to proceed with the return of the cargo to Malakal while the import documents are prepared. Please arrange for the truck to return and provide an updated quotation including any additional detention charges incurred to date.\n\nIn parallel, please send us the full list of documents required for the Ministry of Finance application so we can forward these to GHA''s logistics team immediately.\n\nWe appreciate your continued support on this case.\n\nBest regards',
     ARRAY[]::text[], ARRAY[]::text[],
     1, 'claude-sonnet-4-6',
     NULL, NULL,
     NOW() - INTERVAL '2 days',
     NOW() - INTERVAL '2 days');

  -- ══════════════════════════════════════════════════════════════
  -- THREAD SUMMARIES — Case 490428
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO thread_summaries
    (id, case_id, channel_type, summary_text, tone,
     open_questions, promises_made, unresolved_issues, communication_risks,
     last_message_included, message_count, model_used,
     milestones, updated_at)
  VALUES
    (v_ts_490428_cli,
     v_case_490428,
     'client',
     'GHA requested road transport of office furniture and ICT equipment from Malakal (South Sudan) to Al Jazirah (Sudan). Cargo is currently held at the border due to HAC import complications — HAC stated the move requires a full MoF/Sudan Customs import procedure rather than a standard HAC approval. GHA has agreed to return cargo to Malakal while administrative requirements are resolved. GHA is awaiting the list of required documents from TransGlobe to begin the MoF application.',
     'tense',
     ARRAY[
       'Has GHA received the MoF document checklist from TransGlobe?',
       'What is the expected timeline for MoF approval once documents are submitted?'
     ],
     ARRAY[
       'We will forward MoF document requirements to GHA as soon as received from TransGlobe.',
       'No cost implications for the MoF/HAC application itself.'
     ],
     ARRAY[
       'Truck detention charges accumulating — exact amount not yet confirmed.',
       'HAC import procedure timeline unknown.'
     ],
     ARRAY[
       'Delay in MoF process may result in significant detention charges.',
       'GHA Al Jazirah office may be unresponsive — Phyllis required to follow up directly.'
     ],
     NULL,
     4,
     'claude-sonnet-4-6',
     '[{"position":1,"label":"Booking confirmed","completed":true},{"position":2,"label":"Cargo loaded","completed":true},{"position":3,"label":"Border clearance","completed":false},{"position":4,"label":"Delivery","completed":false}]'::jsonb,
     NOW() - INTERVAL '1 day'),

    (v_ts_490428_ven,
     v_case_490428,
     'vendor',
     'TransGlobe (Grace Wachira) confirmed truck loaded and departed Malakal. At border, HAC rejected the standard process — this is classified as an international import requiring MoF and Sudan Customs. TransGlobe has confirmed no fees for document assistance but stated GHA must lead the authority submissions. Truck is awaiting instructions. Return to Malakal was agreed as the interim step.',
     'tense',
     ARRAY[
       'Has TransGlobe sent the MoF document requirements to us?',
       'What are the total detention charges to date?'
     ],
     ARRAY[
       'TransGlobe will assist to speed up MoF process once GHA prepares application letters.',
       'No cost implications for document preparation.'
     ],
     ARRAY[
       'Truck detention charges — amount unconfirmed.',
       'Timeline for MoF procedure not established.'
     ],
     ARRAY[
       'Continued delay risks further detention charges escalating the total case cost.'
     ],
     NULL,
     5,
     'claude-sonnet-4-6',
     '[{"position":1,"label":"Quote confirmed","completed":true},{"position":2,"label":"Truck loaded","completed":true},{"position":3,"label":"Border clearance","completed":false},{"position":4,"label":"Delivery","completed":false}]'::jsonb,
     NOW() - INTERVAL '1 day');

  -- ══════════════════════════════════════════════════════════════
  -- MANAGER TEAM MEMBERS
  -- Links manager → all operators in the org for KPI aggregation
  -- ══════════════════════════════════════════════════════════════
  IF v_mgr_id IS NOT NULL THEN
    INSERT INTO manager_team_members (manager_id, operator_id)
    SELECT v_mgr_id, id FROM profiles WHERE role = 'operator'
    ON CONFLICT DO NOTHING;
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- CASE ACCESS GRANTS
  -- Pre-grant manager read access to all 4 cases so workbench
  -- loads in read-only mode (green banner) instead of redirecting
  -- ══════════════════════════════════════════════════════════════
  IF v_mgr_id IS NOT NULL THEN
    INSERT INTO case_access_grants
      (case_id, manager_id, operator_id, status, requested_at, resolved_at)
    VALUES
      (v_case_490428, v_mgr_id, v_op_id, 'granted', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
      (v_case_782351, v_mgr_id, v_op_id, 'granted', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days'),
      (v_case_661209, v_mgr_id, v_op_id, 'granted', NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days'),
      (v_case_554107, v_mgr_id, v_op_id, 'granted', NOW() - INTERVAL '2 days',  NOW() - INTERVAL '2 days')
    ON CONFLICT (case_id, manager_id) DO UPDATE SET status = 'granted';

    -- Grant manager access to v_op2_id's 3 cases (if a second operator exists)
    IF v_op2_id IS NOT NULL THEN
      INSERT INTO case_access_grants
        (case_id, manager_id, operator_id, status, requested_at, resolved_at)
      VALUES
        (v_m1, v_mgr_id, v_op2_id, 'granted', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
        (v_m2, v_mgr_id, v_op2_id, 'granted', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
        (v_m3, v_mgr_id, v_op2_id, 'granted', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
      ON CONFLICT (case_id, manager_id) DO UPDATE SET status = 'granted';
    END IF;
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- MANAGER-OWNED CASES (5 cases)
  -- operator_id = v_mgr_id → manager has full workbench access
  -- Each case has client + vendor + quoting-team ('other') channel
  -- ══════════════════════════════════════════════════════════════

  IF v_mgr_id IS NOT NULL THEN

  -- ── Cases ──────────────────────────────────────────────────────
  INSERT INTO shipment_cases
    (id, case_code, ref_number, mailbox_id, status, priority, tags,
     client_email, client_name, item_desc, weight_kg, origin, destination,
     rate_amount, rate_currency, operator_id, created_at, updated_at)
  VALUES
    (v_m1, 'MGR-001', '301445', v_mbx_id,
     'quote_received', 'normal', ARRAY['__demo'],
     'h.weber@bmw-procurement.de', 'BMW Group',
     'Precision automotive tooling — 6 crates, CNC components',
     980, 'Munich (MUC)', 'Chicago O''Hare (ORD)',
     NULL, 'EUR', COALESCE(v_op2_id, v_mgr_id), NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days'),

    (v_m2, 'MGR-002', '302816', v_mbx_id,
     'booked', 'normal', ARRAY['__demo'],
     'c.bennett@unilever-sc.com', 'Unilever Supply Chain',
     'FMCG consumer goods — 4 pallets, mixed SKUs',
     620, 'London Heathrow (LHR)', 'Singapore (SIN)',
     5200.00, 'GBP', COALESCE(v_op2_id, v_mgr_id), NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),

    (v_m3, 'MGR-003', '303922', v_mbx_id,
     'vendor_confirmed', 'high', ARRAY['__demo'],
     'f.alhassan@icrc-logistics.org', 'ICRC',
     'Medical supplies — vaccines, cold chain required 2–8°C, 3 pallets',
     310, 'Amsterdam (AMS)', 'Addis Ababa (ADD)',
     NULL, 'USD', COALESCE(v_op2_id, v_mgr_id), NOW() - INTERVAL '4 days', NOW() - INTERVAL '18 hours'),

    (v_m4, 'MGR-004', '304571', v_mbx_id,
     'client_confirmed', 'normal', ARRAY['__demo'],
     'raj.mehta@bosch-india.com', 'Bosch India',
     'Industrial press machinery — 2 OOG crates, 3,400 kg',
     3400, 'Frankfurt (FRA)', 'Mumbai (BOM)',
     12800.00, 'EUR', v_mgr_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '8 hours'),

    (v_m5, 'MGR-005', '305188', v_mbx_id,
     'in_transit', 'urgent', ARRAY['__demo'],
     'sarah.park@nestle-americas.com', 'Nestlé Americas',
     'Food ingredients — temperature monitored, 8 pallets',
     1850, 'Zurich (ZRH)', 'Los Angeles (LAX)',
     9600.00, 'USD', v_mgr_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 hours');

  -- ── Channels ───────────────────────────────────────────────────
  INSERT INTO case_channels
    (id, case_id, channel_type, party_email, label, position, nylas_thread_id, cc_emails, last_message_at, message_count)
  VALUES
    -- 301445
    (v_m1_cli, v_m1, 'client', 'h.weber@bmw-procurement.de',       'BMW — Hans Weber',          1, NULL, ARRAY[]::text[], NOW() - INTERVAL '2 days', 3),
    (v_m1_ven, v_m1, 'vendor', 'cargo@lufthansa-cargo.com',         'Lufthansa Cargo',           2, NULL, ARRAY[]::text[], NOW() - INTERVAL '2 days', 3),
    (v_m1_qt,  v_m1, 'other',  'quoting@freightmate-internal.com',  'Quoting Team',              3, NULL, ARRAY[]::text[], NOW() - INTERVAL '3 days', 2),
    -- 302816
    (v_m2_cli, v_m2, 'client', 'c.bennett@unilever-sc.com',         'Unilever — Claire Bennett', 1, NULL, ARRAY[]::text[], NOW() - INTERVAL '1 day',  4),
    (v_m2_ven, v_m2, 'vendor', 'bookings@singaporeair-cargo.com',   'SQ Cargo',                  2, NULL, ARRAY[]::text[], NOW() - INTERVAL '1 day',  3),
    (v_m2_qt,  v_m2, 'other',  'quoting@freightmate-internal.com',  'Quoting Team',              3, NULL, ARRAY[]::text[], NOW() - INTERVAL '2 days', 2),
    -- 303922
    (v_m3_cli, v_m3, 'client', 'f.alhassan@icrc-logistics.org',     'ICRC — Dr. Al-Hassan',      1, NULL, ARRAY[]::text[], NOW() - INTERVAL '18 hours', 3),
    (v_m3_ven, v_m3, 'vendor', 'cargo@ethiopianairlines.com',        'ET Cargo',                  2, NULL, ARRAY[]::text[], NOW() - INTERVAL '18 hours', 3),
    (v_m3_qt,  v_m3, 'other',  'quoting@freightmate-internal.com',  'Quoting Team',              3, NULL, ARRAY[]::text[], NOW() - INTERVAL '2 days', 3),
    -- 304571
    (v_m4_cli, v_m4, 'client', 'raj.mehta@bosch-india.com',         'Bosch — Raj Mehta',         1, NULL, ARRAY[]::text[], NOW() - INTERVAL '8 hours', 3),
    (v_m4_ven, v_m4, 'vendor', 'freightdesk@airindia-cargo.in',     'AI Cargo',                  2, NULL, ARRAY[]::text[], NOW() - INTERVAL '8 hours', 2),
    (v_m4_qt,  v_m4, 'other',  'quoting@freightmate-internal.com',  'Quoting Team',              3, NULL, ARRAY[]::text[], NOW() - INTERVAL '1 day',  2),
    -- 305188
    (v_m5_cli, v_m5, 'client', 'sarah.park@nestle-americas.com',    'Nestlé — Sarah Park',       1, NULL, ARRAY[]::text[], NOW() - INTERVAL '3 hours', 4),
    (v_m5_ven, v_m5, 'vendor', 'ops@swissworldcargo.com',           'Swiss WorldCargo',           2, NULL, ARRAY[]::text[], NOW() - INTERVAL '3 hours', 3),
    (v_m5_qt,  v_m5, 'other',  'quoting@freightmate-internal.com',  'Quoting Team',              3, NULL, ARRAY[]::text[], NOW() - INTERVAL '6 hours', 2);

  -- ── Email messages ─────────────────────────────────────────────
  -- 301445 — BMW / MUC→ORD / quote_received
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read, nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_m1, v_m1_cli, v_mbx_id,
     'inbound', 'h.weber@bmw-procurement.de', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'Air Freight Request — Ref 301445 — MUC to ORD — CNC Components',
     E'Dear Team,\n\nWe require air freight for a shipment of precision CNC automotive tooling components. Details below:\n\n- Commodity: CNC tooling components (non-DGR)\n- Packaging: 6 wooden crates\n- Weight: 980 kg / approx. 4.2 cbm\n- Origin: BMW Logistics Centre, Munich Airport (MUC)\n- Destination: BMW Manufacturing, Greer, SC (via ORD)\n- Cargo ready date: Monday next week\n\nThis is a production-critical shipment — please advise earliest available flight and all-in rate.\n\nBest regards,\nHans Weber\nBMW Group Procurement',
     'We require air freight for precision CNC automotive tooling components, 6 crates, 980 kg, MUC to ORD. Production-critical — please advise earliest flight and rate.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-1001', false, true, NOW() - INTERVAL '8 days'),

    (gen_random_uuid(), v_m1, v_m1_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'cargo@lufthansa-cargo.com', ARRAY[]::text[],
     'Space Request MUC-ORD — 980 kg / 6 Crates — Ref 301445',
     E'Dear Lufthansa Cargo Team,\n\nKindly quote for the following space request:\n\n- Route: MUC – ORD\n- Weight: 980 kg / 6 wooden crates (approx. 4.2 cbm)\n- Commodity: CNC automotive tooling, non-DGR\n- Shipper: BMW Group, Munich\n- Cargo ready: Monday\n- Priority: Production-critical, earliest possible departure\n\nPlease include all surcharges in your quote. We need to revert to client by end of business tomorrow.\n\nThank you.',
     'Space request MUC-ORD, 980 kg / 6 crates, CNC automotive tooling, non-DGR. Shipper: BMW Group. Cargo ready Monday. Please quote all-in including surcharges.',
     'email', 'all', 'sent', false, true, 'mgr-msg-1002', false, true, NOW() - INTERVAL '8 days' + INTERVAL '1 hour'),

    (gen_random_uuid(), v_m1, v_m1_ven, v_mbx_id,
     'inbound', 'cargo@lufthansa-cargo.com', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Space Request MUC-ORD — Quote LH400',
     E'Dear,\n\nThank you for the enquiry. We have space available on the following:\n\nFlight: LH400\nRoute: MUC – ORD\nDeparture: Tuesday 07:20\nRate: EUR 4.10/kg all-in (fuel, security, screening)\nEstimated total: EUR 4,018 for 980 kg\n\nAllocation can be held until Monday 16:00. Please confirm at your earliest convenience.\n\nBest regards,\nLufthansa Cargo',
     'Space available LH400, MUC-ORD, Tuesday 07:20. Rate EUR 4.10/kg all-in — total EUR 4,018 for 980 kg. Allocation held until Monday 16:00.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-1003', false, true, NOW() - INTERVAL '6 days'),

    (gen_random_uuid(), v_m1, v_m1_qt, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'quoting@freightmate-internal.com', ARRAY[]::text[],
     'INT: 301445 BMW MUC-ORD — Margin Check',
     E'Team,\n\nLH400 quote in at EUR 4,018 all-in. BMW budget confirmed at EUR 5,200. Margin at current markup: EUR 1,182 (22.7%).\n\nRecommend we quote BMW at EUR 5,100 to stay competitive and within their budget. Thoughts?\n\n— Manager',
     'LH400 quote EUR 4,018. BMW budget EUR 5,200. Recommended quote to client: EUR 5,100 (22.7% margin). Please confirm.',
     'email', 'all', 'sent', false, true, 'mgr-msg-1004', false, true, NOW() - INTERVAL '5 days'),

    (gen_random_uuid(), v_m1, v_m1_qt, v_mbx_id,
     'inbound', 'quoting@freightmate-internal.com', 'internal',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: INT: 301445 BMW — Approved',
     E'Approved. Quote BMW at EUR 5,100. Confirm to LH400 and issue client quote.',
     'Approved. Quote BMW EUR 5,100. Confirm LH400 and issue.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-1005', false, true, NOW() - INTERVAL '4 days');

  -- 302816 — Unilever / LHR→SIN / booked
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read, nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_m2, v_m2_cli, v_mbx_id,
     'inbound', 'c.bennett@unilever-sc.com', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'LHR-SIN Shipment Request — Ref 302816 — FMCG Goods',
     E'Hello,\n\nPlease arrange air freight for 4 pallets of FMCG consumer goods from our Heathrow distribution centre to Singapore. Details:\n\n- Cargo: Mixed FMCG SKUs (shampoo, conditioner, body wash)\n- Weight: 620 kg / 4 pallets\n- Origin: Unilever DC, LHR\n- Destination: Unilever Singapore, SIN\n- Cargo ready: This Friday\n- No DGR, standard handling\n\nPlease advise rate and next available flight.\n\nKind regards,\nClaire Bennett\nUnilever Supply Chain',
     'Please arrange air freight for 4 pallets FMCG goods, 620 kg, LHR to SIN. Cargo ready Friday, no DGR. Please advise rate and next available flight.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-2001', false, true, NOW() - INTERVAL '5 days'),

    (gen_random_uuid(), v_m2, v_m2_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'bookings@singaporeair-cargo.com', ARRAY[]::text[],
     'Space Request LHR-SIN — 620 kg / 4 PAX — Ref 302816',
     E'Dear SQ Cargo,\n\nKindly advise space and rate for the following:\n\n- Route: LHR – SIN\n- Weight: 620 kg / 4 pallets\n- Commodity: FMCG consumer goods, non-DGR\n- Shipper: Unilever, Heathrow\n- Cargo ready: Friday\n\nAll-in rate please. Thank you.',
     'Space request LHR-SIN, 620 kg / 4 pallets, FMCG consumer goods, non-DGR. Shipper Unilever. Cargo ready Friday. All-in rate please.',
     'email', 'all', 'sent', false, true, 'mgr-msg-2002', false, true, NOW() - INTERVAL '5 days' + INTERVAL '2 hours'),

    (gen_random_uuid(), v_m2, v_m2_ven, v_mbx_id,
     'inbound', 'bookings@singaporeair-cargo.com', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Space Request LHR-SIN — SQ Cargo Confirmation',
     E'Dear,\n\nWe confirm space on SQ322 LHR-SIN, Saturday 23:45. Rate GBP 5,200 all-in for 620 kg. AWB issued on booking confirmation. Cargo cut-off Friday 18:00 LHR.\n\nBest,\nSingapore Airlines Cargo',
     'Confirmed space SQ322 LHR-SIN Saturday 23:45. Rate GBP 5,200 all-in for 620 kg. Cut-off Friday 18:00.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-2003', false, true, NOW() - INTERVAL '4 days'),

    (gen_random_uuid(), v_m2, v_m2_cli, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'c.bennett@unilever-sc.com', ARRAY[]::text[],
     'RE: Ref 302816 — Booking Confirmed SQ322 LHR-SIN',
     E'Dear Claire,\n\nWe are pleased to confirm your booking. Details:\n\nFlight: SQ322\nRoute: LHR – SIN\nDeparture: Saturday 23:45\nRate: GBP 5,200 all-in\nCargo cut-off: Friday 18:00 at LHR\n\nAWB will be issued before cut-off. Please ensure cargo is delivered to the Unilever Heathrow DC labelled with our ref 302816.\n\nKind regards',
     'Booking confirmed: SQ322 LHR-SIN, Saturday 23:45, GBP 5,200 all-in. Cargo cut-off Friday 18:00 LHR. AWB issued before cut-off.',
     'email', 'all', 'sent', false, true, 'mgr-msg-2004', false, true, NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), v_m2, v_m2_qt, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'quoting@freightmate-internal.com', ARRAY[]::text[],
     'INT: 302816 Unilever LHR-SIN — Booked at GBP 5,200',
     E'Team,\n\nBooked SQ322 at GBP 5,200. Client invoiced at GBP 6,400. Net margin GBP 1,200 (18.7%). AWB pending. No issues flagged.',
     'Booked SQ322 GBP 5,200. Client invoiced GBP 6,400. Margin GBP 1,200 (18.7%). AWB pending.',
     'email', 'all', 'sent', false, true, 'mgr-msg-2005', false, true, NOW() - INTERVAL '3 days' + INTERVAL '30 minutes'),

    (gen_random_uuid(), v_m2, v_m2_qt, v_mbx_id,
     'inbound', 'quoting@freightmate-internal.com', 'internal',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: INT: 302816 — Noted. Flag AWB when issued.',
     E'Noted. Good margin. Flag us when AWB is issued and cargo confirmed delivered to LHR.',
     'Noted. Good margin. Flag AWB when issued and cargo at LHR.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-2006', false, true, NOW() - INTERVAL '3 days' + INTERVAL '1 hour');

  -- 303922 — ICRC / AMS→ADD / vendor_confirmed (high priority)
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read, nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_m3, v_m3_cli, v_mbx_id,
     'inbound', 'f.alhassan@icrc-logistics.org', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'URGENT — Cold Chain Medical Supplies AMS-ADD — Ref 303922',
     E'Dear Team,\n\nWe have an urgent requirement for cold-chain air freight of medical supplies destined for our field hospital in Addis Ababa.\n\n- Commodity: Vaccines and medical consumables (2–8°C required throughout)\n- Weight: 310 kg / 3 pallets\n- Origin: ICRC Logistics Hub, Amsterdam (AMS)\n- Destination: ICRC Field Hospital, Addis Ababa (ADD)\n- Required delivery: Within 72 hours\n\nHumanitarian shipment — full exemption documentation available. Please advise immediately.\n\nDr. Fatima Al-Hassan\nICRC Logistics',
     'URGENT cold-chain medical supplies, 310 kg / 3 pallets, AMS to ADD. Vaccines, 2–8°C. Required within 72 hours. Humanitarian exemption available.',
     'email', 'all', 'inbox', true, true, 'mgr-msg-3001', true, true, NOW() - INTERVAL '4 days'),

    (gen_random_uuid(), v_m3, v_m3_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'cargo@ethiopianairlines.com', ARRAY[]::text[],
     'URGENT Space Request AMS-ADD — Cold Chain 310 kg — Ref 303922',
     E'Dear ET Cargo,\n\nWe have an urgent humanitarian cold-chain request:\n\n- Route: AMS – ADD\n- Weight: 310 kg / 3 pallets\n- Commodity: Vaccines, 2–8°C\n- Client: ICRC (humanitarian exemption)\n- Required: Within 72 hours\n\nWhat is the next available cold-chain capacity and rate? This is time-critical.',
     'URGENT AMS-ADD cold chain 310 kg vaccines for ICRC. 72-hour delivery required. What is next available ET cold-chain capacity and rate?',
     'email', 'all', 'sent', false, true, 'mgr-msg-3002', false, true, NOW() - INTERVAL '4 days' + INTERVAL '30 minutes'),

    (gen_random_uuid(), v_m3, v_m3_qt, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'quoting@freightmate-internal.com', ARRAY[]::text[],
     'INT: 303922 ICRC AMS-ADD — Humanitarian Rate Guidance',
     E'Team,\n\nICRC humanitarian shipment, vaccines AMS-ADD. Awaiting ET quote. ICRC has blanket humanitarian rate agreement — standard markup does not apply. We invoice at cost +5% admin fee only. Please advise if any issue.\n\n— Manager',
     'ICRC humanitarian case — standard markup does not apply. Invoice at cost +5% admin fee. Awaiting ET quote.',
     'email', 'all', 'sent', false, true, 'mgr-msg-3003', false, true, NOW() - INTERVAL '4 days' + INTERVAL '1 hour'),

    (gen_random_uuid(), v_m3, v_m3_ven, v_mbx_id,
     'inbound', 'cargo@ethiopianairlines.com', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: AMS-ADD Cold Chain — ET Cargo Confirmation',
     E'Dear,\n\nFor humanitarian shipments we confirm priority handling. Next available cold-chain flight: ET702 AMS-ADD departing tomorrow 14:30. Rate USD 3.20/kg all-in = USD 992 for 310 kg. GDP-compliant cold chain maintained throughout.\n\nPlease confirm immediately to secure slot.\n\nET Cargo',
     'ET702 AMS-ADD tomorrow 14:30. USD 3.20/kg all-in = USD 992 for 310 kg. GDP cold chain maintained. Confirm immediately.',
     'email', 'all', 'inbox', true, true, 'mgr-msg-3004', false, true, NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), v_m3, v_m3_qt, v_mbx_id,
     'inbound', 'quoting@freightmate-internal.com', 'internal',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: INT: 303922 — Confirmed, proceed at cost +5%',
     E'Confirmed. Proceed at cost +5% admin. Invoice ICRC USD 1,042. Book ET702.',
     'Confirmed. Proceed at cost +5%. Invoice ICRC USD 1,042. Book ET702.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-3005', false, true, NOW() - INTERVAL '3 days' + INTERVAL '30 minutes'),

    (gen_random_uuid(), v_m3, v_m3_cli, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'f.alhassan@icrc-logistics.org', ARRAY[]::text[],
     'RE: Ref 303922 — Confirmed ET702 AMS-ADD Tomorrow',
     E'Dear Dr. Al-Hassan,\n\nWe have secured your slot. Booking confirmed:\n\nFlight: ET702\nRoute: AMS – ADD\nDeparture: Tomorrow 14:30\nRate: USD 992 all-in (cost +5% admin per ICRC agreement)\n\nGDP-compliant cold chain guaranteed throughout. Please ensure cargo is at AMS cargo terminal by 11:00 tomorrow. AWB to follow within the hour.\n\nKind regards',
     'Confirmed ET702 AMS-ADD tomorrow 14:30. USD 992 all-in per ICRC agreement. GDP cold chain guaranteed. Cargo at AMS by 11:00. AWB to follow.',
     'email', 'all', 'sent', false, true, 'mgr-msg-3006', false, true, NOW() - INTERVAL '3 days' + INTERVAL '1 hour');

  -- 304571 — Bosch / FRA→BOM / client_confirmed (OOG)
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read, nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_m4, v_m4_cli, v_mbx_id,
     'inbound', 'raj.mehta@bosch-india.com', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'Air Cargo Request — Ref 304571 — OOG Press Machinery FRA-BOM',
     E'Hello,\n\nWe need to arrange air freight for 2 out-of-gauge industrial press machine units from our Frankfurt facility to our plant in Mumbai.\n\n- Commodity: Industrial press machinery (OOG, non-DGR)\n- Weight: 3,400 kg / 2 crates\n- Dimensions: Each crate 280 x 180 x 190 cm\n- Origin: Bosch Manufacturing, Frankfurt (FRA)\n- Destination: Bosch Plant, Mumbai (BOM)\n- Cargo ready: Next week Monday\n\nOOG handling required. Please advise carrier options and rate.\n\nRaj Mehta\nBosch India Procurement',
     'OOG industrial press machinery, 2 crates, 3,400 kg, FRA to BOM. Crate dims 280x180x190cm each. Cargo ready next Monday. Please advise OOG carrier options and rate.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-4001', true, true, NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), v_m4, v_m4_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'freightdesk@airindia-cargo.in', ARRAY[]::text[],
     'OOG Space Request FRA-BOM — 3,400 kg / 2 Crates — Ref 304571',
     E'Dear AI Cargo,\n\nKindly advise OOG rate and availability for the below:\n\n- Route: FRA – BOM\n- Weight: 3,400 kg\n- Pieces: 2 crates, 280x180x190 cm each\n- Commodity: Industrial machinery, non-DGR\n- Shipper: Bosch, Frankfurt\n- Cargo ready: Monday next week\n\nPlease include all OOG surcharges. Thank you.',
     'OOG space request FRA-BOM, 3,400 kg, 2 crates 280x180x190 cm. Industrial machinery non-DGR. Shipper Bosch. Ready Monday. Include all OOG surcharges.',
     'email', 'all', 'sent', false, true, 'mgr-msg-4002', false, true, NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),

    (gen_random_uuid(), v_m4, v_m4_qt, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'quoting@freightmate-internal.com', ARRAY[]::text[],
     'INT: 304571 Bosch FRA-BOM — OOG Rate Discussion',
     E'Team,\n\nBosch have confirmed budget EUR 13,500 for this OOG move. AI Cargo quote expected by EOD. If AI comes in above EUR 11,000, check Cargolux as alternative. Bosch is a repeat client — protect the relationship.\n\n— Manager',
     'Bosch budget EUR 13,500. AI quote expected EOD. If above EUR 11,000 check Cargolux. Protect client relationship.',
     'email', 'all', 'sent', false, true, 'mgr-msg-4003', false, true, NOW() - INTERVAL '2 days'),

    (gen_random_uuid(), v_m4, v_m4_ven, v_mbx_id,
     'inbound', 'freightdesk@airindia-cargo.in', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: OOG Request FRA-BOM — AI Cargo Quote',
     E'Dear,\n\nOOG rate confirmed for 2 crates FRA-BOM: EUR 12,800 all-in including OOG surcharge, fuel, and screening. Next available OOG-capable flight AI131 FRA-BOM, Wednesday 22:00.\n\nAI Cargo',
     'OOG rate EUR 12,800 all-in. AI131 FRA-BOM Wednesday 22:00. Includes OOG surcharge, fuel, screening.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-4004', false, true, NOW() - INTERVAL '1 day'),

    (gen_random_uuid(), v_m4, v_m4_cli, v_mbx_id,
     'inbound', 'raj.mehta@bosch-india.com', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Ref 304571 — Confirmed, please book AI131',
     E'Hello,\n\nEUR 12,800 is within budget. Please go ahead and book AI131 FRA-BOM on Wednesday. Please send AWB and crate labelling specs to our Frankfurt warehouse.\n\nRaj Mehta',
     'EUR 12,800 confirmed within budget. Please book AI131 FRA-BOM Wednesday. Send AWB and labelling specs to Frankfurt warehouse.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-4005', false, true, NOW() - INTERVAL '8 hours'),

    (gen_random_uuid(), v_m4, v_m4_qt, v_mbx_id,
     'inbound', 'quoting@freightmate-internal.com', 'internal',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: INT: 304571 — Book AI131, margin EUR 700',
     E'Book AI131. Net margin EUR 700 on EUR 13,500 client rate. Acceptable for OOG complexity. Proceed.',
     'Book AI131. Net margin EUR 700. Acceptable for OOG. Proceed.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-4006', false, true, NOW() - INTERVAL '6 hours');

  -- 305188 — Nestlé / ZRH→LAX / in_transit (urgent)
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_text, body_preview, message_type,
     visibility, folder, is_starred, is_read, nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_m5, v_m5_cli, v_mbx_id,
     'inbound', 'sarah.park@nestle-americas.com', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'URGENT Air Freight — Ref 305188 — Food Ingredients ZRH-LAX',
     E'Hi,\n\nUrgent shipment needed. We have a production line waiting in Los Angeles and must receive these food ingredients within 48 hours.\n\n- Commodity: Food ingredients (stabilisers), temperature monitored 10–25°C\n- Weight: 1,850 kg / 8 pallets\n- Origin: Nestlé Supply Centre, Zurich (ZRH)\n- Destination: Nestlé Manufacturing, Los Angeles (LAX)\n- Required: Earliest available — production line stopped\n\nSarah Park\nNestlé Americas Supply Chain',
     'URGENT — food ingredients 1,850 kg / 8 pallets ZRH to LAX. Production line stopped. 48-hour delivery required, temperature monitored.',
     'email', 'all', 'inbox', true, true, 'mgr-msg-5001', false, true, NOW() - INTERVAL '2 days'),

    (gen_random_uuid(), v_m5, v_m5_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'ops@swissworldcargo.com', ARRAY[]::text[],
     'URGENT Space Request ZRH-LAX — 1,850 kg / 8 PAL — Ref 305188',
     E'Dear Swiss WorldCargo,\n\nWe have a production-critical urgent request:\n\n- Route: ZRH – LAX\n- Weight: 1,850 kg / 8 pallets\n- Commodity: Food ingredients, temperature monitored 10–25°C\n- Shipper: Nestlé, Zurich\n- Required: 48-hour delivery, production stoppage\n\nNext available flight and all-in rate please — urgent response needed.',
     'URGENT ZRH-LAX 1,850 kg / 8 pallets food ingredients, temp monitored. Nestlé. 48h delivery, production stoppage. Next flight and rate please.',
     'email', 'all', 'sent', false, true, 'mgr-msg-5002', false, true, NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),

    (gen_random_uuid(), v_m5, v_m5_qt, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'quoting@freightmate-internal.com', ARRAY[]::text[],
     'INT: 305188 Nestlé ZRH-LAX — Urgent, Production Stoppage',
     E'Team,\n\nNestlé production stoppage — highest priority. Awaiting Swiss WorldCargo quote. Nestlé has agreed to premium pricing. Quote at cost +30% given urgency and weekend handling. Loop me in immediately when quote arrives.\n\n— Manager',
     'Highest priority. Nestlé production stoppage. Quote at cost +30% for urgency. Loop me in when SWC quote arrives.',
     'email', 'all', 'sent', false, true, 'mgr-msg-5003', false, true, NOW() - INTERVAL '2 days' + INTERVAL '45 minutes'),

    (gen_random_uuid(), v_m5, v_m5_ven, v_mbx_id,
     'inbound', 'ops@swissworldcargo.com', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: URGENT ZRH-LAX — LX40 Confirmed',
     E'Dear,\n\nWe can accommodate on LX40 ZRH-LAX departing today 17:55. Rate USD 9,600 all-in for 1,850 kg including priority handling surcharge. Please confirm within 30 minutes to hold slot.\n\nSwiss WorldCargo',
     'LX40 ZRH-LAX today 17:55. USD 9,600 all-in including priority surcharge. Confirm within 30 minutes.',
     'email', 'all', 'inbox', true, true, 'mgr-msg-5004', false, true, NOW() - INTERVAL '1 day' + INTERVAL '6 hours'),

    (gen_random_uuid(), v_m5, v_m5_cli, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'sarah.park@nestle-americas.com', ARRAY[]::text[],
     'RE: Ref 305188 — CONFIRMED LX40 ZRH-LAX Today',
     E'Dear Sarah,\n\nWe have secured your slot. Cargo departs today on LX40 at 17:55 ZRH. ETA LAX tomorrow 20:30 local.\n\nFlight: LX40\nRoute: ZRH – LAX\nDeparture: Today 17:55\nETA: Tomorrow 20:30 LAX\nTotal: USD 12,480 (will be invoiced separately)\n\nAWB and tracking will be sent within the next 30 minutes. Your production team should have cargo by tomorrow evening.\n\nKind regards',
     'Confirmed LX40 ZRH-LAX today 17:55. ETA LAX tomorrow 20:30. USD 12,480 invoiced separately. AWB and tracking in 30 minutes.',
     'email', 'all', 'sent', false, true, 'mgr-msg-5005', false, true, NOW() - INTERVAL '1 day' + INTERVAL '7 hours'),

    (gen_random_uuid(), v_m5, v_m5_qt, v_mbx_id,
     'inbound', 'quoting@freightmate-internal.com', 'internal',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: INT: 305188 — Good. USD 2,880 margin (30%). Ship is in air.',
     E'Good work. USD 9,600 cost, client invoiced USD 12,480. Margin USD 2,880 (30%). LX40 in air. Monitor delivery confirmation and close case when consignee signs.',
     'USD 9,600 cost. Client USD 12,480. Margin USD 2,880 (30%). LX40 in air. Monitor delivery.',
     'email', 'all', 'inbox', false, true, 'mgr-msg-5006', false, true, NOW() - INTERVAL '20 hours');

  -- ── Shipment events for manager cases ──────────────────────────
  INSERT INTO shipment_events
    (id, case_id, event_type, payload, triggered_by, created_at)
  VALUES
    (gen_random_uuid(), v_m1, 'status_changed', '{"from":"new","to":"quote_received"}'::jsonb,    'operator', NOW() - INTERVAL '6 days'),
    (gen_random_uuid(), v_m2, 'status_changed', '{"from":"client_confirmed","to":"booked"}'::jsonb,'operator', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), v_m3, 'status_changed', '{"from":"quote_sent","to":"vendor_confirmed"}'::jsonb,'operator', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), v_m4, 'status_changed', '{"from":"quote_sent","to":"client_confirmed"}'::jsonb,'operator', NOW() - INTERVAL '8 hours'),
    (gen_random_uuid(), v_m5, 'status_changed', '{"from":"booked","to":"in_transit","awb":"LX-305188"}'::jsonb,'operator', NOW() - INTERVAL '20 hours');

  -- ── Case contacts for manager cases ────────────────────────────
  INSERT INTO case_contacts (id, case_id, email, persona, display_name, is_primary)
  VALUES
    (gen_random_uuid(), v_m1, 'h.weber@bmw-procurement.de',    'client', 'Hans Weber',        true),
    (gen_random_uuid(), v_m2, 'c.bennett@unilever-sc.com',     'client', 'Claire Bennett',    true),
    (gen_random_uuid(), v_m3, 'f.alhassan@icrc-logistics.org', 'client', 'Dr. Fatima Al-Hassan', true),
    (gen_random_uuid(), v_m4, 'raj.mehta@bosch-india.com',     'client', 'Raj Mehta',         true),
    (gen_random_uuid(), v_m5, 'sarah.park@nestle-americas.com','client', 'Sarah Park',         true);

  END IF; -- v_mgr_id IS NOT NULL

  RAISE NOTICE 'Demo seed complete. 4 operator cases + 5 manager cases created.';

END;
$$;

COMMIT;
