CREATE TABLE shift_corrections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    requested_by uuid NOT NULL REFERENCES members(id),
    details text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE shift_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own corrections"
    ON shift_corrections FOR SELECT
    TO authenticated
    USING (requested_by = auth.uid() OR (SELECT role FROM members WHERE id = auth.uid()) IN ('foreman', 'admin'));

CREATE POLICY "Members can insert their own corrections"
    ON shift_corrections FOR INSERT
    TO authenticated
    WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Foreman/admin can update corrections"
    ON shift_corrections FOR UPDATE
    TO authenticated
    USING ((SELECT role FROM members WHERE id = auth.uid()) IN ('foreman', 'admin'));
