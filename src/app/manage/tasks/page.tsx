import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader, EmptyState, SectionTitle } from '@/components/common/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckSquare } from 'lucide-react'
import { createTask } from '@/app/actions/tasks'
import { PriorityBadge, StatusBadge } from '@/components/common/status-badge'

export default async function ManageTasksPage() {
  const { supabase } = await requireMember()

  const { data: properties } = await supabase.from('properties').select('*').eq('active', true).order('name')
  const { data: members } = await supabase.from('members').select('*').eq('active', true).order('first_name')
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, properties(name), members(first_name, last_name)')
    .order('created_at', { ascending: false })

  return (
    <PageContainer wide>
      <PageHeader 
        title="Manage Tasks" 
        description="Assign work to the crew and monitor progress."
      />
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Create Task Form */}
        <div className="w-full lg:w-[400px] shrink-0">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Create Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                'use server'
                await createTask(formData)
              }} className="flex flex-col gap-4">
                
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input name="title" required placeholder="Short description..." />
                </div>

                <div className="space-y-1.5">
                  <Label>Property</Label>
                  <Select name="property_id" required>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {properties?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label>Assignee</Label>
                  <Select name="assignee_id" required>
                    <SelectTrigger><SelectValue placeholder="Select crew member" /></SelectTrigger>
                    <SelectContent>
                      {members?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.first_name} {m.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select name="priority" defaultValue="medium" required>
                      <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <Input name="due_date" type="date" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea name="notes" rows={3} placeholder="Detailed instructions..." />
                </div>

                <Button type="submit" className="w-full mt-2">
                  Assign Task
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <div className="flex-1">
          <SectionTitle count={tasks?.length || 0}>All Tasks</SectionTitle>
          <div className="grid gap-4">
            {tasks && tasks.length > 0 ? (
              tasks.map(task => (
                <Card key={task.id}>
                  <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {(task.properties as any)?.name || 'Unknown Property'}
                        </div>
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        <div className="text-sm text-muted-foreground mt-1">
                          Assigned to: <span className="font-medium text-foreground">{(task.members as any)?.first_name} {(task.members as any)?.last_name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>
                    
                    {(task.notes || task.due_date) && (
                      <div className="bg-muted/40 p-3 rounded-md border border-border text-sm flex flex-col gap-2">
                        {task.due_date && <div><span className="font-medium">Due:</span> <span className="text-[#d79921]">{new Date(task.due_date).toLocaleDateString()}</span></div>}
                        {task.notes && <div className="italic text-muted-foreground">"{task.notes}"</div>}
                        {task.blocked_reason && task.status === 'blocked' && (
                          <div className="text-destructive mt-1 font-medium">Blocked: {task.blocked_reason}</div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState 
                icon={CheckSquare}
                title="No tasks"
                description="Create a task to get started."
              />
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
