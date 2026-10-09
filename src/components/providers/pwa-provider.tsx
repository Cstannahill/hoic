'use client'

import { useEffect } from 'react'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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
