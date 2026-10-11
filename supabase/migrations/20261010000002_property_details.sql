ALTER TABLE supplies ADD COLUMN cost_cents integer DEFAULT 0;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('property_images', 'property_images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view property images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'property_images');

CREATE POLICY "Authenticated users can upload property images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'property_images');

CREATE TYPE image_stage AS ENUM ('before', 'after');

CREATE TABLE property_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    stage image_stage NOT NULL,
    storage_path text NOT NULL,
    uploaded_by uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active members see property images" ON property_images FOR SELECT TO authenticated USING (private.current_role() IS NOT NULL);
CREATE POLICY "Active members can insert property images" ON property_images FOR INSERT TO authenticated WITH CHECK (private.current_role() IS NOT NULL);
CREATE POLICY "Active members can delete property images" ON property_images FOR DELETE TO authenticated USING (private.current_role() IS NOT NULL);
