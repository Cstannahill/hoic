import { expect, test, vi, describe } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClock } from '../../src/hooks/use-clock'
import * as timeActions from '../../src/app/actions/time'

describe('useClock', () => {
  test('geolocation denied returns denied status', async () => {
    // Mock config to require geolocation
    vi.stubEnv('NEXT_PUBLIC_REQUIRE_GEOLOCATION', 'true')
    
    // Mock geolocation to deny
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success, error) => 
        error({ code: 1 /* PERMISSION_DENIED */, PERMISSION_DENIED: 1, message: 'denied' })
      )
    }
    vi.stubGlobal('navigator', { geolocation: mockGeolocation })

    // Mock server action
    const clockInMock = vi.spyOn(timeActions, 'clockIn').mockResolvedValue({ data: {} })

    const { result } = renderHook(() => useClock())

    await act(async () => {
      await result.current.handleClockIn('test-prop')
    })

    expect(clockInMock).toHaveBeenCalledWith('test-prop', null, null, null, 'denied', expect.any(String))
    
    vi.restoreAllMocks()
  })
})
