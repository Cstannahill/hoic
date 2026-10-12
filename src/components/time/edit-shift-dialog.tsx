'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { TimePicker } from './time-picker'
import { formatTimeToCrewHHMM, combineCrewDateAndTime } from '@/lib/time-picker'
import { formatDate, formatHours } from '@/lib/format'
import { updateShiftTime } from '@/app/actions/shifts'
import { toast } from 'sonner'
import { Pencil, Loader2 } from 'lucide-react'

export interface EditShiftDialogProps {
  shiftId: string
  startedAt: string
  endedAt: string | null
  propertyName?: string | null
}

export function EditShiftDialog({
  shiftId,
  startedAt,
  endedAt,
  propertyName,
}: EditShiftDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Initial times
  const initialStartHHMM = formatTimeToCrewHHMM(startedAt)
  const initialEndHHMM = endedAt
    ? formatTimeToCrewHHMM(endedAt)
    : initialStartHHMM

  // Check if initially overnight
  const initialIsNextDay = endedAt
    ? new Date(endedAt).getTime() - new Date(startedAt).getTime() > 0 &&
      new Date(endedAt).getDate() !== new Date(startedAt).getDate()
    : false

  const [startTime, setStartTime] = useState(initialStartHHMM)
  const [endTime, setEndTime] = useState(initialEndHHMM)
  const [isNextDay, setIsNextDay] = useState(initialIsNextDay)

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setStartTime(initialStartHHMM)
      setEndTime(initialEndHHMM)
      setIsNextDay(initialIsNextDay)
      setError(null)
    }
  }

  // Calculate duration preview
  const startIso = combineCrewDateAndTime(startedAt, startTime, false)
  const endIso = combineCrewDateAndTime(startedAt, endTime, isNextDay)
  const durationMs = new Date(endIso).getTime() - new Date(startIso).getTime()
  const isValidDuration = durationMs > 0

  const handleSave = () => {
    setError(null)

    if (!isValidDuration) {
      setError('Clock out time must be after clock in time')
      return
    }

    startTransition(async () => {
      try {
        const res = await updateShiftTime(shiftId, startIso, endIso)
        if (res.error) {
          setError(res.error)
          toast.error(res.error)
        } else {
          toast.success('Shift time updated')
          setOpen(false)
        }
      } catch (err: any) {
        const msg = err.message || 'Failed to update shift time'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  const shiftDateFormatted = formatDate(startedAt, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5 font-medium border-border/80 hover:text-primary hover:border-primary/40"
          >
            <Pencil className="size-3" />
            Edit Time
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Shift Time</DialogTitle>
          <DialogDescription>
            {shiftDateFormatted}
            {propertyName ? ` · ${propertyName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 p-2.5 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="clock_in" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clock In Time
            </Label>
            <TimePicker
              id="clock_in"
              aria-label="Clock In"
              value={startTime}
              onChange={(val) => {
                setStartTime(val)
                setError(null)
              }}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clock_out" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clock Out Time
            </Label>
            <TimePicker
              id="clock_out"
              aria-label="Clock Out"
              value={endTime}
              onChange={(val) => {
                setEndTime(val)
                setError(null)
              }}
              disabled={isPending}
            />
          </div>


          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isNextDay}
                onChange={(e) => setIsNextDay(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary size-3.5"
                disabled={isPending}
              />
              <span>Ends following day (overnight)</span>
            </label>

            {isValidDuration && (
              <span className="text-xs font-medium text-muted-foreground">
                Total:{' '}
                <strong className="text-foreground">
                  {formatHours(durationMs)}h
                </strong>
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !isValidDuration}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
