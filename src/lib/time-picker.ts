import { TZDate } from '@date-fns/tz'
import { CREW_TZ } from '@/lib/format'

export type Period = 'AM' | 'PM'

export function parse24To12(hhmm: string): { hour12: number; minute: number; period: Period } {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) {
    return { hour12: 8, minute: 0, period: 'AM' }
  }
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const minute = Math.min(59, Math.max(0, parseInt(mStr, 10) || 0))

  const period: Period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12

  return { hour12, minute, period }
}

export function format12To24(hour12: number, minute: number, period: Period): string {
  const clampedHour = Math.min(12, Math.max(1, hour12))
  const clampedMinute = Math.min(59, Math.max(0, minute))

  let h24 = clampedHour % 12
  if (period === 'PM') {
    h24 += 12
  }

  const hStr = String(h24).padStart(2, '0')
  const mStr = String(clampedMinute).padStart(2, '0')
  return `${hStr}:${mStr}`
}

export function stepHour(currentHour12: number, delta: number): number {
  return ((currentHour12 - 1 + delta) % 12 + 12) % 12 + 1
}

export function stepMinute(currentMinute: number, delta: number): number {
  return ((currentMinute + delta) % 60 + 60) % 60
}

export function togglePeriod(current: Period): Period {
  return current === 'AM' ? 'PM' : 'AM'
}

export function formatTimeToCrewHHMM(isoString: string): string {
  const date = new Date(isoString)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CREW_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  let hour = '00'
  let minute = '00'
  for (const part of parts) {
    if (part.type === 'hour') hour = part.value.padStart(2, '0')
    if (part.type === 'minute') minute = part.value.padStart(2, '0')
  }

  return `${hour}:${minute}`
}

export function formatTimeToCrewDisplay(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CREW_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoString))
}

export function combineCrewDateAndTime(
  baseIso: string,
  timeHHMM: string,
  isNextDay = false
): string {
  const baseDate = new Date(baseIso)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CREW_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(baseDate)

  let year = baseDate.getUTCFullYear()
  let month = 1
  let day = 1

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10)
    if (part.type === 'month') month = parseInt(part.value, 10)
    if (part.type === 'day') day = parseInt(part.value, 10)
  }

  const [hours, minutes] = timeHHMM.split(':').map((n) => parseInt(n, 10))

  const targetDay = isNextDay ? day + 1 : day
  const tzDate = new TZDate(year, month - 1, targetDay, hours, minutes, 0, CREW_TZ)
  return new Date(tzDate).toISOString()
}

