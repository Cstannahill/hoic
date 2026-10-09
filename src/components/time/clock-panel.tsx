'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, LogIn, LogOut, Play, Loader2, RotateCcw, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { useClock } from '@/hooks/use-clock'
import { formatDuration, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type Property = { id: string; name: string }
type ActiveShift = { id: string; status: 'working' | 'on_break'; started_at: string; property_name?: string | null }

export function ClockPanel({
  activeShift,
  properties,
  breakStartedAt,
  priorBreakMs = 0,
}: {
  activeShift: ActiveShift | null
  properties: Property[]
  breakStartedAt?: number | null
  priorBreakMs?: number
}) {
  const { handleClockIn, handleClockOut, handleBreak, isPending, error, isRetry, setError } = useClock()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties.length === 1 ? properties[0].id : '')
  const router = useRouter()
  const now = useNow(activeShift ? 1000 : null)

  const run = async (fn: () => Promise<{ error?: string }>, ok: string) => {
    const res = await fn()
    if (!res.error) {
      toast.success(ok)
      router.refresh()
    }
  }

  const onClockIn = async () => {
    if (properties.length === 0) return setError('No active properties yet. Ask your foreman to add one.')
    if (!selectedPropertyId) return setError('Pick the property you are working at.')
    await run(() => handleClockIn(selectedPropertyId), 'Clocked in. Have a good shift!')
  }

  const startedMs = activeShift ? +new Date(activeShift.started_at) : 0
  const onBreakMs = breakStartedAt ? now - breakStartedAt : 0
  const workedMs = activeShift ? now - startedMs - priorBreakMs - onBreakMs : 0
  const retryLabel = 'Not confirmed — Retry'

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {error && (
        <div role="alert" className="w-full rounded-md border border-destructive/50 bg-destructive/15 p-3 text-center text-sm font-medium text-[#fb4934]">
          {error}
        </div>
      )}

      {activeShift ? (
        <>
          <div className="text-center">
            <p className={cn('text-sm font-semibold uppercase tracking-wider', activeShift.status === 'on_break' ? 'text-[#fabd2f]' : 'text-[#b8bb26]')}>
              {activeShift.status === 'on_break' ? 'On break' : 'Clocked in'}
            </p>
            <p className="tabular mt-1 text-5xl font-bold" aria-live="off" data-testid="shift-timer">
              {formatDuration(activeShift.status === 'on_break' ? onBreakMs : workedMs)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {activeShift.status === 'on_break'
                ? <>Worked {formatDuration(workedMs)} so far</>
                : <>Since {formatTime(activeShift.started_at)}</>}
              {activeShift.property_name && <> · <MapPin className="inline size-3.5 -mt-0.5" /> {activeShift.property_name}</>}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            {activeShift.status === 'working' ? (
              <BigButton tone="warning" disabled={isPending} onClick={() => run(() => handleBreak('start'), 'Break started')} icon={Coffee}>
                {isPending ? 'Saving…' : isRetry ? retryLabel : 'Start break'}
              </BigButton>
            ) : (
              <BigButton tone="primary" disabled={isPending} onClick={() => run(() => handleBreak('end'), 'Back to work')} icon={Play}>
                {isPending ? 'Saving…' : isRetry ? retryLabel : 'End break'}
              </BigButton>
            )}
            <BigButton
              tone="danger"
              disabled={isPending}
              onClick={() => {
                if (activeShift.status === 'on_break' || window.confirm('Clock out and end your shift?')) {
                  run(handleClockOut, 'Clocked out. Nice work!')
                }
              }}
              icon={LogOut}
            >
              {isPending ? 'Saving…' : isRetry ? retryLabel : 'Clock out'}
            </BigButton>
          </div>
        </>
      ) : (
        <>
          {properties.length > 1 && (
            <label className="w-full">
              <span className="mb-1.5 block text-sm font-medium">Where are you working?</span>
              <select
                value={selectedPropertyId}
                onChange={e => { setSelectedPropertyId(e.target.value); setError(null) }}
                className="h-12 w-full rounded-md border border-input bg-secondary px-3"
              >
                <option value="" disabled>Select a property</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          {properties.length === 1 && (
            <p className="text-sm text-muted-foreground"><MapPin className="inline size-4 -mt-0.5" /> {properties[0].name}</p>
          )}
          <button
            disabled={isPending || properties.length === 0}
            onClick={onClockIn}
            className="flex size-44 flex-col items-center justify-center gap-2 rounded-full bg-primary text-xl font-bold text-primary-foreground shadow-lg ring-8 ring-primary/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-8 animate-spin" /> : isRetry ? <RotateCcw className="size-8" /> : <LogIn className="size-8" />}
            {isPending ? 'Saving…' : isRetry ? 'Retry' : 'Clock in'}
          </button>
          {isRetry && <p className="text-xs text-muted-foreground">Not confirmed — tap to retry safely.</p>}
        </>
      )}
    </div>
  )
}

function BigButton({ tone, icon: Icon, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone: 'primary' | 'warning' | 'danger'; icon: React.ElementType }) {
  const tones = {
    primary: 'bg-primary text-primary-foreground',
    warning: 'bg-[#d79921] text-[#282828]',
    danger: 'bg-destructive text-[#ffe9b1]',
  }
  return (
    <button {...props} className={cn('flex h-16 items-center justify-center gap-2 rounded-xl text-base font-bold shadow transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50', tones[tone])}>
      <Icon className="size-5" /> {children}
    </button>
  )
}

function useNow(intervalMs: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!intervalMs) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
