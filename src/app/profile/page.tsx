import type { Metadata } from 'next'
import { LogOut, Clock, Mail } from 'lucide-react'
import { requireMember, displayName, initials } from '@/lib/session'
import { PageContainer, PageHeader } from '@/components/common/page'
import { RoleBadge } from '@/components/common/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'
import { CREW_TZ } from '@/lib/format'
import { AccountSettingsForm } from '@/components/profile/account-settings-form'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const { member } = await requireMember()

  return (
    <PageContainer>
      <PageHeader title="Profile" />

      <Card className="mb-4">
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials(member)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xl font-semibold truncate">{displayName(member)}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground truncate"><Mail className="size-4" />{member.email}</p>
            <p className="text-sm text-muted-foreground truncate">@{member.username}</p>
            <div className="mt-2"><RoleBadge role={member.role} /></div>
          </div>
        </CardContent>
      </Card>

      <AccountSettingsForm currentUsername={member.username} />

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4" /> Crew settings</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Timezone: <span className="text-foreground">{CREW_TZ.replace('_', ' ')}</span></p>
          <p>Pay weeks run Saturday to Friday. (Paid weekly on Friday for all hours from previous Friday, until current Friday.)</p>
        </CardContent>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="destructive" size="lg" className="w-full sm:w-auto">
          <LogOut className="size-4" /> Log out
        </Button>
      </form>
    </PageContainer>
  )
}
