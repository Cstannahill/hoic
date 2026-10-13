'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PriorityBadge, StatusBadge } from '@/components/common/status-badge'
import { EmptyState, SectionTitle } from '@/components/common/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckSquare, Search, User } from 'lucide-react'

export interface TaskItem {
  id: string
  title: string
  property_id?: string | number | null
  assignee_id: string
  priority: string
  status: string
  due_date?: string | null
  notes?: string | null
  blocked_reason?: string | null
  created_at: string
  properties?: { name: string } | null
  members?: { first_name: string; last_name: string } | null
}

export interface MemberOption {
  id: string
  first_name: string
  last_name: string
}

export interface ManageTaskListProps {
  tasks: TaskItem[]
  members: MemberOption[]
}

const priorityWeight: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  normal: 2,
  low: 1,
}

export function ManageTaskList({ tasks, members }: ManageTaskListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [workerFilter, setWorkerFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const statusItems = [
    { value: 'active', label: 'Active Tasks' },
    { value: 'all', label: 'All Statuses' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const workerItems = [
    { value: 'all', label: 'All Workers' },
    ...members.map((m) => ({
      value: m.id,
      label: `${m.first_name} ${m.last_name}`.trim(),
    })),
  ]

  const sortItems = [
    { value: 'newest', label: 'Newest First' },
    { value: 'worker', label: 'Worker (A → Z)' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
  ]

  const filteredAndSortedTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      // 1. Status Filter
      if (statusFilter === 'active') {
        if (task.status === 'done' || task.status === 'cancelled') {
          return false
        }
      } else if (statusFilter !== 'all') {
        if (task.status !== statusFilter) {
          return false
        }
      }

      // 2. Worker Filter
      if (workerFilter !== 'all') {
        if (task.assignee_id !== workerFilter) {
          return false
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const titleMatch = task.title?.toLowerCase().includes(q)
        const notesMatch = task.notes?.toLowerCase().includes(q)
        const propertyMatch = task.properties?.name?.toLowerCase().includes(q)
        const workerMatch = `${task.members?.first_name || ''} ${task.members?.last_name || ''}`
          .toLowerCase()
          .includes(q)

        if (!titleMatch && !notesMatch && !propertyMatch && !workerMatch) {
          return false
        }
      }

      return true
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'worker') {
        const nameA = `${a.members?.first_name || ''} ${a.members?.last_name || ''}`.trim().toLowerCase()
        const nameB = `${b.members?.first_name || ''} ${b.members?.last_name || ''}`.trim().toLowerCase()
        const cmp = nameA.localeCompare(nameB)
        if (cmp !== 0) return cmp
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }

      if (sortBy === 'priority') {
        const weightA = priorityWeight[a.priority] || 0
        const weightB = priorityWeight[b.priority] || 0
        if (weightB !== weightA) return weightB - weightA
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      // default: newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [tasks, statusFilter, workerFilter, sortBy, searchQuery])

  const formatDueDate = (dateStr: string) => {
    try {
      const d = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`)
      return d.toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  const isFiltered =
    statusFilter !== 'active' || workerFilter !== 'all' || searchQuery.trim() !== ''

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 bg-card/60 p-4 sm:p-5 rounded-3xl border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SectionTitle count={filteredAndSortedTasks.length}>
              {statusFilter === 'active'
                ? 'Active Tasks'
                : statusFilter === 'done'
                ? 'Completed Tasks'
                : 'Tasks'}
            </SectionTitle>
            {isFiltered && (
              <span className="text-xs text-muted-foreground">
                (of {tasks.length} total)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-auto min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm rounded-3xl"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-auto min-w-[145px]">
              <Select
                value={statusFilter}
                onValueChange={(val) => val && setStatusFilter(val)}
                items={statusItems}
              >
                <SelectTrigger aria-label="Filter by status" className="w-full sm:w-auto text-xs sm:text-sm h-9">
                  <span className="text-muted-foreground mr-1">Status:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map((s) => (
                    <SelectItem key={s.value} value={s.value} label={s.label}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Worker Filter */}
            <div className="w-full sm:w-auto min-w-[160px]">
              <Select
                value={workerFilter}
                onValueChange={(val) => val && setWorkerFilter(val)}
                items={workerItems}
              >
                <SelectTrigger aria-label="Filter by worker" className="w-full sm:w-auto text-xs sm:text-sm h-9">
                  <span className="text-muted-foreground mr-1">Worker:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workerItems.map((w) => (
                    <SelectItem key={w.value} value={w.value} label={w.label}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="w-full sm:w-auto min-w-[155px]">
              <Select
                value={sortBy}
                onValueChange={(val) => val && setSortBy(val)}
                items={sortItems}
              >
                <SelectTrigger aria-label="Sort tasks by" className="w-full sm:w-auto text-xs sm:text-sm h-9">
                  <span className="text-muted-foreground mr-1">Sort:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortItems.map((item) => (
                    <SelectItem key={item.value} value={item.value} label={item.label}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Task List / Empty State */}
      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Assign a task to a crew member to get started."
          />
        ) : filteredAndSortedTasks.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <CheckSquare className="size-8 text-muted-foreground mb-3 opacity-60" />
              <h4 className="font-semibold text-base">No tasks match your filters</h4>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {statusFilter === 'active'
                  ? 'No active tasks found. You may have completed tasks under the "Done" or "All Statuses" filter.'
                  : 'Try selecting another status or worker filter.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all')
                  setWorkerFilter('all')
                  setSearchQuery('')
                }}
              >
                Show All Tasks
              </Button>
            </div>
          </Card>
        ) : (
          filteredAndSortedTasks.map((task) => (
            <Card key={task.id} className="hover:border-border/80 transition-colors">
              <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {task.properties?.name || 'No specific property'}
                    </div>
                    <h3 className="font-semibold text-lg">{task.title}</h3>
                    <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                      <User className="size-3.5 text-muted-foreground/70" />
                      <span>Assigned to:</span>
                      <span className="font-medium text-foreground">
                        {task.members?.first_name} {task.members?.last_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                </div>

                {(task.notes || task.due_date) && (
                  <div className="bg-muted/40 p-3 rounded-2xl border border-border text-sm flex flex-col gap-2">
                    {task.due_date && (
                      <div>
                        <span className="font-medium">Due:</span>{' '}
                        <span className="text-[#d79921] font-medium">
                          {formatDueDate(task.due_date)}
                        </span>
                      </div>
                    )}
                    {task.notes && (
                      <div className="italic text-muted-foreground">"{task.notes}"</div>
                    )}
                    {task.blocked_reason && task.status === 'blocked' && (
                      <div className="text-destructive mt-1 font-medium">
                        Blocked: {task.blocked_reason}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
