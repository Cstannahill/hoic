'use client'

import { useState } from 'react'
import { ActionButton } from '@/components/common/action-button'
import { updateTaskStatus } from '@/app/actions/tasks'
import { Input } from '@/components/ui/input'

export function TaskActions({ task }: { task: any }) {
  const [note, setNote] = useState('')

  if (task.status === 'todo') {
    return (
      <div className="flex gap-2">
        <ActionButton 
          action={() => updateTaskStatus(task.id, 'in_progress')}
          variant="default"
          size="sm"
        >
          Start Work
        </ActionButton>
      </div>
    )
  }

  if (task.status === 'in_progress') {
    return (
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between w-full">
        <ActionButton 
          action={() => updateTaskStatus(task.id, 'done')}
          className="bg-[#b8bb26] hover:bg-[#b8bb26]/90 text-black"
          size="sm"
          successMessage="Task marked as done!"
        >
          Finish Task
        </ActionButton>

        <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Reason for blocking..."
            className="h-9 min-w-[200px]"
          />
          <ActionButton 
            action={async () => {
              if (!note.trim()) throw new Error("A reason is required to block a task.")
              await updateTaskStatus(task.id, 'blocked', note)
            }}
            variant="destructive"
            size="sm"
            disabled={!note.trim()}
          >
            Block
          </ActionButton>
        </div>
      </div>
    )
  }

  if (task.status === 'blocked') {
    return (
      <div className="flex gap-2">
        <ActionButton 
          action={() => updateTaskStatus(task.id, 'in_progress')}
          variant="default"
          size="sm"
        >
          Resume Work
        </ActionButton>
      </div>
    )
  }

  return null
}
