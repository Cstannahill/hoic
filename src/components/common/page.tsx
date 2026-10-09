import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export function PageHeader({ title, description, actions, className }: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function PageContainer({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn('mx-auto w-full p-4 md:p-8', wide ? 'max-w-6xl' : 'max-w-3xl', className)}>{children}</div>
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <Icon className="size-10 text-muted-foreground" aria-hidden />
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
      {count !== undefined && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">{count}</span>}
    </h2>
  )
}
