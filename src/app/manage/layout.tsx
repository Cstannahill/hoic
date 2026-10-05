import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: member, error } = await supabase.from('members').select('role').eq('id', user.id).single()
  
  if (error) {
    console.log('MANAGE ERROR:', error)
  }
  console.log('MANAGE MEMBER:', member)

  if (!member || (member.role !== 'foreman' && member.role !== 'admin')) {
    redirect('/')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted p-4 border-b border-border flex gap-4 overflow-x-auto whitespace-nowrap">
        <Link href="/manage" className="font-semibold text-primary">Live Board</Link>
        <Link href="/manage/people" className="font-semibold text-primary">People</Link>
        <Link href="/manage/timesheets" className="font-semibold text-primary">Timesheets</Link>
        <Link href="/manage/tasks" className="font-semibold text-primary">Tasks</Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
