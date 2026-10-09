-- Make property_id optional on shifts
ALTER TABLE public.shifts ALTER COLUMN property_id DROP NOT NULL;

-- Make property_id optional on tasks
ALTER TABLE public.tasks ALTER COLUMN property_id DROP NOT NULL;
