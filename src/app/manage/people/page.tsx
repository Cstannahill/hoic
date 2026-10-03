import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function PeoplePage() {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .order('first_name', { ascending: true })

  async function updateRate(formData: FormData) {
    'use server'
    const memberId = formData.get('member_id') as string
    const rate = parseFloat(formData.get('rate') as string)
    if (!memberId || isNaN(rate)) return
    
    const supabase = await createClient()
    await supabase.rpc('set_hourly_rate', {
      p_member_id: memberId,
      p_rate_cents: Math.round(rate * 100),
      p_reason: 'Updated via dashboard'
    })
    revalidatePath('/manage/people')
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">People</h1>
      
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted text-muted-foreground text-sm">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3 hidden md:table-cell">Role</th>
              <th className="p-3 hidden sm:table-cell">Status</th>
              <th className="p-3">Hourly Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members?.map(member => (
              <tr key={member.id}>
                <td className="p-3">
                  <div className="font-semibold">{member.first_name} {member.last_name}</div>
                  <div className="text-xs text-muted-foreground">{member.email}</div>
                </td>
                <td className="p-3 hidden md:table-cell capitalize">{member.role}</td>
                <td className="p-3 hidden sm:table-cell">
                  {member.active ? (
                    <span className="text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded">ACTIVE</span>
                  ) : (
                    <span className="text-destructive text-xs font-bold bg-destructive/10 px-2 py-1 rounded">INACTIVE</span>
                  )}
                </td>
                <td className="p-3">
                  <form action={updateRate} className="flex gap-2">
                    <input type="hidden" name="member_id" value={member.id} />
                    <input 
                      name="rate" 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g. 25.00"
                      className="w-24 p-1 text-sm border border-border bg-input rounded"
                    />
                    <button type="submit" className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
