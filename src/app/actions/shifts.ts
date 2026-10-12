'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireMember } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function updateShiftTime(shiftId: string, startedAt: string, endedAt: string) {
  const startTime = new Date(startedAt).getTime()
  const endTime = new Date(endedAt).getTime()

  if (isNaN(startTime) || isNaN(endTime)) {
    return { error: 'Invalid dates provided' }
  }

  if (endTime <= startTime) {
    return { error: 'End time must be after start time' }
  }

  const session = await requireMember()
  const user = session.user
  const member = session.member
  const supabase = session.supabase || (await createClient())

  const { data: shift, error: fetchError } = await supabase
    .from('shifts')
    .select('id, member_id, version')
    .eq('id', shiftId)
    .maybeSingle()

  if (fetchError || !shift) {
    return { error: 'Shift not found' }
  }

  const isOwner = shift.member_id === user.id
  const isManager = member.role === 'foreman' || member.role === 'admin'

  if (!isOwner && !isManager) {
    return { error: 'Unauthorized to edit this shift' }
  }

  let dbClient = supabase
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    dbClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) as any
  }

  const { error: updateError } = await dbClient
    .from('shifts')
    .update({
      started_at: startedAt,
      ended_at: endedAt,
      corrected: true,
      version: (shift.version || 1) + 1,
    })
    .eq('id', shiftId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/time')
  revalidatePath('/manage/timesheets')
  return { success: true }
}
