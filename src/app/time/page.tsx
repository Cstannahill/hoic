import { requireMember } from '@/lib/session'
import { formatHours, formatCents, formatTime, CREW_TZ } from '@/lib/format'
import { PageContainer, PageHeader, EmptyState } from '@/components/common/page'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar } from 'lucide-react'
import { paidMs, centsFor, type RawShift } from '@/features/reporting/shifts'
import { CorrectionForm } from '@/components/time/correction-form'

export default async function TimePage() {
  const { supabase, user } = await requireMember()
  const now = new Date()

  // Fetch all recent shifts
  const { data: recentShifts } = await supabase
    .from('shifts')
    .select('id, status, started_at, ended_at, rate_snapshot_cents, properties(name), clock_events(event_type, server_recorded_at)')
    .eq('member_id', user.id)
    .order('started_at', { ascending: false })
    .limit(50)

  const shifts = (recentShifts ?? []) as unknown as (RawShift & { properties: { name: string } | null })[]

  // Group shifts by day in crew timezone
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: CREW_TZ }).format(now)

  type DayShift = {
    shift: typeof shifts[number]
    ms: number
    cents: number
  }

  type DayGroup = {
    key: string
    dayOfWeek: string
    formattedDate: string
    isToday: boolean
    totalMs: number
    totalCents: number
    shifts: DayShift[]
  }

  const groupMap = new Map<string, DayGroup>()

  for (const shift of shifts) {
    const startDate = new Date(shift.started_at)
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: CREW_TZ }).format(startDate)

    if (!groupMap.has(key)) {
      const dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: CREW_TZ, weekday: 'long' }).format(startDate)
      const formattedDate = new Intl.DateTimeFormat('en-US', { timeZone: CREW_TZ, month: 'short', day: 'numeric', year: 'numeric' }).format(startDate)
      groupMap.set(key, {
        key,
        dayOfWeek,
        formattedDate,
        isToday: key === todayKey,
        totalMs: 0,
        totalCents: 0,
        shifts: []
      })
    }

    const ms = paidMs(shift, undefined, now.getTime())
    const cents = centsFor(ms, shift.rate_snapshot_cents)

    const group = groupMap.get(key)!
    group.totalMs += ms
    group.totalCents += cents
    group.shifts.push({ shift, ms, cents })
  }

  const dayGroups = Array.from(groupMap.values())

  return (
    <PageContainer>
      <PageHeader 
        title="My Timesheet" 
        description="Your recent shifts and estimated earnings grouped by day."
      />

      <div className="space-y-6">
        {dayGroups.length > 0 ? (
          dayGroups.map(group => (
            <Card key={group.key} className="overflow-hidden border border-border shadow-xs">
              {/* Day Header */}
              <div className="bg-muted/40 px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Calendar className="size-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground tracking-tight">{group.dayOfWeek}</span>
                      {group.isToday && (
                        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-[11px] font-semibold px-2 py-0">
                          Today
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{group.formattedDate}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Day Total</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">{formatHours(group.totalMs)}h</span>
                      <span className="text-base font-bold text-primary">{formatCents(group.totalCents)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shifts List for this day */}
              <CardContent className="p-0 divide-y divide-border/50">
                {group.shifts.map(({ shift, ms, cents }) => (
                  <div key={shift.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/15 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {formatTime(shift.started_at)} – {shift.ended_at ? formatTime(shift.ended_at) : 'Now'}
                        </span>
                        {shift.properties?.name && (
                          <Badge variant="secondary" className="font-normal text-xs px-2 py-0.5">
                            {shift.properties.name}
                          </Badge>
                        )}
                        {shift.status !== 'closed' && (
                          <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-xs gap-1 py-0.5 animate-pulse">
                            <Clock className="size-3" />
                            {shift.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <div className="font-semibold text-sm text-foreground">{formatCents(cents)}</div>
                        <div className="text-xs text-muted-foreground font-medium">{formatHours(ms)}h</div>
                      </div>
                      {shift.status === 'closed' && (
                        <CorrectionForm shiftId={shift.id.toString()} />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState 
            icon={Clock}
            title="No shifts recorded"
            description="You haven't clocked in yet. Shifts will appear here once you start working."
          />
        )}
      </div>
    </PageContainer>
  )
}
