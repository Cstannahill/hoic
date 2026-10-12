import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AccountSettingsForm } from './account-settings-form'

vi.mock('@/app/actions/account', () => ({
  updateAccount: vi.fn().mockResolvedValue({ success: 'Account updated successfully.' }),
}))

describe('AccountSettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial username as a controlled value', () => {
    render(<AccountSettingsForm currentUsername="alice" />)

    const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement
    expect(usernameInput.value).toBe('alice')
  })

  it('allows user to type in username and password fields', () => {
    render(<AccountSettingsForm currentUsername="alice" />)

    const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement
    fireEvent.change(usernameInput, { target: { value: 'alice_updated' } })
    expect(usernameInput.value).toBe('alice_updated')

    const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement
    fireEvent.change(passwordInput, { target: { value: 'supersecret' } })
    expect(passwordInput.value).toBe('supersecret')
  })

  it('updates username when currentUsername prop changes without console error warnings', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = render(<AccountSettingsForm currentUsername="alice" />)
    const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement
    expect(usernameInput.value).toBe('alice')

    rerender(<AccountSettingsForm currentUsername="alice_new" />)
    expect(usernameInput.value).toBe('alice_new')

    // Ensure no Base UI warning about changing defaultValue of an uncontrolled FieldControl
    const baseUiWarnings = consoleSpy.mock.calls
      .map((call) => call.join(' '))
      .filter((msg) => msg.includes('changing the default') || msg.includes('FieldControl'))
    expect(baseUiWarnings).toHaveLength(0)

    consoleSpy.mockRestore()
  })

  it('submits updated username and password, clearing password on success', async () => {
    render(<AccountSettingsForm currentUsername="alice" />)

    const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement
    fireEvent.change(passwordInput, { target: { value: 'newpassword123' } })
    expect(passwordInput.value).toBe('newpassword123')

    const submitBtn = screen.getByRole('button', { name: /save changes/i })
    await act(async () => {
      fireEvent.click(submitBtn)
    })

    expect(screen.getByText('Account updated successfully.')).toBeInTheDocument()
    expect(passwordInput.value).toBe('')
  })
})
