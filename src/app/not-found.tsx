import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <Compass className="mx-auto size-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Page not found</h1>
        <p className="text-sm text-muted-foreground">That page doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href="/" className="inline-flex h-10 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:opacity-90">
          Back to home
        </Link>
      </div>
    </div>
  )
}
