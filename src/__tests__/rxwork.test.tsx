import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { apiMock, ok, Providers } from './mocks'

let role = 'DOCTOR'
vi.mock('../lib/api', () => ({ api: apiMock, errMsg: (e: unknown) => (e as Error)?.message ?? 'error', downloadFile: vi.fn(), openFile: vi.fn(), fetchBlobUrl: vi.fn() }))
vi.mock('../context/AuthContext', () => ({ useOptionalAuth: () => ({ user: { role } }) }))
vi.mock('../context/SiteContext', () => ({ useSite: () => ({ settings: { hospital_name: 'CLINIC-HEADER-TEXT', address: 'Addr', phone: '1' } }) }))
vi.mock('../components/MedicineInput', () => ({ MedicineInput: ({ value }: { value: string }) => <input aria-label="Medicine" value={value} readOnly /> }))
import { Consultation } from '../pages/doctor/DoctorPages'
import { PrescriptionPrint } from '../pages/PrescriptionPrint'
import { AppointmentsByDate, consultationState, daysIn, rangeFor, shiftISO } from '../components/AppointmentsByDate'
import type { AppointmentView } from '../lib/types'

const reset = () => { Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()); role = 'DOCTOR' }

describe('date ranges (Asia/Kolkata, plain ISO dates)', () => {
  const T = '2026-10-30' // Friday
  it('single days', () => { expect(rangeFor('TODAY', T)).toEqual({ from: T, to: T }); expect(rangeFor('YESTERDAY', T)).toEqual({ from: '2026-10-29', to: '2026-10-29' }) })
  it('last N days INCLUDES today and has exactly N days', () => {
    for (const [k, n] of [['LAST_7', 7], ['LAST_10', 10], ['LAST_15', 15], ['LAST_18', 18]] as const) {
      const r = rangeFor(k, T); expect(r.to).toBe(T); expect(daysIn(r.from, r.to)).toHaveLength(n)
    }
    expect(rangeFor('LAST_7', T).from).toBe('2026-10-24')
  })
  it('weeks run Monday to Sunday', () => {
    expect(rangeFor('THIS_WEEK', T)).toEqual({ from: '2026-10-26', to: '2026-11-01' })
    expect(rangeFor('LAST_WEEK', T)).toEqual({ from: '2026-10-19', to: '2026-10-25' })
    expect(rangeFor('THIS_WEEK', '2026-11-01')).toEqual({ from: '2026-10-26', to: '2026-11-01' }) // Sunday belongs to the week that started Monday
    expect(rangeFor('THIS_WEEK', '2026-10-26')).toEqual({ from: '2026-10-26', to: '2026-11-01' }) // Monday
  })
  it('crosses month / year boundaries', () => { expect(shiftISO('2027-01-01', -1)).toBe('2026-12-31'); expect(rangeFor('LAST_7', '2027-01-02').from).toBe('2026-12-27') })
})

const appt = (o: Partial<AppointmentView>): AppointmentView => ({ id: 1, code: 'A1', patientId: 5, patientCode: 'PAT-5', patientName: 'Asha Patil', patientPhone: '1', doctorId: 1, doctorName: 'Dr', date: '2026-10-30', startTime: '10:00:00', endTime: '10:15:00', status: 'COMPLETED', type: 'CONSULTATION', consultationFee: 500, consultationId: 77, canModify: false, ...o } as AppointmentView)

describe('Patients by date', () => {
  beforeEach(reset)
  it('derives consultation state from existing fields', () => {
    expect(consultationState(appt({}))).toMatchObject({ label: 'Completed' })
    expect(consultationState(appt({ status: 'IN_CONSULTATION' }))).toMatchObject({ label: 'In progress' })
    expect(consultationState(appt({ status: 'CONFIRMED', consultationId: null }))).toMatchObject({ label: 'Not started' })
  })
  it('fetches one request per day for the chosen range and lists the fields with history / consultation links', async () => {
    apiMock.get.mockImplementation((_u: string, o: { params: { date: string } }) => ok(o.params.date === rangeFor('TODAY', new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())).from ? [appt({})] : []))
    render(<Providers><AppointmentsByDate /></Providers>)
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument()
    expect(apiMock.get).toHaveBeenCalledTimes(1)
    expect(screen.getByText('PAT-5')).toBeInTheDocument()
    expect(screen.getByLabelText('History of Asha Patil').closest('a')).toHaveAttribute('href', '/doctor/patients/5')
    expect(screen.getByLabelText('Consultation of Asha Patil').closest('a')).toHaveAttribute('href', '/doctor/consultation/77')
    apiMock.get.mockClear(); apiMock.get.mockImplementation(() => ok([]))
    await userEvent.click(screen.getByRole('button', { name: 'Last 18 days' }))
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledTimes(18))
    expect(await screen.findByText(/No appointments in this period/)).toBeInTheDocument()
  })
  it('validates a custom range and shows API errors with retry', async () => {
    apiMock.get.mockImplementation(() => ok([]))
    render(<Providers><AppointmentsByDate /></Providers>)
    await userEvent.click(screen.getByRole('button', { name: 'Custom range' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose both')
    apiMock.get.mockClear() // (the initial Today load already happened)
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-20' } })
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-10-22' } })
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledTimes(3))
    expect(apiMock.get.mock.calls.map((c) => c[1].params.date).sort()).toEqual(['2026-10-20', '2026-10-21', '2026-10-22'])
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-25' } }) // after To: rejected, no requests
    expect(await screen.findByRole('alert')).toHaveTextContent('must not be after')
    apiMock.get.mockClear(); apiMock.get.mockImplementation(() => Promise.reject(new Error('Network down')))
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByText(/Network down/)).toBeInTheDocument()
  })
})

const done = { id: 9, appointmentId: 3, appointmentCode: 'A3', patientId: 5, patientName: 'Asha Patil', doctorName: 'Dr', symptoms: 's', status: 'COMPLETED', startedAt: '2026-10-30T10:00:00', diagnoses: [{ name: 'Knee OA' }], items: [{ medicineName: 'Paracetamol', dosage: '1 tab', frequency: 'Twice daily', duration: '5 days', instructions: 'after food' }], prescriptionId: 4, language: 'EN', followUp: { id: 1, patientId: 5, patientName: 'Asha', doctorName: 'Dr', date: '2026-11-06', status: 'SCHEDULED' } }
const renderConsult = () => render(<Providers route="/doctor/consultation/9"><Routes><Route path="/doctor/consultation/:id" element={<Consultation />} /></Routes></Providers>)

describe('Edit completed prescription', () => {
  beforeEach(() => { reset(); apiMock.get.mockImplementation((u: string) => ok(u.startsWith('/consultations') ? done : { patient: { fullName: 'Asha Patil', patientCode: 'PAT-5', phone: '1' }, consultations: [], reports: [], appointments: [], prescriptions: [], followUps: [], bills: [] })) })
  it('is read-only until Edit prescription is pressed; Cancel restores the saved data', async () => {
    renderConsult()
    expect(await screen.findByLabelText('Dosage')).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Save changes/ })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Edit prescription/ }))
    const dose = screen.getByLabelText('Dosage')
    expect(dose).toBeEnabled(); expect(dose).toHaveValue('1 tab') // existing data is pre-filled
    await userEvent.clear(dose); await userEvent.type(dose, '2 tabs')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Dosage')).toBeDisabled(); expect(screen.getByLabelText('Dosage')).toHaveValue('1 tab')
    expect(apiMock.put).not.toHaveBeenCalled()
  })
  it('saves through the existing PUT /consultations/{id} only (no complete, no billing, no new consultation)', async () => {
    apiMock.put.mockImplementation(() => ok(done))
    renderConsult()
    await userEvent.click(await screen.findByRole('button', { name: /Edit prescription/ }))
    const dose = screen.getByLabelText('Dosage'); await userEvent.clear(dose); await userEvent.type(dose, '2 tabs')
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1))
    const [url, body] = apiMock.put.mock.calls[0]
    expect(url).toBe('/consultations/9'); expect(body.items[0]).toMatchObject({ medicineName: 'Paracetamol', dosage: '2 tabs' }); expect(body.diagnoses).toEqual([{ name: 'Knee OA' }])
    expect(apiMock.post).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('button', { name: /Save changes/ })).toBeNull())
  })
  it('shows the server error and stays in edit mode; blocks removing every diagnosis', async () => {
    apiMock.put.mockImplementation(() => Promise.reject(new Error('Server says no')))
    renderConsult()
    await userEvent.click(await screen.findByRole('button', { name: /Edit prescription/ }))
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }))
    expect(await screen.findByText('Server says no')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeInTheDocument()
    apiMock.put.mockClear()
    await userEvent.clear(screen.getByPlaceholderText('Diagnosis'))
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }))
    expect(await screen.findByText('Keep at least one diagnosis.')).toBeInTheDocument()
    expect(apiMock.put).not.toHaveBeenCalled()
  })
  it('follow-up stays read-only while editing', async () => {
    renderConsult()
    await userEvent.click(await screen.findByRole('button', { name: /Edit prescription/ }))
    expect(screen.getByRole('radio', { name: '7 days' })).toBeDisabled()
    expect(screen.getByText(/Follow-up already arranged/)).toBeInTheDocument()
  })
})

const rx = { id: 4, code: 'RX4', consultationId: 9, patientId: 5, patientName: 'Asha Patil', doctorName: 'Dr Munot', date: '2026-10-30', items: [{ medicineName: 'Paracetamol', dosage: '1 tab', frequency: 'Twice daily', duration: '5 days' }], diagnoses: ['Knee OA'], patientCode: 'PAT-5', doctorRegistrationNumber: 'R1' }
const renderRx = () => render(<Providers route="/print/prescription/4"><Routes><Route path="/print/prescription/:id" element={<PrescriptionPrint />} /></Routes></Providers>)

describe('Prescription print', () => {
  beforeEach(() => { reset(); apiMock.get.mockImplementation((u: string) => ok(u.includes('print-settings') ? { top: 55, bottom: 30, left: 20, right: 20 } : rx)) })
  it('doctor: prints like the certificate - A4, zero page margin, certificate margins, no clinic header', async () => {
    renderRx()
    expect(await screen.findByTestId('rx-print-sheet')).toBeInTheDocument()
    expect(screen.getByTestId('rx-spacer-top').style.height).toBe('55mm'); expect(screen.getByTestId('rx-spacer-bottom').style.height).toBe('30mm')
    expect(screen.queryByText('CLINIC-HEADER-TEXT')).toBeNull()
    expect(screen.getByText('Paracetamol')).toBeInTheDocument()
    expect(document.head.querySelector('[data-munot-page-style]')?.textContent).toMatch(/@page\s*{\s*size:\s*A4 portrait;\s*margin:\s*0/)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByText('CLINIC-HEADER-TEXT')).toBeInTheDocument(); expect(screen.queryByTestId('rx-print-sheet')).toBeNull()
  })
  it('patient: unchanged branded layout, no settings call (that API is doctor-only)', async () => {
    role = 'PATIENT'
    renderRx()
    expect(await screen.findByText('CLINIC-HEADER-TEXT')).toBeInTheDocument()
    expect(screen.queryByTestId('rx-print-sheet')).toBeNull()
    expect(apiMock.get.mock.calls.some((c) => String(c[0]).includes('print-settings'))).toBe(false)
  })
})
