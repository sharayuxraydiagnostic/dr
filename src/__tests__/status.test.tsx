import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../components/ui'

describe('StatusBadge', () => {
  it('shows online requests as awaiting confirmation, never as confirmed', () => {
    render(<StatusBadge status="BOOKED" />)
    expect(screen.getByText('Awaiting confirmation')).toBeInTheDocument()
    expect(screen.queryByText(/^Confirmed$/)).not.toBeInTheDocument()
  })
  it('shows confirmed appointments as Confirmed', () => {
    render(<StatusBadge status="CONFIRMED" />)
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })
})
