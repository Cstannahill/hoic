CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'blocked', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES properties(id),
    assignee_id uuid REFERENCES members(id),
    status task_status NOT NULL DEFAULT 'todo',
    priority task_priority NOT NULL DEFAULT 'medium',
    due_date date,
    notes text,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Constraint for blocked note
ALTER TABLE tasks ADD CONSTRAINT tasks_blocked_note_check CHECK (
    status != 'blocked' OR (notes IS NOT NULL AND length(trim(notes)) > 0)
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: All active members can read tasks
CREATE POLICY "Active members can view tasks" ON tasks FOR SELECT TO authenticated USING (
    private.current_role() IS NOT NULL
);

-- INSERT: Only foreman or admin can insert
CREATE POLICY "Foreman/Admin can insert tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (
    private.current_role() IN ('foreman', 'admin')
);

-- DELETE: Only foreman or admin can delete
CREATE POLICY "Foreman/Admin can delete tasks" ON tasks FOR DELETE TO authenticated USING (
    private.current_role() IN ('foreman', 'admin')
);

-- UPDATE: Foreman/Admin can update anything.
-- Assignee can update only if they are not changing assignee, property, priority, or due_date.
-- And assignee can only make valid transitions.
CREATE POLICY "Foreman/Admin can update tasks" ON tasks FOR UPDATE TO authenticated USING (
    private.current_role() IN ('foreman', 'admin')
);

CREATE POLICY "Assignees can update their task status" ON tasks FOR UPDATE TO authenticated USING (
    assignee_id = auth.uid() AND private.current_role() = 'worker'
) WITH CHECK (
    assignee_id = auth.uid() 
    AND property_id = (SELECT property_id FROM tasks t WHERE t.id = tasks.id)
    AND priority = (SELECT priority FROM tasks t WHERE t.id = tasks.id)
    AND due_date IS NOT DISTINCT FROM (SELECT due_date FROM tasks t WHERE t.id = tasks.id)
    AND status IN ('in_progress', 'blocked', 'done')
    AND (
        -- todo -> in_progress
        ((SELECT status FROM tasks t WHERE t.id = tasks.id) = 'todo' AND status = 'in_progress') OR
        -- in_progress -> blocked
        ((SELECT status FROM tasks t WHERE t.id = tasks.id) = 'in_progress' AND status = 'blocked') OR
        -- blocked -> in_progress
        ((SELECT status FROM tasks t WHERE t.id = tasks.id) = 'blocked' AND status = 'in_progress') OR
        -- todo/in_progress -> done
        ((SELECT status FROM tasks t WHERE t.id = tasks.id) IN ('todo', 'in_progress') AND status = 'done')
    )
);
