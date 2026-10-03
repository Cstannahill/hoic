# hoic v1 — Implementation Design

Date: 2026-10-03 · Status: awaiting review

## 0. Relationship to the requirements document

`Crew_App_Requirements_and_Architecture.md` (the "requirements doc") remains the source of truth for product behavior, roles, rules, failure handling, and privacy. This spec records the decisions agreed during design review and resolves points the requirements doc leaves open. Where they differ, this spec wins.

## 1. Scope

**In:** requirements doc §13 phases 1–4.

1. Invite-only accounts, roles (worker / foreman / admin), deactivation.
2. Properties: create, archive.
3. Clock-in/out, unpaid breaks, personal history, weekly estimated earnings.
4. Foreman timesheet review, direct correction/void, worker correction requests, audit.
5. Coarse event location capture, admin-only inspection, 90-day retention purge.
6. Shared supplies; assigned tasks.
7. Weekly CSV export.

**Out:** phase 5 (real-device pilot, live backup-restore drill — `docs/` will contain the procedures), and everything in requirements doc §2 "Later additions".

**Placeholder data:** §14 decisions use proposed defaults. Local seed data: Christian (admin), one foreman, three workers, one sample property, sample rates.

## 2. Platform and stack

| Concern | Choice |
|---|---|
| Runtime / package manager | Node 25 locally; `engines` set to the minimum Node version the pinned Next.js supports (Vercel uses its default LTS); pnpm 10 |
| App | Next.js App Router (latest stable), TypeScript strict |
| UI | Tailwind CSS, shadcn/ui |
| Validation | Zod (server-side, at every server action) |
| Dates | date-fns + @date-fns/tz (crew timezone math) |
| Backend | Supabase: Postgres, Auth, RLS, pg_cron |
| Supabase client | `@supabase/ssr` (cookie sessions), user-scoped for all data operations |
| Local dev | Supabase CLI via `npx supabase` with Docker (`supabase start`) |
| Tests | Vitest (unit + integration), pgTAP (`supabase test db`), Playwright (E2E) |
| Hosting target | Vercel Hobby + Supabase Free |

Exact versions are pinned at scaffold time and the lockfile is committed.

## 3. Architecture

**Approach: domain rules as Postgres functions behind a user-scoped client.**

- Every mutation is a `plpgsql` function in a migration. Each function: checks `auth.uid()` maps to an **active** member; checks role; takes `SELECT … FOR UPDATE` on the acting/target member row (the shared serialization lock for clock and correction operations); validates invariants; writes rows, audit, and mutation receipt in one transaction.
- Functions are `SECURITY DEFINER`, `SET search_path = ''`, fully schema-qualified, `REVOKE EXECUTE … FROM public, anon`, `GRANT EXECUTE … TO authenticated`.
- Tables have **no** insert/update/delete grants or policies for `authenticated`. All writes go through functions. Reads go through `SELECT` RLS policies.
- Next.js server actions: verify session (`auth.getUser()` / claims), parse input with Zod, call `supabase.rpc(...)` with the user-scoped client, map the result to a typed `ActionResult`.
- The secret (service) key is used only in server-only modules for Auth Admin operations (invite, ban on deactivation) and the production bootstrap script.

### Error contract

Functions raise `errcode = 'P0001'`, `message = <stable_snake_code>`, `detail = <human text>`. A TypeScript map converts codes to `ActionResult` errors:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string };
```

Codes include at least: `not_authenticated`, `not_active_member`, `forbidden`, `invalid_input`, `already_clocked_in`, `no_open_shift`, `break_already_open`, `no_open_break`, `no_rate`, `property_inactive`, `overlap`, `stale_version`, `operation_key_reused`, `self_review_forbidden`, `property_has_open_shifts`, `invalid_transition`, `not_found`.

### Idempotency

Every mutation function takes `p_operation_id uuid`. `mutation_receipts` has `unique (actor_id, operation_id)`, `payload_hash` = SHA-256 of the canonical JSON of the function's inputs, and `result` jsonb.

- Same key + same hash → return the stored result without side effects.
- Same key + different hash → `operation_key_reused`.

The client generates the key once per user intent and reuses it on retry.

### Authoritative time

Clock functions record `server_recorded_at = clock_timestamp()` **after** acquiring the member lock. Client timestamps may be stored as `client_reported_at` for diagnostics only.

## 4. Data model

Requirements doc §9 tables, with these resolutions:

- `members.role` enum `worker | foreman | admin`; `members.active boolean`. Role is read from this protected table, never from JWT/user metadata. `members` contains no pay data and is readable by all active crew members (names/roles for assignment).
- Helper functions (`SECURITY DEFINER`, `STABLE`): `private.current_member_id()`, `private.current_role()`; both return null for inactive or unknown users, which makes every policy deny.
- `hourly_rates.effective_from timestamptz`; `set_hourly_rate` rejects `effective_from < now()` (no silent retroactive change). Clock-in snapshots the latest rate with `effective_from <= server time` into `shifts.rate_snapshot_cents`; none → `no_rate`. Historical snapshot changes go through `correct_shift` with a reason.
- `shifts.status` enum `working | on_break | closed | voided`, plus `version int`, `corrected boolean`.
- Partial unique indexes: one shift with `status in ('working','on_break')` per member; one break with `ended_at is null` per shift.
- `clock_events.event_type` enum `clock_in | clock_out | break_start | break_end`. Immutable after insert.
- `event_locations` (clock_in / clock_out only): `latitude numeric(6,3)`, `longitude numeric(7,3)` (the database also rounds as a defense), `source_accuracy_m`, `captured_at`, `status` enum `captured | denied | timeout | unsupported | unavailable`, `expires_at = captured_at + 90 days` (or `server_recorded_at` when not captured), `purged_at`. **Purge nulls coordinates and accuracy and sets `purged_at`**, so the status history remains.
- `correction_requests.kind` enum `amend | missed_shift`. `amend` references a shift; `missed_shift` carries `property_id`. `proposed` jsonb = `{ started_at, ended_at, breaks: [{started_at, ended_at}] }` — a full replacement timeline. Status `pending | approved | rejected | withdrawn`.
- `supply_items` is **one crew-wide list** (no property picker). `property_id` is nullable and **recorded in the background** by `add_supply`: the property of the adder's open shift; otherwise the only active property if there is exactly one; otherwise null. It is shown only as a small label and in history and CSV/reporting views, never as an input. `stored_in text` is nullable and optional (max 60 chars; trimmed; empty → null). `urgency` enum `low | normal | urgent`. `status` enum `needed | claimed | purchased | cancelled`. Plus `purchased_by`, `purchased_at`, `version`.
- `tasks.priority` enum `low | normal | high`. `status` enum `todo | in_progress | blocked | done | cancelled`. Plus `version`.
- `crews`: single row; `timezone 'America/Chicago'`, `currency 'USD'`, `reporting_week_start 1` (Monday), `stale_shift_hours 9`.
- `audit_events.self_override boolean default false`.

## 5. Rules resolved beyond the requirements doc

| Topic | Decision |
|---|---|
| Self-review | Foremen and workers may not approve/reject their own correction request, directly correct/void their own shift, or set their own rate (`self_review_forbidden`). **Admin override:** an admin may do these on their own records only by passing `p_self_override = true` with a required reason; the UI shows an explicit "Override: acting on my own record" confirmation. The audit record is flagged `self_override = true` and is visible to foremen in the audit trail. |
| Stale open shift | Open longer than **9 hours** → flagged on `/manage` and on the worker's Home. Never auto-closed. The threshold is a single constant in the crew record (`stale_shift_hours`, default 9). |
| Missed clock-out | Worker submits an `amend` request with `ended_at`. A foreman/admin may also close it directly via `correct_shift`. While open, the worker cannot clock in again. |
| Missed shift | Worker submits a `missed_shift` request. Approval creates a closed shift using the rate effective at its `started_at`, with `corrected = true` and an audit record. No location is created. |
| Approval | `review_correction` requires the reviewer's `expected_shift_version` (for `amend`) and re-validates the full timeline: no overlap with other non-voided shifts of that member, breaks inside the shift, at most one break open at a time. |
| Rates | Only foreman/admin set rates, and never their own except via the admin override above. `effective_from` defaults to now. Each change is audited with a reason. |
| Deactivation | Admin sets `members.active = false` through a DB function (audited), then the server action bans the auth user. RLS denies immediately even if an old token remains valid. Unfinished tasks are flagged for reassignment. |
| Invite | Admin server action: Auth Admin `inviteUserByEmail` (secret key) → `create_member` RPC called with the admin's user-scoped client. If the RPC fails, the auth user is deleted (compensation). |
| Task transitions | Assignee: `todo→in_progress`, `in_progress→blocked` (note required), `blocked→in_progress`, `todo/in_progress→done` (completion note optional). Foreman/admin: any transition, including reopen and cancel, plus scope, assignee, priority, and due date. |
| Supplies transitions | `needed→claimed` (any member, `claimed_by` = self); `claimed→needed` (claimer or foreman/admin); `needed/claimed→purchased` (any member, records `purchased_by`/`purchased_at`, optional `stored_in`); `needed/claimed→cancelled` (requester or foreman/admin). Edits to details require `expected_version`. |
| Stored in | Optional and never required. Can be set when marking purchased or edited later by any active member (`update_supply` with `expected_version`), including clearing it. The UI offers quick-pick chips **Shed · Trailer · Inside · Truck** plus free text. No quantities on hand, no stock ledger. |
| Archived property | No new clock-ins or task assignments. Archiving is rejected with `property_has_open_shifts` if open shifts exist. (Supplies are unaffected; their property is derived, never chosen.) |
| Property selection | When exactly one property is active, clock-in selects it automatically and no picker is shown. A picker appears only when several are active. |
| Audited actions | `correct_shift`, `void_shift`, `review_correction`, `set_hourly_rate`, `set_member_role`, `set_member_active`, `create_member`, `archive_property`, `run_location_purge`. Audit payloads never include coordinates. |

## 6. Reporting (single implementation)

The database returns raw shifts, breaks, and rate snapshots. One TypeScript module, `src/features/reporting`, computes everything; screens and CSV both use it.

- `paidMs = (end − start) − Σ breaks`, using integer milliseconds.
- `shiftCents = roundHalfUp(paidMs × rateCents / 3_600_000)`, computed per closed shift.
- Hours are displayed to 2 decimals; that rounded value is never used to compute money.
- Weekly periods run Monday 00:00 → Monday 00:00 in the crew timezone (handles DST). A shift crossing a boundary is split into segments by elapsed time; breaks are subtracted from the segment they fall in.
- **Remainder rule:** each segment except the last gets `floor(shiftCents × segPaidMs / paidMs)`; the last segment gets the remainder. Period totals therefore reconcile to the shift total.
- Recorded earnings use closed shifts only. An open shift shows a separate live estimate.
- **CSV:** one row per shift segment within the range; voided shifts excluded. Columns: member, property, local date, local start, local end, break minutes, paid hours (2dp), rate (USD), estimated earnings (USD), corrected (yes/no). Served by an authenticated route handler with `Cache-Control: no-store`; workers can export their own shifts only.

## 7. Moving to the cloud

- All schema, policies, functions, and cron jobs live in `supabase/migrations/`. Going live: `supabase link` → `supabase db push`.
- `supabase/seed.sql` is local only. Production first admin: `pnpm bootstrap:admin` (`scripts/bootstrap-admin.ts`, secret key, run once).
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public), and `SUPABASE_SECRET_KEY` (server only; imported only from modules guarded by `server-only`). Documented in `.env.example`.
- `supabase/config.toml`: signup disabled, email confirmations, Site URL and redirect URLs. `docs/deploy.md` lists the matching cloud dashboard settings (signup off, custom SMTP, URLs), points Vercel Preview at a separate dev project, and describes weekly backups and restore testing.
- Retention: `pg_cron` runs the daily `private.purge_expired_locations()`. Admin "Run purge now" calls the audited wrapper. No public endpoint.
- No hardcoded hosts, no secret key for ordinary reads, and nothing that depends on the local mail viewer.

## 8. UI and routes (mobile first)

| Route | Access | Purpose |
|---|---|---|
| `/login`, `/auth/confirm`, `/set-password` | public | Sign-in; invite/recovery token verification; set password |
| `/` | all | Current property (auto-selected; picker only if several are active), clock/break controls, live timer, today/week hours and estimate, my open tasks, supplies shortcut, stale-shift warning |
| `/time` | all | My shifts by week; request correction (amend / missed shift); my requests |
| `/tasks` | all | My tasks; status and notes |
| `/supplies` | all | One crew-wide list grouped by status and urgency; add/claim/release/purchase/cancel; optional, editable "Stored in" on purchased items; similar-item hints |
| `/profile` | all | Name, crew timezone, location explanation, logout |
| `/manage` | foreman, admin | Who is working / on break / out, where; stale shifts |
| `/manage/timesheets` (+ `/export`) | foreman, admin | Weekly timesheet; correct/void; CSV |
| `/manage/corrections` | foreman, admin | Review queue, current vs proposed |
| `/manage/tasks`, `/manage/properties` | foreman, admin | Task assignment; property create/archive |
| `/manage/people` | foreman, admin (account actions admin only) | Members, rate history, set rate; invite/role/deactivate |
| `/manage/locations` | admin | Event coordinates, accuracy, status, "Open in Maps", run purge |

**Mobile-first rules:**

- Base styles target a 360×640 phone; `sm`/`md`/`lg` only add layout. Content has a max width on large screens.
- Bottom tab bar on phones (Home · Time · Tasks · Supplies · Manage for foreman/admin); left sidebar from `md`.
- Primary actions live in a sticky bottom action area. Forms are bottom sheets on phones and dialogs from `md`.
- Lists are cards on phones; tables only from `lg`. No horizontal scrolling at 360 px.
- `viewport-fit=cover`, safe-area insets, `100dvh`. Inputs at least 16 px, native input types/pickers. Tap targets at least 48 px. High-contrast light theme.
- Web app manifest, icons, `theme-color`, standalone display. No service worker caching of authenticated content (no service worker in v1).
- Server components by default; client components only for interactive controls and geolocation.

**Clock interaction:** first-use location notice → one `getCurrentPosition` (8 s timeout, `maximumAge: 0`, no watch) → round to 3 dp on the device → submit with status and a per-intent `operation_id` → button locked with "Saving…" → success only after the server responds. On timeout or network error: "Not confirmed — Retry", which reuses the same `operation_id`.

**Freshness:** `revalidatePath` after mutations; `router.refresh()` on `visibilitychange`; 60-second refresh on `/manage` only. Offline banner via `navigator.onLine`; no queued writes.

## 9. Testing

| Layer | Tool | Coverage |
|---|---|---|
| Unit | Vitest | Reporting math: breaks, rounding, rates, overnight, week boundaries, DST (spring forward / fall back in America/Chicago), remainder allocation; Zod schemas; error mapping |
| Database | pgTAP | RLS per role per table; location isolation; rate privacy; deactivation; function invariants; idempotency; overlap; stale version; self-review; admin self-override (rejected without flag + reason, flagged in audit); supply property derivation and optional `stored_in`; privileged function grants |
| Concurrency | Vitest integration (real supabase-js clients, local stack) | Parallel clock-ins → one shift; racing corrections → one success; lost-response retry → same timestamp |
| E2E | Playwright (Pixel 7, iPhone 14 first; one desktop project) | Clock/break/out; denied location; missed clock-out correction; assignment; supply claim/purchase; CSV vs screen totals; no horizontal overflow at 360 px |

Completion gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm test:e2e` passing on a fresh `supabase db reset`.

## 10. Repository layout

As in requirements doc §12, plus `scripts/` (bootstrap admin) and `supabase/tests/` (pgTAP).
