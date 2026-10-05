# Phase 4 (Supplies) Code Review

## Critical Findings
1. **Missing `property_id` in Schema and Logic**: The spec explicitly dictates that `supply_items` must include a nullable `property_id` that is recorded in the background during creation (derived from the adder's open shift or the single active property). The `supplies` schema completely omits the `property_id` column, and the `requestSupply` server action has no logic to compute or store it.

## Important Findings
1. **`updateStoredLocation` Action Rejects Clearing**: The spec dictates that `stored_in` can be edited by any member after purchase, "including clearing it". However, the server action checks `if (!id || !version || !stored_in) throw new Error('Missing required fields')`. Submitting an empty string to clear the location triggers this error, making it impossible to clear `stored_in`.
2. **RLS `UPDATE` Policy Does Not Protect Sibling Fields**: The `UPDATE` policy enforces transitions but only explicitly protects `requested_by` and `description` from being altered maliciously. When transitioning state or updating `stored_in`, a malicious user can alter other critical fields (e.g., they can edit `purchased_by` or `purchased_at` during a `stored_in` update, or edit `urgency` when claiming an item).

## Minor Findings
1. **Missing `getUser()` check in Actions**: The `releaseSupply` and `cancelSupply` server actions omit the explicit `supabase.auth.getUser()` check that is present in others. While Supabase RLS policies effectively block unauthenticated updates, it is better for the Server Actions to validate auth and throw a descriptive "Not logged in" error rather than a generic constraint failure.
