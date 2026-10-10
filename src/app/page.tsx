import Link from 'next/link'
import { CheckSquare, Package, AlertTriangle, ArrowRight } from 'lucide-react'
import { requireMember, displayName } from '@/lib/session'
import { greeting, startOfCrewDay, startOfCrewWeek, formatHours, formatCents } from '@/lib/format'
import { summarize, openBreakStart, breakIntervals, type RawShift } from '@/features/reporting/shifts'
import { PageContainer } from '@/components/common/page'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { ClockPanel } from '@/components/time/clock-panel'
import { PriorityBadge } from '@/components/common/status-badge'

export default async function DashboardPage() {
  const { supabase, user, member } = await requireMember()
  const now = new Date()

  // 1. Fetch active shift with property name and clock events
  const { data: activeData } = await supabase
    .from('shifts')
    .select('id, status, started_at, properties(name), clock_events(event_type, server_recorded_at)')
    .eq('member_id', user.id)
    .in('status', ['working', 'on_break'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const activeShift = activeData ? {
    id: activeData.id,
    status: activeData.status,
    started_at: activeData.started_at,
    property_name: (activeData.properties as any)?.name,
  } : null

  // Calculate prior break ms for the timer
  let priorBreakMs = 0
  let breakStartedAt = null
  if (activeData) {
    const raw = { ...activeData, rate_snapshot_cents: 0, ended_at: null, member_id: user.id } as unknown as RawShift
    const intervals = breakIntervals(raw, now.getTime())
    breakStartedAt = openBreakStart(raw)
    priorBreakMs = intervals.reduce((acc, b) => acc + (b.endMs - b.startMs), 0)
    if (breakStartedAt) priorBreakMs -= (now.getTime() - breakStartedAt)
  }

  const { data: properties } = await supabase.from('properties').select('id, name').eq('active', true).order('name')

  // 2. Fetch stats for today and this week
  const weekStart = startOfCrewWeek(now)
  const dayStart = startOfCrewDay(now)
  
  const { data: recentShifts } = await supabase
    .from('shifts')
    .select('id, status, started_at, ended_at, rate_snapshot_cents, clock_events(event_type, server_recorded_at)')
    .eq('member_id', user.id)
    .gte('started_at', weekStart.toISOString())

  const shifts = (recentShifts ?? []) as RawShift[]
  const weekStats = summarize(shifts, { startMs: weekStart.getTime(), endMs: Infinity }, now.getTime())
  const dayStats = summarize(shifts, { startMs: dayStart.getTime(), endMs: Infinity }, now.getTime())

  // Check stale shift
  const { data: crew } = await supabase.from('crews').select('stale_shift_hours').eq('id', 1).single()
  const isStale = activeShift && (now.getTime() - new Date(activeShift.started_at).getTime() > (crew?.stale_shift_hours ?? 14) * 3600000)

  // 3. Open tasks
  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('id, notes, priority, status, properties(name)')
    .eq('assignee_id', user.id)
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .limit(50)

  // Sort: in_progress first, then by priority
  const priorityWeights: Record<string, number> = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 }
  const tasks = rawTasks?.sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
    if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
    return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0)
  }).slice(0, 3)

  // 4. Supplies count
  const { count: suppliesCount } = await supabase
    .from('supplies')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'needed')

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{greeting(now)}, {displayName(member).split(' ')[0]}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Here&apos;s your dashboard for {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.</p>
      </div>

      {isStale && (
        <div className="mb-6 rounded-md border border-[#d79921]/50 bg-[#d79921]/15 p-4 text-[#fabd2f] flex gap-3 items-start">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Shift left open?</p>
            <p className="mt-1 opacity-90">Your shift has been running for over {crew?.stale_shift_hours} hours. Please clock out or take a break if you are not working.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card className="md:col-span-2 lg:col-span-1 flex items-center justify-center p-6 bg-card">
          <ClockPanel activeShift={activeShift} properties={properties || []} breakStartedAt={breakStartedAt} priorBreakMs={priorBreakMs} />
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Today</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatHours(dayStats.ms)}<span className="text-2xl font-semibold text-muted-foreground ml-1">h</span></div>
            <p className="text-sm text-muted-foreground mt-2">Est. earnings: <span className="font-medium text-foreground">{formatCents(dayStats.cents)}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">This Week</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatHours(weekStats.ms)}<span className="text-2xl font-semibold text-muted-foreground ml-1">h</span></div>
            <p className="text-sm text-muted-foreground mt-2">Est. earnings: <span className="font-medium text-foreground">{formatCents(weekStats.cents)}</span></p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2"><CheckSquare className="size-4" /> My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {tasks && tasks.length > 0 ? (
              <ul className="space-y-3 flex-1">
                {tasks.map(t => (
                  <li key={t.id} className={`flex justify-between items-start gap-4 p-3 rounded-lg border ${t.status === 'in_progress' ? 'bg-primary/10 border-primary/20' : 'bg-muted/40 border-border'}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-sm flex items-center gap-2">
                        <span className="truncate">{t.notes || 'No description'}</span>
                        {t.status === 'in_progress' && <span className="text-[10px] uppercase font-bold text-primary bg-primary/20 px-1.5 py-0.5 rounded-sm shrink-0">Active</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{(t.properties as any)?.name || 'No property'}</p>
                    </div>
                    <PriorityBadge priority={t.priority} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-8">No open tasks.</div>
            )}
            <Link href="/tasks" className={buttonVariants({ variant: "outline", className: "w-full mt-4" })}>
              View all tasks <ArrowRight className="size-4 ml-2" />
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2"><Package className="size-4" /> Crew Supplies</CardTitle>
              <CardDescription>Items needed at the site</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center py-8">
            <div className="text-center space-y-2 mb-6">
              <div className="text-5xl font-bold text-warning">{suppliesCount ?? 0}</div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Items needed</p>
            </div>
            <Link href="/supplies" className={buttonVariants({ variant: "secondary", className: "w-full mt-auto" })}>
              View supplies <ArrowRight className="size-4 ml-2" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
