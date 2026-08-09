# Staffic

Healthcare workforce management platform — VMS + staffing marketplace connecting hospitals ("Client" orgs) with staffing agencies ("Agency" orgs). See [`docs/PLAN.md`](../docs/PLAN.md) for the full product/technical plan and phased roadmap.

Phase 0 (multi-tenant data model, role-based auth, audit logging), Phase 1 (the full requisition → submission → review → placement loop, with a working UI), Phase 2 (reporting/BI, market rate benchmarking, CSV export), Phase 3 (internal float pools, self-serve org signup with agency approval, email notifications), and Phase 4 (timesheets, invoicing as a billing ledger, and direct-hire job postings with a public application flow) are all in here now.

**Phase 4 scope note:** timesheets/invoices are a billing *ledger*, not a payment processor — nothing here moves real money. Actually paying a worker requires integrating a licensed EOR/payroll provider (Deel, Remote, Check, Gusto Embedded), which needs real API credentials and a real contract — that's a business decision, not something to fake with placeholder code, so it wasn't built. See `docs/DECISIONS.md`.

## Stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (NextAuth v5), credentials-based, JWT sessions carrying `organizationId` + `role`
- Zod for input validation

## Local setup

1. **Start Postgres** (or point `DATABASE_URL` at your own instance):
   ```bash
   docker compose up -d
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   npx auth secret   # writes AUTH_SECRET into .env
   ```

4. **Set up the database**:
   ```bash
   npm run db:migrate   # creates tables from prisma/schema.prisma
   npm run db:seed      # demo orgs + users + sample requisitions/submissions/a placement
   ```

5. **Run the app**:
   ```bash
   npm run dev
   ```

Demo logins after seeding (password `password123` for all):
- `admin@staffic.dev` — PLATFORM_ADMIN
- `manager@demohospital.dev` — CLIENT_MANAGER (hospital side)
- `admin@demohospital.dev` — CLIENT_ADMIN, same hospital — org admins are the only ones who can send team invites (see below)
- `recruiter@demostaffing.dev` — AGENCY_RECRUITER (agency side)
- `admin@demostaffing.dev` — AGENCY_ADMIN, same agency — same reason as above
- `recruiter@rivallocum.dev` — AGENCY_RECRUITER, a second/rival agency (so scorecards and market benchmarks have more than one data point to compare)
- `recruiter@newcomerhealth.dev` — AGENCY_ADMIN at an agency that self-registered and is still `PENDING` — signing in shows the "under review" holding page instead of the dashboard

## Try the Phase 1 loop

1. Sign in as `manager@demohospital.dev` → **Requisitions** → post a new one (or use the seeded "ICU RN — Night Shift" req).
2. Sign out, sign in as `recruiter@demostaffing.dev` → **Candidates** → add a candidate → **Marketplace** → submit that candidate against the open requisition.
3. Sign back in as the hospital manager → open the requisition → **Approve** the submission → fill in a start date and rate → **Confirm placement**. The requisition flips to `FILLED`.
4. Sign back in as the agency recruiter → **My Submissions** shows the approved/placed status.

## Try the Phase 2 reports

The seed data includes a second, already-`FILLED` requisition ("Locum Hospitalist — 4 Week Coverage") with a winning submission (from the main demo agency) and a losing one (from the rival agency), so reports have something to aggregate out of the box.

- Sign in as `manager@demohospital.dev` → **Reports**: requisitions-by-specialty (time-to-fill, avg rates), agency scorecards (approval rate per agency), and the platform-wide market rate benchmark. Try the CSV export buttons.
- Sign in as `recruiter@demostaffing.dev` → **Reports**: your submission funnel plus the same market benchmark, so you can see how your proposed rates compare before you submit.
- Sign in as `admin@staffic.dev` → **Reports**: a platform-wide overview (org/requisition/submission/placement counts).

## Try the Phase 3 features

- **Internal float pool**: sign in as `manager@demohospital.dev` → **Float Pool** → the seeded worker (Priya Natarajan, RN) already has an upcoming ED assignment. Add another worker and schedule an assignment yourself.
- **Self-serve signup**: from `/login`, click "create an account" → try both a hospital signup (immediately usable) and an agency signup (lands on a "pending approval" page instead of the dashboard).
- **Agency approval queue**: sign in as `admin@staffic.dev` → **Pending Agencies** → approve or reject "Newcomer Health Staffing" (the seeded pending agency, or whatever you just signed up). Check your terminal for the notification email log line (or a real inbox if `RESEND_API_KEY` is set).
- **Notifications**: submit a candidate, approve/reject a submission, or confirm a placement — each logs `[email:not-configured] to=... subject="..."` to the terminal unless `RESEND_API_KEY` is set in `.env`.

## Try the Phase 4 features

The active placement from the Phase 2 seed data ("Locum Hospitalist") comes with three weeks of timesheets already in different states, so you can see the whole lifecycle without doing anything first:

- **Timesheets**: sign in as `manager@demohospital.dev` → **Timesheets** → approve or reject the pending week-3 timesheet. Sign in as `recruiter@demostaffing.dev` → **Timesheets** to submit a new one against the same placement.
- **Invoices**: sign in as `recruiter@demostaffing.dev` → **Invoices** → the seeded week-1 timesheet is already approved and billed (status `PAID`); week 2 is approved but unbilled — pick that placement in "Generate an invoice" to bundle it, then **Send**. Sign in as the hospital manager → **Invoices** → **Mark paid**.
- **Direct hire / SourceDirect**: sign in as `manager@demohospital.dev` → **Direct Hire** → the seeded "Staff RN — Medical Surgical" posting already has one application (Morgan Ellis) — open it and move the application through the status buttons. Then, with no login at all, visit `/jobs` to see the same posting on the public board and submit a second test application yourself.

## Try the team invites feature

- Sign in as `admin@demohospital.dev` (a `CLIENT_ADMIN`) → **Team** → invite a teammate by email as either "Hiring manager" or "Admin". Check your terminal for the notification email log line (or a real inbox if `RESEND_API_KEY` is set) — it contains a link like `/signup/invite/<token>`.
- Open that link in a private/incognito window (so you're not still logged in as the admin) and finish creating the account. It joins **the same hospital org**, not a new one — that's the fix. `manager@demohospital.dev` (a `CLIENT_MANAGER`) can't send invites — try it to see the "only an org admin" message.
- Same flow works on the agency side with `admin@demostaffing.dev`.
- Invites expire after 7 days and can be revoked from the **Team** page before they're accepted.

## Try the hardened public job board

- Visit `/jobs` → the seeded "Staff RN — Medical Surgical" posting → open it and submit an application. It'll go through normally.
- Try submitting a second application with the *same* email address within a few minutes — you'll get "You've already applied to this job recently." That's the new rate limit (see `docs/DECISIONS.md`), not a bug.
- The form also has an invisible honeypot field a real browser never fills in — there's nothing to click to see this in the UI, but a scripted bot that fills every input will have its submission silently dropped.

## Report exports

`/dashboard/reports` now has three export options: two CSVs (requisitions, submissions — unchanged) and a new **PDF** export that mirrors whatever the page is showing you (specialty summary + agency scorecards + market benchmark for a client, funnel + benchmark for an agency, the org/requisition/submission/placement counts for a platform admin). It's a plain data table, not a styled/branded document — see `docs/DECISIONS.md` for why it's hand-rolled instead of a PDF library.

## Project layout

```
prisma/schema.prisma        Core data model: Organization (+ approvalStatus), User, Requisition,
                             Candidate, Submission, Placement, FloatPoolWorker,
                             FloatPoolAssignment, Timesheet, Invoice, DirectHireJob,
                             JobApplication, InviteToken, AuditLog
prisma/seed.ts               Demo data for local dev
src/auth.ts                  Full NextAuth config (Prisma adapter, Credentials provider)
src/auth.config.ts           Edge-safe auth config used by middleware.ts
src/middleware.ts            Route protection (UX guard, not the security boundary)
src/lib/rbac.ts               requireRole / requireOrgAccess — the actual security boundary;
                              every API route should call these before touching data
src/lib/audit.ts              logAuditEvent — call on every create/update/delete of a
                              Requisition, Candidate, Submission, Placement, Organization,
                              float pool, timesheet/invoice, direct-hire, or invite record
src/lib/email.ts               sendEmail — direct Resend API call, console fallback if unconfigured,
                              sendEmailSafely retries a few times with backoff before giving up
src/lib/notifications.ts       Email templates + recipient lookups for each notification
src/lib/prisma.ts             Prisma client singleton
src/lib/csv.ts / src/lib/pdf.ts  Hand-rolled export helpers, no external dependencies
src/lib/services/             Shared business logic (RBAC + audit-checked + notification-triggering)
                              used by both the API routes and the UI's Server Actions —
                              includes organizations.ts (signup/approval), floatPool.ts,
                              timesheets.ts, invoices.ts, directHire.ts, invites.ts (team invites)
src/app/api/                  REST-ish API: requisitions, requisitions/open (marketplace),
                              candidates, submissions, submissions/[id] (status update), placements,
                              float-pool/workers, float-pool/assignments, timesheets,
                              timesheets/[id], invoices, invoices/[id], direct-hire/jobs,
                              direct-hire/applications/[id], public/jobs (no auth — the job board,
                              now with honeypot + rate limiting on the apply route),
                              reports/export/requisitions, reports/export/submissions (CSV),
                              reports/export/pdf
src/app/login/, src/app/signup/  Credentials login and self-serve org signup (Server Actions);
                              src/app/signup/invite/[token]/ accepts a team invite into an
                              existing org instead of creating a new one
src/app/jobs/                  Public, unauthenticated job board + application form (honeypot
                              field + DB-backed rate limiting) — the only part of the app
                              meant to be reached by non-users
src/app/dashboard/            The UI — layout has role-based nav and gates PENDING agencies
                              behind a holding page; requisitions/candidates/marketplace/
                              submissions/reports/float-pool/timesheets/invoices/direct-hire/team
                              pages are role-gated; admin/agencies is the platform-admin
                              approval queue; team is team-roster + invite management
.github/workflows/ci.yml      Lint + build on every push/PR against a real Postgres service
                              container — not a deploy pipeline, see docs/DECISIONS.md
```

## Security & compliance notes

- **RBAC is enforced server-side in every route**, not just in the UI. `src/lib/rbac.ts` throws `ForbiddenError` if a user's role or org doesn't match — routes catch this and return 403.
- **Every write to a business record should call `logAuditEvent`** (see `src/lib/audit.ts`). Keep `metadata` free of PHI — IDs and status values only.
- This is designed to be **HIPAA-aware, not HIPAA-certified**. Before handling real candidate/patient data: get BAAs from every vendor (hosting, email, file storage), move to HIPAA-eligible infra, and get a compliance review. See `docs/PLAN.md` §4.
- **The `/api/public/*` and `/jobs/*` routes are intentionally unauthenticated.** That's the entire public surface area of the app — everything else requires a session. The application-submission endpoint now has a honeypot field and DB-backed rate limiting (see `docs/DECISIONS.md`) — this is basic abuse prevention, not a CAPTCHA-grade defense; a determined attacker rotating IPs/emails can still get through.
- **Invoices are a record, not a payment.** `Invoice.status` (`DRAFT`/`SENT`/`PAID`) is set manually by users describing something that already happened outside Staffic. Nothing in this codebase calls a bank, card processor, or payroll API.

## What's not built yet

Team invites, real (hours × rate) spend in reports, PDF export, notification retry, and a minimal CI build check were all closed out in a follow-up pass — see `docs/DECISIONS.md`'s "Bug-fix pass" entry.

Still not built, and not fixable by writing more code — each needs a real account, legal review, or infra/budget decision:
- **SSO/OAuth (SAML/OIDC)** — credentials-only for now; Auth.js supports adding providers later without restructuring `auth.ts`, but each one needs a registered app with that specific IdP.
- **Real document/file storage** — `resumeUrl`/`documentUrls` are still just string fields; no S3 (or equivalent) account wired up.
- **SMS notifications** — email only; needs a Twilio (or equivalent) account.
- **Real payroll/EOR money movement** — deliberately out of scope, see above; needs a licensed provider (Deel/Remote/Check/Gusto), a contract, and real credentials.
- **Reports moved from JS aggregation to SQL/a denormalized table** — fine at demo/pilot volume, won't scale to a client's full multi-year history; a real data-layer task, not a quick fix (see `docs/DECISIONS.md`).
- **Formal trademark clearance for "Staffic"** — only a quick web search was ever done, not a USPTO TESS search or live domain check.
- **Full HIPAA certification** (BAAs, HIPAA-eligible infra, SOC 2) — this is a legal/compliance process, explicitly flagged as such since `docs/PLAN.md` §4.
- **Hosting/staging environment** — no target chosen yet; the new CI workflow builds on every push but doesn't deploy anywhere.

See `docs/PLAN.md` for the phased roadmap.

## A known gap worth knowing about

Reports aggregate in application code (fetch rows, `reduce`/`groupBy` in JS — see `src/lib/services/reports.ts`) rather than with SQL-level aggregation. That's fine at demo/pilot data volumes but won't scale to a real client's full requisition history — revisit with raw SQL or a denormalized reporting table before this needs to handle thousands of rows per org.
