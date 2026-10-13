import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader } from '@/components/common/page'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { ManageTaskList } from '@/components/tasks/manage-task-list'

export default async function ManageTasksPage() {
  const { supabase } = await requireMember()

  const { data: properties } = await supabase.from('properties').select('*').eq('active', true).order('name')
  const { data: members } = await supabase.from('members').select('*').eq('active', true).order('first_name')
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, properties(name), members(first_name, last_name)')
    .order('created_at', { ascending: false })

  const propertyOptions = properties?.map((p) => ({ id: p.id, name: p.name })) || []
  const memberOptions = members?.map((m) => ({ id: m.id, first_name: m.first_name, last_name: m.last_name })) || []

  return (
    <PageContainer wide>
      <PageHeader 
        title="Manage Tasks" 
        description="Assign work to the crew and monitor progress."
        actions={
          <CreateTaskDialog
            properties={propertyOptions}
            members={memberOptions}
          />
        }
      />
      
      <ManageTaskList
        tasks={(tasks as any) || []}
        members={memberOptions}
      />
    </PageContainer>
  )
}
