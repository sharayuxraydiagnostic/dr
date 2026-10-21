import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, errMsg: () => 'error' }))
import { PendingRequests } from '../components/PendingRequests'

const req = { id: 5, code: 'APT-000005', patientId: 1, patientCode: 'PAT-000001', patientName: 'Asha Demo', patientPhone: '9000000002', doctorId: 1, doctorName: 'Dr Demo', date: '2030-01-05', startTime: '10:15:00', endTime: '10:30:00', status: 'BOOKED', type: 'ONLINE', consultationFee: 500, canModify: true }

describe('Pending confirmation requests', () => {
  beforeEach(() => { Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()); apiMock.get.mockImplementation(() => ok([req])); apiMock.put.mockReturnValue(ok({})) })

  it('shows the request and confirms it only when staff click Confirm', async () => {
    render(<Providers><PendingRequests /></Providers>)
    expect(await screen.findByText('Asha Demo')).toBeInTheDocument()
    expect(apiMock.put).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/appointments/5/confirm'))
  })

  it('asks for confirmation before declining, then cancels', async () => {
    render(<Providers><PendingRequests /></Providers>)
    await userEvent.click(await screen.findByRole('button', { name: /decline/i }))
    expect(apiMock.put).not.toHaveBeenCalled()
    const declines = await screen.findAllByRole('button', { name: 'Decline' })
    await userEvent.click(declines[declines.length - 1]) // the dialog's confirm button
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/appointments/5/cancel', { reason: 'Declined by hospital' }))
  })

  it('shows an empty state when nothing is waiting', async () => {
    apiMock.get.mockImplementation(() => ok([]))
    render(<Providers><PendingRequests /></Providers>)
    expect(await screen.findByText('No requests waiting')).toBeInTheDocument()
  })
})
