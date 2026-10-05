BEGIN;

SELECT plan(15);

-- Setup users
INSERT INTO auth.users (id, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'worker1@test.com'),
    ('22222222-2222-2222-2222-222222222222', 'worker2@test.com'),
    ('33333333-3333-3333-3333-333333333333', 'admin@test.com');

INSERT INTO public.members (id, email, first_name, last_name, role, active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'worker1@test.com', 'W1', 'Last', 'worker', true),
    ('22222222-2222-2222-2222-222222222222', 'worker2@test.com', 'W2', 'Last', 'worker', true),
    ('33333333-3333-3333-3333-333333333333', 'admin@test.com', 'Admin', 'Last', 'admin', true);

-- Helper to switch context
CREATE OR REPLACE FUNCTION set_user(user_id uuid) RETURNS void AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', user_id), true);
    PERFORM set_config('role', 'authenticated', true);
END;
$$ LANGUAGE plpgsql;

-- Test 1: Worker can create a supply request
SELECT set_user('11111111-1111-1111-1111-111111111111');
SELECT lives_ok(
    $$ INSERT INTO public.supplies (id, description, requested_by) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lumber', '11111111-1111-1111-1111-111111111111') $$,
    'worker can request supply'
);

-- Test 2: Cannot create supply request for someone else
SELECT throws_ok(
    $$ INSERT INTO public.supplies (description, requested_by) VALUES ('Nails', '22222222-2222-2222-2222-222222222222') $$,
    'new row violates row-level security policy for table "supplies"',
    'worker cannot request supply for someone else'
);

-- Test 3: Worker 2 can view the supply
SELECT set_user('22222222-2222-2222-2222-222222222222');
SELECT results_eq(
    $$ SELECT description FROM public.supplies WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    $$ VALUES ('Lumber') $$,
    'worker 2 can see worker 1 supply'
);

-- Test 4: Worker 2 claims the supply
SELECT lives_ok(
    $$ UPDATE public.supplies SET status = 'claimed', claimed_by = '22222222-2222-2222-2222-222222222222' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    'worker 2 can claim supply'
);

-- Test 5: Trigger correctly increments version
SELECT results_eq(
    $$ SELECT version FROM public.supplies WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    $$ VALUES (2) $$,
    'trigger increments version on update'
);

-- Test 6: Worker 1 cannot un-claim Worker 2's claim
SELECT set_user('11111111-1111-1111-1111-111111111111');
SELECT throws_ok(
    $$ UPDATE public.supplies SET status = 'needed', claimed_by = NULL WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    'new row violates row-level security policy for table "supplies"',
    'worker 1 cannot unclaim worker 2s claim'
);

-- Test 7: Admin CAN un-claim Worker 2's claim
SELECT set_user('33333333-3333-3333-3333-333333333333');
SELECT lives_ok(
    $$ UPDATE public.supplies SET status = 'needed', claimed_by = NULL WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    'admin can unclaim any supply'
);

-- Test 8: Worker 1 (requester) cancels the supply
SELECT set_user('11111111-1111-1111-1111-111111111111');
SELECT lives_ok(
    $$ UPDATE public.supplies SET status = 'cancelled' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    'requester can cancel their own needed supply'
);

-- Test 9: Create new item and purchase it directly
SELECT set_user('22222222-2222-2222-2222-222222222222');
INSERT INTO public.supplies (id, description, requested_by) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Paint', '22222222-2222-2222-2222-222222222222');

SELECT lives_ok(
    $$ UPDATE public.supplies SET status = 'purchased', purchased_by = '22222222-2222-2222-2222-222222222222', purchased_at = now() WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
    'can directly transition needed to purchased'
);

-- Test 10: CAN change stored_in during purchase transition
SELECT set_user('11111111-1111-1111-1111-111111111111');
INSERT INTO public.supplies (id, description, requested_by) VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Screws', '11111111-1111-1111-1111-111111111111');
SELECT lives_ok(
    $$ UPDATE public.supplies SET status = 'purchased', purchased_by = '11111111-1111-1111-1111-111111111111', purchased_at = now(), stored_in = 'Truck' WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
    'can set stored_in concurrently with purchase transition per RLS'
);

-- Test 11: CAN update stored_in after it is purchased
-- first purchase it validly (done in test 10)

SELECT lives_ok(
    $$ UPDATE public.supplies SET stored_in = 'Shed' WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
    'can update stored_in on a purchased item'
);

-- Test 12: Cannot change description
SELECT throws_ok(
    $$ UPDATE public.supplies SET description = 'Deck Screws' WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
    'new row violates row-level security policy for table "supplies"',
    'cannot edit description'
);

-- Test 13: Cannot transition back from purchased
SELECT throws_ok(
    $$ UPDATE public.supplies SET status = 'needed' WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
    'new row violates row-level security policy for table "supplies"',
    'cannot un-purchase'
);

-- Test 14: Empty description constraint
SELECT set_user('33333333-3333-3333-3333-333333333333');
SELECT throws_ok(
    $$ INSERT INTO public.supplies (description, requested_by) VALUES ('   ', '33333333-3333-3333-3333-333333333333') $$,
    'new row for relation "supplies" violates check constraint "supplies_description_check"',
    'description cannot be empty'
);

-- Test 15: Cannot cancel someone else's item as worker
SELECT set_user('11111111-1111-1111-1111-111111111111');
INSERT INTO public.supplies (id, description, requested_by) VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Tape', '11111111-1111-1111-1111-111111111111');

SELECT set_user('22222222-2222-2222-2222-222222222222');
SELECT throws_ok(
    $$ UPDATE public.supplies SET status = 'cancelled' WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
    'new row violates row-level security policy for table "supplies"',
    'worker cannot cancel anothers request'
);

ROLLBACK;
