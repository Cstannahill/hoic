'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTaskStatus(taskId: string, status: string, notes?: string) {
  const supabase = await createClient()

  const payload: any = { status }
  if (notes !== undefined) {
    payload.notes = notes
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)

  if (error) {
    console.error('Error updating task status:', error)
    return { error: error.message }
  }

  revalidatePath('/tasks')
  revalidatePath('/manage/tasks')
  return { success: true }
}
