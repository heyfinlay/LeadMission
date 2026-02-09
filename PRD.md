Absolutely bro — and your feedback is **spot on**.

The UI demo nailed the vibe, but the **product design** needs to shift from “drawer dossier” → **full dedicated Lead HQ page** (scrollable, editable, distraction-free).

Below is a **proper PRD** you can hand to a dev (or use for Cursor/Codex) to build this cleanly in **TypeScript + React** with room to expand later.

---

# PRD — Temporary Utopia Lead Command Center

**Product Name:** TU Lead Command Center
**Version:** MVP v1
**Primary User:** Finlay (solo operator)
**Stack:** TypeScript + React (Next.js recommended)
**Design System:** Neo-militarised corporate future (obsidian glass, gunmetal, underlit accents)

---

## 1) Product Summary

TU Lead Command Center is a single-operator CRM + lead intelligence tool designed to:

* track leads end-to-end (Cold → Closed)
* store all research and intel in one place
* score leads objectively (0–100)
* enforce follow-up discipline via timed tasks
* give a daily “what do I do today?” mission dashboard
* evolve later into a client portal / delivery tracker

This is **not a generic CRM**.
It is a **sales + execution command console**.

---

## 2) Goals

### MVP Goals

1. **Never lose a lead again**
2. **Always know who to follow up**
3. **Have one clean page per company**
4. **Make research repeatable**
5. **Make tasks feel urgent + timed**
6. **Remove mental load** (“what do I do today?”)

### Non-goals (MVP)

* multi-user accounts
* complex permissions
* inbox integrations
* auto scraping
* client-facing portal

(Those are v2+)

---

## 3) Key Product Principles

### A) One Lead = One Dedicated Page

No sidebars for primary workflows.

A lead should open as:
**/leads/:id**
and take over the screen.

---

### B) Editing Must Be Fast

Most panels must support:

* inline editing
* quick dropdown updates
* adding/removing list items instantly
* zero friction

---

### C) Tasks Must Be the Loudest System

Tasks are the *operating system* of the day.

The dashboard must clearly show:

* overdue
* due today
* due tomorrow
* “next best action” per lead

---

### D) Expandable Architecture

This app will evolve.

So MVP must be built with:

* clean data models
* scalable page structure
* modular UI components

---

## 4) Core Features (MVP)

## 4.1 Lead Management

* Create lead
* Edit lead
* Delete/archive lead
* Search leads
* Filter leads by stage, priority, industry, budget
* Sort leads by score / next follow-up / value

---

## 4.2 Lead Scoring (0–100)

MVP scoring must support:

### Manual Score

* simple slider / input (0–100)

### Optional Breakdown (MVP-lite)

Store reasons:

* ability to pay
* urgency
* fit
* ease to win

Later: auto scoring.

---

## 4.3 Pipeline Stages

Stages must be editable via dropdown:

* Cold
* Researched
* Contacted
* Warm
* Qualified
* Proposal Sent
* Negotiation
* Closed Won
* Closed Lost
* Not a Fit

---

## 4.4 Lead Research + Audit System

Each lead must store:

* Pain points
* Money leaks
* Quick wins
* Notes
* Offer match (Tier 1 / Tier 2 / Tier 3)

This is the “structured research brain”.

---

## 4.5 Tasks + Follow-Up Discipline

Tasks must support:

* title
* due date
* due time (optional but recommended)
* priority (Low/Medium/High/Critical)
* status (Open/Done)
* linked lead
* “Next Action” pinned per lead

---

## 4.6 Daily Dashboard (Mission Board)

When opening the app, you should instantly see:

### “What needs to happen today?”

* overdue tasks
* tasks due today
* leads needing follow-up
* top priority leads by score
* pipeline value summary

---

## 5) Pages Required (MVP)

## 5.1 Login (Optional)

Since this is solo use, MVP can be:

* no auth (local-only)
  OR
* basic email login (Supabase auth)

**Recommendation:**
Build with auth even if solo — future proof.

---

## 5.2 Dashboard — `/`

**Purpose:** daily command center

### Must include:

* Overdue tasks (RED)
* Due today tasks (CYAN)
* Upcoming tasks
* Top priority leads
* Pipeline totals ($)
* Leads not touched in X days
* Quick actions:

  * “New Lead”
  * “Log touchpoint”
  * “Add task”

---

## 5.3 Leads Index — `/leads`

**Purpose:** find, scan, prioritise

### Views:

* Table view (default)
* Kanban view (optional MVP)

### Must show per lead:

* company name
* stage
* score
* priority
* next follow-up
* deal value
* last contacted date

Clicking a lead opens:
**/leads/:id**

---

## 5.4 Lead Detail Page — `/leads/:id`

**This is the most important page in the entire app.**

It must be:

* full-screen
* scrollable
* editable
* clean + modular

### Sections:

#### A) Lead Header (Sticky)

* Company name
* Stage dropdown
* Score meter
* Priority dropdown
* Deal value
* Budget dropdown
* Next follow-up date
* Quick actions:

  * Add task
  * Log call
  * Mark stage progressed

#### B) Contact + Company Intel

* Website
* industry
* location
* contact name + role
* email + phone

Must be **editable inline**.

#### C) “Situation” Panel

* pain points (editable list)
* money leaks (editable list)
* quick wins (editable list)

#### D) Notes Panel

* freeform notes
* meeting notes
* call notes

#### E) Follow-Up Timeline (MVP)

* log entries:

  * call
  * email
  * DM
  * note
* timestamped
* “last touch” auto updates

#### F) Offer Match

* Tier 1 / Tier 2 / Tier 3
* recommended price
* recommended setup fee
* confidence level

---

## 5.5 Tasks Page — `/tasks`

**Purpose:** discipline system

### Views:

* Today
* Overdue
* Upcoming
* All open

### Must include:

* quick complete button
* filters by priority
* grouped by due date

---

## 5.6 Settings — `/settings`

MVP minimal.

* default follow-up rules (e.g. 72 hours)
* default deal value
* stage definitions (optional)
* export data (JSON/CSV)

---

## 6) Data Models (MVP)

## Lead

* id
* companyName
* stage
* score
* priority
* budget
* dealValue
* website
* industry
* location
* contactName
* contactRole
* contactEmail
* contactPhone
* createdAt
* updatedAt
* lastTouchAt
* nextFollowUpAt
* offerMatchTier
* notes

---

## LeadIntel (can be embedded in Lead or separate)

* painPoints[]
* moneyLeaks[]
* quickWins[]

---

## Task

* id
* leadId (nullable)
* title
* dueAt
* priority
* status
* createdAt
* completedAt

---

## Touchpoint / Timeline

* id
* leadId
* type (call/email/dm/note)
* content
* createdAt

---

## 7) UX Requirements (Critical)

## 7.1 No Drawer-Based Lead View

The lead must open as a page.

Sidebars can exist for:

* quick create
* quick filters

But not for core lead management.

---

## 7.2 Everything Editable

Every panel must support editing.

Examples:

* click field → edit
* list items → add/remove
* dropdowns for stage/budget/priority

---

## 7.3 Tasks Must Visually Dominate

Tasks should have:

* strong urgency lighting
* time remaining indicator
* overdue countdown
* “priority pulse” (subtle, not cringe)

---

## 7.4 “Daily Mode”

The dashboard should feel like:

> “Here’s the mission. Execute.”

---

## 8) UI Requirements (Design Language)

Must match the prototype aesthetic:

* obsidian glass base
* gunmetal panels
* sharp geometry
* controlled cyan/red underlighting
* snap animations only
* no glitch effects
* dense, tactical hierarchy

---

## 9) MVP Build Milestones

### Milestone 0 — Foundation

* Next.js + TypeScript
* UI system (Tailwind + shadcn)
* routing + layout
* dummy seed data

### Milestone 1 — Leads CRUD

* leads list page
* lead create/edit
* lead detail page

### Milestone 2 — Tasks System

* tasks page
* dashboard tasks widget
* due today / overdue logic

### Milestone 3 — Timeline + Research Panels

* touchpoint logging
* pain points / money leaks / quick wins
* notes

### Milestone 4 — Polish

* speed
* keyboard shortcuts
* export
* visual refinement

---

## 10) Future Expansion (v2+)

### V2 features

* AI audit generator
* website scraper
* proposal builder
* client portal conversion
* automations tracking per client
* integrations:

  * Gmail
  * Google Calendar
  * Instagram DMs (via third party)

---

# Final MVP Output (What you’ll have)

A premium “Lead OS” where you can:

* open dashboard
* instantly see what to do today
* open a lead’s full page
* update intel in seconds
* track tasks + follow-ups with discipline
* progress leads through pipeline without chaos
