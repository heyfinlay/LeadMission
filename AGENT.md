# AGENT.md — Temporary Utopia Lead Command Center

> **Source of Truth (SoT)** for all agentic development work in this repository.
>
> This file defines the product intent, system boundaries, engineering standards, UI doctrine, and implementation constraints.
> Any change that contradicts this document must be explicitly justified and recorded as an update to this file.

---

## 0) Executive Definition

**Temporary Utopia Lead Command Center** is a single-operator, high-precision CRM + lead intelligence console.

This is not “a CRM theme.” It is an **operational sales system** designed to:

* eliminate lead loss via enforced follow-up discipline
* centralize research and decision context per company
* score leads objectively (0–100) to determine priority
* provide a daily mission board: **“What do I do today?”**
* scale over time into delivery tracking and client portal functionality

**Primary User:** Finlay (solo operator).

**Non-negotiable UX doctrine:** a Lead opens as a **dedicated page** (`/leads/:id`). No drawer-first workflows for core lead operations.

---

## 1) Core Product Tenets (Non-Negotiables)

### 1.1 One Lead = One Dedicated Page

* Lead detail must be full-screen and scrollable.
* The Lead detail page is the canonical “call screen” for live conversations.
* Sidebars/drawers are allowed only for *secondary* flows (filters, quick create) — never for the primary lead view.

### 1.2 Editing Must Be Frictionless

* Most key fields must support **inline edit** or fast edit forms.
* Lists (pain points / money leaks / quick wins) must be add/remove/edit in-place.
* Avoid duplicated input surfaces and repeated UX patterns.

### 1.3 Tasks Are the Operating System

* Tasks must be visually dominant and time-oriented.
* Overdue and due-soon must be unmissable.
* Dashboard must answer in <5 seconds: **who to contact, what to do, and why**.

### 1.4 High-Fidelity Design, Glitch-Free Execution

* Snap animations, crisp transitions. No jitter, no layout thrash.
* No fake “glitch” effects. Cyber aesthetic is **corporate future**, not hacker cosplay.

### 1.5 MVP First, Extensible Always

* Build the minimum coherent system that Finlay can run daily.
* Architectural decisions should not block v2 expansion (automation tracking, client delivery, integrations).

---

## 2) Tech Stack & Engineering Constraints

### 2.1 Required Stack

* **TypeScript** (strict)
* **React**
* **Next.js** recommended for routing, SSR/ISR optional (prefer client-driven for MVP)
* **Tailwind CSS** + **shadcn/ui** components
* **lucide-react** for icons

### 2.2 State / Data Strategy (MVP)

Choose one as the default MVP persistence target:

**Option A (fastest):** Local-first (IndexedDB) + export/import

* Use a small local DB layer (e.g., Dexie) or a lightweight abstraction.
* Ensure deterministic migrations and schema versioning.

**Option B (recommended for future):** Supabase (Postgres) + Auth

* Keep RLS policies simple for single-user now.
* Use a single “owner_id” pattern for future multi-user readiness.

**Agent rule:** if uncertain, implement Option B with minimal scope (auth optional in MVP, but schema should support it).

### 2.3 Performance Requirements

* Lead list operations must remain responsive at 5,000+ leads.
* Avoid waterfall fetches in Lead detail page.
* Use virtualization for long tables if necessary.
* Prefer memoization and stable component boundaries for dense dashboards.

### 2.4 Accessibility & UX Precision

* Keyboard navigation for key actions (search, new lead, open lead, add task).
* Visible focus states (consistent with neon edge-light doctrine).
* No motion that induces nausea; keep transitions short and controlled.

---

## 3) Information Architecture & Required Pages

### 3.1 Routes (MVP)

* `/` — **Dashboard (Mission Board)**
* `/leads` — **Lead Index** (table-first, Kanban optional)
* `/leads/new` — **Create Lead**
* `/leads/:id` — **Lead Detail (Company HQ Page)**
* `/tasks` — **Tasks Command Queue**
* `/settings` — **Settings / Export / Defaults**

### 3.2 Layout Structure

* Persistent left navigation (desktop) with command-center hierarchy.
* Top bar: global search + quick actions.
* Content area: page-specific.

**Important:** When user is on `/leads/:id`, the content area must be focused and uncluttered. Avoid unrelated dashboards inside the lead page.

---

## 4) Data Model (Canonical)

> Models below are the minimum “truth layer” for MVP.
> Keep naming consistent and stable.

### 4.1 Lead

* `id: string` (ULID/UUID)
* `companyName: string`
* `stage: Stage`
* `score: number` (0–100)
* `priority: Priority`
* `budget: Budget`
* `dealValue: number` (AUD)
* `website?: string`
* `industry?: string`
* `location?: string`
* `contactName?: string`
* `contactRole?: string`
* `contactEmail?: string`
* `contactPhone?: string`
* `offerMatchTier?: OfferTier`
* `recommendedMonthly?: number`
* `recommendedSetupFee?: number`
* `notes?: string` (longform)
* `lastTouchAt?: string` (ISO)
* `nextFollowUpAt?: string` (ISO)
* `createdAt: string` (ISO)
* `updatedAt: string` (ISO)
* `archivedAt?: string` (ISO)

### 4.2 LeadIntel (embedded or relational)

* `leadId: string`
* `painPoints: string[]`
* `moneyLeaks: string[]`
* `quickWins: string[]`

### 4.3 Task

* `id: string`
* `leadId?: string`
* `title: string`
* `dueAt: string` (ISO) — must support date + time
* `priority: Priority`
* `status: "Open" | "Done"`
* `createdAt: string` (ISO)
* `completedAt?: string` (ISO)

### 4.4 Touchpoint (Timeline)

* `id: string`
* `leadId: string`
* `type: "call" | "email" | "dm" | "note"`
* `content: string`
* `createdAt: string` (ISO)

### 4.5 Enums

* `Stage`:

  * `Cold | Researched | Contacted | Warm | Qualified | ProposalSent | Negotiation | ClosedWon | ClosedLost | NotAFit`
* `Priority`:

  * `Low | Medium | High | Critical`
* `Budget`:

  * `Unknown | Low | Mid | High`
* `OfferTier`:

  * `Tier1 | Tier2 | Tier3`

---

## 5) Feature Requirements (MVP)

### 5.1 Lead CRUD

* Create, edit, archive (soft delete), restore.
* Search: company/contact/website/industry/location.
* Filters: stage, priority, budget, offer tier.
* Sort: score desc, nextFollowUpAt asc, dealValue desc, lastTouchAt asc.

### 5.2 Lead Scoring

* Manual score input (0–100) as MVP.
* Optional stored “score reasons” as structured fields (v1.1).

### 5.3 Tasks & Discipline

* Create tasks from anywhere, including inside a Lead.
* Dashboard must highlight:

  * overdue
  * due today
  * due tomorrow
  * due this week
* Each Lead should display a **Next Action** block:

  * either a pinned task or the nearest upcoming open task.

### 5.4 Timeline / Touchpoints

* Log touchpoints quickly from `/leads/:id`.
* Logging a touchpoint updates `lastTouchAt`.
* Optional: suggest nextFollowUpAt upon logging (rule-based).

### 5.5 Dashboard: “Daily Mode”

Dashboard must be mission-first and not ornamental.

Required widgets:

* **Overdue tasks** (dominant)
* **Due today** (dominant)
* **Critical queue**
* **Top priority leads** (by score + urgency)
* **Leads stale > X days**
* **Pipeline totals** (count + value)

---

## 6) Lead Detail Page (Company HQ) — Required Sections

> `/leads/:id` is the primary operating surface when on calls or in meetings.

### 6.1 Sticky Header (always visible)

* Company name
* Stage dropdown
* Score meter + editable score
* Priority dropdown
* Budget dropdown
* Deal value editable
* Next follow-up (date+time)
* Quick actions:

  * Add Task
  * Log Touchpoint
  * Mark Stage Progressed

### 6.2 Company Intel (Editable)

* website, industry, location
* contact name, role, email, phone

### 6.3 Situation (Structured Research)

* Pain Points (editable list)
* Money Leaks (editable list)
* Quick Wins (editable list)

### 6.4 Notes

* Longform notes + meeting notes

### 6.5 Timeline

* Touchpoints list (reverse chronological)
* Create touchpoint inline

### 6.6 Offer Match

* Offer tier
* Recommended monthly + setup fee
* Confidence indicator (optional)

**Implementation rule:** Lead page must support smooth scrolling; no fixed-height unscrollable panes.

---

## 7) UI / Design Doctrine (Neo-Militarized Corporate Future)

### 7.1 Visual System

* **Obsidian glass** base surfaces
* **Gunmetal** secondary panels
* Sharp geometry, disciplined spacing
* Controlled accent lighting:

  * **Cyan** = precision / active / selected
  * **Red** = urgency / overdue / critical

### 7.2 Motion System

* Snap transitions only; no bounce.
* 120–180ms typical durations.
* Prioritize layout stability; avoid reflow.

### 7.3 Component Behavior Rules

* Primary actions must read as “instrument-grade” not playful.
* Tables dense but readable.
* Hover states feel like scan/target highlighting.
* Absolutely no “glitch” overlays.

---

## 8) Code Quality Standards

### 8.1 TypeScript

* `strict: true`
* No `any` without justification.
* Validate external inputs; prefer zod schemas at boundaries.

### 8.2 Architecture

* Separate concerns:

  * `ui/` components (pure)
  * `features/` (lead, tasks, timeline)
  * `data/` (repositories, persistence adapters)
  * `lib/` (utilities)
* Avoid prop drilling; prefer feature-scoped context or store.

### 8.3 Data Access

* Use repository interfaces (LeadRepo, TaskRepo, TouchpointRepo).
* Keep data operations transactional where possible.
* Include migration strategy for schema changes.

### 8.4 Testing (MVP baseline)

* Unit tests for:

  * task due logic
  * sorting/filtering correctness
  * score clamping
* E2E smoke tests for:

  * create lead → open lead → add task → mark done

---

## 9) Agent Operating Protocol

### 9.1 Before Modifying Anything

* Identify the user-facing intent.
* Confirm the change aligns with Sections 1–7.
* Prefer incremental patches over large refactors.

### 9.2 When Adding Features

* Implement behind clean component boundaries.
* Avoid duplication: create reusable “Panel”, “InlineEditField”, “EditableList”, “TaskChip” primitives.
* Every new feature must:

  * preserve performance
  * preserve the design doctrine
  * preserve the Lead detail page focus

### 9.3 When In Doubt

* Default to:

  * clarity
  * speed
  * minimal cognitive load
  * strictness over flexibility

---

## 10) Acceptance Criteria (MVP)

The MVP is complete when:

1. User can open Dashboard and immediately see overdue/due-today actions.
2. User can create a Lead and open it as a dedicated page (`/leads/:id`).
3. Lead page is fully scrollable and supports fast edits of key fields.
4. User can add tasks tied to a Lead and see them in `/tasks` and Dashboard.
5. User can log touchpoints and `lastTouchAt` updates reliably.
6. UI matches the neo-militarized corporate future doctrine and remains glitch-free.

---

## 11) Future Trajectory (Do Not Build Yet)

* AI audit generation
* website scraping
* proposal builder
* client delivery portal transformation
* inbox/calendar integrations
* multi-user permissions


## 12) Change Log

* **v0.1** — Initial SoT specification.
