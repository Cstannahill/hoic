'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WifiOff } from 'lucide-react'

/** Offline banner + refresh when the tab becomes visible again (spec §8 Freshness). */
export function Freshness() {
  const router = useRouter()
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => { setOnline(true); router.refresh() }
    const off = () => setOnline(false)
    const vis = () => { if (document.visibilityState === 'visible') router.refresh() }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [router])

  if (online) return null
  return (
    <div role="status" className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-[#d79921] px-4 py-2 text-sm font-semibold text-[#282828]">
      <WifiOff className="size-4" /> You're offline. Changes won't save until you reconnect.
    </div>
  )
}
