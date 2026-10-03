import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
export default async function LoginPage() {
  const signIn = async (formData: FormData) => {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) redirect('/')
  }
  return (
    <form action={signIn} className="p-4 flex flex-col gap-4">
      <input name="email" type="email" placeholder="Email" required className="border p-2" />
      <input name="password" type="password" placeholder="Password" required className="border p-2" />
      <button type="submit" className="bg-blue-500 text-white p-2">Login</button>
    </form>
  )
}
