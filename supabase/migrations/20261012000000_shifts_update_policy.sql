-- Allow members to update their own shifts, and managers to update any shift
CREATE POLICY "Members can update their own shifts"
    ON public.shifts
    FOR UPDATE
    TO authenticated
    USING (member_id = auth.uid() OR (SELECT role FROM members WHERE id = auth.uid()) IN ('foreman', 'admin'))
    WITH CHECK (member_id = auth.uid() OR (SELECT role FROM members WHERE id = auth.uid()) IN ('foreman', 'admin'));
