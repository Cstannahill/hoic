BEGIN;
SELECT plan(1);
SELECT pass('Placeholder for time functions test');
SELECT * FROM finish();
ROLLBACK;
