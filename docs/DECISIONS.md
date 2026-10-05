# Decision record

Why Atlas Service Desk is shaped the way it is, what it trades away, and what I would do next.

## The problem I chose to solve

Atlas receives service requests through email, WhatsApp and phone. The risks in that mix are **urgent requests that get missed**, **the same problem reported several times**, **requests that arrive without enough detail to act on**, and **customers who keep asking for updates**. All four come from one gap: nobody can see, in one place, what needs attention now, who owns it and what happens next.

So the product is a **service request control center**: one dashboard, one request drawer, one intake form and a small backend. It is not a field-service management system.

## Decisions

### 1. A queue, not a platform
**Decision:** Build triage, ownership and visibility. Do not build scheduling optimisation, routing, billing, a customer portal, a technician app or analytics.
**Why:** Each of those needs data the brief does not supply (skills, locations, contracts, SLAs). Building them would mean inventing that data. A narrow tool that is correct beats a broad one that is half pretend.

### 2. Deterministic rules instead of an AI classifier
**Decision:** Priority, category, missing information and duplicate detection are plain rules in `src/lib/triage.ts`. Every priority shows the reason it was given.
**Why:** A coordinator can read a one-line reason and overrule it. The rules are testable, run offline and cost nothing, and the demo has no external dependency.
**Trade-off:** Keyword rules are brittle on wording I did not anticipate, and they are English only. The worst failure is an urgent request classed too low. Mitigations today: the coordinator can change any priority (logged in the history), and the escalation banner is driven by age, not wording.
**Next step:** Add an LLM as a second opinion that can only raise priority or add missing-information flags, with the rules kept as the floor.

### 3. Duplicates are suggestions
**Decision:** A request is flagged as a possible duplicate when it is from the same customer, has the same detected issue type and arrives within 48 hours of an earlier request that is still open. The coordinator links it or keeps it separate. Linking closes the follow-up and writes an entry in both histories.
**Why:** Wrongly merging two real faults is worse than showing one extra card. Humans stay in the loop.
**Limitation:** Issue type comes from keywords, and two customers reporting the same site are not matched.

### 4. Response targets are illustrative, and the app says so
**Decision:** The queue shows time from receipt to a named owner against a target per priority (Critical 1h, High 4h, Normal 24h, Low 72h). The UI says "overdue against target", never "SLA breached".
**Why:** No SLA was supplied. Presenting invented numbers as policy would be misleading, so they are labelled as defaults and live in one file (`src/lib/targets.ts`).

### 5. Workload suggestion, never auto-assignment
**Decision:** The technician with the lightest priority-weighted load is highlighted as a suggestion. Assignment is always a click.
**Why:** There is no skill, location or capacity data, so a confident auto-assignment would be false precision.

### 6. Every action leaves an audit event
**Decision:** Triage, assignment, scheduling, status changes, priority changes, duplicate decisions and prepared customer messages each write a `RequestEvent`.
**Why:** It is cheap, it makes the history trustworthy, and it is what makes the product feel like operations software rather than a list.

### 7. Customer updates are drafted, not sent
**Decision:** The app writes a message the coordinator copies. Nothing is sent.
**Why:** Intake and messaging channels may be simulated, and a wrong message to a customer cannot be unsent.

### 8. Stack
**Decision:** Next.js (App Router, server actions), TypeScript, Tailwind, Prisma 7 with SQLite through the libsql driver adapter.
**Why SQLite:** a reviewer can run the project with Node alone. The README explains the switch to PostgreSQL.
**Why libsql:** the first choice, `better-sqlite3`, failed to install on a clean machine because it tries to compile a native module. libsql ships prebuilt binaries.
**Why server actions:** the whole API surface is a handful of mutations called from one UI. A REST layer would add code without adding capability.

### 9. A demo clock
**Decision:** The app treats "now" as 09:00 on 1 October 2026 and advances two minutes per action. `USE_REAL_CLOCK=true` switches to real time. Times are shown in UTC.
**Why:** The scenario is anchored to a specific morning, and a demo that depends on the real date would show different ages every day. No time zone was supplied.

## How it is tested

- Unit tests for the triage rules, duplicate window, response targets, escalation order, technician suggestion and search.
- Service tests that run the real data layer against a throwaway SQLite database: seeding, assigning, scheduling, linking, audit events and error cases.
- The browser walkthrough (including the guided demo, dark mode, filters and mobile width) was exercised with scripted browser runs during development. There is **no end-to-end suite in the repository**.
- The tests build their database from `tests/init.sql`, which mirrors `prisma/schema.prisma`. Keep the two in step when the schema changes.

## Known limitations

- No authentication or roles. Anyone who can open the app can act, and **Reset demo** is available to everyone.
- No concurrency control. If two coordinators act at once, the last write wins.
- There is no migrations folder. `npm run setup` uses `prisma db push`.
- No pagination, and the page only refreshes after the user's own actions, not live.
- English only, single time zone, one customer name format (`Customer C01`).
- The wording of the seeded R101 to R108 messages is reconstructed from the situation described in the brief.

## What I would do next

1. Authentication and coordinator or manager roles.
2. PostgreSQL with committed migrations.
3. Real intake: an email webhook and the WhatsApp Business API, feeding the same `createRequest` function the form uses.
4. A settings screen for response targets and priority keywords.
5. A skills and availability matrix, which is what would justify real assignment suggestions.
6. The LLM second opinion described in decision 2.
