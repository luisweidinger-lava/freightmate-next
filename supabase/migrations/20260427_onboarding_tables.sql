-- ── Onboarding tables ───────────────────────────────────────────────────────

-- Ties each Supabase auth.users identity to onboarding state and mailbox
CREATE TABLE IF NOT EXISTS app_users (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mailbox_id           uuid REFERENCES mailboxes(id) ON DELETE SET NULL,
  onboarding_step      int  NOT NULL DEFAULT 1,
  onboarding_complete  bool NOT NULL DEFAULT false,
  month_range_months   int,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Resumable ingestion job tracker (one row per coordinator onboarding run)
CREATE TABLE IF NOT EXISTS onboarding_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','paused','completed','failed')),
  total_estimated   int,
  fetched_count     int  NOT NULL DEFAULT 0,
  page_cursor       text,
  started_at        timestamptz,
  completed_at      timestamptz,
  error_detail      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Audit log: consent accepted, checkpoints, errors, account deletion
CREATE TABLE IF NOT EXISTS onboarding_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  event_type  text        NOT NULL,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- PII-stripped audit archive — consent + deletion events must survive account deletion
CREATE TABLE IF NOT EXISTS audit_archive (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,
  created_at  timestamptz NOT NULL
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE app_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_archive     ENABLE ROW LEVEL SECURITY;

-- Each coordinator can only see and modify their own row
CREATE POLICY "own_row" ON app_users
  FOR ALL USING (id = auth.uid());

CREATE POLICY "own_jobs" ON onboarding_jobs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "own_events" ON onboarding_events
  FOR ALL USING (user_id = auth.uid());

-- audit_archive is write-only from the client; reads are service-role only
CREATE POLICY "no_client_read" ON audit_archive
  FOR SELECT USING (false);

-- ── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER onboarding_jobs_updated_at
  BEFORE UPDATE ON onboarding_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
