'use client'

import { useState } from 'react'
import { clockIn, clockOut } from '@/app/actions/time'

type LocationStatus = 'ok' | 'denied' | 'timeout'

export function useClock() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getLocation = async (): Promise<{ lat: number | null, lng: number | null, acc: number | null, status: LocationStatus }> => {
    // If config says don't require geolocation, skip it to save time/privacy
    if (process.env.NEXT_PUBLIC_REQUIRE_GEOLOCATION === 'false') {
      return { lat: null, lng: null, acc: null, status: 'ok' }
    }

    if (!navigator.geolocation) {
      return { lat: null, lng: null, acc: null, status: 'denied' }
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: Number(pos.coords.latitude.toFixed(3)),
            lng: Number(pos.coords.longitude.toFixed(3)),
            acc: pos.coords.accuracy,
            status: 'ok'
          })
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) resolve({ lat: null, lng: null, acc: null, status: 'denied' })
          else resolve({ lat: null, lng: null, acc: null, status: 'timeout' })
        },
        { timeout: 8000, maximumAge: 0 }
      )
    })
  }

  const handleClockIn = async (propertyId: string) => {
    setIsPending(true)
    setError(null)
    const loc = await getLocation()
    const operationId = crypto.randomUUID()
    
    const res = await clockIn(propertyId, loc.lat, loc.lng, loc.acc, loc.status, operationId)
    setIsPending(false)
    if (res.error) setError(res.error)
    return res
  }

  const handleClockOut = async () => {
    setIsPending(true)
    setError(null)
    const loc = await getLocation()
    const operationId = crypto.randomUUID()
    
    const res = await clockOut(loc.lat, loc.lng, loc.acc, loc.status, operationId)
    setIsPending(false)
    if (res.error) setError(res.error)
    return res
  }

  return { handleClockIn, handleClockOut, isPending, error }
}
