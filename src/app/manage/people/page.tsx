import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader, EmptyState } from '@/components/common/page'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/common/submit-button'
import { revalidatePath } from 'next/cache'
import { Users } from 'lucide-react'

export default async function ManagePeoplePage() {
  const { supabase } = await requireMember()

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('first_name', { ascending: true })

  async function updateRate(formData: FormData) {
    'use server'
    const memberId = formData.get('member_id') as string
    const rate = parseFloat(formData.get('rate') as string)
    if (!memberId || isNaN(rate)) throw new Error('Invalid rate provided.')
    
    const { supabase } = await requireMember()
    const { error } = await supabase.rpc('set_hourly_rate', {
      p_member_id: memberId,
      p_rate_cents: Math.round(rate * 100),
      p_reason: 'Updated via dashboard'
    })
    if (error) throw new Error(error.message)
    revalidatePath('/manage/people')
  }

  return (
    <PageContainer wide>
      <PageHeader 
        title="Crew Members" 
        description="Manage the team, roles, and set hourly pay rates."
        actions={
          <Button disabled title="Coming soon">
            Invite Member
          </Button>
        }
      />
      
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted text-muted-foreground text-sm border-b border-border">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 hidden md:table-cell font-semibold">Role</th>
                <th className="p-4 hidden sm:table-cell font-semibold">Status</th>
                <th className="p-4 font-semibold">Hourly Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members?.map((member: any) => (
                <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-base">{member.first_name} {member.last_name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{member.email}</div>
                  </td>
                  <td className="p-4 hidden md:table-cell capitalize font-medium">{member.role}</td>
                  <td className="p-4 hidden sm:table-cell">
                    {member.active ? (
                      <span className="text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded uppercase tracking-wider">Active</span>
                    ) : (
                      <span className="text-destructive text-xs font-bold bg-destructive/10 px-2 py-1 rounded uppercase tracking-wider">Inactive</span>
                    )}
                  </td>
                  <td className="p-4">
                    <form action={updateRate} className="flex gap-2 items-center">
                      <input type="hidden" name="member_id" value={member.id} />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                        <Input 
                          name="rate" 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          className="w-24 pl-6"
                        />
                      </div>
                      <SubmitButton size="sm" type="submit" variant="secondary" className="h-9">
                        Save
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!members?.length && (
            <div className="p-8">
              <EmptyState 
                icon={Users}
                title="No members found"
                description="Your crew is empty."
              />
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  )
}
