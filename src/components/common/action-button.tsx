'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmationDialog } from '@/components/common/confirmation-dialog'

type ButtonProps = React.ComponentProps<typeof Button>

/**
 * Runs a server action with a pending spinner and toast feedback.
 * Server actions in this app throw on failure; the message is surfaced to the user.
 */
export function ActionButton({
  action,
  successMessage,
  confirm,
  children,
  disabled,
  ...props
}: Omit<ButtonProps, 'onClick' | 'action'> & {
  action: () => Promise<unknown>
  successMessage?: string
  confirm?: string
}) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()

  const executeAction = () => {
    startTransition(async () => {
      try {
        await action()
        if (successMessage) toast.success(successMessage)
        router.refresh()
      } catch (e) {
        toast.error(friendlyError(e))
      }
    })
  }

  return (
    <>
      <Button
        {...props}
        disabled={disabled || pending}
        aria-busy={pending}
        onClick={() => {
          if (confirm) {
            setConfirmOpen(true)
          } else {
            executeAction()
          }
        }}
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {children}
      </Button>

      {confirm && (
        <ConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm action"
          description={confirm}
          confirmLabel="Continue"
          variant={props.variant === 'destructive' ? 'destructive' : 'default'}
          onConfirm={executeAction}
        />
      )}
    </>
  )
}

export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/row-level security|permission denied|0 rows|JSON object requested/i.test(msg)) {
    return "That change wasn't allowed. It may have been updated by someone else — refresh and try again."
  }
  if (/fetch failed|network/i.test(msg)) return 'Network problem. Check your connection and try again.'
  // Next redacts server errors in production; keep a sensible fallback.
  if (!msg || /An error occurred in the Server Components render/i.test(msg)) return 'Something went wrong. Please try again.'
  return msg
}
