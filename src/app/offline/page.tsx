import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
      <WifiOff className="mb-4 size-16 opacity-50" />
      <h1 className="mb-2 text-2xl font-bold text-foreground">You are offline</h1>
      <p>Please check your internet connection. We couldn't load this page.</p>
    </div>
  )
}
