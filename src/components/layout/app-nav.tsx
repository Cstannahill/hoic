import { getSession } from '@/lib/session'
import { NavLinks } from './nav-links'
import { UserMenu } from './user-menu'

export async function AppNav() {
  const { user, member } = await getSession()
  if (!user || !member) return null

  const isManager = member.role === 'foreman' || member.role === 'admin'
  const userProps = {
    firstName: member.first_name,
    lastName: member.last_name,
    email: member.email,
    role: member.role,
  }

  return (
    <>
      {/* Mobile top bar: identity is always visible */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-card/95 backdrop-blur px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2">
        <span className="font-bold text-lg tracking-wide text-primary">HOIC</span>
        <UserMenu {...userProps} compact />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-card h-dvh sticky top-0">
        <div className="px-6 py-6">
          <span className="font-bold text-2xl tracking-wide text-primary">HOIC</span>
          <p className="text-xs text-muted-foreground mt-1">Crew timekeeping</p>
        </div>
        <NavLinks isManager={isManager} variant="sidebar" />
        <div className="mt-auto border-t border-border p-3">
          <UserMenu {...userProps} />
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <NavLinks isManager={isManager} variant="tabs" />
      </nav>
    </>
  )
}
