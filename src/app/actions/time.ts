'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type LocationStatus = 'captured' | 'denied' | 'timeout' | 'unsupported' | 'unavailable'

const FRIENDLY: Record<string, string> = {
  not_active_member: 'Your account is not active. Contact your foreman.',
  already_clocked_in: "You're already clocked in.",
  shift_already_open: "You're already clocked in.",
  no_open_shift: "You're not clocked in, or already on break.",
  not_on_break: "You're not on a break.",
  property_archived: 'That property is archived. Pick another one.',
  operation_key_reused: 'That request conflicted with an earlier one. Please try again.',
  no_rate: 'No hourly rate is set for you yet. Ask your foreman.',
}

function friendly(message: string) {
  const key = Object.keys(FRIENDLY).find(k => message.includes(k))
  return key ? FRIENDLY[key] : message
}

function done() {
  revalidatePath('/')
  revalidatePath('/time')
  revalidatePath('/manage')
}

export async function clockIn(propertyId: string, lat: number | null, lng: number | null, acc: number | null, status: LocationStatus, operationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('clock_in', {
    p_operation_id: operationId,
    p_payload_hash: `${propertyId}-${status}`,
    p_property_id: propertyId,
    p_client_reported_at: new Date().toISOString(),
    p_latitude: lat,
    p_longitude: lng,
    p_accuracy: acc,
    p_status: status,
  })
  if (error) return { error: friendly(error.message) }
  done()
  return { data }
}

export async function clockOut(lat: number | null, lng: number | null, acc: number | null, status: LocationStatus, operationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('clock_out', {
    p_operation_id: operationId,
    p_payload_hash: `out-${status}`,
    p_client_reported_at: new Date().toISOString(),
    p_latitude: lat,
    p_longitude: lng,
    p_accuracy: acc,
    p_status: status,
  })
  if (error) return { error: friendly(error.message) }
  done()
  return { data }
}

export async function startBreak(operationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('break_start', {
    p_operation_id: operationId,
    p_payload_hash: 'break-start',
    p_client_reported_at: new Date().toISOString(),
  })
  if (error) return { error: friendly(error.message) }
  done()
  return { data }
}

export async function endBreak(operationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('break_end', {
    p_operation_id: operationId,
    p_payload_hash: 'break-end',
    p_client_reported_at: new Date().toISOString(),
  })
  if (error) return { error: friendly(error.message) }
  done()
  return { data }
}
