import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeeklyLaborSummary } from './weekly-labor-summary'

describe('WeeklyLaborSummary', () => {
  it('renders running weekly labor for the current week', () => {
    // 26.55 hours = 26.55 * 3600 * 1000 = 95_580_000 ms
    // $531.07 = 53107 cents
    render(
      <WeeklyLaborSummary
        isCurrentWeek={true}
        totalLaborCents={53107}
        totalLaborMs={95_580_000}
        workersCount={2}
        shiftsCount={6}
      />
    )

    expect(screen.getByText('Running Weekly Labor')).toBeInTheDocument()
    expect(screen.getAllByText('$531.07').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('26.55')).toBeInTheDocument()
    expect(screen.getByText(/2 workers • 6 completed shifts/i)).toBeInTheDocument()
  })

  it('renders total period labor when browsing past weeks', () => {
    render(
      <WeeklyLaborSummary
        isCurrentWeek={false}
        totalLaborCents={124050}
        totalLaborMs={144_000_000}
        workersCount={1}
        shiftsCount={1}
      />
    )

    expect(screen.getByText('Total Period Labor')).toBeInTheDocument()
    expect(screen.getAllByText('$1,240.50').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('40.00')).toBeInTheDocument()
    expect(screen.getByText(/1 worker • 1 completed shift/i)).toBeInTheDocument()
  })
})
