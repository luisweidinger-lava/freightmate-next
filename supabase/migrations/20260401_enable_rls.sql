-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Row-Level Security on all FreightMate tables
-- Run this once in the Supabase SQL editor.
--
-- Context: FreightMate is an internal single-team operations tool.
-- The frontend uses the anon key directly (no user auth yet), so we
-- grant anon full access via explicit policy rather than leaving RLS
-- disabled. Service role continues to bypass RLS by default.
--
-- TODO: When Supabase Auth is added, replace `TO anon` with
-- `TO authenticated` and remove the anon grants.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.shipment_cases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_channels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_drafts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_facts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailboxes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments        ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permissive policies for internal anon access
-- (Single-team tool — no public users. Replace with auth policies later.)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "internal_anon_all" ON public.shipment_cases   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.email_messages   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.case_channels    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.draft_tasks      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.message_drafts   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.thread_summaries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.shipment_facts   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.shipment_events  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.contacts         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.case_contacts    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.mailboxes        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.vendors          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.clients          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "internal_anon_all" ON public.shipments        FOR ALL TO anon USING (true) WITH CHECK (true);
