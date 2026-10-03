'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type LocationStatus = 'captured' | 'denied' | 'timeout'

export async function clockIn(propertyId: string, lat: number | null, lng: number | null, acc: number | null, status: LocationStatus, operationId: string) {
  const supabase = await createClient()
  
  // Note: RLS and backend logic handles validation and idempotency
  const { data, error } = await supabase.rpc('clock_in', {
    p_operation_id: operationId,
    p_payload_hash: `${propertyId}-${status}`, // simple hash
    p_property_id: propertyId,
    p_client_reported_at: new Date().toISOString(),
    p_latitude: lat,
    p_longitude: lng,
    p_accuracy: acc,
    p_status: status
  })

  if (error) {
    console.error('Clock in error:', error)
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/time')
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
    p_status: status
  })

  if (error) {
    console.error('Clock out error:', error)
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/time')
  return { data }
}
