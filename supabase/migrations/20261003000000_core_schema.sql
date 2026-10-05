CREATE SCHEMA IF NOT EXISTS private;

CREATE TYPE member_role AS ENUM ('worker', 'foreman', 'admin');

CREATE TABLE crews (
    id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    timezone text NOT NULL DEFAULT 'America/Chicago',
    currency text NOT NULL DEFAULT 'USD',
    reporting_week_start int NOT NULL DEFAULT 1,
    stale_shift_hours int NOT NULL DEFAULT 9
);

CREATE TABLE members (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role member_role NOT NULL DEFAULT 'worker',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE members ENABLE ROW LEVEL SECURITY;


CREATE TABLE mutation_receipts (
    actor_id uuid NOT NULL,
    operation_id uuid NOT NULL,
    payload_hash text NOT NULL,
    result jsonb,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (actor_id, operation_id)
);
ALTER TABLE mutation_receipts ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION private.current_member_id() RETURNS uuid AS $$
    SELECT id FROM public.members WHERE id = auth.uid() AND active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

CREATE FUNCTION private.current_role() RETURNS text AS $$
    SELECT role::text FROM public.members WHERE id = auth.uid() AND active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';
CREATE POLICY "Active members can view all active members" ON members FOR SELECT TO authenticated USING (active = true AND private.current_role() IS NOT NULL);
