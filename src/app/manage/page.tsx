import { createClient } from '@/utils/supabase/server'

export default async function ManagePage() {
  const supabase = await createClient()

  // Fetch active shifts across the crew
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, members(first_name, last_name), properties(name)')
    .in('status', ['working', 'on_break'])
    .order('started_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Live Board</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        {shifts?.map(shift => (
          <div key={shift.id} className="bg-card p-4 rounded-lg shadow-sm border border-border">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">{(shift.members as any)?.first_name} {(shift.members as any)?.last_name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  At: <span className="font-medium text-foreground">{(shift.properties as any)?.name || 'Unknown'}</span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${shift.status === 'working' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-500'}`}>
                {shift.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <div className="text-sm mt-4 text-muted-foreground">
              Since {new Date(shift.started_at).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {!shifts?.length && <div className="col-span-full text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">No active shifts right now.</div>}
      </div>
    </div>
  )
}
