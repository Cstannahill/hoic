import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader, EmptyState } from '@/components/common/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { CreatePropertyDialog } from '@/components/properties/create-property-dialog'
import Link from 'next/link'

export default async function ManagePropertiesPage() {
  const { supabase } = await requireMember()

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .order('active', { ascending: false })
    .order('name')

  return (
    <PageContainer>
      <PageHeader 
        title="Properties" 
        description="Manage active job sites and locations."
        actions={<CreatePropertyDialog />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {properties && properties.length > 0 ? (
          properties.map((property: any) => (
            <Link key={property.id} href={`/manage/properties/${property.id}`}>
              <Card className={`hover:border-primary transition-colors ${property.active ? '' : 'opacity-60 grayscale'}`}>
                <CardContent className="p-4 sm:p-5 flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      {property.name}
                    </h3>
                    {property.address && <div className="text-sm text-muted-foreground mt-1">{property.address}</div>}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${property.active ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                    {property.active ? 'Active' : 'Inactive'}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState 
              icon={MapPin}
              title="No properties"
              description="Add a property to start tracking time and tasks."
            />
          </div>
        )}
      </div>
    </PageContainer>
  )
}
