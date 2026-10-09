import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader, EmptyState } from '@/components/common/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { startOfCrewWeek, formatHours, formatCents } from '@/lib/format'
import { summarize, type RawShift } from '@/features/reporting/shifts'
import { Download, Calendar } from 'lucide-react'

export default async function ManageTimesheetsPage() {
  const { supabase } = await requireMember()
  const now = new Date()
  const weekStart = startOfCrewWeek(now)

  // Fetch all closed shifts for this week
  const { data: recentShifts } = await supabase
    .from('shifts')
    .select('*, members(id, first_name, last_name, role), clock_events(event_type, server_recorded_at)')
    .gte('started_at', weekStart.toISOString())
    .eq('status', 'closed')

  const shifts = (recentShifts ?? []) as any[]

  // Group by member
  const memberTotals = new Map<number, { member: any, shifts: any[], ms: number, cents: number }>()

  for (const shift of shifts) {
    const memberId = shift.member_id
    if (!memberTotals.has(memberId)) {
      memberTotals.set(memberId, { member: shift.members, shifts: [], ms: 0, cents: 0 })
    }
    const current = memberTotals.get(memberId)!
    current.shifts.push(shift)
  }

  // Calculate totals
  for (const group of memberTotals.values()) {
    const stats = summarize(group.shifts, { startMs: weekStart.getTime(), endMs: Infinity }, now.getTime())
    group.ms = stats.ms
    group.cents = stats.cents
  }

  const sortedGroups = Array.from(memberTotals.values()).sort((a, b) => b.ms - a.ms)

  return (
    <PageContainer>
      <PageHeader 
        title="Weekly Timesheets" 
        description={`Current period: ${weekStart.toLocaleDateString()} - Now`}
        actions={
          <Button variant="outline" disabled title="CSV export coming soon">
            <Download className="size-4 mr-2" /> Export CSV
          </Button>
        }
      />

      <div className="space-y-4">
        {sortedGroups.length > 0 ? (
          sortedGroups.map(group => (
            <Card key={group.member.id}>
              <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="font-semibold text-lg">{group.member.first_name} {group.member.last_name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{group.shifts.length} completed shift{group.shifts.length !== 1 ? 's' : ''} this week</div>
                </div>
                <div className="flex gap-6 items-center text-right w-full md:w-auto bg-muted/30 p-3 md:p-0 rounded-md">
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Hours</div>
                    <div className="font-bold text-xl">{formatHours(group.ms)}<span className="text-muted-foreground font-medium text-sm ml-1">h</span></div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Gross Pay</div>
                    <div className="font-bold text-xl text-primary">{formatCents(group.cents)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState 
            icon={Calendar}
            title="No completed shifts"
            description="No one has closed a shift this week yet."
          />
        )}
      </div>
    </PageContainer>
  )
}
