-- 1a. Presence column on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 1b. Junction table: which operators a manager is watching
CREATE TABLE IF NOT EXISTS manager_team_members (
  manager_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (manager_id, operator_id)
);
ALTER TABLE manager_team_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'manager_team_members' AND policyname = 'manager can manage own team'
  ) THEN
    CREATE POLICY "manager can manage own team"
      ON manager_team_members FOR ALL USING (manager_id = auth.uid());
  END IF;
END $$;

-- 1c. get_team_kpis() — returns aggregate KPIs for the manager's watched operators
CREATE OR REPLACE FUNCTION get_team_kpis()
RETURNS TABLE (
  operator_id    uuid,
  operator_email text,
  display_name   text,
  active_cases   bigint,
  critical_cases bigint,
  last_seen_at   timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    p.email,
    p.display_name,
    COUNT(sc.id) FILTER (WHERE sc.status NOT IN ('closed','delivered'))             AS active_cases,
    COUNT(sc.id) FILTER (
      WHERE sc.status NOT IN ('closed','delivered') AND sc.priority IN ('high','urgent')
    )                                                                                AS critical_cases,
    p.last_seen_at
  FROM manager_team_members mtm
  JOIN profiles p ON p.id = mtm.operator_id
  LEFT JOIN shipment_cases sc ON sc.operator_id = p.id
  WHERE mtm.manager_id = auth.uid()
  GROUP BY p.id, p.email, p.display_name, p.last_seen_at;
$$;

-- 1d. get_org_operators() — all operators in same org, with in_team flag
CREATE OR REPLACE FUNCTION get_org_operators()
RETURNS TABLE (
  id           uuid,
  email        text,
  display_name text,
  in_team      boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    p.email,
    p.display_name,
    EXISTS (
      SELECT 1 FROM manager_team_members mtm
      WHERE mtm.manager_id = auth.uid() AND mtm.operator_id = p.id
    ) AS in_team
  FROM profiles p
  WHERE p.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND p.role = 'operator'
    AND p.id != auth.uid();
$$;
