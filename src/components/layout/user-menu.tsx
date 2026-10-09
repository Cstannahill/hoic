'use client'

import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoleBadge } from '@/components/common/status-badge'
import { signOut } from '@/app/actions/auth'

type Props = {
  firstName: string
  lastName: string
  email: string
  role: 'worker' | 'foreman' | 'admin'
  compact?: boolean
}

export function UserMenu({ firstName, lastName, email, role, compact }: Props) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
  const name = `${firstName} ${lastName}`.trim()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="user-menu"
        className="flex w-full items-center gap-3 rounded-md p-1.5 text-left hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Account menu for ${name}`}
      >
        {compact && <span className="text-sm font-medium max-w-[40vw] truncate">{firstName}</span>}
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
        </Avatar>
        {!compact && (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{name}</span>
            <span className="mt-0.5"><RoleBadge role={role} /></span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="font-semibold text-foreground">{name}</span>
          <span className="text-xs font-normal text-muted-foreground truncate">{email}</span>
          <span><RoleBadge role={role} /></span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <User className="size-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOut className="size-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
