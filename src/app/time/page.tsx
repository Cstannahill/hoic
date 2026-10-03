import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { calculateShiftEarnings } from '@/features/reporting/math'

export default async function TimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, properties(name)')
    .eq('member_id', user.id)
    .order('started_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Time</h1>
      
      <div className="grid gap-4">
        {shifts?.map(shift => (
          <div key={shift.id} className="bg-card p-4 rounded-lg shadow-sm border border-border flex justify-between items-center">
            <div>
              <div className="font-semibold">{new Date(shift.started_at).toLocaleDateString()}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(shift.started_at).toLocaleTimeString()} - {shift.ended_at ? new Date(shift.ended_at).toLocaleTimeString() : 'Now'}
              </div>
              <div className="text-xs mt-1 bg-secondary text-secondary-foreground inline-block px-2 py-0.5 rounded">
                {(shift.properties as any)?.name || 'Unknown Property'}
              </div>
            </div>
            <div className="text-right">
              {shift.status === 'closed' ? (
                <>
                  <div className="font-bold text-green-500">
                    ${(calculateShiftEarnings(
                      new Date(shift.started_at).getTime(),
                      new Date(shift.ended_at).getTime(),
                      [],
                      shift.rate_snapshot_cents
                    ) / 100).toFixed(2)}
                  </div>
                  <button className="text-xs text-blue-500 underline mt-1">Request Correction</button>
                </>
              ) : (
                <div className="text-amber-500 font-semibold">{shift.status.replace('_', ' ')}</div>
              )}
            </div>
          </div>
        ))}

        {!shifts?.length && <div className="text-muted-foreground">No shifts found.</div>}
      </div>
    </div>
  )
}
