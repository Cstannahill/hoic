import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ClockPanel } from '@/components/time/clock-panel'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch active shift
  const { data: activeShifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('member_id', user.id)
    .in('status', ['working', 'on_break'])
    .limit(1)
  
  const activeShift = activeShifts && activeShifts.length > 0 ? activeShifts[0] : null

  // Fetch properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .eq('active', true)

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-full bg-background p-4">
      <main className="w-full max-w-lg flex flex-col items-center justify-center p-8 bg-card rounded-xl shadow-lg border border-border">
        <h1 className="text-3xl font-bold mb-4 text-primary text-center">Time Clock</h1>
        
        <ClockPanel activeShift={activeShift} properties={properties || []} />

      </main>
    </div>
  )
}
