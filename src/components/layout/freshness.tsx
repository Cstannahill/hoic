'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useSync } from '@/components/providers/sync-provider'

/** Offline banner + refresh when the tab becomes visible again (spec 8 Freshness). */
export function Freshness() {
  const router = useRouter()
  const { isOffline, pendingCount, isSyncing, triggerSync } = useSync()

  useEffect(() => {
    const vis = () => { if (document.visibilityState === 'visible') router.refresh() }
    document.addEventListener('visibilitychange', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
    }
  }, [router])

  if (!isOffline && pendingCount === 0 && !isSyncing) return null

  if (isOffline) {
    return (
      <div role="status" className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-[#d79921] px-4 py-2 text-sm font-semibold text-[#282828] shadow-md">
        <WifiOff className="size-4" /> You are offline. Actions will be saved to your device.
        {pendingCount > 0 && <span className="ml-2 font-bold bg-[#282828] text-[#d79921] px-2 py-0.5 rounded-full text-xs">{pendingCount} pending</span>}
      </div>
    )
  }

  return (
    <div role="status" className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md cursor-pointer" onClick={() => triggerSync()}>
      <RefreshCw className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
      {isSyncing ? `Syncing ${pendingCount} actions...` : `${pendingCount} offline actions pending sync. Tap to sync.`}
    </div>
  )
}
