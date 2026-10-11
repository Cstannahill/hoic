'use server'

import { createClient } from '@/utils/supabase/server'
import { requireManager, requireMember } from '@/lib/session'
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

export async function uploadPropertyImage(propertyId: string, stage: 'before' | 'after', file: File) {
  const { user } = await requireMember()
  const supabase = await createClient()

  const ext = file.name.split('.').pop()
  const fileName = `${propertyId}/${stage}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('property_images')
    .upload(fileName, file)

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: dbError } = await supabase
    .from('property_images')
    .insert({
      property_id: propertyId,
      stage,
      storage_path: fileName,
      uploaded_by: user.id
    })

  if (dbError) {
    throw new Error(dbError.message)
  }

  revalidatePath(`/manage/properties/${propertyId}`)
}
