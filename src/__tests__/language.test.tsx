import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, errMsg: (e: { message?: string }) => e?.message ?? 'error', downloadFile: vi.fn(), openFile: vi.fn() }))
import { Consultation } from '../pages/doctor/DoctorPages'
import { PrescriptionPrint } from '../pages/PrescriptionPrint'
import { VisitDetails } from '../components/VisitDetails'
import type { ConsultationView, PrescriptionView } from '../lib/types'

const consultation: ConsultationView = {
  id: 7, appointmentId: 3, appointmentCode: 'APT-000003', patientId: 1, patientName: 'Asha Demo', doctorName: 'Dr Demo', status: 'IN_PROGRESS', startedAt: '2030-01-01T10:00:00',
  advice: 'Take rest. Avoid heavy lifting', testsAdvised: 'X-ray', diagnoses: [{ name: 'Lumbar strain' }],
  items: [{ medicineName: 'Dolo 650 Tablet', composition: 'Paracetamol 650 mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', instructions: 'After food' }],
}
const history = { patient: { id: 1, patientCode: 'PAT-000001', fullName: 'Asha Demo', phone: '9000000002' }, consultations: [], prescriptions: [], reports: [], appointments: [], followUps: [], bills: [] }
const translateAnswer = (complete = true) => ({
  machineAvailable: false,
  translations: [
    { source: 'Take rest. Avoid heavy lifting', text: 'विश्रांती घ्या जड वस्तू उचलू नका', method: complete ? 'GLOSSARY' : 'PARTIAL', complete },
    { source: 'X-ray', text: 'एक्स-रे', method: 'GLOSSARY', complete: true },
    { source: 'Twice daily', text: 'दिवसातून दोनदा', method: 'GLOSSARY', complete: true },
    { source: '5 days', text: '5 दिवस', method: 'GLOSSARY', complete: true },
    { source: 'After food', text: 'जेवणानंतर', method: 'GLOSSARY', complete: true },
  ],
})

function setup() {
  apiMock.get.mockImplementation((url: string) => ok(url === '/consultations/7' ? consultation : url === '/patients/1/history' ? history : []))
  return render(<Providers route="/doctor/consultation/7"><Routes><Route path="/doctor/consultation/:id" element={<Consultation />} /></Routes></Providers>)
}

describe('Prescription in the patient\'s language', () => {
  beforeEach(() => { Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()) })

  it('translates advice, tests and medicine instructions when Marathi is clicked, and lets the doctor edit them', async () => {
    apiMock.post.mockReturnValue(ok(translateAnswer()))
    setup()
    await userEvent.click(await screen.findByRole('radio', { name: 'मराठी' }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/translate', { target: 'MR', texts: ['Take rest. Avoid heavy lifting', 'X-ray', 'Twice daily', '5 days', 'After food'] }))
    const advice = (await screen.findByLabelText(/Advice in Marathi/)) as HTMLTextAreaElement
    expect(advice.value).toBe('विश्रांती घ्या जड वस्तू उचलू नका')
    expect((screen.getByLabelText('Frequency in Marathi') as HTMLInputElement).value).toBe('दिवसातून दोनदा')
    expect((screen.getByLabelText('Duration in Marathi') as HTMLInputElement).value).toBe('5 दिवस')
    expect((screen.getByLabelText('Instructions in Marathi') as HTMLInputElement).value).toBe('जेवणानंतर')
    await userEvent.clear(advice)
    await userEvent.type(advice, 'आराम करा')
    expect(advice.value).toBe('आराम करा')
  })

  it('sends the language and the local text when the draft is saved', async () => {
    apiMock.post.mockReturnValue(ok(translateAnswer()))
    apiMock.put.mockReturnValue(ok(consultation))
    setup()
    await userEvent.click(await screen.findByRole('radio', { name: 'मराठी' }))
    await screen.findByLabelText(/Advice in Marathi/)
    await userEvent.click(screen.getByRole('button', { name: /save draft/i }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalled())
    const [url, body] = apiMock.put.mock.calls[0]
    expect(url).toBe('/consultations/7')
    expect(body).toMatchObject({ language: 'MR', adviceLocal: 'विश्रांती घ्या जड वस्तू उचलू नका', testsAdvisedLocal: 'एक्स-रे' })
    expect(body.items[0]).toMatchObject({ medicineName: 'Dolo 650 Tablet', composition: 'Paracetamol 650 mg', frequencyLocal: 'दिवसातून दोनदा', durationLocal: '5 दिवस', instructionsLocal: 'जेवणानंतर' })
  })

  it('warns when some sentences could not be translated automatically', async () => {
    apiMock.post.mockReturnValue(ok(translateAnswer(false)))
    setup()
    await userEvent.click(await screen.findByRole('radio', { name: 'हिन्दी' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/not in the built-in medical phrase list/)
    expect(apiMock.post.mock.calls[0][1].target).toBe('HI')
  })

  it('does not send local text when English is selected', async () => {
    apiMock.put.mockReturnValue(ok(consultation))
    setup()
    await screen.findByRole('radio', { name: 'English' })
    await userEvent.click(screen.getByRole('button', { name: /save draft/i }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalled())
    const body = apiMock.put.mock.calls[0][1]
    expect(body.language).toBe('EN')
    expect(body.adviceLocal).toBeUndefined()
    expect(apiMock.post).not.toHaveBeenCalled()
  })
})

const rx: PrescriptionView = {
  id: 4, code: 'RX-000004', consultationId: 7, patientId: 1, patientName: 'Asha Demo', doctorName: 'Dr Demo', date: '2030-01-01T10:30:00', diagnoses: ['Lumbar strain'],
  patientCode: 'PAT-000001', patientPhone: '9000000002', doctorRegistrationNumber: 'REG-1', advice: 'Take rest', adviceLocal: 'विश्रांती घ्या', language: 'MR',
  items: [{ medicineName: 'Dolo 650 Tablet', composition: 'Paracetamol 650 mg', dosage: '1 tablet', frequency: 'Twice daily', frequencyLocal: 'दिवसातून दोनदा', duration: '5 days', durationLocal: '5 दिवस' }],
}

describe('Printed prescription and patient view', () => {
  beforeEach(() => { Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()) })

  it('prints Marathi with the English original underneath and keeps medicine name and composition in English', async () => {
    apiMock.get.mockImplementation(() => ok(rx))
    render(<Providers route="/print/prescription/4"><Routes><Route path="/print/prescription/:id" element={<PrescriptionPrint />} /></Routes></Providers>)
    expect(await screen.findByText('RX-000004')).toBeInTheDocument()
    const row = screen.getByText('Dolo 650 Tablet').closest('tr')!
    expect(within(row).getByText('Paracetamol 650 mg')).toBeInTheDocument()
    expect(within(row).getByText('दिवसातून दोनदा')).toHaveClass('font-indic')
    expect(within(row).getByText('Twice daily')).toBeInTheDocument()
    expect(screen.getByText('विश्रांती घ्या')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument()
  })

  it('shows plain English (no duplicate line) when the prescription is in English', async () => {
    apiMock.get.mockImplementation(() => ok({ ...rx, language: 'EN', adviceLocal: undefined, items: [{ medicineName: 'Dolo', frequency: 'Twice daily' }] }))
    render(<Providers route="/print/prescription/4"><Routes><Route path="/print/prescription/:id" element={<PrescriptionPrint />} /></Routes></Providers>)
    expect(await screen.findAllByText('Twice daily')).toHaveLength(1)
  })

  it('patient visit summary shows the doctor\'s advice in Marathi first', () => {
    render(<Providers><VisitDetails c={{ ...consultation, status: 'COMPLETED', language: 'MR', adviceLocal: 'विश्रांती घ्या',
      items: [{ medicineName: 'Dolo', frequency: 'Twice daily', frequencyLocal: 'दिवसातून दोनदा' }] }} /></Providers>)
    expect(screen.getByText('विश्रांती घ्या')).toHaveClass('font-indic')
    expect(screen.getByText('दिवसातून दोनदा')).toBeInTheDocument()
    expect(screen.getByText('Twice daily')).toBeInTheDocument()
  })
})
