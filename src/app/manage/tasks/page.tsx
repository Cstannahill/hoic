import { createClient } from '@/utils/supabase/server'
import { createTask } from '@/app/actions/tasks'

export default async function ManageTasksPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase.from('properties').select('*').eq('active', true).order('name')
  const { data: members } = await supabase.from('members').select('*').eq('active', true).order('first_name')
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, properties(name), members(first_name, last_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
      
      {/* Create Task Form */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-6 text-primary">Manage Tasks</h1>
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h2 className="text-xl font-semibold mb-4">Create Assignment</h2>
          <form action={async (formData) => {
            'use server'
            await createTask(formData)
          }} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property</label>
              <select name="property_id" required className="w-full border border-border bg-input p-2 rounded">
                <option value="">Select Property</option>
                {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Assignee</label>
              <select name="assignee_id" required className="w-full border border-border bg-input p-2 rounded">
                <option value="">Select Assignee</option>
                {members?.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select name="priority" required className="w-full border border-border bg-input p-2 rounded">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input name="due_date" type="date" className="w-full border border-border bg-input p-2 rounded" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea name="notes" rows={3} className="w-full border border-border bg-input p-2 rounded" placeholder="Instructions..."></textarea>
            </div>

            <button type="submit" className="bg-primary text-primary-foreground py-2 rounded font-bold hover:opacity-90 mt-2">
              Assign Task
            </button>
          </form>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-[2]">
        <h2 className="text-2xl font-bold mb-6">All Open Tasks</h2>
        <div className="grid gap-4">
          {tasks?.map(task => (
            <div key={task.id} className="bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="font-bold text-lg">{(task.properties as { name: string } | null)?.name}</span>
                <span className="text-sm bg-secondary text-secondary-foreground px-2 py-1 rounded uppercase font-bold">{task.status.replace('_', ' ')}</span>
              </div>
              <div className="text-sm">
                Assigned to: <span className="font-semibold">{(task.members as { first_name: string; last_name: string } | null)?.first_name} {(task.members as { first_name: string; last_name: string } | null)?.last_name}</span>
              </div>
              <div className="text-sm flex gap-4 text-muted-foreground">
                <span>Priority: <span className="font-medium text-foreground capitalize">{task.priority}</span></span>
                {task.due_date && <span>Due: <span className="font-medium text-foreground">{task.due_date}</span></span>}
              </div>
              {task.notes && <div className="text-sm mt-2 p-2 bg-muted rounded italic">"{task.notes}"</div>}
            </div>
          ))}
          {!tasks?.length && <div className="text-muted-foreground">No tasks exist.</div>}
        </div>
      </div>

    </div>
  )
}
