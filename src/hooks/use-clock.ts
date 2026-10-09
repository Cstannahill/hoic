'use client'

import { useState } from 'react'
import { clockIn, clockOut, startBreak, endBreak } from '@/app/actions/time'

type LocationStatus = 'captured' | 'denied' | 'timeout'

export function useClock() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRetry, setIsRetry] = useState(false)
  const [operationId, setOperationId] = useState<string | null>(null)

  const getLocation = async (): Promise<{ lat: number | null, lng: number | null, acc: number | null, status: LocationStatus }> => {
    // If config says don't require geolocation, skip it to save time/privacy
    if (process.env.NEXT_PUBLIC_REQUIRE_GEOLOCATION === 'false') {
      return { lat: null, lng: null, acc: null, status: 'captured' }
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
            status: 'captured'
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
    const opId = isRetry && operationId ? operationId : crypto.randomUUID()
    setOperationId(opId)
    
    const res = await clockIn(propertyId, loc.lat, loc.lng, loc.acc, loc.status, opId)
    setIsPending(false)
    if (res.error) {
      setError(res.error)
      setIsRetry(true)
    } else {
      setIsRetry(false)
      setOperationId(null)
    }
    return res
  }

  const handleClockOut = async () => {
    setIsPending(true)
    setError(null)
    const loc = await getLocation()
    const opId = isRetry && operationId ? operationId : crypto.randomUUID()
    setOperationId(opId)
    
    const res = await clockOut(loc.lat, loc.lng, loc.acc, loc.status, opId)
    setIsPending(false)
    if (res.error) {
      setError(res.error)
      setIsRetry(true)
    } else {
      setIsRetry(false)
      setOperationId(null)
    }
    return res
  }

  const handleBreak = async (kind: 'start' | 'end') => {
    setIsPending(true)
    setError(null)
    const opId = isRetry && operationId ? operationId : crypto.randomUUID()
    setOperationId(opId)
    const res = kind === 'start' ? await startBreak(opId) : await endBreak(opId)
    setIsPending(false)
    if (res.error) {
      setError(res.error)
      setIsRetry(true)
    } else {
      setIsRetry(false)
      setOperationId(null)
    }
    return res
  }

  return { handleClockIn, handleClockOut, handleBreak, isPending, error, isRetry, setError }
}
