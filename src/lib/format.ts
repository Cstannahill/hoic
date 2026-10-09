export const CREW_TZ = 'America/Chicago'

export function formatTime(d: string | Date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: CREW_TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(d))
}

export function formatDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', { timeZone: CREW_TZ, ...opts }).format(new Date(d))
}

export function formatDateTime(d: string | Date) {
  return `${formatDate(d)} · ${formatTime(d)}`
}

export function relativeTime(d: string | Date, now = Date.now()) {
  const diff = new Date(d).getTime() - now
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (abs < 60_000) return 'just now'
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute')
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour')
  return rtf.format(Math.round(diff / 86_400_000), 'day')
}

export function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatHours(ms: number) {
  return (ms / 3_600_000).toFixed(2)
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

/** Midnight in crew TZ for the given instant, returned as a UTC Date. */
export function startOfCrewDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: CREW_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(now)
    .reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {})
  const elapsedMs = ((+parts.hour * 60 + +parts.minute) * 60 + +parts.second) * 1000 + now.getMilliseconds()
  return new Date(now.getTime() - elapsedMs)
}

/** Monday 00:00 in crew TZ (reporting_week_start = 1). */
export function startOfCrewWeek(now = new Date()) {
  const dayStart = startOfCrewDay(now)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: CREW_TZ, weekday: 'short' }).format(now)
  const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday)
  // Step back whole days; recompute day start to stay correct across DST.
  return startOfCrewDay(new Date(dayStart.getTime() - idx * 86_400_000 + 3_600_000 * 2))
}

export function greeting(now = new Date()) {
  const h = +new Intl.DateTimeFormat('en-US', { timeZone: CREW_TZ, hour: 'numeric', hourCycle: 'h23' }).format(now)
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
