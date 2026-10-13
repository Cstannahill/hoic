import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreateTaskDialog } from './create-task-dialog'

vi.mock('@/app/actions/tasks', () => ({
  createTask: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('CreateTaskDialog', () => {
  const mockProperties = [{ id: '1', name: 'Oakwood' }]
  const mockMembers = [{ id: 'm1', first_name: 'John', last_name: 'Doe' }]

  it('renders trigger button and opens dialog upon click', async () => {
    render(<CreateTaskDialog properties={mockProperties} members={mockMembers} />)

    const trigger = screen.getByRole('button', { name: /assign task/i })
    expect(trigger).toBeInTheDocument()

    // Dialog title should not be in document initially
    expect(screen.queryByRole('heading', { name: /assign task/i })).not.toBeInTheDocument()

    fireEvent.click(trigger)

    // Dialog should open
    expect(await screen.findByRole('heading', { name: /assign task/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument()
  })
})
