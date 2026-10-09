import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type Role = 'worker' | 'foreman' | 'admin'

export type Member = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: Role
  active: boolean
}

/** One auth + member lookup per request, shared by layout, nav and pages. */
export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, member: null as Member | null }

  const { data: member } = await supabase
    .from('members')
    .select('id, email, first_name, last_name, role, active')
    .eq('id', user.id)
    .maybeSingle()

  return { supabase, user, member: (member as Member | null) }
})

/** For pages: requires a signed-in, active member. */
export async function requireMember() {
  const session = await getSession()
  if (!session.user) redirect('/login')
  if (!session.member || !session.member.active) redirect('/inactive')
  return session as typeof session & { member: Member; user: NonNullable<typeof session.user> }
}

export async function requireManager() {
  const session = await requireMember()
  if (session.member.role === 'worker') redirect('/')
  return session
}

export function displayName(m: Pick<Member, 'first_name' | 'last_name'> | null | undefined) {
  if (!m) return 'Unknown'
  return `${m.first_name} ${m.last_name}`.trim()
}

export function initials(m: Pick<Member, 'first_name' | 'last_name'> | null | undefined) {
  if (!m) return '?'
  return `${m.first_name?.[0] ?? ''}${m.last_name?.[0] ?? ''}`.toUpperCase() || '?'
}
