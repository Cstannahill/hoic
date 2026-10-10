'use server'

import { requireMember } from '@/lib/session'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function createMember(formData: FormData) {
  const { member } = await requireMember()
  if (member.role !== 'admin' && member.role !== 'foreman') {
    return { error: 'Unauthorized. Only admins and foremen can add members.' }
  }

  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const rateStr = formData.get('rate') as string
  const rate = rateStr ? parseFloat(rateStr) : 0

  if (!firstName || !lastName || !username || !password || !role) {
    return { error: 'All fields except rate are required.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const fakeEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@hoic.app`

  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: fakeEmail,
    password: password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      username: username
    }
  })

  if (authError) {
    if (authError.message.includes('already exists')) {
      return { error: 'Username or account already exists.' }
    }
    return { error: authError.message }
  }

  const userId = authData.user.id

  // 2. Insert into members table
  const supabase = await createClient()
  const { error: memberError } = await supabase.from('members').insert({
    id: userId,
    email: fakeEmail,
    first_name: firstName,
    last_name: lastName,
    username: username,
    role: role,
    active: true
  })

  if (memberError) {
    // Attempt rollback
    await adminClient.auth.admin.deleteUser(userId)
    if (memberError.code === '23505') {
      return { error: 'That username is already taken.' }
    }
    return { error: memberError.message }
  }

  // 3. Set hourly rate if provided
  if (!isNaN(rate) && rate > 0) {
    await supabase.rpc('set_hourly_rate', {
      p_member_id: userId,
      p_rate_cents: Math.round(rate * 100),
      p_reason: 'Initial rate set at creation'
    })
  }

  revalidatePath('/manage/people')
  return { success: true }
}
