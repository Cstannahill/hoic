import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Home, Clock, CheckSquare, Package, Settings, Users } from 'lucide-react'

export async function AppNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let role = 'worker'
  if (user) {
    const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single()
    if (member) role = member.role
  }

  const isManager = role === 'foreman' || role === 'admin'

  // If not logged in, don't render nav
  if (!user) return null

  return (
    <nav className="fixed bottom-0 w-full bg-card border-t border-border pb-safe pt-2 px-2 flex justify-around items-center z-50 text-xs text-muted-foreground md:relative md:w-64 md:border-t-0 md:border-r md:flex-col md:justify-start md:items-stretch md:pt-8 md:gap-4 md:px-4 md:min-h-screen">
      
      <div className="hidden md:flex mb-8 items-center px-4">
        <span className="font-bold text-xl text-primary tracking-wide">HOIC</span>
      </div>

      <Link href="/" className="flex flex-col md:flex-row items-center md:justify-start md:px-4 gap-1 md:gap-3 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition">
        <Home size={24} />
        <span className="font-medium">Home</span>
      </Link>
      <Link href="/time" className="flex flex-col md:flex-row items-center md:justify-start md:px-4 gap-1 md:gap-3 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition">
        <Clock size={24} />
        <span className="font-medium">Time</span>
      </Link>
      <Link href="/tasks" className="flex flex-col md:flex-row items-center md:justify-start md:px-4 gap-1 md:gap-3 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition">
        <CheckSquare size={24} />
        <span className="font-medium">Tasks</span>
      </Link>
      <Link href="/supplies" className="flex flex-col md:flex-row items-center md:justify-start md:px-4 gap-1 md:gap-3 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition">
        <Package size={24} />
        <span className="font-medium">Supplies</span>
      </Link>
      {isManager && (
        <Link href="/manage" className="flex flex-col md:flex-row items-center md:justify-start md:px-4 gap-1 md:gap-3 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition">
          <Users size={24} />
          <span className="font-medium">Manage</span>
        </Link>
      )}
      <Link href="/profile" className="flex flex-col md:flex-row items-center md:justify-start md:px-4 gap-1 md:gap-3 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition md:mt-auto md:mb-4">
        <Settings size={24} />
        <span className="font-medium">Profile</span>
      </Link>
    </nav>
  )
}
