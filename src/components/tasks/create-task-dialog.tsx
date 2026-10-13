'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CreateTaskForm } from './create-task-form'

interface PropertyOption {
  id: string | number
  name: string
}

interface MemberOption {
  id: string
  first_name: string
  last_name: string
}

interface CreateTaskDialogProps {
  properties: PropertyOption[]
  members: MemberOption[]
}

export function CreateTaskDialog({ properties, members }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="font-medium" />}>
        <Plus className="mr-2 size-4" />
        Assign Task
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
          <DialogDescription>
            Create an assignment for a crew member with due dates and instructions.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <CreateTaskForm
            properties={properties}
            members={members}
            inDialog
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
