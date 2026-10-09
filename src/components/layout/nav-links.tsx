'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, CheckSquare, Package, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const baseLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/time', label: 'Time', icon: Clock },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/supplies', label: 'Supplies', icon: Package },
]

export function NavLinks({ isManager, variant }: { isManager: boolean; variant: 'tabs' | 'sidebar' }) {
  const pathname = usePathname()
  const links = isManager ? [...baseLinks, { href: '/manage', label: 'Manage', icon: Users }] : baseLinks

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  if (variant === 'tabs') {
    return (
      <ul className="flex justify-around">
        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('size-6', active && 'stroke-[2.5]')} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ul className="flex flex-col gap-1 px-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
