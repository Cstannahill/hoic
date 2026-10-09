import { requireMember } from '@/lib/session'
import { startOfCrewWeek, formatHours, formatCents, startOfCrewDay, greeting } from '@/lib/format'
import { summarize, type RawShift } from '@/features/reporting/shifts'
import { PageContainer, PageHeader, EmptyState } from '@/components/common/page'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import { paidMs, centsFor } from '@/features/reporting/shifts'
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
  
  return (
    <PageContainer>
      <PageHeader 
        title="My Timesheet" 
        description="Your recent shifts and estimated earnings."
      />

      <div className="space-y-4">
        {shifts.length > 0 ? (
          shifts.map(shift => {
            const ms = paidMs(shift, undefined, now.getTime())
            const cents = centsFor(ms, shift.rate_snapshot_cents)
            return (
              <Card key={shift.id}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">{new Date(shift.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{new Date(shift.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {shift.ended_at ? new Date(shift.ended_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Now'}</span>
                      {shift.properties?.name && (
                        <Badge variant="secondary" className="font-normal text-xs">{shift.properties.name}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1 w-full md:w-auto mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                    {shift.status === 'closed' ? (
                      <>
                        <div className="flex gap-4 md:gap-1 w-full md:w-auto justify-between md:justify-end items-center md:flex-col">
                          <div className="font-bold text-lg text-primary">{formatCents(cents)}</div>
                          <div className="text-sm font-medium text-muted-foreground">{formatHours(ms)}h</div>
                        </div>
                        <CorrectionForm shiftId={shift.id.toString()} />
                      </>
                    ) : (
                      <>
                        <div className="text-warning font-semibold capitalize flex items-center gap-2">
                          <Clock className="size-4 animate-pulse" />
                          {shift.status.replace('_', ' ')}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">{formatHours(ms)}h (running)</div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
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
