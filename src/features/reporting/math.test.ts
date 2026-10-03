import { expect, test } from 'vitest'
import { calculateShiftEarnings } from './math'

test('calculates shift earnings correctly', () => {
    // 2 hours at $10.50/hr = $21.00 = 2100 cents
    const start = new Date('2026-10-01T08:00:00Z').getTime()
    const end = new Date('2026-10-01T10:00:00Z').getTime()
    const breaks: {startMs: number, endMs: number}[] = []
    const rateCents = 1050
    expect(calculateShiftEarnings(start, end, breaks, rateCents)).toBe(2100)
})
