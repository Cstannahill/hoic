'use server'

import { requireMember } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export type AccountState = { error?: string; success?: string }

export async function updateAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { supabase, user } = await requireMember()
  
  const username = formData.get('username')?.toString().trim().toLowerCase()
  const password = formData.get('password')?.toString()

  if (!username) {
    return { error: 'Username cannot be empty.' }
  }

  // Update Username
  const { error: dbError } = await supabase
    .from('members')
    .update({ username })
    .eq('id', user.id)

  if (dbError) {
    if (dbError.code === '23505') {
      return { error: 'That username is already taken.' }
    }
    return { error: 'Failed to update username.' }
  }

  // Update Password (if provided)
  if (password) {
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      return { error: authError.message }
    }
  }

  revalidatePath('/profile')
  return { success: 'Account updated successfully.' }
}
