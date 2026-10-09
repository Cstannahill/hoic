'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { requestCorrection } from '@/app/actions/corrections'
import { SubmitButton } from '@/components/common/submit-button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function CorrectionForm({ shiftId }: { shiftId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <Button variant="link" size="sm" onClick={() => setIsOpen(true)} className="px-0 mt-1 h-auto text-xs text-muted-foreground hover:text-primary">
        Request Correction
      </Button>
    )
  }

  return (
    <form action={async (formData) => {
      try {
        await requestCorrection(formData)
        toast.success('Correction requested')
        setIsOpen(false)
      } catch (e: any) {
        toast.error(e.message)
      }
    }} className="mt-3 flex flex-col gap-2 w-full max-w-sm ml-auto">
      <input type="hidden" name="shift_id" value={shiftId} />
      <Textarea name="details" placeholder="What needs to be corrected? (e.g. forgot to clock out, should be 5 PM)" required className="text-sm min-h-[60px]" />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
        <SubmitButton size="sm">Submit</SubmitButton>
      </div>
    </form>
  )
}
