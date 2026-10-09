'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export type LoginState = { error?: string; email?: string }

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginIdentifier = formData.get('email')?.toString().trim().toLowerCase() ?? ''
  const password = formData.get('password')?.toString() ?? ''
  
  if (!loginIdentifier || !password) return { error: 'Enter your username/email and password.', email: loginIdentifier }

  let emailToUse = loginIdentifier

  // If there's no '@', treat it as a username and look up the email
  if (!loginIdentifier.includes('@')) {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data, error } = await adminClient
      .from('members')
      .select('email')
      .eq('username', loginIdentifier)
      .single()
      
    if (data?.email) {
      emailToUse = data.email
    } else {
      return { error: 'Incorrect username or password.', email: loginIdentifier }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password })
  if (error) {
    const msg = /invalid login/i.test(error.message)
      ? 'Incorrect username or password.'
      : /email not confirmed/i.test(error.message)
        ? 'Please confirm your email first - check your inbox.'
        : 'Could not sign in. Please try again.'
    return { error: msg, email: loginIdentifier }
  }
  
  redirect('/')
}
