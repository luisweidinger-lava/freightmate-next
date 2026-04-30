-- ============================================================
-- Migration: drop_permissive_policies
-- Purpose: Remove the internal_anon_all bypass policies now
--          that scoped policies are in place and verified.
-- IMPORTANT: Only apply after 20260430_add_scoped_rls_policies.sql
--            and 20260430_crm_visibility_scope.sql are verified working.
-- Rollback: See bottom of file.
-- ============================================================

-- Operational tables (scoped policies added in 20260430_add_scoped_rls_policies.sql)
DROP POLICY IF EXISTS "internal_anon_all" ON shipment_cases;
DROP POLICY IF EXISTS "internal_anon_all" ON email_messages;
DROP POLICY IF EXISTS "internal_anon_all" ON draft_tasks;
DROP POLICY IF EXISTS "internal_anon_all" ON message_drafts;
DROP POLICY IF EXISTS "internal_anon_all" ON case_channels;
DROP POLICY IF EXISTS "internal_anon_all" ON thread_summaries;
DROP POLICY IF EXISTS "internal_anon_all" ON shipment_facts;
DROP POLICY IF EXISTS "internal_anon_all" ON shipment_events;
DROP POLICY IF EXISTS "internal_anon_all" ON shipments;

-- CRM tables (scoped policies added in 20260430_crm_visibility_scope.sql)
DROP POLICY IF EXISTS "internal_anon_all" ON contacts;
DROP POLICY IF EXISTS "internal_anon_all" ON clients;
DROP POLICY IF EXISTS "internal_anon_all" ON vendors;

-- ============================================================
-- Rollback (recreate permissive policies if something breaks):
-- ============================================================
-- CREATE POLICY "internal_anon_all" ON shipment_cases    FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON email_messages    FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON draft_tasks       FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON message_drafts    FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON case_channels     FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON thread_summaries  FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON shipment_facts    FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON shipment_events   FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON shipments         FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON contacts          FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON clients           FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "internal_anon_all" ON vendors           FOR ALL TO anon USING (true) WITH CHECK (true);
