import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { GoogleButton } from '@/components/auth/google-button'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await getSession()
  if (user) redirect('/')
  const { error } = await searchParams

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/icon.svg" alt="" className="mx-auto mb-4 size-14" />
          <h1 className="text-2xl font-bold">Sign in to <span className="text-primary">HOIC</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">Crew timekeeping, tasks and supplies</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          <GoogleButton />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or use email</span>
            </div>
          </div>

          <LoginForm initialError={error ? 'Sign-in with Google failed. Please try again.' : undefined} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">Accounts are invite-only. Ask your foreman for access.</p>
      </div>
    </div>
  )
}
