import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ManageTaskList, TaskItem, MemberOption } from './manage-task-list'

describe('ManageTaskList', () => {
  const mockMembers: MemberOption[] = [
    { id: 'm1', first_name: 'Joe', last_name: 'Manley' },
    { id: 'm2', first_name: 'Christian', last_name: 'Tannahill' },
    { id: 'm3', first_name: 'Alice', last_name: 'Adams' },
  ]

  const mockTasks: TaskItem[] = [
    {
      id: 't1',
      title: 'Fix roof leak',
      property_id: '1',
      assignee_id: 'm1',
      priority: 'urgent',
      status: 'done',
      due_date: '2026-10-10',
      notes: 'Can it... or else',
      created_at: '2026-10-01T10:00:00Z',
      properties: { name: 'Reutter' },
      members: { first_name: 'Joe', last_name: 'Manley' },
    },
    {
      id: 't2',
      title: 'Paint garage ceiling and trim white',
      property_id: '1',
      assignee_id: 'm2',
      priority: 'high',
      status: 'in_progress',
      due_date: '2026-10-12',
      notes: 'Paint garage walls brown; paint garage ceiling and trim white',
      created_at: '2026-10-02T10:00:00Z',
      properties: { name: 'Reutter' },
      members: { first_name: 'Christian', last_name: 'Tannahill' },
    },
    {
      id: 't3',
      title: 'Install dry wall',
      property_id: '2',
      assignee_id: 'm3',
      priority: 'low',
      status: 'todo',
      due_date: '2026-10-15',
      notes: null,
      created_at: '2026-10-03T10:00:00Z',
      properties: { name: 'Oakwood' },
      members: { first_name: 'Alice', last_name: 'Adams' },
    },
  ]

  it('defaults to active tasks and hides done tasks', () => {
    render(<ManageTaskList tasks={mockTasks} members={mockMembers} />)

    // Should show active tasks
    expect(screen.getByText('Paint garage ceiling and trim white')).toBeInTheDocument()
    expect(screen.getByText('Install dry wall')).toBeInTheDocument()

    // Should hide the 'done' task by default
    expect(screen.queryByText('Fix roof leak')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /active tasks/i })).toBeInTheDocument()
  })

  it('shows completed tasks when status filter is set to "done"', async () => {
    render(<ManageTaskList tasks={mockTasks} members={mockMembers} />)

    const statusTrigger = screen.getByRole('combobox', { name: /filter by status/i })
    fireEvent.click(statusTrigger)

    const doneOption = await screen.findByRole('option', { name: 'Done' })
    fireEvent.pointerDown(doneOption)
    fireEvent.click(doneOption)

    expect(screen.getByText('Fix roof leak')).toBeInTheDocument()
    expect(screen.queryByText('Paint garage ceiling and trim white')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /completed tasks/i })).toBeInTheDocument()
  })

  it('filters tasks by selected worker', async () => {
    render(<ManageTaskList tasks={mockTasks} members={mockMembers} />)

    const workerTrigger = screen.getByRole('combobox', { name: /filter by worker/i })
    fireEvent.click(workerTrigger)

    const aliceOption = await screen.findByRole('option', { name: 'Alice Adams' })
    fireEvent.pointerDown(aliceOption)
    fireEvent.click(aliceOption)

    expect(screen.getByText('Install dry wall')).toBeInTheDocument()
    expect(screen.queryByText('Paint garage ceiling and trim white')).not.toBeInTheDocument()
  })

  it('sorts tasks alphabetically by worker when sort is set to "Worker (A → Z)"', async () => {
    render(<ManageTaskList tasks={mockTasks} members={mockMembers} />)

    // First switch status to 'all' so all three tasks are rendered
    const statusTrigger = screen.getByRole('combobox', { name: /filter by status/i })
    fireEvent.click(statusTrigger)
    const allOption = await screen.findByRole('option', { name: 'All Statuses' })
    fireEvent.pointerDown(allOption)
    fireEvent.click(allOption)

    // Change sort to Worker (A → Z)
    const sortTrigger = screen.getByRole('combobox', { name: /sort tasks by/i })
    fireEvent.click(sortTrigger)
    const workerSortOption = await screen.findByRole('option', { name: 'Worker (A → Z)' })
    fireEvent.pointerDown(workerSortOption)
    fireEvent.click(workerSortOption)

    // Order should be: Alice Adams (Install dry wall), Christian Tannahill (Paint garage), Joe Manley (Fix roof)
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual([
      'Install dry wall',
      'Paint garage ceiling and trim white',
      'Fix roof leak',
    ])
  })

  it('filters by search input', () => {
    render(<ManageTaskList tasks={mockTasks} members={mockMembers} />)

    const searchInput = screen.getByPlaceholderText(/search tasks/i)
    fireEvent.change(searchInput, { target: { value: 'garage' } })

    expect(screen.getByText('Paint garage ceiling and trim white')).toBeInTheDocument()
    expect(screen.queryByText('Install dry wall')).not.toBeInTheDocument()
  })

  it('shows empty state when no tasks match filter and resets when clicked', () => {
    render(<ManageTaskList tasks={mockTasks} members={mockMembers} />)

    const searchInput = screen.getByPlaceholderText(/search tasks/i)
    fireEvent.change(searchInput, { target: { value: 'nonexistent keyword' } })

    expect(screen.getByText('No tasks match your filters')).toBeInTheDocument()

    const resetButton = screen.getByRole('button', { name: /show all tasks/i })
    fireEvent.click(resetButton)

    // After reset, all tasks (including done) are visible
    expect(screen.getByText('Fix roof leak')).toBeInTheDocument()
    expect(screen.getByText('Paint garage ceiling and trim white')).toBeInTheDocument()
  })
})
