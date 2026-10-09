'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProperty } from '@/app/actions/properties'
import { toast } from 'sonner'

export function CreatePropertyDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    try {
      const formData = new FormData(e.currentTarget)
      await createProperty(formData)
      toast.success('Property created successfully')
      setIsOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create property')
    } finally {
      setIsPending(false)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="size-4 mr-2" /> Add Property
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl border border-border">
        <h2 className="text-xl font-bold mb-4">Add Property</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Property Name</Label>
            <Input id="name" name="name" required autoFocus placeholder="e.g. 123 Main St" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
