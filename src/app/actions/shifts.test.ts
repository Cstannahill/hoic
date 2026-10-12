import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock session
const mockUser = { id: 'user-1' }
const mockMember = { id: 'user-1', role: 'worker', active: true }
vi.mock('@/lib/session', () => ({
  requireMember: vi.fn(async () => ({ user: mockUser, member: mockMember })),
}))

// Mock Supabase client
const mockFrom = vi.fn()
const mockSupabase = {
  from: mockFrom,
}

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

import { updateShiftTime } from './shifts'
import { revalidatePath } from 'next/cache'

describe('updateShiftTime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects if endedAt is not after startedAt', async () => {
    const res = await updateShiftTime('shift-1', '2026-10-12T15:00:00Z', '2026-10-12T14:00:00Z')
    expect(res.error).toBe('End time must be after start time')
  })

  it('rejects if shift is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const res = await updateShiftTime('shift-1', '2026-10-12T12:00:00Z', '2026-10-12T15:00:00Z')
    expect(res.error).toBe('Shift not found')
  })

  it('rejects if worker tries to edit someone elses shift', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'shift-1', member_id: 'other-user', version: 1 },
            error: null,
          }),
        }),
      }),
    })

    const res = await updateShiftTime('shift-1', '2026-10-12T12:00:00Z', '2026-10-12T15:00:00Z')
    expect(res.error).toBe('Unauthorized to edit this shift')
  })

  it('successfully updates shift when owner edits their shift', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shifts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'shift-1', member_id: 'user-1', version: 2 },
                error: null,
              }),
            }),
          }),
          update: updateFn,
        }
      }
      return {}
    })

    const res = await updateShiftTime('shift-1', '2026-10-12T12:00:00Z', '2026-10-12T15:00:00Z')
    expect(res.success).toBe(true)
    expect(updateFn).toHaveBeenCalledWith({
      started_at: '2026-10-12T12:00:00Z',
      ended_at: '2026-10-12T15:00:00Z',
      corrected: true,
      version: 3,
    })
    expect(updateEq).toHaveBeenCalledWith('id', 'shift-1')
    expect(revalidatePath).toHaveBeenCalledWith('/time')
    expect(revalidatePath).toHaveBeenCalledWith('/manage/timesheets')
  })

  it('allows foreman to edit another worker shift', async () => {
    // Override member to foreman
    mockMember.role = 'foreman'
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shifts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'shift-2', member_id: 'other-user', version: 1 },
                error: null,
              }),
            }),
          }),
          update: updateFn,
        }
      }
      return {}
    })

    const res = await updateShiftTime('shift-2', '2026-10-12T12:00:00Z', '2026-10-12T15:00:00Z')
    expect(res.success).toBe(true)
    mockMember.role = 'worker' // restore
  })
})
