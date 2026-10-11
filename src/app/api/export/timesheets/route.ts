import { createClient } from '@/utils/supabase/server'
import { getCrewWeekRange } from '@/lib/format'
import { summarize } from '@/features/reporting/shifts'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single()
  if (!member || (member.role !== 'foreman' && member.role !== 'admin')) {
    return new Response('Forbidden', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const offset = Math.min(0, parseInt(searchParams.get('offset') || '0', 10) || 0)
  const isCurrentWeek = offset === 0

  const now = new Date()
  const { start: weekStart, end: weekEnd } = getCrewWeekRange(offset, now)

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, members(id, first_name, last_name, role), clock_events(event_type, server_recorded_at)')
    .gte('started_at', weekStart.toISOString())
    .lt('started_at', weekEnd.toISOString())
    .eq('status', 'closed')

  const memberTotals = new Map<number, { member: any, shifts: any[], ms: number, cents: number }>()

  for (const shift of (shifts || [])) {
    const memberId = shift.member_id
    if (!memberTotals.has(memberId)) {
      memberTotals.set(memberId, { member: shift.members, shifts: [], ms: 0, cents: 0 })
    }
    const current = memberTotals.get(memberId)!
    current.shifts.push(shift)
  }

  const windowEndMs = isCurrentWeek ? now.getTime() : weekEnd.getTime()
  for (const group of memberTotals.values()) {
    const stats = summarize(group.shifts, { startMs: weekStart.getTime(), endMs: windowEndMs }, windowEndMs)
    group.ms = stats.ms
    group.cents = stats.cents
  }

  const sortedGroups = Array.from(memberTotals.values()).sort((a, b) => b.ms - a.ms)

  // CSV format: Name, Role, Hours, Gross Pay
  const rows = [
    ['Name', 'Role', 'Hours', 'Gross Pay USD']
  ]

  for (const group of sortedGroups) {
    const hours = (group.ms / 3600000).toFixed(2)
    const pay = (group.cents / 100).toFixed(2)
    rows.push([
      `"${group.member.first_name} ${group.member.last_name}"`,
      group.member.role,
      hours,
      pay
    ])
  }

  const csvContent = rows.map(e => e.join(',')).join('\n')
  const startDateStr = weekStart.toISOString().split('T')[0]
  const endDateStr = new Date(weekEnd.getTime() - 86_400_000).toISOString().split('T')[0]

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="timesheets_${startDateStr}_to_${endDateStr}.csv"`
    }
  })
}
