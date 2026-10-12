import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TimePicker } from './time-picker'

afterEach(() => {
  cleanup()
})

describe('TimePicker component', () => {
  it('renders initial 12-hour formatted values and period', () => {
    render(<TimePicker value="08:30" onChange={vi.fn()} aria-label="Clock In" />)
    const hourInput = screen.getByRole('textbox', { name: /^hour$/i }) as HTMLInputElement
    const minuteInput = screen.getByRole('textbox', { name: /^minute$/i }) as HTMLInputElement
    expect(hourInput.value).toBe('08')
    expect(minuteInput.value).toBe('30')
    expect(screen.getByRole('button', { name: /^AM$/i })).toHaveAttribute('data-active', 'true')
  })

  it('switches period between AM and PM when toggled', () => {
    const onChange = vi.fn()
    render(<TimePicker value="08:30" onChange={onChange} aria-label="Clock In" />)
    const pmButton = screen.getByRole('button', { name: /^PM$/i })
    fireEvent.click(pmButton)
    expect(onChange).toHaveBeenCalledWith('20:30')
  })

  it('allows typing any exact minute', () => {
    const onChange = vi.fn()
    render(<TimePicker value="08:30" onChange={onChange} aria-label="Clock In" />)
    const minuteInput = screen.getByRole('textbox', { name: /^minute$/i })
    fireEvent.change(minuteInput, { target: { value: '07' } })
    expect(onChange).toHaveBeenCalledWith('08:07')
  })

  it('allows typing a new hour', () => {
    const onChange = vi.fn()
    render(<TimePicker value="08:30" onChange={onChange} aria-label="Clock In" />)
    const hourInput = screen.getByRole('textbox', { name: /^hour$/i })
    fireEvent.change(hourInput, { target: { value: '11' } })
    expect(onChange).toHaveBeenCalledWith('11:30')
  })


  it('sets minute when quick preset chip is clicked', () => {
    const onChange = vi.fn()
    render(<TimePicker value="08:07" onChange={onChange} aria-label="Clock In" />)
    const chip45 = screen.getByRole('button', { name: ':45' })
    fireEvent.click(chip45)
    expect(onChange).toHaveBeenCalledWith('08:45')
  })

  it('increments hour when hour up stepper is clicked', () => {
    const onChange = vi.fn()
    render(<TimePicker value="08:30" onChange={onChange} aria-label="Clock In" />)
    const hourUpBtn = screen.getByLabelText(/increase hour/i)
    fireEvent.click(hourUpBtn)
    expect(onChange).toHaveBeenCalledWith('09:30')
  })
})
