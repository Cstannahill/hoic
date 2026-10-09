'use server'

import { requireMember } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function requestCorrection(formData: FormData) {
  const { supabase, user } = await requireMember()
  
  const shiftId = formData.get('shift_id') as string
  const details = formData.get('details') as string
  
  if (!shiftId || !details.trim()) {
    throw new Error('Shift ID and details are required')
  }

  const { error } = await supabase.from('shift_corrections').insert({
    shift_id: shiftId,
    requested_by: user.id,
    details: details.trim()
  })

  if (error) throw new Error(error.message)
  revalidatePath('/time')
}

export async function approveCorrection(correctionId: string) {
  const { supabase, member } = await requireMember()
  if (member.role !== 'foreman' && member.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase.from('shift_corrections').update({ status: 'approved' }).eq('id', correctionId)
  if (error) throw new Error(error.message)
  revalidatePath('/manage/timesheets')
}

export async function rejectCorrection(correctionId: string) {
  const { supabase, member } = await requireMember()
  if (member.role !== 'foreman' && member.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase.from('shift_corrections').update({ status: 'rejected' }).eq('id', correctionId)
  if (error) throw new Error(error.message)
  revalidatePath('/manage/timesheets')
}
