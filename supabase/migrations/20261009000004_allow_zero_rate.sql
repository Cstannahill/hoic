-- Modify the clock_in function to default to a 0 rate if none is set, rather than throwing an exception
CREATE OR REPLACE FUNCTION clock_in(
    p_operation_id uuid,
    p_payload_hash text,
    p_property_id uuid,
    p_client_reported_at timestamptz,
    p_latitude numeric,
    p_longitude numeric,
    p_accuracy numeric,
    p_status location_status
) RETURNS jsonb AS $$
DECLARE
    v_member_id uuid;
    v_receipt public.mutation_receipts;
    v_rate_cents int;
    v_shift_id uuid;
    v_event_id uuid;
    v_now timestamptz := clock_timestamp();
BEGIN
    v_member_id := private.current_member_id();
    IF v_member_id IS NULL THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'not_active_member'; END IF;
    
    SELECT result INTO v_receipt.result FROM public.mutation_receipts 
    WHERE actor_id = v_member_id AND operation_id = p_operation_id FOR UPDATE;
    
    IF FOUND THEN
        IF v_receipt.payload_hash = p_payload_hash THEN
            RETURN v_receipt.result;
        ELSE
            RAISE EXCEPTION USING errcode = 'P0001', message = 'operation_key_reused';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM public.shifts WHERE member_id = v_member_id AND status IN ('working', 'on_break') FOR UPDATE) THEN
        RAISE EXCEPTION USING errcode = 'P0001', message = 'shift_already_open';
    END IF;

    -- Here is the change: Default to 0 if no rate is found instead of throwing an exception
    SELECT rate_cents INTO v_rate_cents FROM public.members_rates WHERE member_id = v_member_id;
    IF v_rate_cents IS NULL THEN 
        v_rate_cents := 0; 
    END IF;

    INSERT INTO public.shifts (member_id, property_id, rate_snapshot_cents, started_at, status)
    VALUES (v_member_id, p_property_id, v_rate_cents, v_now, 'working') RETURNING id INTO v_shift_id;
    
    INSERT INTO public.clock_events (shift_id, member_id, event_type, server_recorded_at, client_reported_at)
    VALUES (v_shift_id, v_member_id, 'clock_in', v_now, p_client_reported_at) RETURNING id INTO v_event_id;

    INSERT INTO public.event_locations (event_id, latitude, longitude, source_accuracy_m, status, captured_at, expires_at)
    VALUES (v_event_id, p_latitude, p_longitude, p_accuracy, p_status, COALESCE(p_client_reported_at, v_now), v_now + interval '90 days');

    INSERT INTO public.mutation_receipts (actor_id, operation_id, payload_hash, result)
    VALUES (v_member_id, p_operation_id, p_payload_hash, jsonb_build_object('shift_id', v_shift_id))
    RETURNING result INTO v_receipt.result;

    RETURN v_receipt.result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
