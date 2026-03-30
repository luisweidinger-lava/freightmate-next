@AGENTS.md

# CLAUDE.md — FreightMate / AxisLog

## Purpose

Central navigation layer for Claude Code in this project.

- Do NOT load the entire codebase
- Use this file as a navigation system
- Only open files relevant to the current task

---

## System Overview

FreightMate is a logistics operations platform.

- Email-driven shipment coordination
- Case-based workflow system
- AI-assisted operations (drafting, summarisation, automation)

### Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js — `app/` directory |
| Database | Supabase (PostgreSQL + PostgREST) |
| Logic layer | MCP server (`mcp/src/`, runs on port 3001 in dev) |
| Orchestration | n8n (`https://logra.app.n8n.cloud`) |
| Email | Nylas v3 EU (`https://api.eu.nylas.com`) |

Core views: Workbench (`/cases/[ref]`), Inbox (`/inbox`), CRM (`/crm`), Reports

### Architecture reference
`docs/freightmate-architecture-flowchart.md` — full WF1–WF7 flow description

---

## Core Domain Concepts

Understand these before any change:

| Concept | Table |
|---------|-------|
| Case | `shipment_cases` — central entity |
| Channel | `case_channels` — client or vendor communication stream per case |
| Email Message | `email_messages` — atomic unit |
| Thread | messages grouped by `case_id + channel_id` (not by inbox folder) |
| Draft | `message_drafts` + `draft_tasks` |

---

## Critical Rules

### 1. Do not load everything
Only identify and open the relevant files for the task at hand. Never read the full SQL schema, all workflows, or the entire frontend at once.

### 2. Trace data flow first
Before coding:
1. Where does data come from?
2. Where is it stored (Supabase table)?
3. How is it queried?
4. How is it rendered?

### 3. Supabase is source of truth
- Do NOT create parallel data models
- Do NOT fake frontend-only state for data that should persist

Core tables: `shipment_cases`, `case_channels`, `email_messages`, `message_drafts`, `contacts`, `clients`, `vendors`

### 4. Threading logic is critical
Threads must:
- combine inbound + outbound messages
- be grouped by `case_id + channel_id`
- never split sent vs inbox views

### 5. MCP is the logic layer
MCP orchestrates logic and controls data flow. It does NOT store data.

### 6. Do not assume n8n is working — verify
Check webhook env vars are set before assuming a workflow fires. See env var table below.

---

## Seed / Test Data

Single case: **Ref 123456** — Hartmann Logistics, FRA→ORD, EUR 3,200, LH8400

Run: `npx tsx scripts/seed.ts`

---

## Environment Variables (names only)

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (scripts, MCP) |
| `NYLAS_API_KEY` | Nylas v3 API key |
| `NYLAS_GRANT_ID` | Nylas mailbox grant ID |
| `NYLAS_API_BASE` | `https://api.eu.nylas.com` |
| `NYLAS_CLIENT_SECRET` | Used to verify Nylas webhook HMAC signatures |
| `N8N_DRAFT_WEBHOOK_URL` | WF5 — generate AI draft |
| `N8N_SEND_WEBHOOK_URL` | WF6 — approve and send |
| `N8N_WF1_WEBHOOK_URL` | WF1 — inbound email trigger |
| `N8N_WEBHOOK_SECRET` | Auth header value — `X-AxisLog-Key: <secret>` |
| `MCP_SERVER_URL` | MCP server base URL (localhost:3001 in dev) |
| `MCP_SERVER_SECRET` | Bearer token for MCP gateway |

---

## UI Development

### Design principles
- Operational clarity over visual decoration
- Email = Outlook-style (NOT chat bubbles)
- Dense but readable, professional enterprise interface
- Colour: grey / blue / violet tones
- Reference: Outlook 365 web 2026

### Component conventions
- Icons: Lucide, stroke-width 1.5, never filled
- Buttons: primary = filled, secondary = ghost
- Cards: subtle border, minimal shadow

### Forbidden patterns
- No gradients (except rare justified use)
- No chat-style bubbles for emails
- No inline styles (except dynamic values)
- No random colour usage

### Wireframe rule
For **new full pages or major layout changes only**: create an ASCII wireframe first and wait for approval before implementing. Small component changes, bug fixes, and column/content tweaks do not require a wireframe.

---

## Module Navigation

| Area | Files |
|------|-------|
| Email / Threads | `email_messages` table, `app/cases/[ref]/page.tsx`, `app/inbox/page.tsx` |
| Case logic | `shipment_cases`, `case_channels`, `case_contacts` |
| Drafts / AI | `draft_tasks`, `message_drafts`, `app/api/request-draft/route.ts`, `app/api/approve-draft/route.ts` |
| CRM | `contacts`, `clients`, `vendors`, `app/crm/page.tsx` |
| n8n gateway | `app/api/nylas-webhook/route.ts` (WF1), `app/api/request-draft/route.ts` (WF5), `app/api/approve-draft/route.ts` (WF6) |

---

## What Not To Do

- Do not rewrite large parts without reason
- Do not duplicate logic
- Do not fake state in UI
- Do not assume n8n works — verify env vars
- Do not introduce new architecture without checking existing one
- Do not use `overflow-hidden` on email body cards
