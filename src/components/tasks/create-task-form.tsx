'use client'

import { useState, useRef, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createTask } from '@/app/actions/tasks'
import { VoiceDictationButton } from './voice-dictation-button'

interface PropertyOption {
  id: string | number
  name: string
}

interface MemberOption {
  id: string
  first_name: string
  last_name: string
}

interface CreateTaskFormProps {
  properties: PropertyOption[]
  members: MemberOption[]
  onSuccess?: () => void
  inDialog?: boolean
}

export function CreateTaskForm({
  properties,
  members,
  onSuccess,
  inDialog = false,
}: CreateTaskFormProps) {
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement | null>(null)
  const notesRef = useRef<HTMLTextAreaElement | null>(null)

  const handleTranscript = (transcriptText: string) => {
    if (!transcriptText.trim()) return
    setNotes((prev) => {
      const trimmed = prev.trim()
      if (!trimmed) return transcriptText.trim()
      return `${trimmed}\n${transcriptText.trim()}`
    })

    // Focus the textarea so the user can easily review or refine speech text
    setTimeout(() => {
      notesRef.current?.focus()
    }, 50)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      try {
        await createTask(formData)
        toast.success('Task assigned successfully!')
        form.reset()
        setNotes('')
        onSuccess?.()
      } catch (err: any) {
        toast.error(err.message || 'Failed to assign task.')
      }
    })
  }

  const propertyItems = [
    { value: 'none', label: 'No specific property' },
    ...(properties?.map((p) => ({
      value: p.id.toString(),
      label: p.name,
    })) || []),
  ]

  const memberItems =
    members?.map((m) => ({
      value: m.id.toString(),
      label: `${m.first_name} ${m.last_name}`.trim(),
    })) || []

  const priorityItems = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ]

  const formContent = (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="Short description..." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="property_id">Property (Optional)</Label>
        <Select name="property_id" items={propertyItems}>
          <SelectTrigger id="property_id">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" label="No specific property">
              No specific property
            </SelectItem>
            {properties?.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()} label={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="assignee_id">Assignee</Label>
        <Select name="assignee_id" items={memberItems} required>
          <SelectTrigger id="assignee_id">
            <SelectValue placeholder="Select crew member" />
          </SelectTrigger>
          <SelectContent>
            {members?.map((m) => {
              const fullName = `${m.first_name} ${m.last_name}`.trim()
              return (
                <SelectItem key={m.id} value={m.id.toString()} label={fullName}>
                  {fullName}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue="medium" items={priorityItems} required>
            <SelectTrigger id="priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low" label="Low">Low</SelectItem>
              <SelectItem value="medium" label="Medium">Medium</SelectItem>
              <SelectItem value="high" label="High">High</SelectItem>
              <SelectItem value="urgent" label="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_date">Due Date</Label>
          <Input id="due_date" name="due_date" type="date" />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="notes">Notes</Label>
          <VoiceDictationButton onTranscript={handleTranscript} disabled={isPending} />
        </div>
        <Textarea
          ref={notesRef}
          id="notes"
          name="notes"
          rows={3}
          placeholder="Detailed instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full mt-2">
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Assigning Task…
          </>
        ) : (
          'Assign Task'
        )}
      </Button>
    </form>
  )

  if (inDialog) {
    return formContent
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Create Assignment</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  )
}
