import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader, EmptyState } from '@/components/common/page'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { formatHours } from '@/lib/format'
import { paidMs, centsFor } from '@/features/reporting/shifts'

export default async function ManagePage() {
  const { supabase } = await requireMember()
  const now = new Date()

  // Fetch active shifts across the crew
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, properties(name), members(first_name, last_name), clock_events(event_type, server_recorded_at)')
    .in('status', ['working', 'on_break'])
    .order('started_at', { ascending: false })

  return (
    <PageContainer>
      <PageHeader 
        title="Live Board" 
        description="See who is currently clocked in."
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shifts && shifts.length > 0 ? (
          shifts.map((shift: any) => {
            const ms = paidMs(shift, undefined, now.getTime())
            return (
              <Card key={shift.id}>
                <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg">{shift.members?.first_name} {shift.members?.last_name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{shift.properties?.name || 'Unknown Property'}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${shift.status === 'working' ? 'bg-[#b8bb26]/20 text-[#b8bb26]' : 'bg-[#fabd2f]/20 text-[#fabd2f]'}`}>
                      {shift.status.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-sm font-medium flex justify-between items-center bg-muted/40 p-2 rounded-md border border-border">
                    <span className="text-muted-foreground">Running time:</span>
                    <span className="text-primary">{formatHours(ms)}h</span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full">
            <EmptyState 
              icon={Users}
              title="No active shifts"
              description="No crew members are currently clocked in."
            />
          </div>
        )}
      </div>
    </PageContainer>
  )
}
