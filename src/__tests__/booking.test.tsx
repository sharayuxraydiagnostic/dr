import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, errMsg: (e: { message?: string }) => e?.message ?? 'error' }))
import { PatientBooking } from '../pages/portal/PatientPages'

const doctor = { id: 1, fullName: 'Dr Demo', specialization: 'Orthopaedics', consultationFee: 500, slotMinutes: 15, maxPatientsPerSlot: 1, active: true, hasPhoto: false, photoVersion: 0 }
const slots = [{ startTime: '10:00:00', endTime: '10:15:00', remaining: 1 }, { startTime: '10:15:00', endTime: '10:30:00', remaining: 0 }]

describe('Patient booking', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset())
    apiMock.get.mockImplementation((url: string) => ok(url === '/public/doctors' ? [doctor] : slots))
  })

  it('disables fully booked slots so they cannot be chosen', async () => {
    render(<Providers><PatientBooking /></Providers>)
    expect(await screen.findByRole('radio', { name: '10:00 AM' })).toBeEnabled()
    expect(screen.getByRole('radio', { name: '10:15 AM' })).toBeDisabled()
  })

  it('submits a request (not a confirmed booking) and tells the patient it is awaiting confirmation', async () => {
    apiMock.post.mockReturnValue(ok({ id: 1 }))
    render(<Providers><PatientBooking /></Providers>)
    expect(await screen.findByText(/The hospital will confirm your request/)).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('radio', { name: '10:00 AM' }))
    await userEvent.click(screen.getByRole('button', { name: /request appointment/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/appointments', expect.objectContaining({ doctorId: 1, startTime: '10:00' })))
    expect(await screen.findByText(/NOT confirmed until the hospital confirms/)).toBeInTheDocument()
  })

  it('shows the server message when the slot was taken meanwhile', async () => {
    apiMock.post.mockRejectedValue({ message: 'That time slot is not available. Please choose another slot.' })
    render(<Providers><PatientBooking /></Providers>)
    await userEvent.click(await screen.findByRole('radio', { name: '10:00 AM' }))
    await userEvent.click(screen.getByRole('button', { name: /request appointment/i }))
    expect(await screen.findByText(/not available/)).toBeInTheDocument()
  })
})
