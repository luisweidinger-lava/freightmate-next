-- Add cc/bcc fields to message_drafts for user-composed drafts.
-- User-composed drafts are identified by draft_task_id IS NULL AND sent_at IS NULL.
ALTER TABLE message_drafts
  ADD COLUMN IF NOT EXISTS cc_emails  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bcc_emails text[] NOT NULL DEFAULT '{}';
