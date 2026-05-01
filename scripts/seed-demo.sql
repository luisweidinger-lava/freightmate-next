-- ============================================================
-- FreightMate — Demo seed
-- Run in Supabase SQL editor (service role) or via psql.
-- Creates 4 realistic freight cases for client demo.
-- All cases tagged '__demo' for safe teardown.
-- ============================================================

BEGIN;

DO $$
DECLARE
  -- ── Runtime IDs (resolved from existing data) ──────────────
  v_op_id   uuid;
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
  v_vendor_tgl       uuid := gen_random_uuid();  -- TransGlobe Logistics
  v_vendor_nistar    uuid := gen_random_uuid();  -- NileStar Air Cargo
  v_vendor_afrikargo uuid := gen_random_uuid();  -- AfriKargo Express

  -- ── Case IDs ────────────────────────────────────────────────
  v_case_490428 uuid := gen_random_uuid();
  v_case_782351 uuid := gen_random_uuid();
  v_case_661209 uuid := gen_random_uuid();
  v_case_554107 uuid := gen_random_uuid();

  -- ── Channel IDs (client + vendor per case) ──────────────────
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

BEGIN
  -- ── Resolve environment IDs ──────────────────────────────────
  SELECT id INTO v_op_id  FROM profiles WHERE role = 'operator' ORDER BY created_at LIMIT 1;
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
  -- EMAIL MESSAGES
  -- Case 490428 — Malakal → Al Jazirah
  -- ══════════════════════════════════════════════════════════════

  -- [1] Client inbound: initial request
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_cli, v_mbx_id,
    'inbound', 'miriam.okonkwo@gha-international.org', 'client',
    'freightmate58@gmail.com',
    ARRAY['phyllis.njenga@gha-international.org'],
    'GHA Malakal to Al Jazirah Job//490428',
    'Dear Team, please arrange movement of GHA office furniture and ICT equipment from our Malakal office to Al Jazirah. PL attached. Our rep Ibrahim Osman will be on-site to supervise loading.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0001', true, true,
    NOW() - INTERVAL '11 days'
  );

  -- [2] Outbound to vendor: quote request
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_ven, v_mbx_id,
    'outbound', 'freightmate58@gmail.com', 'internal',
    'grace.wachira@transglobelogistics.com',
    ARRAY['daniel.osei@transglobelogistics.com'],
    'RE: GHA Malakal to Al Jazirah Job//490428 — Rate Request',
    'Dear Grace, please provide a quotation for road transport of approx. 640 kg office furniture and ICT equipment from Malakal (South Sudan) to Al Jazirah (Sudan). Client requires border crossing via Renk/Kosti.',
    'email', 'all', 'sent', false, true,
    'demo-msg-0002', false, true,
    NOW() - INTERVAL '11 days' + INTERVAL '2 hours'
  );

  -- [3] Vendor inbound: loading confirmed
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_ven, v_mbx_id,
    'inbound', 'grace.wachira@transglobelogistics.com', 'vendor',
    'freightmate58@gmail.com',
    ARRAY[]::text[],
    'RE: GHA Malakal to Al Jazirah — Truck Loaded',
    'Hi, note that truck loaded and left Malakal yesterday morning. Traveling across a dead zone — no network coverage until border crossing. We expect arrival at Renk/Kosti border later today.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0003', false, true,
    NOW() - INTERVAL '9 days'
  );

  -- [4] Vendor inbound: HAC issue
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_ven, v_mbx_id,
    'inbound', 'grace.wachira@transglobelogistics.com', 'vendor',
    'freightmate58@gmail.com',
    ARRAY['daniel.osei@transglobelogistics.com'],
    'RE: GHA Malakal — HAC Clearance Issue',
    'HAC informed this issue is beyond their mandate as this is an import from another country. GHA has to follow the normal import procedure through MoF and Sudan Customs. Truck has been waiting since Monday — further delay will incur detention charges.',
    'email', 'all', 'inbox', true, true,
    'demo-msg-0004', false, true,
    NOW() - INTERVAL '6 days'
  );

  -- [5] Client inbound: GHA reply on HAC
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_cli, v_mbx_id,
    'inbound', 'phyllis.njenga@gha-international.org', 'client',
    'freightmate58@gmail.com',
    ARRAY['miriam.okonkwo@gha-international.org'],
    'RE: GHA Malakal — HAC Clearance Issue',
    'Thank you for the update. With the truck incurring costs, the feasible option is to move the equipment back to Malakal and ensure all admin is completed before moving again. Please provide MoF/Customs requirements, expected timeline, and cost implications.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0005', false, true,
    NOW() - INTERVAL '4 days'
  );

  -- [6] Outbound to client: status update
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_490428, v_ch_490428_cli, v_mbx_id,
    'outbound', 'freightmate58@gmail.com', 'internal',
    'phyllis.njenga@gha-international.org',
    ARRAY['miriam.okonkwo@gha-international.org'],
    'RE: GHA Malakal — Next Steps',
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
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_cli, v_mbx_id,
    'inbound', 'thomas.mueller@hartmann-logistics.de', 'client',
    'freightmate58@gmail.com', ARRAY[]::text[],
    'Air Freight Request — Ref 782351 — FRA to ORD',
    'Please arrange air freight for 18 cartons automotive press-fit components, 2 pallets, 1,240 kg. Shipment ready at FRA warehouse by Thursday. Consignee: Midwest Auto Parts, Chicago. We need earliest available flight.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0101', true, true,
    NOW() - INTERVAL '6 days'
  );

  -- [2] Outbound to vendor: space request
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_ven, v_mbx_id,
    'outbound', 'freightmate58@gmail.com', 'internal',
    'hfarouk@nilestarlogistics.com', ARRAY[]::text[],
    'Space Request FRA-ORD — 1,240 kg / 2 Pallets — Ref 782351',
    'Dear Hassan, please quote for 1,240 kg / 2 pallets FRA–ORD. Cargo ready Thursday. Shipper: Hartmann Logistics GmbH, Frankfurt. Consignee: Midwest Auto Parts, Chicago. Commodity: automotive components, no DGR.',
    'email', 'all', 'sent', false, true,
    'demo-msg-0102', false, true,
    NOW() - INTERVAL '6 days' + INTERVAL '3 hours'
  );

  -- [3] Vendor inbound: rate confirmation
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_ven, v_mbx_id,
    'inbound', 'hfarouk@nilestarlogistics.com', 'vendor',
    'freightmate58@gmail.com', ARRAY[]::text[],
    'RE: Space Request FRA-ORD — Rate Confirmed',
    'Confirmed space LH8400 FRA-ORD departing Friday 0610. Rate EUR 4,800 all-in (incl. fuel surcharge, security). AWB will be issued on acceptance. Please confirm by COB Thursday.',
    'email', 'all', 'inbox', false, true,
    'demo-msg-0103', false, true,
    NOW() - INTERVAL '5 days'
  );

  -- [4] Outbound to client: quote forwarded
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_cli, v_mbx_id,
    'outbound', 'freightmate58@gmail.com', 'internal',
    'thomas.mueller@hartmann-logistics.de', ARRAY[]::text[],
    'RE: Ref 782351 — Air Freight Quote FRA-ORD',
    'Dear Thomas, we have secured space on LH8400 (FRA-ORD, Friday 0610). All-in rate EUR 4,800 for 1,240 kg / 2 pallets. AWB issued on confirmation. Please confirm by COB Thursday to hold the space.',
    'email', 'all', 'sent', false, true,
    'demo-msg-0104', false, true,
    NOW() - INTERVAL '5 days' + INTERVAL '1 hour'
  );

  -- [5] Vendor inbound: AWB issued, cargo departed
  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES (
    gen_random_uuid(), v_case_782351, v_ch_782351_ven, v_mbx_id,
    'inbound', 'hfarouk@nilestarlogistics.com', 'vendor',
    'freightmate58@gmail.com', ARRAY[]::text[],
    'AWB Issued — Ref 782351 — LH8400 FRA/ORD',
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
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_case_661209, v_ch_661209_cli, v_mbx_id,
     'inbound', 'phyllis.njenga@gha-international.org', 'client',
     'freightmate58@gmail.com', ARRAY['rania.guleid@gha-international.org'],
     'URGENT — Field Equipment Shipment HAM to DXB — Ref 661209',
     'Please arrange immediate air freight for 3 pallets field survey equipment, 420 kg / 2.1 cbm, Hamburg to Dubai. Required delivery by end of next week for mission deployment. Please advise earliest flight and rate.',
     'email', 'all', 'inbox', true, true,
     'demo-msg-0201', false, true,
     NOW() - INTERVAL '4 days'),

    (gen_random_uuid(), v_case_661209, v_ch_661209_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'james.kimani@afrikargo.com', ARRAY[]::text[],
     'Rate Request — HAM-DXB — 420 kg 3 Pallets — Ref 661209',
     'Dear James, please quote for 3 pallets, 420 kg / 2.1 cbm, HAM–DXB. Cargo: field survey equipment, not DGR. Client needs delivery by Friday next week. What is the earliest available flight?',
     'email', 'all', 'sent', false, true,
     'demo-msg-0202', false, true,
     NOW() - INTERVAL '4 days' + INTERVAL '2 hours'),

    (gen_random_uuid(), v_case_661209, v_ch_661209_ven, v_mbx_id,
     'inbound', 'james.kimani@afrikargo.com', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Rate Request HAM-DXB — AfriKargo Quote',
     'Rate confirmed: USD 2.85/kg all-in (min 250 kg). Transit 3–4 days via EK. Next available space: Tuesday EK054. Please confirm by Monday 1200 to secure allocation.',
     'email', 'all', 'inbox', false, true,
     'demo-msg-0203', false, true,
     NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), v_case_661209, v_ch_661209_cli, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'phyllis.njenga@gha-international.org', ARRAY['rania.guleid@gha-international.org'],
     'RE: Ref 661209 — Quote HAM-DXB — USD 2.85/kg',
     'Dear Phyllis, we have received a quote from AfriKargo: USD 2.85/kg all-in for 420 kg = USD 1,197. Departure Tuesday on EK054, delivery Thursday/Friday. Please confirm by Monday noon to hold the space.',
     'email', 'all', 'sent', false, true,
     'demo-msg-0204', false, true,
     NOW() - INTERVAL '2 days');

  -- ══════════════════════════════════════════════════════════════
  -- EMAIL MESSAGES — Case 554107 — NBO → LHR (client_confirmed)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO email_messages
    (id, case_id, channel_id, mailbox_id, direction, sender_email, sender_persona,
     recipient_email, cc, subject, body_preview, message_type,
     visibility, folder, is_starred, is_read,
     nylas_message_id, has_attachments, is_processed, created_at)
  VALUES
    (gen_random_uuid(), v_case_554107, v_ch_554107_cli, v_mbx_id,
     'inbound', 'thomas.mueller@hartmann-logistics.de', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'Cold Chain Shipment NBO-LHR — Ref 554107',
     'Please arrange temperature-controlled air freight for pharmaceutical samples, 180 kg, Nairobi to London. Temp requirement: 2–8 °C throughout. Shipper: AfroPharma Ltd, Nairobi. Consignee: BioMedica UK, Heathrow.',
     'email', 'all', 'inbox', false, true,
     'demo-msg-0301', false, true,
     NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), v_case_554107, v_ch_554107_ven, v_mbx_id,
     'outbound', 'freightmate58@gmail.com', 'internal',
     'grace.wachira@transglobelogistics.com', ARRAY[]::text[],
     'Rate Request — NBO-LHR — Cold Chain 180 kg — Ref 554107',
     'Dear Grace, please quote for 180 kg temp-controlled (2–8 °C) pharmaceutical cargo NBO–LHR. Shipper in Nairobi. Consignee at LHR. What is your next available cold-chain capacity and rate?',
     'email', 'all', 'sent', false, true,
     'demo-msg-0302', false, true,
     NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),

    (gen_random_uuid(), v_case_554107, v_ch_554107_ven, v_mbx_id,
     'inbound', 'grace.wachira@transglobelogistics.com', 'vendor',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Cold Chain NBO-LHR — Rate Confirmed',
     'Hi, confirmed rate GBP 3,200 all-in for 180 kg on KQ101 (NBO-LHR) departing Thursday. Full cold-chain custody maintained. Temperature log provided on delivery. Please confirm by Wednesday to book.',
     'email', 'all', 'inbox', false, true,
     'demo-msg-0303', false, true,
     NOW() - INTERVAL '2 days'),

    (gen_random_uuid(), v_case_554107, v_ch_554107_cli, v_mbx_id,
     'inbound', 'thomas.mueller@hartmann-logistics.de', 'client',
     'freightmate58@gmail.com', ARRAY[]::text[],
     'RE: Ref 554107 — Confirmed — Please Proceed',
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
     'demo-msg-0006',
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
     'demo-msg-0005',
     5,
     'claude-sonnet-4-6',
     '[{"position":1,"label":"Quote confirmed","completed":true},{"position":2,"label":"Truck loaded","completed":true},{"position":3,"label":"Border clearance","completed":false},{"position":4,"label":"Delivery","completed":false}]'::jsonb,
     NOW() - INTERVAL '1 day');

  -- ══════════════════════════════════════════════════════════════
  -- MANAGER TEAM MEMBERS
  -- Links manager → operator so manager dashboard shows KPIs
  -- ══════════════════════════════════════════════════════════════
  IF v_mgr_id IS NOT NULL THEN
    INSERT INTO manager_team_members (manager_id, operator_id)
    VALUES (v_mgr_id, v_op_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Demo seed complete. 4 cases (490428, 782351, 661209, 554107) created for operator %', v_op_id;
END;
$$;

COMMIT;
