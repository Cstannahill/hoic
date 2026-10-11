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

export async function uploadPropertyImage(formData: FormData) {
  const { user } = await requireMember()
  const supabase = await createClient()

  const propertyId = formData.get('propertyId') as string
  const stage = formData.get('stage') as 'before' | 'after'
  const file = formData.get('file') as File

  if (!propertyId || !stage || !file) {
    throw new Error('Property, stage, and file are required')
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${propertyId}/${stage}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('property_images')
    .upload(fileName, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true
    })

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

export async function deletePropertyImage(imageId: string, storagePath: string, propertyId: string) {
  await requireMember()
  const supabase = await createClient()

  await supabase.storage.from('property_images').remove([storagePath])

  const { error } = await supabase
    .from('property_images')
    .delete()
    .eq('id', imageId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/manage/properties/${propertyId}`)
}

