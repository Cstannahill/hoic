'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type LoginState = { error?: string; email?: string }

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email')?.toString().trim() ?? ''
  const password = formData.get('password')?.toString() ?? ''
  if (!email || !password) return { error: 'Enter your email and password.', email }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const msg = /invalid login/i.test(error.message)
      ? 'Incorrect email or password.'
      : /email not confirmed/i.test(error.message)
        ? 'Please confirm your email first — check your inbox.'
        : 'Could not sign in. Please try again.'
    return { error: msg, email }
  }
  redirect('/')
}
