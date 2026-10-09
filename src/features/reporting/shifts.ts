/**
 * Single reporting implementation (spec §6). Screens and CSV both use this.
 * Breaks are derived from clock_events break_start/break_end pairs.
 */

export type ClockEvent = { event_type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'; server_recorded_at: string }

export type RawShift = {
  id: string
  member_id: string
  status: 'working' | 'on_break' | 'closed' | 'voided'
  started_at: string
  ended_at: string | null
  rate_snapshot_cents: number
  clock_events?: ClockEvent[] | null
}

export type Interval = { startMs: number; endMs: number }

export function breakIntervals(shift: RawShift, nowMs = Date.now()): Interval[] {
  const events = [...(shift.clock_events ?? [])].sort(
    (a, b) => +new Date(a.server_recorded_at) - +new Date(b.server_recorded_at)
  )
  const out: Interval[] = []
  let open: number | null = null
  for (const e of events) {
    const t = +new Date(e.server_recorded_at)
    if (e.event_type === 'break_start') open = t
    else if (e.event_type === 'break_end' && open !== null) { out.push({ startMs: open, endMs: t }); open = null }
  }
  if (open !== null) out.push({ startMs: open, endMs: shift.ended_at ? +new Date(shift.ended_at) : nowMs })
  return out
}

/** Current open break start, if on break. */
export function openBreakStart(shift: RawShift): number | null {
  if (shift.status !== 'on_break') return null
  const b = breakIntervals(shift).at(-1)
  return b ? b.startMs : null
}

function overlap(a: Interval, b: Interval) {
  return Math.max(0, Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs))
}

/** Paid ms of a shift, optionally clipped to a window (e.g. today / this week). */
export function paidMs(shift: RawShift, window?: Interval, nowMs = Date.now()): number {
  if (shift.status === 'voided') return 0
  const span: Interval = { startMs: +new Date(shift.started_at), endMs: shift.ended_at ? +new Date(shift.ended_at) : nowMs }
  const w = window ?? span
  const worked = overlap(span, w)
  const breaks = breakIntervals(shift, nowMs).reduce((sum, b) => sum + overlap(b, w), 0)
  return Math.max(0, worked - breaks)
}

export function roundHalfUp(n: number) {
  return Math.sign(n) * Math.floor(Math.abs(n) + 0.5)
}

export function centsFor(ms: number, rateCents: number) {
  return roundHalfUp((ms * rateCents) / 3_600_000)
}

export function summarize(shifts: RawShift[], window: Interval, nowMs = Date.now()) {
  let ms = 0
  let cents = 0
  for (const s of shifts) {
    const p = paidMs(s, window, nowMs)
    ms += p
    cents += centsFor(p, s.rate_snapshot_cents)
  }
  return { ms, cents }
}
