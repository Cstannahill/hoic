'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function requestSupply(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const description = formData.get('description')?.toString()
  const urgency = formData.get('urgency')?.toString() || 'medium'

  if (!description || description.trim() === '') {
    throw new Error('Description is required')
  }

  // Derive property_id from current open shift quietly
  const { data: activeShift } = await supabase
    .from('shifts')
    .select('property_id')
    .eq('member_id', user.id)
    .is('end_time', null)
    .single()

  const { error } = await supabase
    .from('supplies')
    .insert({
      description: description.trim(),
      urgency,
      requested_by: user.id,
      property_id: activeShift?.property_id || null
    })

  if (error) throw new Error(error.message)
  
  revalidatePath('/supplies')
  revalidatePath('/')
  return { success: true }
}

export async function claimSupply(id: string, version: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { error } = await supabase
    .from('supplies')
    .update({ status: 'claimed', claimed_by: user.id })
    .eq('id', id)
    .eq('version', version)
    .select()
    .single()

  if (error) throw new Error('Failed to claim supply. It may have been updated by someone else.')
  
  revalidatePath('/supplies')
  return { success: true }
}

export async function releaseSupply(id: string, version: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { error } = await supabase
    .from('supplies')
    .update({ status: 'needed', claimed_by: null })
    .eq('id', id)
    .eq('version', version)
    .select()
    .single()

  if (error) throw new Error('Failed to release supply. It may have been updated by someone else.')
  
  revalidatePath('/supplies')
  return { success: true }
}

export async function purchaseSupply(id: string, version: number, storedIn?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const payload: any = { status: 'purchased', purchased_by: user.id, purchased_at: new Date().toISOString() }
  if (storedIn) {
    payload.stored_in = storedIn
  }

  const { error } = await supabase
    .from('supplies')
    .update(payload)
    .eq('id', id)
    .eq('version', version)
    .select()
    .single()

  if (error) throw new Error('Failed to mark as purchased. It may have been updated by someone else.')
  
  revalidatePath('/supplies')
  return { success: true }
}

export async function cancelSupply(id: string, version: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const { error } = await supabase
    .from('supplies')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('version', version)
    .select()
    .single()

  if (error) throw new Error('Failed to cancel supply. It may have been updated by someone else.')
  
  revalidatePath('/supplies')
  return { success: true }
}

export async function updateStoredLocation(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  
  const id = formData.get('id')?.toString()
  const version = parseInt(formData.get('version')?.toString() || '0')
  const stored_in = formData.get('stored_in')?.toString() || null // Allow null/empty clearing

  if (!id || !version) throw new Error('Missing required fields')

  const { error } = await supabase
    .from('supplies')
    .update({ stored_in })
    .eq('id', id)
    .eq('version', version)
    .select()
    .single()

  if (error) throw new Error('Failed to update storage location.')
  
  revalidatePath('/supplies')
  return { success: true }
}
