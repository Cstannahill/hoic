import { UserX } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'

export const metadata = { title: 'Account not active' }

export default async function InactivePage() {
  const { user, member } = await getSession()
  if (!user) redirect('/login')
  if (member?.active) redirect('/')

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <UserX className="mx-auto size-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Account not active</h1>
        <p className="text-muted-foreground">
          You&apos;re signed in as <span className="text-foreground">{user.email}</span>, but this account
          {member ? ' has been deactivated' : " hasn't been added to the crew yet"}. Ask your foreman or admin for access.
        </p>
        <form action={signOut}><Button type="submit" variant="outline">Sign out</Button></form>
      </div>
    </div>
  )
}
