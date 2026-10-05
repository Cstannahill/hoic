'use client'

import { useActionState, useState } from 'react'
import { claimSupply, releaseSupply, purchaseSupply, cancelSupply, updateStoredLocation } from '@/app/actions/supplies'

const urgencyColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  high: 'bg-orange-900 text-orange-100',
  urgent: 'bg-destructive text-destructive-foreground'
}

export function SupplyCard({ item, currentUserId, currentUserRole }: { item: any, currentUserId: string, currentUserRole: string }) {
  const [error, setError] = useState<string | null>(null)
  const isRequester = item.requested_by === currentUserId
  const isClaimer = item.claimed_by === currentUserId
  const canCancel = isRequester || currentUserRole === 'admin' || currentUserRole === 'foreman'
  const canRelease = isClaimer || currentUserRole === 'admin' || currentUserRole === 'foreman'

  const handleAction = async (actionFn: any, ...args: any[]) => {
    try {
      setError(null)
      await actionFn(...args)
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border border-border flex flex-col gap-2 relative">
      {error && <div className="absolute top-0 left-0 right-0 bg-destructive text-destructive-foreground text-xs p-1 text-center rounded-t-lg">{error}</div>}
      
      <div className={`flex justify-between items-start ${error ? 'mt-4' : ''}`}>
        <div className="flex flex-col">
          <span className="font-bold text-lg">{item.description}</span>
          <span className="text-xs text-muted-foreground">
            Requested by {item.requested_by_member?.first_name} {item.requested_by_member?.last_name}
          </span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${urgencyColors[item.urgency as keyof typeof urgencyColors]}`}>
            {item.urgency}
          </span>
          {item.status === 'claimed' && (
            <span className="text-xs text-primary font-medium">
              Claimed by {item.claimed_by_member?.first_name}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-2 flex-wrap">
        {item.status === 'needed' && (
          <>
            <button 
              onClick={() => handleAction(claimSupply, item.id, item.version)}
              className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-semibold flex-1"
            >
              Claim to Buy
            </button>
            <button 
              onClick={() => handleAction(purchaseSupply, item.id, item.version)}
              className="bg-secondary text-secondary-foreground px-3 py-1 rounded text-sm font-semibold flex-1 border border-border"
            >
              Mark Purchased
            </button>
          </>
        )}

        {item.status === 'claimed' && (
          <>
            <button 
              onClick={() => handleAction(purchaseSupply, item.id, item.version)}
              className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-semibold flex-1"
            >
              Mark Purchased
            </button>
            {canRelease && (
              <button 
                onClick={() => handleAction(releaseSupply, item.id, item.version)}
                className="bg-muted text-foreground px-3 py-1 rounded text-sm font-semibold border border-border"
              >
                Release
              </button>
            )}
          </>
        )}

        {(item.status === 'needed' || item.status === 'claimed') && canCancel && (
          <button 
            onClick={() => handleAction(cancelSupply, item.id, item.version)}
            className="text-destructive text-sm font-semibold px-2 hover:underline"
          >
            Cancel
          </button>
        )}

        {item.status === 'purchased' && (
          <div className="w-full flex gap-2 items-center text-sm border-t border-border pt-2 mt-1">
            <span className="text-muted-foreground whitespace-nowrap">Stored in:</span>
            <form className="flex-1 flex gap-1" onSubmit={(e) => e.preventDefault()}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="version" value={item.version} />
              {/* Using native JS to submit via server action import */}
            </form>
            <LocationForm item={item} />
          </div>
        )}
      </div>
    </div>
  )
}

function LocationForm({ item }: { item: any }) {
  const [loc, setLoc] = useState(item.stored_in || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (newLoc: string) => {
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('id', item.id)
      fd.append('version', item.version.toString())
      fd.append('stored_in', newLoc)
      await updateStoredLocation(fd)
      setLoc(newLoc)
    } catch (e) {
      alert("Failed to update location")
    }
    setSaving(false)
  }

  const quickPicks = ['Shed', 'Trailer', 'Inside', 'Truck']

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex gap-1">
        <input 
          type="text" 
          value={loc} 
          onChange={(e) => setLoc(e.target.value)} 
          placeholder="Where is it?"
          className="flex-1 border border-border bg-input px-2 py-1 rounded min-w-[100px]"
        />
        <button 
          onClick={() => handleSave(loc)}
          disabled={saving || loc === (item.stored_in || '')}
          className="bg-secondary text-secondary-foreground px-2 py-1 rounded disabled:opacity-50"
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>
      <div className="flex gap-1 flex-wrap">
        {quickPicks.map(p => (
          <button 
            key={p} 
            onClick={() => { setLoc(p); handleSave(p); }}
            className={`text-xs px-2 py-1 rounded border border-border ${loc === p ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
