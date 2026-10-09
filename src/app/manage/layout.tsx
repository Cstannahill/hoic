import { requireMember } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/common/page'

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const { member } = await requireMember()

  if (member.role !== 'foreman' && member.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="bg-muted/40 border-b border-border">
        <PageContainer className="!py-0">
          <div className="flex gap-6 overflow-x-auto whitespace-nowrap h-12 items-center text-sm font-medium">
            <Link href="/manage" className="hover:text-primary transition-colors py-3 border-b-2 border-transparent focus:border-primary">Live</Link>
            <Link href="/manage/timesheets" className="hover:text-primary transition-colors py-3 border-b-2 border-transparent focus:border-primary">Timesheets</Link>
            <Link href="/manage/tasks" className="hover:text-primary transition-colors py-3 border-b-2 border-transparent focus:border-primary">Tasks</Link>
            <Link href="/manage/properties" className="hover:text-primary transition-colors py-3 border-b-2 border-transparent focus:border-primary">Properties</Link>
            <Link href="/manage/people" className="hover:text-primary transition-colors py-3 border-b-2 border-transparent focus:border-primary">People</Link>
          </div>
        </PageContainer>
      </div>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}
