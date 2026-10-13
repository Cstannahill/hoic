import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader, EmptyState } from '@/components/common/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { getCrewWeekRange, formatHours, formatCents } from '@/lib/format'
import { summarize } from '@/features/reporting/shifts'
import { Download, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { WeeklyLaborSummary } from '@/components/timesheets/weekly-labor-summary'

export default async function ManageTimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>
}) {
  const { supabase } = await requireMember()
  const { offset: offsetParam } = await searchParams
  const offset = Math.min(0, parseInt(offsetParam || '0', 10) || 0)
  const isCurrentWeek = offset === 0

  const now = new Date()
  const { start: weekStart, end: weekEnd } = getCrewWeekRange(offset, now)

  // Fetch all closed shifts for this week / period
  const { data: recentShifts } = await supabase
    .from('shifts')
    .select('*, members(id, first_name, last_name, role), clock_events(event_type, server_recorded_at)')
    .gte('started_at', weekStart.toISOString())
    .lt('started_at', weekEnd.toISOString())
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
  const windowEndMs = isCurrentWeek ? now.getTime() : weekEnd.getTime()
  for (const group of memberTotals.values()) {
    const stats = summarize(group.shifts, { startMs: weekStart.getTime(), endMs: windowEndMs }, windowEndMs)
    group.ms = stats.ms
    group.cents = stats.cents
  }

  const sortedGroups = Array.from(memberTotals.values()).sort((a, b) => b.ms - a.ms)
  const totalLaborMs = sortedGroups.reduce((acc, g) => acc + g.ms, 0)
  const totalLaborCents = sortedGroups.reduce((acc, g) => acc + g.cents, 0)
  const totalCompletedShifts = sortedGroups.reduce((acc, g) => acc + g.shifts.length, 0)

  // Fetch pending corrections (shown when viewing current period)
  const { data: corrections } = await supabase
    .from('shift_corrections')
    .select('*, members!shift_corrections_requested_by_fkey(first_name, last_name), shifts(started_at, ended_at, properties(name))')
    .eq('status', 'pending')

  const endDateDisplay = new Date(weekEnd.getTime() - 86_400_000)
  const periodDescription = isCurrentWeek
    ? `Current period: ${weekStart.toLocaleDateString()} - Now`
    : `Period: ${weekStart.toLocaleDateString()} - ${endDateDisplay.toLocaleDateString()}`

  return (
    <PageContainer>
      <PageHeader 
        title="Weekly Timesheets" 
        description={periodDescription}
        actions={
          <form action="/api/export/timesheets" method="GET">
            <input type="hidden" name="offset" value={offset} />
            <Button variant="outline" type="submit">
              <Download className="size-4 mr-2" /> Export CSV
            </Button>
          </form>
        }
      />

      {/* Week Selector / Period Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-card border border-border p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Link
            href={`/manage/timesheets?offset=${offset - 1}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "h-8")}
          >
            <ChevronLeft className="size-4 mr-1" /> Previous Week
          </Link>

          {offset < 0 ? (
            <Link
              href={`/manage/timesheets?offset=${offset + 1}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "h-8")}
            >
              Next Week <ChevronRight className="size-4 ml-1" />
            </Link>
          ) : (
            <span
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "h-8 opacity-40 pointer-events-none")}
            >
              Next Week <ChevronRight className="size-4 ml-1" />
            </span>
          )}

          {offset < 0 && (
            <Link
              href="/manage/timesheets"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "h-8 text-xs")}
            >
              Current Week
            </Link>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          {isCurrentWeek ? (
            <span className="text-primary font-semibold">● Current Pay Period</span>
          ) : (
            <span>Past period ({Math.abs(offset)} week{Math.abs(offset) > 1 ? 's' : ''} ago)</span>
          )}
        </div>
      </div>

      {isCurrentWeek && corrections && corrections.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-[#fb4934]">Pending Corrections ({corrections.length})</h2>
          <div className="grid gap-4">
            {corrections.map((c: any) => (
              <Card key={c.id} className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="font-semibold">{c.members.first_name} {c.members.last_name}</div>
                    <div className="text-sm mt-1">&quot;{c.details}&quot;</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Shift: {new Date(c.shifts.started_at).toLocaleDateString()} @ {c.shifts.properties?.name || 'Unknown'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={async () => { 'use server'; await require('@/app/actions/corrections').rejectCorrection(c.id) }}>
                      <Button variant="outline" size="sm" type="submit">Reject</Button>
                    </form>
                    <form action={async () => { 'use server'; await require('@/app/actions/corrections').approveCorrection(c.id) }}>
                      <Button variant="default" size="sm" type="submit">Approve</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {sortedGroups.length > 0 && (
        <WeeklyLaborSummary
          isCurrentWeek={isCurrentWeek}
          totalLaborCents={totalLaborCents}
          totalLaborMs={totalLaborMs}
          workersCount={sortedGroups.length}
          shiftsCount={totalCompletedShifts}
        />
      )}

      <h2 className="text-lg font-bold mb-4">Crew Totals</h2>
      <div className="space-y-4">
        {sortedGroups.length > 0 ? (
          sortedGroups.map(group => (
            <Card key={group.member.id}>
              <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="font-semibold text-lg">{group.member.first_name} {group.member.last_name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {group.shifts.length} completed shift{group.shifts.length !== 1 ? 's' : ''} {isCurrentWeek ? 'this week' : 'in this period'}
                  </div>
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
            description={isCurrentWeek ? "No one has closed a shift this week yet." : "No completed shifts recorded for this pay period."}
          />
        )}
      </div>
    </PageContainer>
  )
}
