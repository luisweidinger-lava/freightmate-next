-- Index profiles.org_id to speed up the manager RLS policy on shipment_cases.
-- The policy does: SELECT org_id FROM profiles WHERE id = shipment_cases.operator_id
-- for every row — this index makes that lookup O(1) instead of O(n).
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles (org_id);

-- Index to accelerate the manager org-match check in the RLS policy.
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles (id, role, org_id);

-- Index to speed up ORDER BY updated_at DESC on shipment_cases (cases list page).
-- Without this, the query requires a full sequential scan + in-memory sort.
-- Managers see all cases (no operator_id WHERE filter), making this the dominant cost.
CREATE INDEX IF NOT EXISTS idx_shipment_cases_updated_at ON shipment_cases (updated_at DESC);
