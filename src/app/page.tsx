import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background p-4">
      <main className="w-full max-w-3xl flex-col items-center justify-center p-8 bg-card rounded-xl shadow-lg border border-border">
        <h1 className="text-3xl font-bold mb-4 text-primary text-center">Welcome to HOIC!</h1>
        <p className="text-center text-muted-foreground mb-8">
          You are successfully logged in as <strong className="text-foreground">{user.email}</strong>
        </p>
        
        <form action={async () => {
          'use server'
          const supabase = await createClient()
          await supabase.auth.signOut()
          redirect('/login')
        }} className="flex justify-center">
          <button type="submit" className="bg-destructive text-destructive-foreground px-6 py-2 rounded-md font-semibold hover:opacity-90 transition">
            Sign Out
          </button>
        </form>
      </main>
    </div>
  )
}
