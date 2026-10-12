'use client'

import { useEffect } from 'react'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'production') {
        // Unregister service workers in development to prevent stale Turbopack chunks
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
          }
        })
        return
      }

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered with scope:', registration.scope)
          },
          (err) => {
            console.log('SW registration failed:', err)
          }
        )
      })
    }
  }, [])


  return <>{children}</>
}
