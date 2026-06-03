-- Case access grants: allows a manager to request + receive read-only access
-- to a case owned by an operator.

CREATE TABLE case_access_grants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      uuid NOT NULL REFERENCES shipment_cases(id) ON DELETE CASCADE,
  manager_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operator_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'granted', 'revoked')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  UNIQUE (case_id, manager_id)
);

CREATE INDEX idx_case_access_grants_case_id     ON case_access_grants (case_id);
CREATE INDEX idx_case_access_grants_manager_id  ON case_access_grants (manager_id);
CREATE INDEX idx_case_access_grants_operator_id ON case_access_grants (operator_id);

ALTER TABLE case_access_grants ENABLE ROW LEVEL SECURITY;

-- Manager can insert new requests and read/update their own
CREATE POLICY "manager_own_grants" ON case_access_grants
  FOR ALL
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- Operator can read and update grants for their own cases
CREATE POLICY "operator_case_grants" ON case_access_grants
  FOR ALL
  USING (operator_id = auth.uid())
  WITH CHECK (operator_id = auth.uid());

-- Enable realtime for this table so postgres_changes subscriptions fire
ALTER PUBLICATION supabase_realtime ADD TABLE case_access_grants;
