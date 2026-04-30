-- ============================================================
-- Migration: crm_visibility_scope
-- Purpose: Add visibility_scope, owner_user_id, org_id to contacts.
--          All existing rows default to org-scope with no owner.
-- Rollback: See bottom of file.
-- ============================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS visibility_scope TEXT NOT NULL DEFAULT 'org'
    CHECK (visibility_scope IN ('private', 'org')),
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id);

-- Backfill: existing rows → org-scope, single org (development)
UPDATE contacts
  SET org_id = (SELECT id FROM organisations LIMIT 1)
  WHERE org_id IS NULL;

ALTER TABLE contacts ALTER COLUMN org_id SET NOT NULL;

-- contacts SELECT policy
CREATE POLICY "con_read" ON contacts FOR SELECT TO authenticated
  USING (
    (visibility_scope = 'private' AND owner_user_id = auth.uid())
    OR (visibility_scope = 'org' AND org_id = current_user_org_id())
    OR (
      needs_review = true
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'manager' AND org_id = contacts.org_id
      )
    )
  );

-- contacts INSERT: must set correct owner + org
CREATE POLICY "con_insert" ON contacts FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND org_id = current_user_org_id()
  );

-- contacts UPDATE: owner of any record OR manager for org-scope records
CREATE POLICY "con_update" ON contacts FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR (
      visibility_scope = 'org'
      AND org_id = current_user_org_id()
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
    )
    OR (
      needs_review = true
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'manager' AND org_id = contacts.org_id
      )
    )
  );

-- clients: inherit from parent contact
CREATE POLICY "cli_read" ON clients FOR SELECT TO authenticated
  USING (
    contact_id IS NULL
    OR contact_id IN (
      SELECT id FROM contacts
      WHERE (visibility_scope = 'private' AND owner_user_id = auth.uid())
         OR (visibility_scope = 'org' AND org_id = current_user_org_id())
    )
  );

CREATE POLICY "cli_write" ON clients FOR ALL TO authenticated
  WITH CHECK (
    contact_id IS NULL
    OR contact_id IN (
      SELECT id FROM contacts
      WHERE owner_user_id = auth.uid()
         OR (visibility_scope = 'org' AND org_id = current_user_org_id())
    )
  );

-- vendors: same pattern as clients
CREATE POLICY "ven_read" ON vendors FOR SELECT TO authenticated
  USING (
    contact_id IS NULL
    OR contact_id IN (
      SELECT id FROM contacts
      WHERE (visibility_scope = 'private' AND owner_user_id = auth.uid())
         OR (visibility_scope = 'org' AND org_id = current_user_org_id())
    )
  );

CREATE POLICY "ven_write" ON vendors FOR ALL TO authenticated
  WITH CHECK (
    contact_id IS NULL
    OR contact_id IN (
      SELECT id FROM contacts
      WHERE owner_user_id = auth.uid()
         OR (visibility_scope = 'org' AND org_id = current_user_org_id())
    )
  );

-- ============================================================
-- Rollback:
-- ============================================================
-- DROP POLICY IF EXISTS "con_read"   ON contacts;
-- DROP POLICY IF EXISTS "con_insert" ON contacts;
-- DROP POLICY IF EXISTS "con_update" ON contacts;
-- DROP POLICY IF EXISTS "cli_read"   ON clients;
-- DROP POLICY IF EXISTS "cli_write"  ON clients;
-- DROP POLICY IF EXISTS "ven_read"   ON vendors;
-- DROP POLICY IF EXISTS "ven_write"  ON vendors;
-- ALTER TABLE contacts DROP COLUMN IF EXISTS visibility_scope;
-- ALTER TABLE contacts DROP COLUMN IF EXISTS owner_user_id;
-- ALTER TABLE contacts DROP COLUMN IF EXISTS org_id;
