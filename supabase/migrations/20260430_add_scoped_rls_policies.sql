-- ============================================================
-- Migration: add_scoped_rls_policies
-- Purpose: Add ownership-scoped SELECT/INSERT/UPDATE/DELETE
--          policies alongside existing internal_anon_all.
--          Do NOT drop internal_anon_all in this migration.
-- Rollback: DROP all policies created in this file (see bottom).
-- ============================================================

-- Helper function: get org_id for current user
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;

-- ── shipment_cases ────────────────────────────────────────────
-- SELECT: operator sees own; manager sees same-org
CREATE POLICY "sc_operator_select" ON shipment_cases
  FOR SELECT TO authenticated
  USING (operator_id = auth.uid());

CREATE POLICY "sc_manager_org_select" ON shipment_cases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'manager'
        AND org_id = (SELECT org_id FROM profiles WHERE id = shipment_cases.operator_id)
    )
  );

-- INSERT/UPDATE/DELETE: operator owns
CREATE POLICY "sc_operator_insert" ON shipment_cases
  FOR INSERT TO authenticated WITH CHECK (operator_id = auth.uid());

CREATE POLICY "sc_operator_update" ON shipment_cases
  FOR UPDATE TO authenticated
  USING (operator_id = auth.uid()) WITH CHECK (operator_id = auth.uid());

CREATE POLICY "sc_operator_delete" ON shipment_cases
  FOR DELETE TO authenticated USING (operator_id = auth.uid());

-- ── email_messages ────────────────────────────────────────────
CREATE POLICY "em_own_mailbox_select" ON email_messages
  FOR SELECT TO authenticated
  USING (mailbox_id IN (SELECT mailbox_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "em_own_mailbox_insert" ON email_messages
  FOR INSERT TO authenticated
  WITH CHECK (mailbox_id IN (SELECT mailbox_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "em_own_mailbox_update" ON email_messages
  FOR UPDATE TO authenticated
  USING (mailbox_id IN (SELECT mailbox_id FROM app_users WHERE id = auth.uid()))
  WITH CHECK (mailbox_id IN (SELECT mailbox_id FROM app_users WHERE id = auth.uid()));

-- ── draft_tasks ───────────────────────────────────────────────
CREATE POLICY "dt_operator_all" ON draft_tasks
  FOR ALL TO authenticated
  USING (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()))
  WITH CHECK (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()));

CREATE POLICY "dt_manager_select" ON draft_tasks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ── message_drafts ────────────────────────────────────────────
CREATE POLICY "md_operator_all" ON message_drafts
  FOR ALL TO authenticated
  USING (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()))
  WITH CHECK (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()));

CREATE POLICY "md_manager_select" ON message_drafts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

CREATE POLICY "md_manager_update" ON message_drafts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ── case_channels ─────────────────────────────────────────────
CREATE POLICY "cc_operator_all" ON case_channels
  FOR ALL TO authenticated
  USING (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()))
  WITH CHECK (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()));

CREATE POLICY "cc_manager_select" ON case_channels
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ── thread_summaries ──────────────────────────────────────────
-- Pre-flight confirmed: case_id exists (non-null)
CREATE POLICY "ts_operator_all" ON thread_summaries
  FOR ALL TO authenticated
  USING (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()))
  WITH CHECK (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()));

CREATE POLICY "ts_manager_select" ON thread_summaries
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ── shipment_facts ────────────────────────────────────────────
-- Pre-flight confirmed: case_id exists (non-null)
CREATE POLICY "sf_operator_all" ON shipment_facts
  FOR ALL TO authenticated
  USING (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()))
  WITH CHECK (case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid()));

CREATE POLICY "sf_manager_select" ON shipment_facts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ── shipment_events ───────────────────────────────────────────
-- Pre-flight confirmed: case_id exists (nullable — NULL rows are system events, not user-visible)
CREATE POLICY "se_operator_select" ON shipment_events
  FOR SELECT TO authenticated
  USING (
    case_id IS NOT NULL
    AND case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid())
  );

CREATE POLICY "se_manager_select" ON shipment_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ── shipments ─────────────────────────────────────────────────
-- Pre-flight confirmed: case_id exists (nullable — NULL rows excluded from user view)
CREATE POLICY "shp_operator_all" ON shipments
  FOR ALL TO authenticated
  USING (
    case_id IS NOT NULL
    AND case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid())
  )
  WITH CHECK (
    case_id IS NOT NULL
    AND case_id IN (SELECT id FROM shipment_cases WHERE operator_id = auth.uid())
  );

CREATE POLICY "shp_manager_select" ON shipments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ── profiles (currently no RLS) ──────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prof_read_own_and_org" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR org_id = current_user_org_id());

CREATE POLICY "prof_write_own" ON profiles
  FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── organisations (currently no RLS) ────────────────────────
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_own" ON organisations
  FOR SELECT TO authenticated
  USING (id = current_user_org_id());

CREATE POLICY "org_manager_update" ON organisations
  FOR UPDATE TO authenticated
  USING (
    id = current_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- ============================================================
-- Rollback (run if this migration needs to be reverted):
-- ============================================================
-- DROP FUNCTION IF EXISTS current_user_org_id();
-- DROP POLICY IF EXISTS "sc_operator_select"    ON shipment_cases;
-- DROP POLICY IF EXISTS "sc_manager_org_select" ON shipment_cases;
-- DROP POLICY IF EXISTS "sc_operator_insert"    ON shipment_cases;
-- DROP POLICY IF EXISTS "sc_operator_update"    ON shipment_cases;
-- DROP POLICY IF EXISTS "sc_operator_delete"    ON shipment_cases;
-- DROP POLICY IF EXISTS "em_own_mailbox_select" ON email_messages;
-- DROP POLICY IF EXISTS "em_own_mailbox_insert" ON email_messages;
-- DROP POLICY IF EXISTS "em_own_mailbox_update" ON email_messages;
-- DROP POLICY IF EXISTS "dt_operator_all"       ON draft_tasks;
-- DROP POLICY IF EXISTS "dt_manager_select"     ON draft_tasks;
-- DROP POLICY IF EXISTS "md_operator_all"       ON message_drafts;
-- DROP POLICY IF EXISTS "md_manager_select"     ON message_drafts;
-- DROP POLICY IF EXISTS "md_manager_update"     ON message_drafts;
-- DROP POLICY IF EXISTS "cc_operator_all"       ON case_channels;
-- DROP POLICY IF EXISTS "cc_manager_select"     ON case_channels;
-- DROP POLICY IF EXISTS "ts_operator_all"       ON thread_summaries;
-- DROP POLICY IF EXISTS "ts_manager_select"     ON thread_summaries;
-- DROP POLICY IF EXISTS "sf_operator_all"       ON shipment_facts;
-- DROP POLICY IF EXISTS "sf_manager_select"     ON shipment_facts;
-- DROP POLICY IF EXISTS "se_operator_select"    ON shipment_events;
-- DROP POLICY IF EXISTS "se_manager_select"     ON shipment_events;
-- DROP POLICY IF EXISTS "shp_operator_all"      ON shipments;
-- DROP POLICY IF EXISTS "shp_manager_select"    ON shipments;
-- DROP POLICY IF EXISTS "prof_read_own_and_org" ON profiles;
-- DROP POLICY IF EXISTS "prof_write_own"        ON profiles;
-- DROP POLICY IF EXISTS "org_read_own"          ON organisations;
-- DROP POLICY IF EXISTS "org_manager_update"    ON organisations;
-- ALTER TABLE profiles      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE organisations DISABLE ROW LEVEL SECURITY;
