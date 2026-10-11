import { requireMember } from '@/lib/session'
import { PageContainer, PageHeader } from '@/components/common/page'
import { PropertyDetailsClient } from '@/components/properties/property-details-client'
import { breakIntervals, RawShift } from '@/features/reporting/shifts'
import { calculateShiftEarnings } from '@/features/reporting/math'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function PropertyDetailsPage({ params }: { params: { id: string } }) {
  const { supabase } = await requireMember()
  
  // Await the params object itself before accessing id if Next.js 15
  // Actually params.id is synchronously accessible in Next 14, but we can do await if needed, let's just use it
  const propertyId = params.id

  const [
    { data: property },
    { data: shiftsData },
    { data: suppliesData },
    { data: imagesData }
  ] = await Promise.all([
    supabase.from('properties').select('*').eq('id', propertyId).single(),
    supabase.from('shifts').select('*, clock_events(*)').eq('property_id', propertyId).eq('status', 'closed'),
    supabase.from('supplies').select('cost_cents').eq('property_id', propertyId),
    supabase.from('property_images').select('*').eq('property_id', propertyId).order('created_at', { ascending: false })
  ])

  if (!property) {
    notFound()
  }

  // Calculate Labor Cost
  let totalLaborCostCents = 0
  if (shiftsData) {
    for (const shift of shiftsData) {
      if (!shift.ended_at) continue
      const startMs = new Date(shift.started_at).getTime()
      const endMs = new Date(shift.ended_at).getTime()
      const breaks = breakIntervals(shift as unknown as RawShift)
      totalLaborCostCents += calculateShiftEarnings(startMs, endMs, breaks, shift.rate_snapshot_cents)
    }
  }

  // Calculate Supplies Cost
  let totalSuppliesCostCents = 0
  if (suppliesData) {
    totalSuppliesCostCents = suppliesData.reduce((acc, curr) => acc + (curr.cost_cents || 0), 0)
  }

  return (
    <PageContainer>
      <div className="mb-4 flex items-center">
        <Link href="/manage/properties" className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm font-medium">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Link>
      </div>

      <PageHeader 
        title={property.name}
        description="Property Details & Media"
      />

      <PropertyDetailsClient
        propertyId={propertyId}
        laborCostCents={totalLaborCostCents}
        suppliesCostCents={totalSuppliesCostCents}
        initialImages={imagesData || []}
      />
    </PageContainer>
  )
}
