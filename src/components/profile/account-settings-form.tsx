'use client'

import { useActionState, useState, useEffect } from 'react'
import { AlertCircle, KeyRound } from 'lucide-react'
import { updateAccount, type AccountState } from '@/app/actions/account'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { SubmitButton } from '@/components/common/submit-button'

export function AccountSettingsForm({ currentUsername }: { currentUsername: string }) {
  const [state, action] = useActionState<AccountState, FormData>(updateAccount, {})
  const [username, setUsername] = useState(currentUsername)
  const [password, setPassword] = useState('')

  useEffect(() => {
    setUsername(currentUsername)
  }, [currentUsername])

  useEffect(() => {
    if (state.success) {
      setPassword('')
    }
  }, [state.success])

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" /> Account Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          {state.error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/15 p-3 text-sm text-[#fb4934]">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
            </div>
          )}
          {state.success && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-green-500/50 bg-green-500/15 p-3 text-sm text-green-500">
              {state.success}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 max-w-sm"
            />
            <p className="text-xs text-muted-foreground">You can use this instead of your email to sign in.</p>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 max-w-sm"
            />
            <p className="text-xs text-muted-foreground">If you signed up with Google, you can set a password here to sign in with your username.</p>
          </div>

          <div className="mt-2">
            <SubmitButton>Save Changes</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
