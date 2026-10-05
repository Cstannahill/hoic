import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { requestSupply, claimSupply, releaseSupply, purchaseSupply, cancelSupply, updateStoredLocation } from '@/app/actions/supplies'
import { SupplyCard } from '@/components/supplies/supply-card'

export default async function SuppliesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: member } = await supabase.from('members').select('role').eq('id', user.id).single()
  const role = member?.role || 'worker'

  const { data: supplies } = await supabase
    .from('supplies')
    .select('*, requested_by_member:members!supplies_requested_by_fkey(first_name, last_name), claimed_by_member:members!supplies_claimed_by_fkey(first_name, last_name), purchased_by_member:members!supplies_purchased_by_fkey(first_name, last_name)')
    .order('created_at', { ascending: false })

  // Group by status
  const needed = supplies?.filter(s => s.status === 'needed') || []
  const claimed = supplies?.filter(s => s.status === 'claimed') || []
  const purchased = supplies?.filter(s => s.status === 'purchased') || []

  // Sort by urgency for needed/claimed (urgent -> high -> medium -> low)
  const urgencyWeight = { urgent: 4, high: 3, medium: 2, low: 1 }
  const sortByUrgency = (a: any, b: any) => urgencyWeight[b.urgency as keyof typeof urgencyWeight] - urgencyWeight[a.urgency as keyof typeof urgencyWeight]
  
  needed.sort(sortByUrgency)
  claimed.sort(sortByUrgency)

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <h1 className="text-3xl font-bold mb-6 text-primary">Crew Supplies</h1>

      <div className="bg-card p-4 rounded-lg shadow-sm border border-border mb-8">
        <h2 className="text-lg font-semibold mb-2">Request Item</h2>
        <form action={async (formData) => { 'use server'; await requestSupply(formData) }} className="flex flex-col md:flex-row gap-2">
          <input 
            type="text" 
            name="description" 
            placeholder="e.g. 2x4 Lumber, Nails..." 
            required 
            className="flex-1 bg-input border border-border p-2 rounded"
          />
          <select name="urgency" className="bg-input border border-border p-2 rounded">
            <option value="low">Low Priority</option>
            <option value="medium">Medium</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded font-bold hover:opacity-90">
            Request
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-8">
        {needed.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">Needed ({needed.length})</h2>
            <div className="grid gap-3">
              {needed.map(item => (
                <SupplyCard key={item.id} item={item} currentUserId={user.id} currentUserRole={role} />
              ))}
            </div>
          </div>
        )}

        {claimed.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">Claimed ({claimed.length})</h2>
            <div className="grid gap-3">
              {claimed.map(item => (
                <SupplyCard key={item.id} item={item} currentUserId={user.id} currentUserRole={role} />
              ))}
            </div>
          </div>
        )}

        {purchased.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 border-b border-border pb-2 opacity-70">Recently Purchased ({purchased.length})</h2>
            <div className="grid gap-3 opacity-80">
              {purchased.slice(0, 10).map(item => (
                <SupplyCard key={item.id} item={item} currentUserId={user.id} currentUserRole={role} />
              ))}
            </div>
          </div>
        )}

        {supplies?.length === 0 && (
          <div className="text-center p-8 text-muted-foreground bg-muted/30 rounded-lg border border-border border-dashed">
            No supplies requested yet.
          </div>
        )}
      </div>
    </div>
  )
}
