import { describe, it, expect } from 'vitest'
import {
  parse24To12,
  format12To24,
  stepHour,
  stepMinute,
  togglePeriod,
  formatTimeToCrewHHMM,
  formatTimeToCrewDisplay,
  combineCrewDateAndTime,
} from './time-picker'

describe('time-picker utilities', () => {
  describe('parse24To12', () => {
    it('parses morning times correctly', () => {
      expect(parse24To12('08:30')).toEqual({ hour12: 8, minute: 30, period: 'AM' })
      expect(parse24To12('09:05')).toEqual({ hour12: 9, minute: 5, period: 'AM' })
    })

    it('parses midnight (00:xx) as 12:xx AM', () => {
      expect(parse24To12('00:00')).toEqual({ hour12: 12, minute: 0, period: 'AM' })
      expect(parse24To12('00:15')).toEqual({ hour12: 12, minute: 15, period: 'AM' })
    })

    it('parses noon (12:xx) as 12:xx PM', () => {
      expect(parse24To12('12:00')).toEqual({ hour12: 12, minute: 0, period: 'PM' })
      expect(parse24To12('12:45')).toEqual({ hour12: 12, minute: 45, period: 'PM' })
    })

    it('parses afternoon and evening times correctly', () => {
      expect(parse24To12('13:15')).toEqual({ hour12: 1, minute: 15, period: 'PM' })
      expect(parse24To12('17:42')).toEqual({ hour12: 5, minute: 42, period: 'PM' })
      expect(parse24To12('23:59')).toEqual({ hour12: 11, minute: 59, period: 'PM' })
    })

    it('handles fallback for invalid inputs gracefully', () => {
      expect(parse24To12('')).toEqual({ hour12: 8, minute: 0, period: 'AM' })
      expect(parse24To12('invalid')).toEqual({ hour12: 8, minute: 0, period: 'AM' })
    })
  })

  describe('format12To24', () => {
    it('converts 12-hour AM times to 24-hour string', () => {
      expect(format12To24(8, 30, 'AM')).toBe('08:30')
      expect(format12To24(12, 15, 'AM')).toBe('00:15')
      expect(format12To24(12, 0, 'AM')).toBe('00:00')
    })

    it('converts 12-hour PM times to 24-hour string', () => {
      expect(format12To24(12, 0, 'PM')).toBe('12:00')
      expect(format12To24(1, 45, 'PM')).toBe('13:45')
      expect(format12To24(5, 7, 'PM')).toBe('17:07')
      expect(format12To24(11, 59, 'PM')).toBe('23:59')
    })
  })

  describe('stepHour', () => {
    it('increments hour and wraps around 12 to 1', () => {
      expect(stepHour(8, 1)).toBe(9)
      expect(stepHour(11, 1)).toBe(12)
      expect(stepHour(12, 1)).toBe(1)
    })

    it('decrements hour and wraps around 1 to 12', () => {
      expect(stepHour(8, -1)).toBe(7)
      expect(stepHour(1, -1)).toBe(12)
    })
  })

  describe('stepMinute', () => {
    it('increments minute and wraps 59 to 0', () => {
      expect(stepMinute(30, 1)).toBe(31)
      expect(stepMinute(59, 1)).toBe(0)
      expect(stepMinute(45, 15)).toBe(0)
    })

    it('decrements minute and wraps 0 to 59', () => {
      expect(stepMinute(30, -1)).toBe(29)
      expect(stepMinute(0, -1)).toBe(59)
      expect(stepMinute(0, -15)).toBe(45)
    })
  })

  describe('togglePeriod', () => {
    it('toggles AM to PM and vice versa', () => {
      expect(togglePeriod('AM')).toBe('PM')
      expect(togglePeriod('PM')).toBe('AM')
    })
  })

  describe('formatTimeToCrewHHMM', () => {
    it('formats UTC ISO to Chicago 24-hour HH:MM during Daylight Saving Time (CDT)', () => {
      // 13:30 UTC is 08:30 CDT (UTC-5)
      expect(formatTimeToCrewHHMM('2026-07-15T13:30:00.000Z')).toBe('08:30')
      // 22:00 UTC is 17:00 CDT (UTC-5)
      expect(formatTimeToCrewHHMM('2026-07-15T22:00:00.000Z')).toBe('17:00')
    })

    it('formats UTC ISO to Chicago 24-hour HH:MM during Standard Time (CST)', () => {
      // 14:30 UTC is 08:30 CST (UTC-6)
      expect(formatTimeToCrewHHMM('2026-01-15T14:30:00.000Z')).toBe('08:30')
    })
  })

  describe('formatTimeToCrewDisplay', () => {
    it('formats UTC ISO to localized 12-hour display string', () => {
      expect(formatTimeToCrewDisplay('2026-07-15T13:30:00.000Z')).toBe('8:30 AM')
      expect(formatTimeToCrewDisplay('2026-07-15T22:00:00.000Z')).toBe('5:00 PM')
    })
  })

  describe('combineCrewDateAndTime', () => {
    it('combines base date and HH:MM in Chicago timezone for the same day', () => {
      const baseIso = '2026-07-15T13:30:00.000Z' // July 15, 2026
      const result = combineCrewDateAndTime(baseIso, '09:45', false)
      // 09:45 CDT is 14:45 UTC
      expect(result).toBe('2026-07-15T14:45:00.000Z')
    })

    it('handles next day when isNextDay is true', () => {
      const baseIso = '2026-07-15T13:30:00.000Z' // July 15, 2026
      const result = combineCrewDateAndTime(baseIso, '02:15', true)
      // July 16 at 02:15 CDT is 07:15 UTC
      expect(result).toBe('2026-07-16T07:15:00.000Z')
    })
  })
})
