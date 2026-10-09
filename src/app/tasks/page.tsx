import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader, EmptyState } from '@/components/common/page'
import { Card, CardContent } from '@/components/ui/card'
import { CheckSquare } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/common/status-badge'
import { TaskActions } from './task-actions'

export default async function TasksPage() {
  const { supabase, user } = await requireMember()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, properties(name)')
    .eq('assignee_id', user.id)
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .order('priority', { ascending: false }) // lazy enum ordering

  return (
    <PageContainer>
      <PageHeader 
        title="My Tasks" 
        description="Your assigned tasks that need attention."
      />
      
      <div className="space-y-4">
        {tasks && tasks.length > 0 ? (
          tasks.map((task: any) => (
            <Card key={task.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 sm:p-6 pb-4">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        {task.properties?.name || 'Unknown Property'}
                      </div>
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      {task.due_date && <div className="text-sm text-[#d79921] mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  
                  {task.notes && (
                    <div className="mt-4 text-sm bg-muted/40 p-3 rounded-md border border-border italic text-muted-foreground">
                      "{task.notes}"
                    </div>
                  )}
                  {task.blocked_reason && task.status === 'blocked' && (
                    <div className="mt-4 text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20 text-destructive-foreground">
                      <span className="font-semibold">Blocked:</span> {task.blocked_reason}
                    </div>
                  )}
                </div>
                
                <div className="bg-muted/30 px-4 py-3 sm:px-6 border-t border-border">
                  <TaskActions task={task} />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState 
            icon={CheckSquare}
            title="All caught up"
            description="You have no open tasks assigned to you right now."
          />
        )}
      </div>
    </PageContainer>
  )
}
