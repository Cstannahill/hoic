'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getPendingMutations, removeMutation, markMutationFailed, type OfflineMutation } from '@/lib/offline-queue'
import { toast } from 'sonner'
import { clockIn, clockOut, startBreak, endBreak } from '@/app/actions/time'

type SyncContextType = {
  isOffline: boolean
  pendingCount: number
  isSyncing: boolean
  triggerSync: () => Promise<void>
  refreshQueue: () => Promise<void>
  mutations: OfflineMutation[]
}

const SyncContext = createContext<SyncContextType | null>(null)

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [mutations, setMutations] = useState<OfflineMutation[]>([])

  const refreshQueue = useCallback(async () => {
    try {
      const m = await getPendingMutations()
      setMutations(m)
    } catch (e) {
      console.error('Failed to load pending mutations', e)
    }
  }, [])

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    refreshQueue()

    const onOffline = () => setIsOffline(true)
    const onOnline = () => {
      setIsOffline(false)
      triggerSync()
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [refreshQueue])

  const triggerSync = async () => {
    if (isSyncing || !navigator.onLine) return
    setIsSyncing(true)
    
    try {
      const pending = await getPendingMutations()
      if (pending.length === 0) {
        setIsSyncing(false)
        return
      }

      toast.info(`Syncing ${pending.length} offline actions...`)

      for (const m of pending) {
        try {
          // Replay the action based on type
          switch (m.action) {
            case 'clock_in':
              await clockIn(m.payload.propertyId, m.payload.lat, m.payload.lng, m.payload.acc, m.payload.status, m.payload.opId)
              break
            case 'clock_out':
              await clockOut(m.payload.lat, m.payload.lng, m.payload.acc, m.payload.status, m.payload.opId)
              break
            case 'start_break':
              await startBreak(m.payload.opId)
              break
            case 'end_break':
              await endBreak(m.payload.opId)
              break
            // Add tasks/supplies here later
            default:
              console.warn('Unknown offline action', m.action)
          }
          await removeMutation(m.id)
        } catch (e: any) {
          console.error(`Sync failed for ${m.id}`, e)
          // If it's a conflict or expected error, mark failed, otherwise it might be network again
          if (e.message?.includes('fetch') || e.message?.includes('network')) {
            throw e // stop syncing, we are probably offline again
          } else {
            await markMutationFailed(m.id, e.message || 'Unknown error')
          }
        }
      }
      
      toast.success('Sync complete')
    } catch (e) {
      toast.error('Sync paused due to network')
    } finally {
      setIsSyncing(false)
      await refreshQueue()
    }
  }

  return (
    <SyncContext.Provider value={{
      isOffline,
      isSyncing,
      pendingCount: mutations.length,
      mutations,
      triggerSync,
      refreshQueue
    }}>
      {children}
    </SyncContext.Provider>
  )
}
