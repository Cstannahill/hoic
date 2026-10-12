import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EditShiftDialog } from './edit-shift-dialog'

afterEach(() => {
  cleanup()
})

vi.mock('@/app/actions/shifts', () => ({
  updateShiftTime: vi.fn().mockResolvedValue({ success: true }),
}))


describe('EditShiftDialog', () => {
  it('renders "Edit Time" button initially', () => {
    render(
      <EditShiftDialog
        shiftId="shift-1"
        startedAt="2026-10-12T13:00:00Z"
        endedAt="2026-10-12T21:30:00Z"
      />
    )
    expect(screen.getByRole('button', { name: /Edit Time/i })).toBeInTheDocument()
  })

  it('opens the dialog when "Edit Time" is clicked', () => {
    render(
      <EditShiftDialog
        shiftId="shift-1"
        startedAt="2026-10-12T13:00:00Z"
        endedAt="2026-10-12T21:30:00Z"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Edit Time/i }))
    expect(screen.getByText('Edit Shift Time')).toBeInTheDocument()
    expect(screen.getByLabelText(/Clock In/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Clock Out/i)).toBeInTheDocument()
  })

  it('submits updated shift time when Save Changes is clicked', async () => {
    const { updateShiftTime } = await import('@/app/actions/shifts')
    render(
      <EditShiftDialog
        shiftId="shift-1"
        startedAt="2026-10-12T13:00:00Z"
        endedAt="2026-10-12T21:30:00Z"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Edit Time/i }))
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    expect(updateShiftTime).toHaveBeenCalledWith(
      'shift-1',
      expect.any(String),
      expect.any(String)
    )
  })
})
