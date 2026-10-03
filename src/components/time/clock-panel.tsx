'use client'

import { useClock } from '@/hooks/use-clock'
import { useState } from 'react'

export function ClockPanel({ activeShift, properties }: { activeShift: any, properties: any[] }) {
  const { handleClockIn, handleClockOut, isPending, error, isRetry, setError } = useClock()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties.length === 1 ? properties[0].id : '')

  const onClockIn = async () => {
    if (properties.length === 0) {
      return setError('No active properties available.')
    }
    if (!selectedPropertyId) {
      return setError('Please select a property first.')
    }
    await handleClockIn(selectedPropertyId)
  }

  const inButtonText = isPending ? 'Saving...' : (isRetry ? 'Not confirmed - Retry' : 'Clock In')
  const outButtonText = isPending ? 'Saving...' : (isRetry ? 'Not confirmed - Retry' : 'Clock Out')

  return (
    <div className="flex flex-col gap-6 items-center justify-center p-4">
      {error && <div className="text-destructive font-semibold bg-destructive/10 p-4 rounded-md text-center max-w-sm">{error}</div>}
      
      {activeShift ? (
        <div className="flex flex-col items-center gap-4">
          <div className="text-xl font-bold text-primary mb-4">You are currently Clocked In</div>
          <button 
            disabled={isPending}
            onClick={handleClockOut}
            className="w-48 h-48 rounded-full bg-destructive text-destructive-foreground text-xl md:text-2xl font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition"
          >
            {outButtonText}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full">
          {properties.length > 1 && (
            <select 
              value={selectedPropertyId} 
              onChange={e => {
                setSelectedPropertyId(e.target.value)
                setError(null)
              }}
              className="w-full max-w-sm p-4 border border-border bg-input rounded-md mb-4 text-lg"
            >
              <option value="" disabled>Select a property</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.id}</option>
              ))}
            </select>
          )}
          <button 
            disabled={isPending || properties.length === 0}
            onClick={onClockIn}
            className="w-48 h-48 rounded-full bg-primary text-primary-foreground text-xl md:text-2xl font-bold shadow-lg hover:opacity-90 disabled:opacity-50 transition"
          >
            {inButtonText}
          </button>
        </div>
      )}
    </div>
  )
}
