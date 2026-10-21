import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, errMsg: (e: { message?: string }) => e?.message ?? 'error' }))
import { DoctorSchedule } from '../pages/doctor/DoctorSchedule'

describe('Doctor slot blocking', () => {
  beforeEach(() => {
    apiMock.get.mockReset(); apiMock.post.mockReset(); apiMock.delete.mockReset()
    apiMock.get.mockImplementation((url: string) => ok(url === '/doctor/blocks' ? [{ id: 9, date: '2030-01-05', wholeDay: true, reason: 'Conference', affectedAppointments: 2 }] : []))
  })

  it('lists upcoming blocks and warns about affected appointments', async () => {
    render(<Providers><DoctorSchedule /></Providers>)
    expect(await screen.findByText(/Whole day/)).toBeInTheDocument()
    expect(screen.getByText('2 appointment(s) affected')).toBeInTheDocument()
  })

  it('blocks a whole day with one click', async () => {
    apiMock.post.mockReturnValue(ok({ id: 10, affectedAppointments: 0 }))
    render(<Providers><DoctorSchedule /></Providers>)
    await userEvent.click(await screen.findByRole('button', { name: /block whole day/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalled())
    const [url, body] = apiMock.post.mock.calls[0]
    expect(url).toBe('/doctor/blocks')
    expect(body.startTime).toBeUndefined()
    expect(body.endTime).toBeUndefined()
  })

  it('disables a time-range block when the end is not after the start', async () => {
    render(<Providers><DoctorSchedule /></Providers>)
    await userEvent.click(await screen.findByRole('radio', { name: 'Time range' }))
    const [from, to] = Array.from(document.querySelectorAll('input[type="time"]')) as HTMLInputElement[]
    fireEvent.change(from, { target: { value: '15:00' } })
    fireEvent.change(to, { target: { value: '14:00' } })
    expect(screen.getByText('End must be after start')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /block this time/i })).toBeDisabled()
  })

  it('sends the chosen time range', async () => {
    apiMock.post.mockReturnValue(ok({ id: 11, affectedAppointments: 1 }))
    render(<Providers><DoctorSchedule /></Providers>)
    await userEvent.click(await screen.findByRole('radio', { name: 'Time range' }))
    await userEvent.click(screen.getByRole('button', { name: /block this time/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalled())
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({ startTime: '13:00', endTime: '14:00' })
  })
})
