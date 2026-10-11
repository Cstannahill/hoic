'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadPropertyImage, deletePropertyImage } from '@/app/actions/properties'
import { formatCents } from '@/lib/format'
import { toast } from 'sonner'
import { Loader2, Upload, Trash2 } from 'lucide-react'

// You might need to adjust NEXT_PUBLIC_SUPABASE_URL to your actual env variable
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321' 

export function PropertyDetailsClient({
  propertyId,
  laborCostCents,
  suppliesCostCents,
  initialImages
}: {
  propertyId: string
  laborCostCents: number
  suppliesCostCents: number
  initialImages: any[]
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before')

  const beforeImages = initialImages.filter(img => img.stage === 'before')
  const afterImages = initialImages.filter(img => img.stage === 'after')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('propertyId', propertyId)
      formData.append('stage', activeTab)
      formData.append('file', file)
      await uploadPropertyImage(formData)
      toast.success('Image uploaded successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
      // Reset the input
      e.target.value = ''
    }
  }

  const handleDelete = async (imageId: string, storagePath: string) => {
    try {
      setDeletingId(imageId)
      await deletePropertyImage(imageId, storagePath, propertyId)
      toast.success('Image deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete image')
    } finally {
      setDeletingId(null)
    }
  }

  const getImageUrl = (path: string) => {
    return `${SUPABASE_URL}/storage/v1/object/public/property_images/${path}`
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Labor Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCents(laborCostCents)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Supplies Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCents(suppliesCostCents)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Property Photos</CardTitle>
          <div className="relative">
            <Input 
              type="file" 
              accept="image/*" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <Button disabled={isUploading} variant="outline" size="sm">
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Photo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'before' | 'after')}>
            <TabsList className="mb-4">
              <TabsTrigger value="before">Before ({beforeImages.length})</TabsTrigger>
              <TabsTrigger value="after">After ({afterImages.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="before" className="mt-0">
              {beforeImages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No before photos uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {beforeImages.map(img => (
                    <div key={img.id} className="aspect-square relative rounded-md overflow-hidden bg-muted group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={getImageUrl(img.storage_path)} 
                        alt="Before" 
                        className="object-cover w-full h-full"
                      />
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={deletingId === img.id}
                        onClick={() => handleDelete(img.id, img.storage_path)}
                      >
                        {deletingId === img.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="after" className="mt-0">
              {afterImages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No after photos uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {afterImages.map(img => (
                    <div key={img.id} className="aspect-square relative rounded-md overflow-hidden bg-muted group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={getImageUrl(img.storage_path)} 
                        alt="After" 
                        className="object-cover w-full h-full"
                      />
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={deletingId === img.id}
                        onClick={() => handleDelete(img.id, img.storage_path)}
                      >
                        {deletingId === img.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
