# HOIC Phase 2: Core Timekeeping UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile-first frontend interface for clocking in/out, viewing timesheets, and managing workers.

**Architecture:** We will use Next.js App Router with Server Components for layout and data fetching, and Client Components exclusively for interactive UI (clock buttons) and browser APIs (geolocation). All database mutations will happen via Next.js Server Actions calling the idempotency-locked Supabase RPCs we built in Phase 1.

**Tech Stack:** Next.js (App Router), Tailwind CSS v4, shadcn/ui, Playwright, Supabase SSR.

**Spec:** `docs/superpowers/specs/2026-10-03-hoic-v1-design.md`

*(Note: Per the `writing-plans` skill guidelines, Tasks and Supplies are independent subsystems and will be implemented in subsequent plans to keep this plan focused, testable, and strictly bound to the Timekeeping critical path.)*

## Global Constraints

- Server components by default; client components only for interactive controls and geolocation.
- Base styles target a 360x640 phone.
- No horizontal scrolling at 360 px.
- Tap targets at least 48 px.
- `viewport-fit=cover`, safe-area insets, `100dvh`.

## Review Focus

- **Denied Location Permission:** If a user denies location, the clock action must gracefully catch this and submit with `status = 'denied'` rather than crashing. Task 2's hook must test this explicitly.
- **Offline / Network Failure during Clock-in:** The UI must enter a "Saving..." state and if the server doesn't respond, offer a "Not confirmed - Retry" button that resubmits with the *exact same* `operation_id` to prevent duplicate shifts.
- **Role-based Navigation:** Regular workers must not see the `/manage` tab or route links; this must be derived safely from their `members.role`.
- **Active Property Selection:** If exactly one property is active in the database, the UI must automatically select it and hide the picker. If multiple are active, the UI must require a selection.

---

### Task 1: Navigation & Mobile Layout

**Files:**
- Create: `src/components/layout/app-nav.tsx`
- Modify: `src/app/layout.tsx`
- Create: `tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes: Supabase SSR `getUser()` and `members` table to get user role.
- Produces: The global mobile bottom-tab and desktop sidebar wrapper.

- [ ] **Step 1: Write the failing E2E test**
```typescript
// tests/e2e/layout.spec.ts
import { test, expect } from '@playwright/test'
test('shows mobile bottom nav with correct tabs', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) {
    const nav = page.locator('nav.fixed.bottom-0')
    await expect(nav).toBeVisible()
    await expect(nav.getByText('Home')).toBeVisible()
    await expect(nav.getByText('Time')).toBeVisible()
  }
})
```
- [ ] **Step 2: Run test (fails)**
Run: `pnpm playwright test tests/e2e/layout.spec.ts`
Expected: FAIL
- [ ] **Step 3: Implement Nav Component**
Create `src/components/layout/app-nav.tsx`. Fetch user role server-side. Render standard links for all (`/`, `/time`, `/profile`) and `/manage` conditionally if role is `foreman` or `admin`. Apply sticky bottom CSS (`fixed bottom-0 w-full`) and safe-area insets.
- [ ] **Step 4: Update Root Layout**
Modify `src/app/layout.tsx` to wrap `children` in a `div` that includes `<AppNav />`.
- [ ] **Step 5: Run test (passes)**
Run: `pnpm playwright test tests/e2e/layout.spec.ts`
Expected: PASS
- [ ] **Step 6: Commit**
`git add src/ tests/ && git commit -m "feat(ui): mobile first navigation layout"`

---

### Task 2: Geolocation & Clock Server Actions

**Files:**
- Create: `src/app/actions/time.ts`
- Create: `src/hooks/use-clock.ts`
- Test: `tests/unit/use-clock.test.ts` (using jsdom)

**Interfaces:**
- Consumes: Task 1 RPCs (`clock_in`, `clock_out`) from Supabase.
- Produces: `clockAction(type, propertyId)` server action, and a client hook `useClock()` that handles `getCurrentPosition` and `operation_id` generation (UUIDv4).

- [ ] **Step 1: Write the failing test**
Create `tests/unit/use-clock.test.ts` mocking `navigator.geolocation` returning a denied error, verifying the hook returns `status: 'denied'` to the action payload.
- [ ] **Step 2: Run test (fails)**
Run: `pnpm vitest run tests/unit/use-clock.test.ts`
- [ ] **Step 3: Implement Server Actions**
Create `src/app/actions/time.ts`. Write `clockIn(propertyId, locationData, operationId)` that uses `createServerClient` to call `rpc('clock_in')`. Call `revalidatePath('/')` on success.
- [ ] **Step 4: Implement Client Hook**
Create `src/hooks/use-clock.ts`. Use `navigator.geolocation.getCurrentPosition` with an 8-second timeout, `maximumAge: 0`. Map errors (timeout, denied) into the `location_status` enum. Generate `crypto.randomUUID()` for `operation_id`. Maintain `isPending` state.
- [ ] **Step 5: Run test (passes)**
Run: `pnpm vitest run tests/unit/use-clock.test.ts`
- [ ] **Step 6: Commit**
`git add src/ tests/ && git commit -m "feat(time): geolocation hook and server actions"`

---

### Task 3: The Time Clock UI (Home Page)

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/time/clock-panel.tsx`
- Test: `tests/e2e/clock.spec.ts`

**Interfaces:**
- Consumes: `src/app/actions/time.ts`, `useClock` hook. Database query for active shift.
- Produces: Interactive home page replacing the dummy dashboard.

- [ ] **Step 1: Write E2E test**
Create `tests/e2e/clock.spec.ts` ensuring clicking "Clock In" shows a "Saving..." state, updates the DB, and then the UI reflects an active shift.
- [ ] **Step 2: Run test (fails)**
Run: `pnpm playwright test tests/e2e/clock.spec.ts`
- [ ] **Step 3: Build Server-Side Data Fetch**
In `src/app/page.tsx`, fetch the user's active shift (`status IN ('working', 'on_break')`), and active properties. Pass these to a Client Component.
- [ ] **Step 4: Build Client UI**
Create `src/components/time/clock-panel.tsx`. If `activeShift` exists, show "Clock Out" and "Start Break". If none, show "Clock In" and a property picker (only if properties.length > 1). Connect to `useClock()`. Ensure buttons are large (min 48px).
- [ ] **Step 5: Run test (passes)**
Run: `pnpm playwright test tests/e2e/clock.spec.ts`
- [ ] **Step 6: Commit**
`git add src/ tests/ && git commit -m "feat(ui): interactive time clock dashboard"`

---

### Task 4: Time History & Corrections

**Files:**
- Create: `src/app/time/page.tsx`
- Create: `src/app/actions/corrections.ts`

**Interfaces:**
- Consumes: Database `shifts` view, `calculateShiftEarnings` from `src/features/reporting/math.ts`.
- Produces: The user's timesheet view.

- [ ] **Step 1: Write E2E test**
Verify a user can view a past shift and submit a correction form.
- [ ] **Step 2: Build Server Action**
Write `submitCorrection(shiftId, details)` in `src/app/actions/corrections.ts` calling the `rpc('correct_shift')`.
- [ ] **Step 3: Build Page UI**
Implement `src/app/time/page.tsx`. Query shifts for the current week. Display them in a list/card format. Calculate totals using `calculateShiftEarnings`. Add a dialog for requesting corrections.
- [ ] **Step 4: Run test (passes)**
Run Playwright.
- [ ] **Step 5: Commit**
`git add src/ tests/ && git commit -m "feat(ui): shift history and correction requests"`

---

### Task 5: Management Dashboard (Admin)

**Files:**
- Create: `src/app/manage/page.tsx`
- Create: `src/app/manage/people/page.tsx`

**Interfaces:**
- Consumes: Supabase Admin Auth (for invites), `members` table.
- Produces: Foreman/Admin views.

- [ ] **Step 1: Write E2E test**
Ensure non-admins cannot load `/manage` (redirects or 404). Ensure admins can load it and see active workers.
- [ ] **Step 2: Secure the Routes**
In `src/app/manage/layout.tsx` (create it), fetch user role. Redirect to `/` if not foreman/admin.
- [ ] **Step 3: Build Live Board**
In `src/app/manage/page.tsx`, fetch all active shifts across the crew. Display who is working where.
- [ ] **Step 4: Build People Manager**
In `src/app/manage/people/page.tsx`, list members. Build a form to update hourly rates (`rpc('set_hourly_rate')`).
- [ ] **Step 5: Run tests**
- [ ] **Step 6: Commit**
`git add src/ tests/ && git commit -m "feat(manage): admin live board and people manager"`
