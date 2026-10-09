import type { Metadata } from 'next'
import { LogOut, MapPin, Clock, Mail, ShieldCheck } from 'lucide-react'
import { requireMember, displayName, initials } from '@/lib/session'
import { PageContainer, PageHeader } from '@/components/common/page'
import { RoleBadge } from '@/components/common/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'
import { CREW_TZ } from '@/lib/format'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const { member } = await requireMember()
  const geoRequired = process.env.NEXT_PUBLIC_REQUIRE_GEOLOCATION !== 'false'

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
            <div className="mt-2"><RoleBadge role={member.role} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4" /> Crew settings</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Timezone: <span className="text-foreground">{CREW_TZ.replace('_', ' ')}</span></p>
          <p>Pay weeks run Monday through Sunday.</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="size-4" /> Location</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {geoRequired ? (
            <>
              <p>When you clock in, clock out, or take a break, HOIC asks your device for its location <strong className="text-foreground">once</strong>. It is rounded to about 100 m before being sent.</p>
              <p>We never track you between those taps. Only admins can see locations, and they are deleted after 90 days.</p>
              <p>If you decline, you can still clock in — the event is just marked &ldquo;location denied&rdquo;.</p>
            </>
          ) : (
            <p className="flex items-center gap-2"><ShieldCheck className="size-4" /> Location capture is turned off for this crew.</p>
          )}
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
