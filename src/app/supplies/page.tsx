import { requireMember } from '@/lib/session'
import { requestSupply } from '@/app/actions/supplies'
import { SupplyCard } from '@/components/supplies/supply-card'
import { PageContainer, PageHeader, EmptyState, SectionTitle } from '@/components/common/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package } from 'lucide-react'

export default async function SuppliesPage() {
  const { supabase, user, member } = await requireMember()
  const role = member.role

  const { data: propertiesData } = await supabase
    .from('properties')
    .select('id, name')
    .eq('active', true)
    .order('name')

  const properties = propertiesData || []

  const { data: supplies } = await supabase
    .from('supplies')
    .select('*, properties(name), requested_by_member:members!supplies_requested_by_fkey(first_name, last_name), claimed_by_member:members!supplies_claimed_by_fkey(first_name, last_name), purchased_by_member:members!supplies_purchased_by_fkey(first_name, last_name)')
    .order('created_at', { ascending: false })

  const needed = supplies?.filter(s => s.status === 'needed') || []
  const claimed = supplies?.filter(s => s.status === 'claimed') || []
  const purchased = supplies?.filter(s => s.status === 'purchased') || []

  const urgencyWeight = { urgent: 4, high: 3, medium: 2, low: 1 }
  const sortByUrgency = (a: any, b: any) => urgencyWeight[b.urgency as keyof typeof urgencyWeight] - urgencyWeight[a.urgency as keyof typeof urgencyWeight]
  
  needed.sort(sortByUrgency)
  claimed.sort(sortByUrgency)

  return (
    <PageContainer>
      <PageHeader 
        title="Crew Supplies" 
        description="Request items needed on site and track who is picking them up."
      />

      <Card className="mb-8 overflow-visible">
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Request Item</h2>
          <form action={async (formData) => { 'use server'; await requestSupply(formData) }} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input 
                name="description" 
                placeholder="e.g. 2x4 Lumber, Nails..." 
                required 
              />
            </div>
            {properties.length > 0 && (
              <div className="w-full sm:w-48">
                <Select name="property_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any location</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="w-full sm:w-40">
              <Select name="urgency" defaultValue="medium">
                <SelectTrigger>
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full sm:w-auto font-bold">
              Request
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {needed.length > 0 && (
          <section>
            <SectionTitle count={needed.length}>Needed</SectionTitle>
            <div className="grid gap-3">
              {needed.map(item => (
                <SupplyCard key={item.id} item={item} currentUserId={user.id} currentUserRole={role} />
              ))}
            </div>
          </section>
        )}

        {claimed.length > 0 && (
          <section>
            <SectionTitle count={claimed.length}>Claimed</SectionTitle>
            <div className="grid gap-3">
              {claimed.map(item => (
                <SupplyCard key={item.id} item={item} currentUserId={user.id} currentUserRole={role} />
              ))}
            </div>
          </section>
        )}

        {purchased.length > 0 && (
          <section>
            <SectionTitle count={purchased.slice(0, 10).length}>Recently Purchased</SectionTitle>
            <div className="grid gap-3 opacity-80">
              {purchased.slice(0, 10).map(item => (
                <SupplyCard key={item.id} item={item} currentUserId={user.id} currentUserRole={role} />
              ))}
            </div>
          </section>
        )}

        {supplies?.length === 0 && (
          <EmptyState 
            icon={Package}
            title="No supplies needed"
            description="Everyone has everything they need right now."
          />
        )}
      </div>
    </PageContainer>
  )
}
