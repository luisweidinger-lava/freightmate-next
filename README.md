# Nexio 🚛
> A CRM platform connecting logistics clients with freight contractors across Kenya and East Africa.
 
---
 
## What We're Building
 
Nexio is a B2B CRM system designed for Kenya's logistics sector. It bridges the coordination gap between **clients** who need goods transported and the **contractors** (truck operators, freight forwarders) who do the actual moving — replacing fragmented email threads with a structured, trackable digital workflow.
 
The platform handles the full coordination lifecycle: quoting, job assignment, contractor management, shipment tracking, and client communication — in one place.
 
---
 
## The Problem
 
Kenya's freight market moves billions of dollars worth of goods every year, yet the coordination layer between clients and contractors remains largely unstructured. Operators manage cases primarily through email — a process that is slow, error-prone, and difficult to oversee. Relevant information gets buried in long threads, documents are scattered across inboxes, and critical updates are easily overlooked.
 
This results in:
- High per-unit transport costs for smaller shippers
- Empty return trips and poor asset utilisation for contractors
- No visibility or accountability for clients
- Fragmented records that make billing and dispute resolution difficult
---
 
## The Market
 
Kenya is East Africa's dominant logistics hub, with the sector valued at approximately **USD 1.4 billion (2023)** and projected to reach **USD 10.3 billion by 2032** (CAGR ~7.1%). Road freight is the primary mode, serving both domestic routes and landlocked neighbouring countries including Uganda, Rwanda, and South Sudan.
 
Globally, the freight forwarding software market was valued at **USD 1.6 billion in 2024** and is forecast to reach **USD 3.4 billion by 2032**, growing at a CAGR of approximately 10%. Freight-specific CRM platforms represent an even faster-growing niche at a projected **CAGR of 16.7%** through 2033 — driven by cloud adoption and the shift away from legacy, manual coordination systems.
 
Kenya's digital infrastructure makes the timing right: internet penetration exceeds 85%, the ICT sector grew 7.2% in 2024, and the country attracted **USD 638 million in startup funding** in 2024 — the highest on the continent.
 
> Sources: World Bank Logistics Performance Index 2023 · ReportOcean Kenya Logistics & Warehousing Report · Credence Research Freight Forwarding Software Market · KeNIA Innovation Outlook 2024
 
---
 
## Business Model
 
Nexio is offered as a **SaaS subscription** to logistics companies, delivering value across two interconnected dashboards.
 
**Operator Dashboard**
 
The operator dashboard is designed to eliminate the inefficiencies of email-based case management. Incoming emails are automatically tagged and assigned to the relevant case, so nothing gets lost in a cluttered inbox. Operators work in a split-screen messaging interface that keeps client and contractor communication in one view, alongside all associated documents. Uploaded documents are automatically analysed for key information extraction, and each case maintains a continuously updated AI-generated summary — giving operators an at-a-glance overview of where every shipment stands without digging through threads.
 
**Manager Dashboard**
 
The manager dashboard provides company-wide visibility through data analysis and KPI reporting, giving managers the operational insights they need to run the business efficiently and distribute workload across their team. Through the aggregated AI summary on each case, managers can gain a quick understanding of any shipment at a glance. Should a coordinator require support on a case, the manager can step in and assist directly within it — keeping collaboration seamless and in context.
 
Together, both dashboards form an integrated system that empowers coordinators and managers to work more efficiently as a team — enabling coordinators to handle an estimated **30% more cases** and giving managers the tools to run a leaner, better-informed operation.
 
---
 
## Status
 
Nexio is currently in active development as part of a university AI project. The codebase is structured as follows:
 
```
/
├── app/         # Next.js App Router — pages, API routes, UI
├── components/  # Shared React components
├── lib/         # Frontend utilities, Supabase client, types
├── mcp/         # MCP server — logic layer between app, DB, and n8n
├── n8n/         # Exported n8n workflow definitions (WF1, WF5, WF6, …)
├── supabase/    # Database migrations and schema
├── scripts/     # Seed and maintenance scripts
├── public/      # Static assets
└── docs/        # Architecture and API documentation
```
---

## Architecture

Nexio connects to the logistics company's existing email infrastructure and layers a structured case-management system on top. Both coordinators and managers work in the same platform — coordinators handle day-to-day case execution while managers oversee, assist, and report across the team.

### Tech stack

| Layer             | Technology                                                                          |
|-------------------|-------------------------------------------------------------------------------------|
| Frontend          | **Next.js** (App Router) + TypeScript                                               |
| Database / Auth   | **Supabase** (PostgreSQL + PostgREST) — source of truth for all app state           |
| Logic layer       | **MCP server** — exposes tooling for AI agents and shared business logic (case lookups, draft handling) |
| Workflow engine   | **n8n** — handles inbound email processing, AI invocations, and outbound sends      |
| Email integration | **Nylas v3 (EU)** — connects the company's operations mailbox (Gmail) to the platform |
| AI                | LLM calls executed inside n8n workflows for case summaries, draft generation, and email classification |

### Data flow (high level)

1. **Inbound email** arrives at the connected mailbox → Nylas webhook → Next.js API route (`/api/nylas-webhook`) → n8n (WF1) → Supabase, linked to the relevant case.
2. **Case workspace** in the Next.js frontend reads from Supabase and renders threaded conversations grouped by case and channel.
3. **AI drafts and summaries** are triggered from the UI via a Next.js API route (`/api/request-draft`) → n8n (WF5), which calls the LLM and writes the result back to Supabase for the coordinator to review.
4. **Approved drafts** are dispatched via `/api/approve-draft` → n8n (WF6) → Nylas → recipient, with the sent message recorded against the case.

---

## Team

Luis Weidinger, Emanuele Scammacca

---
