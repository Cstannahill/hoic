# HOIC Phase 3: Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Tasks subsystem, allowing foremen to assign work and crew members to track their progress.

**Architecture:** We will extend the Supabase database with a `tasks` table and strict RLS policies governing state transitions. The frontend will consume this via Next.js Server Actions.

**Tech Stack:** Next.js (App Router), Tailwind CSS v4, shadcn/ui, Playwright, Supabase SSR, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-10-03-hoic-v1-design.md`

## Global Constraints

- Server components by default; client components only for interactive controls.
- Base styles target a 360x640 phone.
- No horizontal scrolling at 360 px.
- Tap targets at least 48 px.

## Review Focus

- **Unauthorized Transitions:** An assignee attempting to re-open a `done` task, cancel a task, or change the priority/due date must be rejected by RLS (only foreman/admin can do this). Task 1's RLS must enforce this strictly.
- **Missing Blocked Notes:** When transitioning a task to `blocked`, a note is required by the spec. This must be enforced by a DB constraint or trigger.

---

### Task 1: Tasks Schema and Security

**Files:**
- Create: `supabase/migrations/20261003000003_tasks_schema.sql`
- Create: `supabase/tests/20261003000003_tasks_test.sql`

**Interfaces:**
- Consumes: Core schema (`members`, `properties`).
- Produces: `tasks` table with `todo`, `in_progress`, `blocked`, `done`, `cancelled` states.

- [ ] **Step 1: Write pgTAP tests**
Create `supabase/tests/20261003000003_tasks_test.sql`. Test that a worker can transition `todo` -> `in_progress`, but gets a policy violation if they try to change the `assignee_id` or `priority`. Test that `blocked` requires a note.
- [ ] **Step 2: Run test (fails)**
Run: `pnpm supabase test db`
Expected: FAIL
- [ ] **Step 3: Implement Schema**
Create `supabase/migrations/20261003000003_tasks_schema.sql`.
Define `task_status` enum.
Create `tasks` table: `id`, `property_id`, `assignee_id`, `status`, `priority`, `due_date`, `notes`.
Write RLS policies:
- `SELECT`: All active members.
- `INSERT/DELETE`: Foreman/Admin only.
- `UPDATE`: Foreman/Admin can do anything. Assignee can only update `status` and `notes`, and only for allowed transitions (`todo`->`in_progress`, `in_progress`->`blocked`, `blocked`->`in_progress`, `todo`/`in_progress`->`done`).
Add a `CHECK` constraint: `status != 'blocked' OR (notes IS NOT NULL AND length(trim(notes)) > 0)`.
- [ ] **Step 4: Run test (passes)**
Run: `pnpm supabase test db`
- [ ] **Step 5: Commit**
`git add supabase/ && git commit -m "feat(db): tasks schema and rls"`

---

### Task 2: Worker Tasks UI

**Files:**
- Create: `src/app/tasks/page.tsx`
- Create: `src/app/actions/tasks.ts`
- Create: `tests/e2e/worker-tasks.spec.ts`

**Interfaces:**
- Consumes: `tasks` table.
- Produces: `/tasks` route where workers view and update their assigned tasks.

- [ ] **Step 1: Write E2E test**
Create `tests/e2e/worker-tasks.spec.ts`. Mock a login, navigate to Tasks, and verify a task can be marked "In Progress".
- [ ] **Step 2: Run test (fails)**
Run: `pnpm playwright test tests/e2e/worker-tasks.spec.ts`
- [ ] **Step 3: Implement Server Actions**
Create `src/app/actions/tasks.ts`. Write `updateTaskStatus(taskId, status, notes)` using `createServerClient` and `revalidatePath('/tasks')`.
- [ ] **Step 4: Implement Worker UI**
Create `src/app/tasks/page.tsx`. Fetch tasks where `assignee_id = user.id` and `status != 'done'`. Render them as cards. Add buttons for state transitions (e.g. "Start Work", "Block", "Finish"). If blocking, prompt for a note.
- [ ] **Step 5: Run test (passes)**
Run: `pnpm playwright test tests/e2e/worker-tasks.spec.ts`
- [ ] **Step 6: Commit**
`git add src/ tests/ && git commit -m "feat(ui): worker tasks dashboard"`

---

### Task 3: Admin Task Management

**Files:**
- Create: `src/app/manage/tasks/page.tsx`
- Modify: `src/app/actions/tasks.ts`
- Create: `tests/e2e/admin-tasks.spec.ts`

**Interfaces:**
- Consumes: `tasks` table, `members` table.
- Produces: `/manage/tasks` route for foremen to assign work.

- [ ] **Step 1: Write E2E test**
Create `tests/e2e/admin-tasks.spec.ts`. Verify an admin can create a new task and assign it to a worker.
- [ ] **Step 2: Run test (fails)**
Run: `pnpm playwright test tests/e2e/admin-tasks.spec.ts`
- [ ] **Step 3: Implement Server Action**
Add `createTask(data)` to `src/app/actions/tasks.ts`.
- [ ] **Step 4: Implement Admin UI**
Create `src/app/manage/tasks/page.tsx`. Include a form to create a task (select property, assignee, priority, due date). List all open tasks across the crew.
- [ ] **Step 5: Run test (passes)**
Run: `pnpm playwright test tests/e2e/admin-tasks.spec.ts`
- [ ] **Step 6: Commit**
`git add src/ tests/ && git commit -m "feat(manage): admin task creation"`
