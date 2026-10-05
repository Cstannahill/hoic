import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { GoogleButton } from '@/components/auth/google-button'

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
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="p-8 w-full max-w-md border border-border bg-card rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-primary">Sign in to HOIC</h1>
        
        <form action={signIn} className="flex flex-col gap-4 mb-4">
          <input name="email" type="email" placeholder="Email" required className="border border-border bg-input p-3 rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition" />
          <input name="password" type="password" placeholder="Password" required className="border border-border bg-input p-3 rounded-md focus:ring-2 focus:ring-ring focus:outline-none transition" />
          <button type="submit" className="bg-primary text-primary-foreground font-semibold p-3 rounded-md hover:opacity-90 transition">Login</button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <GoogleButton />
      </div>
    </div>
  )
}
