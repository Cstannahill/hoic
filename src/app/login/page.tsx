import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function LoginPage() {
  const signIn = async (formData: FormData) => {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) redirect('/')
  }

  const signInWithGoogle = async () => {
    'use server'
    const supabase = await createClient()
    const origin = (await headers()).get('origin')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    })
    
    if (data.url) {
      redirect(data.url)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="p-8 w-full max-w-md border border-border bg-card rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-primary">Sign in to hoic</h1>
        
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

        <form action={signInWithGoogle}>
          <button type="submit" className="w-full bg-secondary text-secondary-foreground font-semibold p-3 rounded-md border border-border hover:opacity-90 transition flex justify-center items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
            Google
          </button>
        </form>
      </div>
    </div>
  )
}
