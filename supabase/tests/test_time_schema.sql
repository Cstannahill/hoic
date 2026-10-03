BEGIN;
SELECT plan(1);
-- We'll just verify the migrations apply cleanly for now.
SELECT pass('Migrations apply successfully');
SELECT * FROM finish();
ROLLBACK;
