'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { signIn, type LoginState } from '@/app/actions/login'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: initialError })
  const [show, setShow] = useState(false)

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/15 p-3 text-sm text-[#fb4934]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Username or Email</Label>
        <Input id="email" name="email" type="text" autoCapitalize="none" autoComplete="username" required defaultValue={state.email} className="h-12" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required className="h-12 pr-12" />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </div>
      <Button type="submit" size="lg" className="h-12 text-base" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
