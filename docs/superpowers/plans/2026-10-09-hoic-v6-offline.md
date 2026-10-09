# Phase 6: True Offline Mode & MVP Wrap-up

## Objective
Upgrade the application to a full Progressive Web App (PWA) with robust offline capabilities. Users must be able to load the app, view cached data, and perform critical actions (like clocking in/out or creating a task) without an active internet connection. Once reconnected, the app will automatically synchronize these actions with the server. Afterward, we will implement the remaining MVP features: Timesheet Corrections and CSV Exports.

## Technical Strategy

### 1. Offline Caching (Service Worker)
- **App Shell & Assets:** Implement a custom Service Worker (`public/sw.js`) that caches static assets (CSS, JS) and core route HTML/RSC payloads.
- **Cache Strategy:** Use `Stale-While-Revalidate` for navigation requests so the app loads instantly from cache while fetching fresh data in the background, falling back to cache if offline.
- **PWA Manifest:** Ensure `manifest.ts` is correctly configured with icons and `display: standalone` so it can be installed on iOS/Android home screens.

### 2. Offline Mutations Queue (IndexedDB)
- **Data Store:** We cannot rely on the browser's native Background Sync API because it is not supported on iOS Safari. Instead, we will use an in-app IndexedDB queue (using `idb-keyval` or native IndexedDB).
- **Queue Structure:** An `offline_mutations` store holding objects with `{ id, type, payload, timestamp, status }`.
- **Sync Engine:** A React Context (`OfflineProvider`) that listens to the `window` `online` event and processes pending mutations sequentially when a connection is restored.

### 3. Optimistic UI Updates
- **Local State Override:** Components like `ClockPanel` must overlay local state on top of the server-provided props. If an offline "clock_in" mutation exists in IndexedDB, the UI must show as "Clocked In (Pending Sync)" rather than the stale server state.
- **Conflict Resolution:** If a sync fails (e.g., trying to clock in when the server already says you are clocked in), the sync engine will mark the mutation as `failed` and prompt the user to resolve it, or auto-resolve if the state is equivalent.

### 4. MVP Wrap-up: Corrections & CSV Export
- **Correction Queue:** Add a UI for workers to submit a correction request (e.g., "I forgot to clock out at 5 PM"). Admins will see these in the `/manage/timesheets` view and can approve/deny them, which will insert an audit log and update the shift.
- **CSV Export:** Add an API route (`/api/export/timesheets`) that generates a CSV of the weekly timesheets for payroll.

## Execution Steps

1. **Step 1: PWA Registration & Caching**
   - Register a service worker in `src/app/layout.tsx`.
   - Write `public/sw.js` with basic caching strategies.
2. **Step 2: IndexedDB Sync Engine**
   - Create `src/lib/offline-queue.ts` for DB interactions.
   - Create `src/components/providers/sync-provider.tsx` to handle background syncing.
   - Update `AppNav` to show a "Syncing..." or "Offline Actions Pending" indicator.
3. **Step 3: Refactor ClockPanel for Offline**
   - Modify `ClockPanel` to write to the offline queue when `navigator.onLine` is false (or if the server action fails due to network error).
   - Add local optimistic state to `useClock` to instantly reflect offline actions.
4. **Step 4: MVP Wrap-up**
   - Implement `manage/timesheets/corrections`.
   - Implement CSV export route.
