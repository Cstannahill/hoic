'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <AlertTriangle className="mx-auto size-12 text-[#fabd2f]" />
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          This page couldn&apos;t load. Your data is safe — try again, or go back home.
        </p>
        {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
        <div className="flex justify-center gap-2">
          <Button onClick={() => retry()}>Try again</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>Home</Button>
        </div>
      </div>
    </div>
  )
}
