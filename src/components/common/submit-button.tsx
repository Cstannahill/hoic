'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

export function SubmitButton({ children, pendingText = '...', type = 'submit', ...props }: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type={type} {...props} disabled={props.disabled || pending}>
      {pending ? pendingText : children}
    </Button>
  )
}
