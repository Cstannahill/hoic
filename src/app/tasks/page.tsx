import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { updateTaskStatus } from '@/app/actions/tasks'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, properties(name)')
    .eq('assignee_id', user.id)
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true })

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-primary">My Tasks</h1>
      
      <div className="grid gap-4">
        {tasks?.map(task => (
          <div key={task.id} className="bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-muted-foreground font-medium mb-1">
                  {(task.properties as { name: string } | null)?.name || 'Unknown Property'}
                </div>
                <div className="font-semibold text-lg">{task.priority.toUpperCase()} Priority</div>
                {task.due_date && <div className="text-sm text-amber-500">Due: {task.due_date}</div>}
              </div>
              <div className="px-2 py-1 rounded text-xs font-bold bg-secondary text-secondary-foreground uppercase">
                {task.status.replace('_', ' ')}
              </div>
            </div>
            
            {task.notes && (
              <div className="text-sm bg-muted/50 p-3 rounded-md italic">
                "{task.notes}"
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border mt-2">
              {task.status === 'todo' && (
                <form action={async () => {
                  'use server'
                  await updateTaskStatus(task.id, 'in_progress')
                }}>
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:opacity-90">
                    Start Work
                  </button>
                </form>
              )}
              
              {task.status === 'in_progress' && (
                <form action={async () => {
                  'use server'
                  await updateTaskStatus(task.id, 'done')
                }}>
                  <button className="bg-green-500 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90">
                    Finish Task
                  </button>
                </form>
              )}

              {(task.status === 'in_progress' || task.status === 'todo') && (
                <form action={async (formData: FormData) => {
                  'use server'
                  const note = formData.get('notes') as string
                  await updateTaskStatus(task.id, 'blocked', note)
                }} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <input 
                    name="notes" 
                    type="text" 
                    placeholder="Reason for blocking..." 
                    required 
                    className="flex-1 min-w-[200px] border border-border p-2 rounded-md bg-input text-sm"
                  />
                  <button className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md font-semibold hover:opacity-90">
                    Block
                  </button>
                </form>
              )}

              {task.status === 'blocked' && (
                <form action={async () => {
                  'use server'
                  await updateTaskStatus(task.id, 'in_progress')
                }}>
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold hover:opacity-90">
                    Resume Work
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}

        {!tasks?.length && (
          <div className="text-center p-8 bg-muted/30 rounded-lg text-muted-foreground border border-dashed border-border">
            You have no open tasks. Great job!
          </div>
        )}
      </div>
    </div>
  )
}
