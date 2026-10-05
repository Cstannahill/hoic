# Implementation Plan: hoic Phase 4 (Supplies)

This plan covers the crew-wide shared supplies list, allowing workers to request items, claim items to pick up, and mark items as purchased/stored.

## Task 1: Database Schema and RLS Policies for Supplies
**Goal**: Create the `supplies` table, enums, and comprehensive RLS policies.

1.  **Migration File**: Create `supabase/migrations/20261003000004_supplies_schema.sql`.
2.  **Enums**:
    *   `supply_status`: 'needed', 'claimed', 'purchased', 'cancelled'
    *   `supply_urgency`: 'low', 'medium', 'high', 'urgent'
3.  **Table `supplies`**:
    *   `id` (uuid, pk, default gen_random_uuid())
    *   `created_at` (timestamptz)
    *   `description` (text, not null)
    *   `urgency` (supply_urgency, not null, default 'medium')
    *   `status` (supply_status, not null, default 'needed')
    *   `requested_by` (uuid, references members(id), not null)
    *   `claimed_by` (uuid, references members(id), nullable)
    *   `purchased_by` (uuid, references members(id), nullable)
    *   `purchased_at` (timestamptz, nullable)
    *   `stored_in` (text, nullable)
    *   `version` (integer, not null, default 1) - used for optimistic concurrency.
4.  **Row Level Security (RLS)**:
    *   `Enable RLS` on `supplies`.
    *   **SELECT**: Any active member can view all supplies.
    *   **INSERT**: Any active member can insert (`requested_by` must be themselves).
    *   **UPDATE**:
        *   Version bumping trigger: Create a trigger that automatically increments `version` on `UPDATE`.
        *   Policy for updates must allow:
            *   `needed` -> `claimed` (by anyone, must set `claimed_by` = self)
            *   `claimed` -> `needed` (only by claimer or foreman/admin)
            *   `needed`/`claimed` -> `purchased` (by anyone, must set `purchased_by` = self, `purchased_at` = now)
            *   `needed`/`claimed` -> `cancelled` (only by requester or foreman/admin)
            *   `stored_in` updates: any active member can update `stored_in` for a `purchased` item.
            *   Optimistic concurrency: To prevent overlapping edits, server actions will use `WHERE id = ? AND version = ?`.
5.  **Tests**: Write `supabase/tests/20261003000004_supplies_test.sql` using pgTAP to verify RLS rules (claiming, cancelling permissions, version bumping).

## Task 2: Shared Supplies UI and Server Actions
**Goal**: Build the UI and backend logic for managing supplies.

1.  **Server Actions** (`src/app/actions/supplies.ts`):
    *   `requestSupply(formData: FormData)`: Inserts a new supply request.
    *   `claimSupply(id: string, version: number)`: Updates status to 'claimed', sets `claimed_by`.
    *   `releaseSupply(id: string, version: number)`: Updates status to 'needed', clears `claimed_by`.
    *   `purchaseSupply(id: string, version: number, stored_in?: string)`: Updates status to 'purchased', sets `purchased_by` and `purchased_at`.
    *   `cancelSupply(id: string, version: number)`: Updates status to 'cancelled'.
    *   `updateStoredLocation(id: string, version: number, stored_in: string)`: Edits the location of a purchased item.
    *   *Note*: Ensure all actions check `error` and explicitly `throw new Error()` on failure (or return `{error}` and use `useActionState` if appropriate, but since these might be inline buttons, `throw new Error` with an error boundary is acceptable per Phase 3).
2.  **UI Components**:
    *   Create `/supplies` page.
    *   Fetch all supplies, ordered by status (needed/claimed first) and then urgency.
    *   Render a "Request Item" form.
    *   Render a list/grid of items. For each item:
        *   If `needed`: show "Claim" button, "Purchase" button, and if owned/admin, "Cancel".
        *   If `claimed`: show who claimed it. If claimed by me: "Release", "Purchase".
        *   If `purchased`: show "Purchased by X". Render a quick-pick for `stored_in` (Shed, Trailer, Inside, Truck) or a free-text input.
3.  **Tests**: Write Playwright test `tests/e2e/supplies.spec.ts` covering the full flow: request -> claim -> purchase -> set storage location.
