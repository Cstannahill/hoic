CREATE TABLE properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members see properties" ON properties FOR SELECT TO authenticated USING (private.current_role() IS NOT NULL);

CREATE TYPE shift_status AS ENUM ('working', 'on_break', 'closed', 'voided');

CREATE TABLE shifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid NOT NULL REFERENCES members(id),
    property_id uuid NOT NULL REFERENCES properties(id),
    status shift_status NOT NULL DEFAULT 'working',
    started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    ended_at timestamptz,
    rate_snapshot_cents integer NOT NULL,
    version int NOT NULL DEFAULT 1,
    corrected boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- Partial unique index: one active shift per member
CREATE UNIQUE INDEX one_active_shift_per_member ON shifts (member_id) WHERE status IN ('working', 'on_break');
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members see shifts" ON shifts FOR SELECT TO authenticated USING (private.current_role() IS NOT NULL);

CREATE TYPE event_type AS ENUM ('clock_in', 'clock_out', 'break_start', 'break_end');
CREATE TYPE location_status AS ENUM ('captured', 'denied', 'timeout', 'unsupported', 'unavailable');

CREATE TABLE clock_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id uuid NOT NULL REFERENCES shifts(id),
    member_id uuid NOT NULL REFERENCES members(id),
    event_type event_type NOT NULL,
    server_recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    client_reported_at timestamptz
);
ALTER TABLE clock_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members see clock_events" ON clock_events FOR SELECT TO authenticated USING (private.current_role() IS NOT NULL);

CREATE TABLE event_locations (
    event_id uuid PRIMARY KEY REFERENCES clock_events(id),
    latitude numeric(6,3),
    longitude numeric(7,3),
    source_accuracy_m numeric,
    status location_status NOT NULL,
    captured_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    purged_at timestamptz
);
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only locations" ON event_locations FOR SELECT TO authenticated USING (private.current_role() = 'admin');

CREATE TABLE hourly_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid NOT NULL REFERENCES members(id),
    rate_cents integer NOT NULL,
    effective_from timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hourly_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Foreman/Admin see rates" ON hourly_rates FOR SELECT TO authenticated USING (private.current_role() IN ('foreman', 'admin'));
