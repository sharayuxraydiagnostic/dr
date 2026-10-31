import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { apiMock, ok, Providers } from './mocks'

let role = 'DOCTOR'
vi.mock('../lib/api', () => ({ api: apiMock, errMsg: (e: unknown) => (e as Error)?.message ?? 'error', downloadFile: vi.fn(), openFile: vi.fn(), fetchBlobUrl: vi.fn() }))
vi.mock('../context/AuthContext', async (orig) => ({ ...(await orig<object>()), useOptionalAuth: () => ({ user: { role } }) }))
vi.mock('../context/SiteContext', () => ({ useSite: () => ({ settings: { hospital_name: 'CLINIC-HEADER-TEXT', address: 'Addr', phone: '1' } }) }))
vi.mock('../components/MedicineInput', () => ({ MedicineInput: ({ value }: { value: string }) => <input aria-label="Medicine" value={value} readOnly /> }))
import { Consultation } from '../pages/doctor/DoctorPages'
import { PrescriptionPrint } from '../pages/PrescriptionPrint'
import { ReceptionPatients } from '../pages/reception/ReceptionPages'
import { PatientForm } from '../components/PatientParts'
import { ageFromDob, dobFromAge, formatAge, parseAge } from '../lib/age'
import { fmtLongDate, followUpDate, parseFollowUpDays } from '../lib/followUp'
import { istToday, shiftISO } from '../lib/istDate'

const reset = () => { Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()); role = 'DOCTOR' }

describe('age helpers', () => {
  it('accepts only whole, non-negative numbers up to 120', () => {
    for (const ok of ['0', '1', '25', '120', ' 30 ']) expect(parseAge(ok).error).toBeUndefined()
    for (const bad of ['', '  ', '-5', '2.5', '25.0', 'abc', '1e2', '+25', '121', '25 years']) expect(parseAge(bad).error).toBeTruthy()
    expect(parseAge('25').age).toBe(25)
  })
  it('stores a date that makes the patient exactly that age today, and reads it back', () => {
    const today = '2026-10-30'
    expect(dobFromAge(25, today)).toBe('2001-10-30'); expect(ageFromDob('2001-10-30', today)).toBe(25)
    expect(ageFromDob('2001-10-31', today)).toBe(24) // birthday tomorrow
    expect(ageFromDob(dobFromAge(0, today), today)).toBe(0)
    expect(dobFromAge(1, '2028-02-29')).toBe('2027-02-28'); expect(ageFromDob('2027-02-28', '2028-02-29')).toBe(1) // leap day
    for (const a of [0, 1, 7, 25, 64, 120]) expect(ageFromDob(dobFromAge(a, today), today)).toBe(a)
  })
  it('formats age and ignores missing / bad dates', () => {
    expect(formatAge('2001-10-30', '2026-10-30')).toBe('25 Years'); expect(formatAge('2025-10-30', '2026-10-30')).toBe('1 Year')
    expect(formatAge(undefined)).toBe(''); expect(formatAge('not a date')).toBe(''); expect(ageFromDob('2100-01-01', '2026-10-30')).toBeNull()
  })
})

describe('follow-up days helpers', () => {
  it('empty means no follow-up; positive whole numbers are accepted', () => {
    expect(parseFollowUpDays('')).toEqual({ days: null }); expect(parseFollowUpDays('   ')).toEqual({ days: null })
    for (const n of ['3', '5', '10', '15', '20', '30', ' 7 ']) expect(parseFollowUpDays(n).error).toBeUndefined()
    expect(parseFollowUpDays('10').days).toBe(10)
  })
  it('rejects zero, negatives, decimals, signs, text and huge values', () => {
    for (const bad of ['0', '00', '-3', '2.5', '1,5', '+7', 'abc', '7 days', '1e1', '366']) expect(parseFollowUpDays(bad).error, bad).toBeTruthy()
  })
  it('adds days across month ends, year ends and leap years', () => {
    expect(followUpDate('2026-10-30', 7)).toBe('2026-11-06'); expect(fmtLongDate('2026-11-06')).toBe('06 November 2026')
    expect(followUpDate('2026-12-28', 7)).toBe('2027-01-04')
    expect(followUpDate('2028-02-27', 3)).toBe('2028-03-01'); expect(followUpDate('2027-02-27', 3)).toBe('2027-03-02')
    expect(followUpDate('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('Patient registration / editing form', () => {
  beforeEach(reset)
  const fill = async () => { await userEvent.type(screen.getByLabelText(/Full name/), 'Asha Patil'); await userEvent.type(screen.getByLabelText(/Mobile number/), '9876543210') }
  const patient = (dob?: string) => ({ id: 5, patientCode: 'PAT-5', fullName: 'Asha Patil', phone: '9876543210', dateOfBirth: dob, hasPortalAccount: false, createdAt: '2026-01-01T00:00:00' })

  it('asks for Age (Years), never for date of birth; sends the stored date and no "age" field', async () => {
    apiMock.post.mockImplementation(() => ok(patient()))
    render(<Providers><PatientForm onSaved={() => {}} onCancel={() => {}} /></Providers>)
    expect(screen.queryByLabelText(/date of birth/i)).toBeNull(); expect(screen.queryByText(/DOB/i)).toBeNull()
    await fill(); await userEvent.type(screen.getByLabelText(/Age \(Years\)/), '25')
    await userEvent.click(screen.getByRole('button', { name: /Register patient/ }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1))
    const body = apiMock.post.mock.calls[0][1]
    expect(body.dateOfBirth).toBe(dobFromAge(25)); expect(ageFromDob(body.dateOfBirth)).toBe(25); expect('age' in body).toBe(false)
  })
  it('another valid age', async () => {
    apiMock.post.mockImplementation(() => ok(patient()))
    render(<Providers><PatientForm onSaved={() => {}} onCancel={() => {}} /></Providers>)
    await fill(); await userEvent.type(screen.getByLabelText(/Age \(Years\)/), '64')
    await userEvent.click(screen.getByRole('button', { name: /Register patient/ }))
    await waitFor(() => expect(ageFromDob(apiMock.post.mock.calls[0][1].dateOfBirth)).toBe(64))
  })
  it('age is required and must be a whole non-negative number', async () => {
    render(<Providers><PatientForm onSaved={() => {}} onCancel={() => {}} /></Providers>)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: /Register patient/ }))
    expect(await screen.findByText('Enter the age in years')).toBeInTheDocument()
    for (const [bad, msg] of [['2.5', /whole number/], ['abc', /whole number/], ['-4', /whole number/], ['150', /between 0 and 120/]] as const) {
      const f = screen.getByLabelText(/Age \(Years\)/)
      await userEvent.clear(f); await userEvent.type(f, bad)
      await userEvent.click(screen.getByRole('button', { name: /Register patient/ }))
      expect(await screen.findByText(msg)).toBeInTheDocument()
    }
    expect(apiMock.post).not.toHaveBeenCalled()
  })
  it('editing: shows the current age, keeps the stored date when the age is unchanged, replaces it when the age is changed', async () => {
    const dob = dobFromAge(40, shiftISO(istToday(), -100)) // a legacy record with a real, unrelated date
    const existing = ageFromDob(dob)!
    apiMock.put.mockImplementation(() => ok(patient(dob)))
    const { unmount } = render(<Providers><PatientForm initial={patient(dob)} onSaved={() => {}} onCancel={() => {}} /></Providers>)
    expect(screen.getByLabelText(/Age \(Years\)/)).toHaveValue(String(existing)); expect(screen.queryByLabelText(/date of birth/i)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1))
    expect(apiMock.put.mock.calls[0][1].dateOfBirth).toBe(dob) // existing record untouched
    unmount(); apiMock.put.mockClear()
    render(<Providers><PatientForm initial={patient(dob)} onSaved={() => {}} onCancel={() => {}} /></Providers>)
    const f = screen.getByLabelText(/Age \(Years\)/); await userEvent.clear(f); await userEvent.type(f, '31')
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1))
    expect(ageFromDob(apiMock.put.mock.calls[0][1].dateOfBirth)).toBe(31)
  })
})

describe('Patient list shows Age only', () => {
  beforeEach(reset)
  it('Age column, no DOB', async () => {
    apiMock.get.mockImplementation(() => ok([{ id: 5, patientCode: 'PAT-5', fullName: 'Asha Patil', phone: '1', dateOfBirth: dobFromAge(25), hasPortalAccount: false, createdAt: '2026-01-01T00:00:00' }]))
    render(<Providers><ReceptionPatients /></Providers>)
    expect(await screen.findByText('25 Years')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Age' })).toBeInTheDocument(); expect(screen.queryByText('DOB')).toBeNull()
  })
})

const base = { id: 9, appointmentId: 3, appointmentCode: 'A3', patientId: 5, patientName: 'Asha Patil', doctorName: 'Dr', symptoms: 's', startedAt: '2026-10-30T10:00:00', diagnoses: [{ name: 'Knee OA' }],
  items: [{ medicineName: 'Paracetamol', dosage: '1 tab', frequency: 'Twice daily', duration: '5 days', instructions: 'after food' }], language: 'EN' }
const inProgress = { ...base, status: 'IN_PROGRESS' }
const completedC = { ...base, status: 'COMPLETED', completedAt: '2026-10-30T11:00:00', prescriptionId: 4, followUpDays: 5,
  followUp: { id: 1, patientId: 5, patientName: 'Asha', doctorName: 'Dr', date: '2026-11-06', time: '17:20:00', status: 'SCHEDULED' } }
const history = { patient: { fullName: 'Asha Patil', patientCode: 'PAT-5', phone: '1', dateOfBirth: dobFromAge(25), gender: 'Female' }, consultations: [], reports: [], appointments: [], prescriptions: [], followUps: [], bills: [] }
const renderConsult = () => render(<Providers route="/doctor/consultation/9"><Routes><Route path="/doctor/consultation/:id" element={<Consultation />} /></Routes></Providers>)
const mockGet = (c: object) => apiMock.get.mockImplementation((u: string) => ok(u.startsWith('/consultations') ? c : history))

describe('Prescription follow-up (new consultation)', () => {
  beforeEach(reset)
  it('replaces the old options with one numeric field and shows the calculated date', async () => {
    mockGet(inProgress)
    renderConsult()
    const field = await screen.findByLabelText(/Follow-up After \(Days\)/)
    for (const old of ['No follow-up', '3 days', '7 days', '15 days', '30 days', 'Custom date']) expect(screen.queryByText(old)).toBeNull()
    expect(screen.queryByRole('radiogroup', { name: 'Follow-up' })).toBeNull() // (the language selector is a different radiogroup)
    expect(screen.queryByTestId('fu-date')).toBeNull() // empty = no follow-up
    await userEvent.type(field, '7')
    expect(screen.getByTestId('fu-date')).toHaveTextContent(`Follow-up Date: ${fmtLongDate(shiftISO(istToday(), 7))}`)
    await userEvent.clear(field); await userEvent.type(field, '10')
    expect(screen.getByTestId('fu-date')).toHaveTextContent(fmtLongDate(shiftISO(istToday(), 10)))
  })
  it('Patient Age is shown (never DOB) while writing the prescription', async () => {
    mockGet(inProgress)
    renderConsult()
    expect(await screen.findByText('Patient Age: 25 Years')).toBeInTheDocument(); expect(screen.queryByText(/DOB/)).toBeNull()
  })
  it('completes with DAYS + the number of days; empty means NONE', async () => {
    mockGet(inProgress)
    apiMock.post.mockImplementation(() => ok({ consultation: { ...inProgress, status: 'COMPLETED' }, followUp: null, followUpMessage: 'done' }))
    renderConsult()
    await userEvent.type(await screen.findByLabelText(/Follow-up After \(Days\)/), '15')
    await userEvent.click(screen.getByRole('button', { name: /Complete consultation/ }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1))
    const [url, body] = apiMock.post.mock.calls[0]
    expect(url).toBe('/consultations/9/complete'); expect(body.followUp).toBe('DAYS'); expect(body.consultation.followUpDays).toBe(15); expect('customDate' in body).toBe(false)
  })
  it('empty field -> NONE, followUpDays null', async () => {
    mockGet(inProgress)
    apiMock.post.mockImplementation(() => ok({ consultation: { ...inProgress, status: 'COMPLETED' }, followUp: null, followUpMessage: 'done' }))
    renderConsult()
    await screen.findByLabelText(/Follow-up After \(Days\)/)
    await userEvent.click(screen.getByRole('button', { name: /Complete consultation/ }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1))
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({ followUp: 'NONE', consultation: { followUpDays: null } })
  })
  it('invalid values are never saved: 0, negative, decimal, text', async () => {
    mockGet(inProgress)
    renderConsult()
    const field = await screen.findByLabelText(/Follow-up After \(Days\)/)
    for (const bad of ['0', '-3', '2.5', 'abc']) {
      await userEvent.clear(field); await userEvent.type(field, bad)
      expect(screen.getByRole('alert', { name: '' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /Save draft/ }))
      await userEvent.click(screen.getByRole('button', { name: /Complete consultation/ }))
    }
    expect(apiMock.put).not.toHaveBeenCalled(); expect(apiMock.post).not.toHaveBeenCalled()
    expect(screen.queryByTestId('fu-date')).toBeNull()
  })
})

describe('Editing a completed prescription keeps appointments separate', () => {
  beforeEach(() => { reset(); mockGet(completedC) })
  it('loads the saved days; the scheduled-appointment message is unchanged; the date is based on the prescription date', async () => {
    renderConsult()
    const field = await screen.findByLabelText(/Follow-up After \(Days\)/)
    await waitFor(() => expect(field).toHaveValue('5')) // the saved value is loaded into the form
    expect(field).toBeDisabled()
    expect(screen.getByTestId('fu-date')).toHaveTextContent('Follow-up Date: 04 November 2026')
    const note = screen.getByText(/Follow-up already arranged for/)
    expect(note).toHaveTextContent('Follow-up already arranged for 06 Nov 2026 at 5:20 PM')
    expect(note).toHaveTextContent('Scheduled'); expect(note).toHaveTextContent('It is not changed by editing the prescription; reschedule it from the appointment if needed.')
  })
  it('changing the days recalculates, saves with ONE PUT, and creates/changes no appointment', async () => {
    apiMock.put.mockImplementation(() => ok(completedC))
    renderConsult()
    await userEvent.click(await screen.findByRole('button', { name: /Edit prescription/ }))
    const field = screen.getByLabelText(/Follow-up After \(Days\)/); expect(field).toBeEnabled()
    await userEvent.clear(field); await userEvent.type(field, '10')
    expect(screen.getByTestId('fu-date')).toHaveTextContent('Follow-up Date: 09 November 2026')
    expect(screen.getByText(/Follow-up already arranged for/)).toHaveTextContent('06 Nov 2026 at 5:20 PM') // unchanged by the new number
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1))
    expect(apiMock.put.mock.calls[0][0]).toBe('/consultations/9'); expect(apiMock.put.mock.calls[0][1].followUpDays).toBe(10)
    expect(apiMock.post).not.toHaveBeenCalled(); expect(apiMock.delete).not.toHaveBeenCalled()
  })
  it('an invalid value blocks the save; clearing it saves "no follow-up days"; Cancel restores', async () => {
    apiMock.put.mockImplementation(() => ok(completedC))
    renderConsult()
    await userEvent.click(await screen.findByRole('button', { name: /Edit prescription/ }))
    const field = screen.getByLabelText(/Follow-up After \(Days\)/)
    await userEvent.clear(field); await userEvent.type(field, '0')
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }))
    expect(apiMock.put).not.toHaveBeenCalled()
    await userEvent.clear(field)
    await userEvent.click(screen.getByRole('button', { name: /Save changes/ }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1))
    expect(apiMock.put.mock.calls[0][1].followUpDays).toBeNull()
    await userEvent.click(await screen.findByRole('button', { name: /Edit prescription/ }))
    await userEvent.clear(screen.getByLabelText(/Follow-up After \(Days\)/)); await userEvent.type(screen.getByLabelText(/Follow-up After \(Days\)/), '9')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText(/Follow-up After \(Days\)/)).toHaveValue('5')
  })
})

describe('Prescription print', () => {
  beforeEach(reset)
  const rx = { id: 4, code: 'RX4', consultationId: 9, patientId: 5, patientName: 'Asha Patil', doctorName: 'Dr Munot', date: '2026-10-30T10:00:00', items: [{ medicineName: 'Paracetamol', dosage: '1 tab', frequency: 'Twice daily', duration: '5 days' }],
    diagnoses: ['Knee OA'], patientCode: 'PAT-5', patientGender: 'Female', patientDob: dobFromAge(25), followUpDays: 7 }
  const renderRx = () => render(<Providers route="/print/prescription/4"><Routes><Route path="/print/prescription/:id" element={<PrescriptionPrint />} /></Routes></Providers>)
  it('shows Patient Age only (no DOB) and the follow-up date', async () => {
    role = 'PATIENT'; apiMock.get.mockImplementation(() => ok(rx))
    renderRx()
    expect(await screen.findByText(/Patient Age: 25 Years/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/DOB|Date of birth/i)
    expect(screen.getByTestId('rx-followup')).toHaveTextContent('after 7 days (06 November 2026)')
  })
  it('no follow-up line when none was advised', async () => {
    role = 'PATIENT'; apiMock.get.mockImplementation(() => ok({ ...rx, followUpDays: null }))
    renderRx()
    await screen.findByText(/Patient Age/); expect(screen.queryByTestId('rx-followup')).toBeNull()
  })
})
