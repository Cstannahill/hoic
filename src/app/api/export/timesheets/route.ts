import { createClient } from '@/utils/supabase/server'
import { startOfCrewWeek } from '@/lib/format'
import { summarize } from '@/features/reporting/shifts'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single()
  if (!member || (member.role !== 'foreman' && member.role !== 'admin')) {
    return new Response('Forbidden', { status: 403 })
  }

  const now = new Date()
  const weekStart = startOfCrewWeek(now)

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, members(id, first_name, last_name, role), clock_events(event_type, server_recorded_at)')
    .gte('started_at', weekStart.toISOString())
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

  for (const group of memberTotals.values()) {
    const stats = summarize(group.shifts, { startMs: weekStart.getTime(), endMs: Infinity }, now.getTime())
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

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="timesheets_${weekStart.toISOString().split('T')[0]}.csv"`
    }
  })
}
