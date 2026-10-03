BEGIN;
SELECT plan(1);
-- We test that without authentication, current_role() returns null
SELECT is(private.current_role(), NULL, 'Unauthenticated user has no role');
SELECT * FROM finish();
ROLLBACK;
