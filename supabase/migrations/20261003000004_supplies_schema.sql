CREATE TYPE public.supply_status AS ENUM ('needed', 'claimed', 'purchased', 'cancelled');
CREATE TYPE public.supply_urgency AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE public.supplies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    description text NOT NULL CHECK (char_length(trim(description)) > 0),
    urgency supply_urgency NOT NULL DEFAULT 'medium',
    status supply_status NOT NULL DEFAULT 'needed',
    requested_by uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    claimed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
    purchased_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
    purchased_at timestamptz,
    stored_in text,
    version integer NOT NULL DEFAULT 1
);

CREATE OR REPLACE FUNCTION public.increment_supply_version()
RETURNS trigger AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplies_version_trigger
    BEFORE UPDATE ON public.supplies
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_supply_version();

ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members can view all supplies" ON public.supplies
    FOR SELECT TO authenticated
    USING (private.current_role() IS NOT NULL);

CREATE POLICY "Active members can request supplies" ON public.supplies
    FOR INSERT TO authenticated
    WITH CHECK (
        private.current_role() IS NOT NULL AND
        requested_by = auth.uid() AND
        status = 'needed'
    );

CREATE POLICY "Members can update supplies based on status rules" ON public.supplies
    FOR UPDATE TO authenticated
    USING (private.current_role() IS NOT NULL)
    WITH CHECK (
        private.current_role() IS NOT NULL AND
        (
            -- ANY member can claim a needed item
            ((SELECT s.status FROM public.supplies s WHERE s.id = supplies.id) = 'needed' AND status = 'claimed' AND claimed_by = auth.uid()) OR
            
            -- Claimer or foreman/admin can un-claim an item back to needed
            ((SELECT s.status FROM public.supplies s WHERE s.id = supplies.id) = 'claimed' AND status = 'needed' AND claimed_by IS NULL AND ((SELECT s.claimed_by FROM public.supplies s WHERE s.id = supplies.id) = auth.uid() OR private.current_role() IN ('foreman', 'admin'))) OR
            
            -- ANY member can mark needed/claimed as purchased
            ((SELECT s.status FROM public.supplies s WHERE s.id = supplies.id) IN ('needed', 'claimed') AND status = 'purchased' AND purchased_by = auth.uid() AND purchased_at IS NOT NULL) OR
            
            -- Requester or foreman/admin can cancel needed/claimed items
            ((SELECT s.status FROM public.supplies s WHERE s.id = supplies.id) IN ('needed', 'claimed') AND status = 'cancelled' AND ((SELECT s.requested_by FROM public.supplies s WHERE s.id = supplies.id) = auth.uid() OR private.current_role() IN ('foreman', 'admin'))) OR
            
            -- Any member can update stored_in if item is purchased
            ((SELECT s.status FROM public.supplies s WHERE s.id = supplies.id) = 'purchased' AND status = 'purchased' AND (SELECT s.purchased_by FROM public.supplies s WHERE s.id = supplies.id) IS NOT NULL AND (SELECT s.stored_in FROM public.supplies s WHERE s.id = supplies.id) IS DISTINCT FROM stored_in)
        ) AND
        -- Ensure critical fields are not maliciously altered during these transitions
        (SELECT s.requested_by FROM public.supplies s WHERE s.id = supplies.id) = requested_by AND
        (SELECT s.description FROM public.supplies s WHERE s.id = supplies.id) = description AND
        ((SELECT s.status FROM public.supplies s WHERE s.id = supplies.id) = 'purchased' OR status = 'purchased' OR (SELECT s.stored_in FROM public.supplies s WHERE s.id = supplies.id) IS NOT DISTINCT FROM stored_in)
    );
