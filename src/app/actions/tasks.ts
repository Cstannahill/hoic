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

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  
  const property_id = formData.get('property_id') as string
  const assignee_id = formData.get('assignee_id') as string
  const priority = formData.get('priority') as string
  const due_date = formData.get('due_date') as string || null
  const notes = formData.get('notes') as string || null

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      property_id,
      assignee_id,
      priority,
      due_date: due_date ? due_date : null,
      notes,
      status: 'todo'
    })

  if (error) {
    console.error('Error creating task:', error)
    return { error: error.message }
  }

  revalidatePath('/manage/tasks')
  revalidatePath('/tasks')
  return { success: true }
}
