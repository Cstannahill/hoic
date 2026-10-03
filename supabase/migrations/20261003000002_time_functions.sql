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
    
    PERFORM 1 FROM public.members WHERE id = v_member_id FOR UPDATE; -- lock member
    
    SELECT * INTO v_receipt FROM public.mutation_receipts WHERE actor_id = v_member_id AND operation_id = p_operation_id;
    IF FOUND THEN
        IF v_receipt.payload_hash != p_payload_hash THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'operation_key_reused'; END IF;
        RETURN v_receipt.result;
    END IF;

    IF EXISTS (SELECT 1 FROM public.shifts WHERE member_id = v_member_id AND status IN ('working', 'on_break')) THEN
        RAISE EXCEPTION USING errcode = 'P0001', message = 'already_clocked_in';
    END IF;

    SELECT rate_cents INTO v_rate_cents FROM public.hourly_rates WHERE member_id = v_member_id AND effective_from <= v_now ORDER BY effective_from DESC LIMIT 1;
    IF v_rate_cents IS NULL THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'no_rate'; END IF;

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
REVOKE EXECUTE ON FUNCTION clock_in FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clock_in TO authenticated;

CREATE OR REPLACE FUNCTION clock_out(
    p_operation_id uuid,
    p_payload_hash text,
    p_client_reported_at timestamptz,
    p_latitude numeric,
    p_longitude numeric,
    p_accuracy numeric,
    p_status location_status
) RETURNS jsonb AS $$
DECLARE
    v_member_id uuid;
    v_receipt public.mutation_receipts;
    v_shift_id uuid;
    v_event_id uuid;
    v_now timestamptz := clock_timestamp();
BEGIN
    v_member_id := private.current_member_id();
    IF v_member_id IS NULL THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'not_active_member'; END IF;
    
    PERFORM 1 FROM public.members WHERE id = v_member_id FOR UPDATE; -- lock member
    
    SELECT * INTO v_receipt FROM public.mutation_receipts WHERE actor_id = v_member_id AND operation_id = p_operation_id;
    IF FOUND THEN
        IF v_receipt.payload_hash != p_payload_hash THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'operation_key_reused'; END IF;
        RETURN v_receipt.result;
    END IF;

    SELECT id INTO v_shift_id FROM public.shifts WHERE member_id = v_member_id AND status = 'working';
    IF NOT FOUND THEN
        IF EXISTS (SELECT 1 FROM public.shifts WHERE member_id = v_member_id AND status = 'on_break') THEN
            RAISE EXCEPTION USING errcode = 'P0001', message = 'invalid_transition';
        ELSE
            RAISE EXCEPTION USING errcode = 'P0001', message = 'no_open_shift';
        END IF;
    END IF;

    UPDATE public.shifts SET status = 'closed', ended_at = v_now, version = version + 1 WHERE id = v_shift_id;
    
    INSERT INTO public.clock_events (shift_id, member_id, event_type, server_recorded_at, client_reported_at)
    VALUES (v_shift_id, v_member_id, 'clock_out', v_now, p_client_reported_at) RETURNING id INTO v_event_id;

    INSERT INTO public.event_locations (event_id, latitude, longitude, source_accuracy_m, status, captured_at, expires_at)
    VALUES (v_event_id, p_latitude, p_longitude, p_accuracy, p_status, COALESCE(p_client_reported_at, v_now), v_now + interval '90 days');

    INSERT INTO public.mutation_receipts (actor_id, operation_id, payload_hash, result)
    VALUES (v_member_id, p_operation_id, p_payload_hash, jsonb_build_object('shift_id', v_shift_id))
    RETURNING result INTO v_receipt.result;

    RETURN v_receipt.result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION clock_out FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clock_out TO authenticated;

CREATE OR REPLACE FUNCTION break_start(
    p_operation_id uuid,
    p_payload_hash text,
    p_client_reported_at timestamptz
) RETURNS jsonb AS $$
DECLARE
    v_member_id uuid;
    v_receipt public.mutation_receipts;
    v_shift_id uuid;
    v_event_id uuid;
    v_now timestamptz := clock_timestamp();
BEGIN
    v_member_id := private.current_member_id();
    IF v_member_id IS NULL THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'not_active_member'; END IF;
    
    PERFORM 1 FROM public.members WHERE id = v_member_id FOR UPDATE;
    
    SELECT * INTO v_receipt FROM public.mutation_receipts WHERE actor_id = v_member_id AND operation_id = p_operation_id;
    IF FOUND THEN
        IF v_receipt.payload_hash != p_payload_hash THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'operation_key_reused'; END IF;
        RETURN v_receipt.result;
    END IF;

    SELECT id INTO v_shift_id FROM public.shifts WHERE member_id = v_member_id AND status = 'working';
    IF NOT FOUND THEN
        RAISE EXCEPTION USING errcode = 'P0001', message = 'no_open_shift'; -- Or already on break
    END IF;

    UPDATE public.shifts SET status = 'on_break', version = version + 1 WHERE id = v_shift_id;
    
    INSERT INTO public.clock_events (shift_id, member_id, event_type, server_recorded_at, client_reported_at)
    VALUES (v_shift_id, v_member_id, 'break_start', v_now, p_client_reported_at) RETURNING id INTO v_event_id;

    INSERT INTO public.mutation_receipts (actor_id, operation_id, payload_hash, result)
    VALUES (v_member_id, p_operation_id, p_payload_hash, jsonb_build_object('shift_id', v_shift_id))
    RETURNING result INTO v_receipt.result;

    RETURN v_receipt.result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION break_start FROM PUBLIC;
GRANT EXECUTE ON FUNCTION break_start TO authenticated;

CREATE OR REPLACE FUNCTION break_end(
    p_operation_id uuid,
    p_payload_hash text,
    p_client_reported_at timestamptz
) RETURNS jsonb AS $$
DECLARE
    v_member_id uuid;
    v_receipt public.mutation_receipts;
    v_shift_id uuid;
    v_event_id uuid;
    v_now timestamptz := clock_timestamp();
BEGIN
    v_member_id := private.current_member_id();
    IF v_member_id IS NULL THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'not_active_member'; END IF;
    
    PERFORM 1 FROM public.members WHERE id = v_member_id FOR UPDATE;
    
    SELECT * INTO v_receipt FROM public.mutation_receipts WHERE actor_id = v_member_id AND operation_id = p_operation_id;
    IF FOUND THEN
        IF v_receipt.payload_hash != p_payload_hash THEN RAISE EXCEPTION USING errcode = 'P0001', message = 'operation_key_reused'; END IF;
        RETURN v_receipt.result;
    END IF;

    SELECT id INTO v_shift_id FROM public.shifts WHERE member_id = v_member_id AND status = 'on_break';
    IF NOT FOUND THEN
        RAISE EXCEPTION USING errcode = 'P0001', message = 'no_open_break';
    END IF;

    UPDATE public.shifts SET status = 'working', version = version + 1 WHERE id = v_shift_id;
    
    INSERT INTO public.clock_events (shift_id, member_id, event_type, server_recorded_at, client_reported_at)
    VALUES (v_shift_id, v_member_id, 'break_end', v_now, p_client_reported_at) RETURNING id INTO v_event_id;

    INSERT INTO public.mutation_receipts (actor_id, operation_id, payload_hash, result)
    VALUES (v_member_id, p_operation_id, p_payload_hash, jsonb_build_object('shift_id', v_shift_id))
    RETURNING result INTO v_receipt.result;

    RETURN v_receipt.result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION break_end FROM PUBLIC;
GRANT EXECUTE ON FUNCTION break_end TO authenticated;
