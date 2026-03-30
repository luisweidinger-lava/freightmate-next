# FreightMate — System Architecture Flowchart Guide

This document describes the complete FreightMate system architecture in enough detail to manually recreate it as a MURAL flowchart. It covers every component, how they connect, and what data flows between them.

---

## Recommended Board Layout

Arrange the board in **three horizontal rows** from top to bottom:

1. **Top row** — External world, email infrastructure, n8n automation, AI services
2. **Middle row** — Supabase database (the central hub everything reads/writes)
3. **Bottom row** — Next.js web application deployed on Vercel

Use vertical connector arrows between rows to show data flowing up and down.

---

## Color Coding

| Zone | Color | What goes here |
|------|-------|----------------|
| External / Email input | Light blue | Gmail, Nylas |
| n8n Automation | Light green | WF1–WF7 |
| AI Services | Light purple | Claude, OpenAI |
| Supabase Database | Light amber/yellow | All 14 tables |
| Next.js / Vercel | Light indigo | Pages + API routes |
| MCP Server | Light gray | MCP infrastructure |

---

## Row 1 — Top: External Input → Automation → AI

### Zone A: External Input (far left)

**Gmail Account**
- Email address: `freightmate58@gmail.com`
- Role: the actual mailbox — receives inbound freight enquiries, vendor quotes, client confirmations
- Connected to Nylas via OAuth grant

### Zone B: Nylas EU (center-left)

**Nylas Email Infrastructure**
- Region: EU (`api.eu.nylas.com`)
- Grant ID: `0d720d76-fc61-4d5a-a99a-5961a35ba54e`
- Responsibilities:
  - Receives Gmail events via webhook and pushes them to n8n WF1
  - Sends outbound emails on behalf of FreightMate (WF6 + manual sends)
  - Provides message threading via `nylas_message_id` and `nylas_thread_id`

**Connections from Nylas:**
- → n8n WF1 (webhook push of every inbound message)
- → Next.js API `/api/nylas-sync` (manual pull of recent messages)
- ← n8n WF6 (sends approved AI drafts via Nylas)
- ← Next.js API `/api/send-email` (sends manual replies)

### Zone C: n8n Cloud Automation (center)

This is the automation backbone. Seven workflows run on n8n Cloud. They communicate with Supabase via direct REST API calls (Supabase PostgREST) authenticated with the service role key. They are triggered by webhooks or schedules.

All webhook calls from Next.js to n8n include the header `X-AxisLog-Key: <secret>` for authentication.

---

#### WF1 — Inbound Email Processor

**Trigger:** Nylas webhook (fires on every new inbound Gmail message)

**Purpose:** Deduplicate, classify, and route each inbound email to the right workflow.

**Steps in order:**
1. Receive webhook payload from Nylas
2. Extract fields from the raw message (subject, sender, body, thread ID)
3. Check duplicate — query Supabase `email_messages` to see if this `nylas_message_id` was already processed; if yes, stop
4. Try to match to an existing case using three strategies in order:
   - **Thread ID match** — look up `case_channels` where `nylas_thread_id` matches → if found, route to WF3
   - **Reference number match** — scan subject/body for a case reference code (e.g. `AX-2025-001`) → look up in `shipment_facts` → if found, route to WF3
   - **Sender classification** — check if sender is a known vendor (in `vendors` table) or known client (in `clients` table)
5. If match found → route to **WF3 (Case Update)**
6. If no match found → route to **WF2 (New Case Creator)**
7. If completely unrecognised → insert raw email into `email_messages` with `is_processed = false`, stop for manual triage

---

#### WF2 — New Case Creator

**Trigger:** Called by WF1 (sub-workflow execution)

**Purpose:** Create a brand new shipment case from a first-contact email.

**Steps in order:**
1. Receive email payload from WF1
2. **OpenAI gpt-4o-mini** — extract structured facts from the email body:
   - Origin, destination, cargo description, weight, dimensions, incoterms, requested dates, client name
3. Parse the AI JSON response
4. Generate a unique case code (e.g. `AX-2025-042`) via Supabase sequence
5. **INSERT** into `shipment_cases` — new case record with status `enquiry`
6. **INSERT** into `case_channels` — link the case to the sender's email channel
7. **INSERT** into `email_messages` — store the inbound email, now linked to `case_id` + `channel_id`
8. **INSERT** into `shipment_events` — log `case_created` event
9. **INSERT** into `draft_tasks` — queue a first-response draft task
10. Call **WF4** to generate the thread summary

---

#### WF3 — Case Update

**Trigger:** Called by WF1 (sub-workflow execution)

**Purpose:** Process an inbound email on an existing case and classify what type of update it is.

**Steps in order:**
1. Load the existing case from `shipment_cases`
2. Load active channels and vendors for that case
3. **Classify the message** using a rule-based switch:
   - `quote_received` — vendor sent back a price
   - `client_confirmed` — client approved the quote/booking
   - `document_received` — label, AWB, or shipping doc attached
   - `general_update` — anything else
4. Route by type:
   - **Quote received path:**
     - OpenAI extracts the quoted price, transit time, carrier name
     - PATCH `shipment_cases` — set `quote_received = true`, store price
     - Upsert `case_channels` — update vendor channel with quote data
     - INSERT `email_messages` + `draft_tasks` (draft to forward quote to client)
     - INSERT `shipment_events` — log `quote_received`
     - Call WF4 to update summary
   - **Client confirmed path:**
     - PATCH `shipment_cases` — set `client_confirmed = true`, status → `booked`
     - INSERT `email_messages` + `draft_tasks` (booking confirmation draft)
     - INSERT `shipment_events` — log `client_confirmed`
     - Download label attachment from Nylas if present
     - Upload label to Supabase Storage
     - Call WF4 to update summary
   - **General update path:**
     - INSERT `email_messages`
     - INSERT `draft_tasks`
     - Call WF4 to update summary

---

#### WF4 — Summary Updater

**Trigger:** Called by WF2 or WF3 (sub-workflow execution)

**Purpose:** Maintain a rolling AI-generated summary of every case thread.

**Steps in order:**
1. Load the current `thread_summaries` row for this case (if any)
2. Load the last 5 email messages for the case
3. Load case facts from `shipment_facts`
4. Build a prompt combining: case facts + email thread + previous summary
5. **Claude Sonnet** — generate a structured summary containing:
   - `summary` — 2–3 sentence plain-English thread overview
   - `tone` — `positive` / `neutral` / `urgent`
   - `risks` — array of identified risks
   - `promises` — array of commitments made
6. Parse the Claude JSON response
7. UPSERT `thread_summaries` — update or create the summary row

---

#### WF5 — Draft Generator

**Trigger:** Two entry points:
- Webhook trigger (called by Next.js `/api/request-draft` for manual "Request AI Draft" button)
- Polled by WF7 and WF3 by inserting `draft_tasks` rows

**Purpose:** Generate an AI draft reply for any pending draft task.

**Steps in order:**
1. Query `draft_tasks` where `status = pending`
2. If none pending → stop
3. Mark task as `generating`
4. For each pending task (batched):
   - Load the case from `shipment_cases`
   - Load the thread summary from `thread_summaries`
   - Load the last 3 messages from `email_messages`
   - Load the recipient from `contacts` / `case_contacts`
   - Build a prompt: context + tone instructions + what the draft should accomplish
   - **Claude Sonnet** — generate the draft email (subject + body)
   - Parse the response
   - INSERT into `message_drafts` — store the draft with status `pending_approval`
   - PATCH `draft_tasks` — mark as `ready`

---

#### WF6 — Draft Sender

**Trigger:** Webhook from Next.js `/api/approve-draft` (manager clicks "Approve & Send" in the UI)

**Purpose:** Send an approved AI draft via Nylas and record the outcome.

**Steps in order:**
1. Receive webhook with `draft_id` and any manager edits to the text
2. Validate `X-AxisLog-Key` secret
3. Load the draft from `message_drafts`
4. Apply manager edits to the draft body
5. Load the associated channel from `case_channels` to get the `nylas_thread_id`
6. Decide: is this a reply to an existing thread, or a new email?
   - **Reply:** build payload with `reply_to_message_id = nylas_thread_id`
   - **New:** build standard email payload
7. **Send via Nylas** EU API
8. UPDATE `message_drafts` — set status `sent`, store `nylas_message_id`
9. UPDATE `case_channels` — update `last_outbound_at`
10. INSERT `shipment_events` — log `draft_sent`
11. PATCH `shipment_cases` — update `last_activity_at`

---

#### WF7 — Follow-up Checker

**Trigger:** Schedule — runs every 2 days automatically

**Purpose:** Detect stale cases and queue follow-up drafts.

**Steps in order:**
1. Calculate cutoff date = today minus 2 days
2. Query `shipment_cases` for active cases where `last_activity_at < cutoff` and status is not `closed` or `cancelled`
3. If no stale cases → stop
4. Loop over each stale case:
   - Check if there is already a `draft_task` with `status = pending` or `generating` for this case
   - If yes → skip (draft already in progress)
   - If no → INSERT `draft_tasks` with `type = follow_up`
   - INSERT `shipment_events` — log `follow_up_queued`
5. WF5 will pick up the new `draft_tasks` on its next run

---

### Zone D: AI Services (far right of top row)

Two AI services are used:

**OpenAI (gpt-4o-mini)**
- Used by: WF2 (fact extraction), WF3 (quote extraction)
- Purpose: Structured data extraction from unstructured email text
- Called directly from n8n via the OpenAI node

**Claude Sonnet (Anthropic)**
- Used by: WF4 (thread summary), WF5 (draft generation)
- Purpose: Higher-quality reasoning for summaries and draft composition
- Called directly from n8n via the OpenAI-compatible node (Anthropic API)

---

## Row 2 — Middle: Supabase Database

Supabase is the single source of truth. Everything reads from and writes to it.

Organise the tables into **4 sub-groups** within the Supabase zone:

### Sub-group 1: Cases
| Table | Purpose |
|-------|---------|
| `shipment_cases` | One row per freight case. Core fields: `case_ref`, `status`, `client_id`, `last_activity_at` |
| `shipment_facts` | Key-value store of extracted facts per case (origin, destination, cargo, weight, etc.) |
| `shipment_events` | Chronological event log per case (case_created, quote_received, draft_sent, etc.) |

### Sub-group 2: Email
| Table | Purpose |
|-------|---------|
| `email_messages` | Every email (inbound + outbound). Key fields: `nylas_message_id`, `nylas_thread_id`, `case_id`, `channel_id`, `direction`, `folder` |
| `case_channels` | One row per communication channel per case (e.g. client channel, vendor channel). Stores `nylas_thread_id` for threading |
| `mailboxes` | Registered mailbox accounts connected via Nylas |

### Sub-group 3: AI / Drafts
| Table | Purpose |
|-------|---------|
| `draft_tasks` | Queue of draft generation jobs. Fields: `case_id`, `status` (pending/generating/ready), `type` |
| `message_drafts` | Generated AI draft content awaiting approval. Fields: `subject`, `body`, `status` (pending_approval/sent/rejected) |
| `thread_summaries` | Latest AI summary per case. Fields: `summary`, `tone`, `risks[]`, `promises[]` |

### Sub-group 4: Contacts
| Table | Purpose |
|-------|---------|
| `contacts` | Individual people (clients, vendor contacts) |
| `case_contacts` | Junction table: which contacts are involved in which case |
| `clients` | Client companies |
| `vendors` | Freight vendor/carrier companies |
| `shipments` | Physical shipment records linked to cases |

---

## Row 3 — Bottom: Next.js Application on Vercel

### API Routes (server-side, no UI)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/nylas-sync` | POST | Manual sync — fetches last 50 messages from Nylas EU and upserts into `email_messages`. Used before n8n WF1 is fully active. |
| `/api/send-email` | POST | Manual email send — sends via Nylas and inserts the sent message into `email_messages` with `case_id` + `channel_id` for thread linking |
| `/api/request-draft` | POST | Triggers WF5 via n8n webhook to request an AI draft for a case |
| `/api/approve-draft` | POST | Triggers WF6 via n8n webhook to approve and send a draft |
| `/api/mcp-gateway` | POST | Proxy to the MCP server (port 3001) — adds Bearer auth and forwards MCP protocol messages |

### Pages (user-facing UI)

| Page | Purpose |
|------|---------|
| `/` (redirect) | Redirects to `/dashboard` |
| `/dashboard` | KPI overview — pipeline stages, SLA dots, pending draft count, recent activity |
| `/inbox` | Full email inbox — folders: inbox, sent, drafts, starred, spam, bin |
| `/cases` | List of all shipment cases with status filters |
| `/cases/[ref]` | Individual case detail — 4-column workbench: email thread, AI summary, facts, timeline |
| `/drafts` | Pending AI drafts awaiting approval — approve/reject/edit before sending |
| `/sent` | Sent email history |
| `/crm` | Contact and client/vendor management |
| `/reports` | Analytics — case volume, SLA performance, draft approval rates |
| `/workbench` | Full-screen email thread workbench view |
| `/starred` | Starred messages |
| `/spam` | Spam folder |
| `/bin` | Deleted messages |

---

## MCP Server (separate process, port 3001)

The MCP (Model Context Protocol) server is a separate Node.js process that runs alongside the Next.js app. It provides a privacy-controlled gateway for AI agents to access Supabase data.

- Transport: Streamable HTTP
- Auth: Bearer token (`MCP_SERVER_SECRET`)
- Entry point: `mcp/src/server.ts`
- Accessed via: Next.js `/api/mcp-gateway` proxy route
- Future use: n8n workflows will call the MCP server instead of Supabase directly, enabling fine-grained data access control

---

## Key Data Flow Sequences

### Sequence 1: New inbound freight enquiry
```
Gmail receives email
  → Nylas detects it (webhook)
    → n8n WF1 receives webhook
      → WF1: dedup check (Supabase email_messages)
      → WF1: no match found → call WF2
        → WF2: OpenAI extracts facts
        → WF2: creates shipment_cases + case_channels + email_messages
        → WF2: queues draft_task
        → WF2: calls WF4
          → WF4: Claude generates thread_summary
        → WF5 (later): picks up draft_task
          → WF5: Claude generates message_draft
            → Manager sees draft in /drafts page
              → Manager clicks Approve
                → Next.js /api/approve-draft
                  → n8n WF6 webhook
                    → WF6: sends via Nylas
                      → Gmail sends the email
```

### Sequence 2: Manual reply by manager
```
Manager opens case in /cases/[ref]
  → Clicks Reply in workbench
    → InlineCompose component
      → POST /api/send-email (with case_id + channel_id)
        → Nylas EU sends email
        → email_messages row inserted (folder=sent, linked to case)
          → Message appears in workbench thread
```

### Sequence 3: AI draft request
```
Manager clicks "Request AI Draft" in /cases/[ref]
  → POST /api/request-draft
    → n8n WF5 webhook
      → WF5: loads case + summary + last 3 messages
      → WF5: Claude generates draft
      → WF5: inserts message_drafts (status=pending_approval)
        → Draft appears in /drafts page
```

### Sequence 4: Stale case follow-up
```
n8n WF7 runs every 2 days (scheduled)
  → Queries shipment_cases for last_activity_at < 2 days ago
    → For each stale case: inserts draft_tasks (type=follow_up)
      → WF5 picks up the task
        → Claude generates follow-up draft
          → Manager approves in /drafts → WF6 sends it
```

---

## Connection Summary (for drawing arrows)

| From | To | Data |
|------|----|------|
| Gmail | Nylas EU | Raw email |
| Nylas EU | n8n WF1 | Webhook payload |
| Next.js `/api/nylas-sync` | Nylas EU | Fetch request |
| Nylas EU | `/api/nylas-sync` | Message list |
| `/api/nylas-sync` | Supabase `email_messages` | Upsert |
| n8n WF1 | Supabase `email_messages` | Dedup check |
| n8n WF1 | n8n WF2 | Sub-workflow call |
| n8n WF1 | n8n WF3 | Sub-workflow call |
| n8n WF2 | OpenAI | Fact extraction prompt |
| n8n WF2 | Supabase (5 tables) | INSERT |
| n8n WF3 | OpenAI | Quote extraction prompt |
| n8n WF3 | Supabase (multiple tables) | PATCH / INSERT |
| n8n WF3 | n8n WF4 | Sub-workflow call |
| n8n WF2 | n8n WF4 | Sub-workflow call |
| n8n WF4 | Supabase `email_messages` | Load last 5 |
| n8n WF4 | Supabase `thread_summaries` | UPSERT |
| n8n WF4 | Claude API | Summary prompt |
| n8n WF5 | Supabase `draft_tasks` | GET + PATCH |
| n8n WF5 | Supabase `thread_summaries` | Load |
| n8n WF5 | Claude API | Draft prompt |
| n8n WF5 | Supabase `message_drafts` | INSERT |
| n8n WF6 | Nylas EU | Send email |
| n8n WF6 | Supabase `message_drafts` | UPDATE sent |
| n8n WF7 | Supabase `shipment_cases` | Query stale |
| n8n WF7 | Supabase `draft_tasks` | INSERT follow-up |
| Next.js `/api/send-email` | Nylas EU | Send email |
| Next.js `/api/send-email` | Supabase `email_messages` | INSERT |
| Next.js `/api/request-draft` | n8n WF5 | Webhook |
| Next.js `/api/approve-draft` | n8n WF6 | Webhook |
| Next.js pages | Supabase (all tables) | SELECT (read) |
| Next.js `/api/mcp-gateway` | MCP Server :3001 | Proxy |
| MCP Server :3001 | Supabase | Controlled reads |
