import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { CreateTaskForm } from './create-task-form'
import { createTask } from '@/app/actions/tasks'

vi.mock('@/app/actions/tasks', () => ({
  createTask: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock VoiceDictationButton to easily trigger onTranscript
vi.mock('./voice-dictation-button', () => ({
  VoiceDictationButton: ({ onTranscript }: { onTranscript: (t: string) => void }) => (
    <button
      type="button"
      data-testid="mock-dictate-btn"
      onClick={() => onTranscript('Fix leaky pipe in basement')}
    >
      Dictate
    </button>
  ),
}))

describe('CreateTaskForm', () => {
  const mockProperties = [
    { id: '1', name: 'Oakwood Apartments' },
    { id: '2', name: 'Maple Ridge Plaza' },
  ]

  const mockMembers = [
    { id: 'm1', first_name: 'John', last_name: 'Doe' },
    { id: 'm2', first_name: 'Jane', last_name: 'Smith' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all assignment fields correctly', () => {
    render(<CreateTaskForm properties={mockProperties} members={mockMembers} />)

    expect(screen.getByText('Create Assignment')).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/property \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^notes$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /assign task/i })).toBeInTheDocument()
  })

  it('inserts transcribed text into notes textarea when speech dictation completes', async () => {
    render(<CreateTaskForm properties={mockProperties} members={mockMembers} />)

    const notesTextarea = screen.getByLabelText(/^notes$/i) as HTMLTextAreaElement
    expect(notesTextarea.value).toBe('')

    // Click mock dictate button to emit transcript
    const dictateBtn = screen.getByTestId('mock-dictate-btn')
    await act(async () => {
      fireEvent.click(dictateBtn)
    })

    expect(notesTextarea.value).toBe('Fix leaky pipe in basement')

    // Click again to ensure subsequent speech appends neatly
    await act(async () => {
      fireEvent.click(dictateBtn)
    })

    expect(notesTextarea.value).toBe(
      'Fix leaky pipe in basement\nFix leaky pipe in basement'
    )
  })

  it('submits task and resets notes on success', async () => {
    render(<CreateTaskForm properties={mockProperties} members={mockMembers} />)

    const titleInput = screen.getByLabelText(/title/i)
    fireEvent.change(titleInput, { target: { value: 'Inspect HVAC' } })

    const notesTextarea = screen.getByLabelText(/^notes$/i) as HTMLTextAreaElement
    fireEvent.change(notesTextarea, { target: { value: 'Check unit 102 filter' } })

    const submitBtn = screen.getByRole('button', { name: /assign task/i })
    const form = submitBtn.closest('form')!
    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(createTask).toHaveBeenCalled()
      expect(notesTextarea.value).toBe('')
    })
  })

  it('displays member name instead of ID in trigger when crew member is selected', async () => {
    render(<CreateTaskForm properties={mockProperties} members={mockMembers} />)

    const assigneeTrigger = screen.getByRole('combobox', { name: /assignee/i })
    expect(assigneeTrigger).toHaveTextContent('Select crew member')

    // Open the assignee select popup
    fireEvent.click(assigneeTrigger)

    // Select John Doe
    const option = await screen.findByRole('option', { name: 'John Doe' })
    fireEvent.pointerDown(option)
    fireEvent.click(option)

    // Trigger should display the human-readable full name, never the raw ID
    expect(assigneeTrigger).toHaveTextContent('John Doe')
    expect(assigneeTrigger).not.toHaveTextContent('m1')
  })

  it('displays property name instead of ID in trigger when property is selected', async () => {
    render(<CreateTaskForm properties={mockProperties} members={mockMembers} />)

    const propertyTrigger = screen.getByRole('combobox', { name: /property/i })
    expect(propertyTrigger).toHaveTextContent('Select property')

    // Open property select popup
    fireEvent.click(propertyTrigger)

    // Select Oakwood Apartments
    const option = await screen.findByRole('option', { name: 'Oakwood Apartments' })
    fireEvent.pointerDown(option)
    fireEvent.click(option)

    // Trigger should display the property name, never the raw ID
    expect(propertyTrigger).toHaveTextContent('Oakwood Apartments')
    expect(propertyTrigger).not.toHaveTextContent('1')
  })

  it('submits selected assignee_id and property_id values in FormData', async () => {
    render(<CreateTaskForm properties={mockProperties} members={mockMembers} />)

    // Select assignee John Doe (m1)
    const assigneeTrigger = screen.getByRole('combobox', { name: /assignee/i })
    fireEvent.click(assigneeTrigger)
    const memberOption = await screen.findByRole('option', { name: 'John Doe' })
    fireEvent.pointerDown(memberOption)
    fireEvent.click(memberOption)

    // Select property Oakwood Apartments (1)
    const propertyTrigger = screen.getByRole('combobox', { name: /property/i })
    fireEvent.click(propertyTrigger)
    const propOption = await screen.findByRole('option', { name: 'Oakwood Apartments' })
    fireEvent.pointerDown(propOption)
    fireEvent.click(propOption)

    // Set title
    const titleInput = screen.getByLabelText(/title/i)
    fireEvent.change(titleInput, { target: { value: 'Repair door' } })

    const submitBtn = screen.getByRole('button', { name: /assign task/i })
    const form = submitBtn.closest('form')!
    await act(async () => {
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(createTask).toHaveBeenCalled()
      const formDataArg = vi.mocked(createTask).mock.calls[0][0] as FormData
      expect(formDataArg.get('assignee_id')).toBe('m1')
      expect(formDataArg.get('property_id')).toBe('1')
      expect(formDataArg.get('title')).toBe('Repair door')
    })
  })
})
