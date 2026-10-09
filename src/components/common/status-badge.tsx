import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

const tones: Record<Tone, string> = {
  neutral: 'bg-secondary text-secondary-foreground border-border',
  info: 'bg-[#458588]/20 text-[#83a598] border-[#458588]/40',
  success: 'bg-[#98971a]/20 text-[#b8bb26] border-[#98971a]/40',
  warning: 'bg-[#d79921]/20 text-[#fabd2f] border-[#d79921]/40',
  danger: 'bg-[#cc241d]/20 text-[#fb4934] border-[#cc241d]/40',
  accent: 'bg-[#b16286]/20 text-[#d3869b] border-[#b16286]/40',
}

export function Pill({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap', tones[tone], className)}>
      {children}
    </span>
  )
}

const statusMap: Record<string, { tone: Tone; label: string }> = {
  // tasks
  todo: { tone: 'neutral', label: 'To do' },
  in_progress: { tone: 'info', label: 'In progress' },
  blocked: { tone: 'danger', label: 'Blocked' },
  done: { tone: 'success', label: 'Done' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  // supplies
  needed: { tone: 'warning', label: 'Needed' },
  claimed: { tone: 'info', label: 'Claimed' },
  purchased: { tone: 'success', label: 'Purchased' },
  // shifts
  working: { tone: 'success', label: 'Working' },
  on_break: { tone: 'warning', label: 'On break' },
  closed: { tone: 'neutral', label: 'Closed' },
  voided: { tone: 'danger', label: 'Voided' },
  // corrections
  pending: { tone: 'warning', label: 'Pending' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] ?? { tone: 'neutral' as Tone, label: status.replace(/_/g, ' ') }
  return <Pill tone={s.tone}>{s.label}</Pill>
}

const priorityMap: Record<string, Tone> = { low: 'neutral', medium: 'info', normal: 'info', high: 'warning', urgent: 'danger' }

export function PriorityBadge({ priority }: { priority: string }) {
  return <Pill tone={priorityMap[priority] ?? 'neutral'}>{priority}</Pill>
}

export function RoleBadge({ role }: { role: string }) {
  const tone: Tone = role === 'admin' ? 'accent' : role === 'foreman' ? 'info' : 'neutral'
  return <Pill tone={tone}>{role}</Pill>
}
