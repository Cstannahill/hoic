import { describe, it, expect } from 'vitest'
import { paidMs, summarize, breakIntervals, centsFor, type RawShift } from './shifts'

const H = 3_600_000
const base = Date.UTC(2026, 9, 5, 14) // 2026-10-05 14:00Z

function shift(p: Partial<RawShift> = {}): RawShift {
  return {
    id: 's', member_id: 'm', status: 'closed',
    started_at: new Date(base).toISOString(),
    ended_at: new Date(base + 8 * H).toISOString(),
    rate_snapshot_cents: 2000,
    clock_events: [],
    ...p,
  }
}

describe('reporting/shifts', () => {
  it('subtracts breaks derived from clock events', () => {
    const s = shift({ clock_events: [
      { event_type: 'break_start', server_recorded_at: new Date(base + 4 * H).toISOString() },
      { event_type: 'break_end', server_recorded_at: new Date(base + 4.5 * H).toISOString() },
    ] })
    expect(paidMs(s)).toBe(7.5 * H)
    expect(centsFor(paidMs(s), 2000)).toBe(15000)
  })

  it('treats an open break as running until now', () => {
    const s = shift({ status: 'on_break', ended_at: null, clock_events: [
      { event_type: 'break_start', server_recorded_at: new Date(base + 2 * H).toISOString() },
    ] })
    expect(paidMs(s, undefined, base + 3 * H)).toBe(2 * H)
    expect(breakIntervals(s, base + 3 * H)).toHaveLength(1)
  })

  it('clips to a window', () => {
    const s = shift()
    expect(paidMs(s, { startMs: base + 6 * H, endMs: base + 24 * H })).toBe(2 * H)
  })

  it('ignores voided shifts', () => {
    expect(summarize([shift({ status: 'voided' })], { startMs: 0, endMs: Infinity }).ms).toBe(0)
  })
})
