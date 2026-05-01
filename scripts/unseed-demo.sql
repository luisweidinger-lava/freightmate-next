-- ============================================================
-- FreightMate — Demo teardown
-- Removes all data inserted by seed-demo.sql.
-- Safe: anchors on '__demo' tag — never touches real cases.
-- Run in Supabase SQL editor (service role) or via psql.
-- ============================================================

BEGIN;

DO $$
DECLARE
  demo_ids uuid[];
BEGIN
  SELECT ARRAY_AGG(id) INTO demo_ids
  FROM shipment_cases
  WHERE '__demo' = ANY(tags);

  IF demo_ids IS NULL OR array_length(demo_ids, 1) = 0 THEN
    RAISE NOTICE 'No demo cases found — nothing to remove.';
    RETURN;
  END IF;

  RAISE NOTICE 'Removing demo cases: %', demo_ids;

  -- ── Case children (dependency order) ───────────────────────
  DELETE FROM message_drafts   WHERE case_id = ANY(demo_ids);
  DELETE FROM draft_tasks      WHERE case_id = ANY(demo_ids);
  DELETE FROM thread_summaries WHERE case_id = ANY(demo_ids);
  DELETE FROM shipment_events  WHERE case_id = ANY(demo_ids);
  DELETE FROM case_contacts    WHERE case_id = ANY(demo_ids);
  DELETE FROM email_messages   WHERE case_id = ANY(demo_ids);
  DELETE FROM case_channels    WHERE case_id = ANY(demo_ids);
  DELETE FROM shipment_cases   WHERE id      = ANY(demo_ids);

  -- ── CRM data (identified by demo company domains) ──────────
  DELETE FROM clients
  WHERE email LIKE '%@gha-international.org'
     OR email LIKE '%@hartmann-logistics.de';

  DELETE FROM vendors
  WHERE email LIKE '%@transglobelogistics.com'
     OR email LIKE '%@nilestarlogistics.com'
     OR email LIKE '%@afrikargo.com';

  DELETE FROM contacts
  WHERE company_domain IN (
    'gha-international.org',
    'hartmann-logistics.de',
    'transglobelogistics.com',
    'nilestarlogistics.com',
    'afrikargo.com'
  );

  -- ── Manager team link ───────────────────────────────────────
  -- Only removes the link; does not touch the manager or operator accounts.
  DELETE FROM manager_team_members
  WHERE manager_id  = (SELECT id FROM profiles WHERE role = 'manager'  ORDER BY created_at LIMIT 1)
    AND operator_id = (SELECT id FROM profiles WHERE role = 'operator' ORDER BY created_at LIMIT 1);

  RAISE NOTICE 'Demo teardown complete. All demo data removed. Users and organisation untouched.';
END;
$$;

COMMIT;
