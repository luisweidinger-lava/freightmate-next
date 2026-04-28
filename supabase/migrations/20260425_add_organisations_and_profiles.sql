-- Organisations: one row per company using FreightMate.
-- domain is the email domain used to auto-assign users (e.g. "companyx.com").
CREATE TABLE IF NOT EXISTS organisations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  domain     text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles: one row per authenticated user.
-- Auto-created by the trigger below on first sign-in.
-- role defaults to 'operator'; a manager can promote to 'manager' via the UI.
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       uuid REFERENCES organisations(id) ON DELETE SET NULL,
  email        text NOT NULL,
  display_name text,
  role         text NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'manager')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Link mailboxes to an organisation.
ALTER TABLE mailboxes
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id) ON DELETE SET NULL;

-- Trigger function: runs after a new auth.users row is inserted (i.e. first sign-in).
-- Extracts the email domain, looks up the matching org, and inserts a profile.
-- If no org matches the domain, org_id is left NULL.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain   text;
  v_org_id   uuid;
BEGIN
  v_domain := split_part(NEW.email, '@', 2);

  SELECT id INTO v_org_id
  FROM organisations
  WHERE domain = v_domain
  LIMIT 1;

  INSERT INTO profiles (id, org_id, email, display_name, role)
  VALUES (
    NEW.id,
    v_org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'operator'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
