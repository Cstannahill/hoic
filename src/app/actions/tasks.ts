'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTaskStatus(taskId: string, status: string, notes?: string) {
  const supabase = await createClient()

  const payload: any = { status }
  if (notes !== undefined) {
    payload.notes = notes
  }

  const { error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('Error updating task status:', error)
    throw new Error(error.message || 'Unauthorized or invalid transition')
  }

  revalidatePath('/tasks')
  revalidatePath('/manage/tasks')
  return { success: true }
}

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  
  let property_id = formData.get('property_id')?.toString()
  if (property_id === 'none') property_id = undefined
  const assignee_id = formData.get('assignee_id')?.toString()
  const priority = formData.get('priority')?.toString()
  const due_date = formData.get('due_date')?.toString() || null
  const notes = formData.get('notes')?.toString() || null

  if (!assignee_id || !priority) {
    throw new Error('Missing required fields')
  }

  const { error } = await supabase
    .from('tasks')
    .insert({
      property_id: property_id || null,
      assignee_id,
      priority,
      due_date: due_date ? due_date : null,
      notes,
      status: 'todo'
    })

  if (error) {
    console.error('Error creating task:', error)
    throw new Error(error.message)
  }

  revalidatePath('/manage/tasks')
  revalidatePath('/tasks')
  return { success: true }
}
