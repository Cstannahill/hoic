'use server'

import { createClient } from '@/utils/supabase/server'
import { requireManager } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function createProperty(formData: FormData) {
  await requireManager()
  const name = formData.get('name')?.toString().trim()

  if (!name) throw new Error('Name is required')

  const supabase = await createClient()
  const { error } = await supabase.from('properties').insert({ name })

  if (error) throw new Error(error.message)
  revalidatePath('/manage/properties')
  revalidatePath('/time')
  revalidatePath('/tasks')
}
