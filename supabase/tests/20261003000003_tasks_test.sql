BEGIN;
SELECT plan(6);

-- Setup dummy data
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@hoic.test'),
       ('00000000-0000-0000-0000-000000000002', 'worker@hoic.test');

INSERT INTO public.members (id, email, first_name, last_name, role, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@hoic.test', 'Admin', 'Test', 'admin', true),
       ('00000000-0000-0000-0000-000000000002', 'worker@hoic.test', 'Worker', 'Test', 'worker', true);

INSERT INTO public.properties (id, name, active)
VALUES ('00000000-0000-0000-0000-000000000101', 'Site 1', true);

-- Authenticate as admin to create a task
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';

INSERT INTO public.tasks (id, property_id, assignee_id, priority, due_date, status)
VALUES ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'medium', CURRENT_DATE, 'todo');

-- Switch to worker
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002"}';

-- Test 1: Worker can transition todo -> in_progress
PREPARE transition_valid AS UPDATE public.tasks SET status = 'in_progress' WHERE id = '00000000-0000-0000-0000-000000001001';
SELECT lives_ok('transition_valid', 'Worker can transition from todo to in_progress');

-- Test 2: Worker cannot transition to blocked without a note
PREPARE transition_blocked_no_note AS UPDATE public.tasks SET status = 'blocked' WHERE id = '00000000-0000-0000-0000-000000001001';
SELECT throws_ok('transition_blocked_no_note', 'new row for relation "tasks" violates check constraint "tasks_blocked_note_check"', 'Blocked tasks require a note');

-- Test 3: Worker can transition to blocked with a note
PREPARE transition_blocked_with_note AS UPDATE public.tasks SET status = 'blocked', notes = 'Need supplies' WHERE id = '00000000-0000-0000-0000-000000001001';
SELECT lives_ok('transition_blocked_with_note', 'Worker can transition to blocked with a note');

-- Test 4: Worker cannot change priority
PREPARE invalid_update AS UPDATE public.tasks SET priority = 'high' WHERE id = '00000000-0000-0000-0000-000000001001';
-- For RLS, it might just ignore the update silently if using a trigger, or throw if using a strict policy.
-- If RLS policy prevents updating priority, the row just won't update (returns 0 rows updated), but `UPDATE` itself doesn't throw. 
-- Wait, if it's an RLS `WITH CHECK` violation, it throws. Let's test that it throws.
SELECT throws_ok('invalid_update', 'new row violates row-level security policy for table "tasks"', 'Worker cannot change priority');

-- Test 5: Worker cannot transition blocked to done
PREPARE transition_invalid_done AS UPDATE public.tasks SET status = 'done' WHERE id = '00000000-0000-0000-0000-000000001001';
SELECT throws_ok('transition_invalid_done', 'new row violates row-level security policy for table "tasks"', 'Worker cannot transition from blocked to done');

-- Test 6: Admin can transition blocked to done
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';
PREPARE admin_transition AS UPDATE public.tasks SET status = 'done' WHERE id = '00000000-0000-0000-0000-000000001001';
SELECT lives_ok('admin_transition', 'Admin can transition any state');

SELECT * FROM finish();
ROLLBACK;
