import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { apiMock, ok, Providers } from './mocks'

const downloadFile = vi.fn(() => Promise.resolve())
vi.mock('../lib/api', () => ({ api: apiMock, TOKEN_KEY: 'munot_token', errMsg: (e: { message?: string }) => e?.message ?? 'error', downloadFile: (...a: unknown[]) => (downloadFile as (...x: unknown[]) => unknown)(...a), openFile: vi.fn(), fetchBlobUrl: vi.fn() }))
import { AuthProvider } from '../context/AuthContext'
import { MedicalDocuments } from '../pages/doctor/MedicalDocuments'
import { AlignmentSheet, PrintAlignment, PrintMedicalDocument, PrintSheet } from '../pages/PrintMedicalDocument'
import { renderToStaticMarkup } from 'react-dom/server'
import { DocumentBody } from '../components/MedicalDocumentSheet'
import { DOC_TYPES, docDef, validateDoc } from '../lib/medicalDocs'
import type { MedicalDocView } from '../lib/types'

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const patient = { id: 1, patientCode: 'PAT-000001', fullName: 'Asha Demo', phone: '9000000002', hasPortalAccount: false, createdAt: '2026-01-01T00:00:00' }
const doctor = (reg?: string) => ({ id: 1, fullName: 'Dr Demo Munot', qualification: 'MS Ortho', registrationNumber: reg, consultationFee: 0, slotMinutes: 15, maxPatientsPerSlot: 1, active: true, hasPhoto: false, photoVersion: 0 })
const doc = (over: Partial<MedicalDocView> = {}): MedicalDocView => ({ id: 7, code: 'MD-000007', docType: 'MEDICAL_CERTIFICATE', status: 'DRAFT', documentDate: '2030-01-05', patientId: 1, patientName: 'Asha Demo', patientCode: 'PAT-000001', doctorId: 1, doctorName: 'Dr Demo Munot', doctorQualification: 'MS Ortho', doctorRegistrationNumber: 'REG-1', content: { condition: 'Fracture left wrist' }, printCount: 0, createdAt: '2030-01-05T10:00:00', updatedAt: '2030-01-05T10:00:00', ...over })
const margins = { top: 55, bottom: 30, left: 20, right: 20 }
const reset = () => { localStorage.clear(); downloadFile.mockClear(); Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()) }

function page(opts: { reg?: string; docs?: MedicalDocView[] } = {}) {
  localStorage.setItem('munot_token', 't')
  apiMock.get.mockImplementation((url: string) => {
    if (url === '/auth/me') return ok({ id: 9, fullName: 'Dr Demo Munot', email: 'd@x.com', role: 'DOCTOR', doctorId: 1, enabled: true })
    if (url === '/medical-documents') return ok(opts.docs ?? [])
    if (url === '/medical-documents/print-settings') return ok(margins)
    if (url === '/staff/doctors') return ok([doctor('reg' in opts ? opts.reg : 'MMC-12345')])
    if (url === '/patients/search') return ok([patient])
    return ok({})
  })
  return render(<Providers><AuthProvider><MedicalDocuments /></AuthProvider></Providers>)
}
async function choosePatient() {
  await userEvent.type(await screen.findByLabelText('Search patient'), 'Asha')
  await userEvent.click(await screen.findByText('Asha Demo'))
}

describe('Field rules (same as the server)', () => {
  it('has the four document types with the requested fields', () => {
    expect(DOC_TYPES.map((t) => t.id)).toEqual(['MEDICAL_CERTIFICATE', 'PHYSIOTHERAPY_REFERRAL', 'IMPLANT_CERTIFICATE', 'ADMISSION_ADVICE'])
    expect(docDef('MEDICAL_CERTIFICATE').fields.map((f) => f.key)).toEqual(expect.arrayContaining(['condition', 'treatmentStart', 'treatmentEnd', 'restAdvised', 'fitToResumeDate']))
    expect(docDef('ADMISSION_ADVICE').fields.map((f) => f.key)).toEqual(expect.arrayContaining(['admissionDate', 'operationDate', 'plannedProcedure', 'anaesthesiaAssessment', 'nbmInstructions', 'nbmTime', 'otherInstructions']))
    expect(docDef('IMPLANT_CERTIFICATE').fields.map((f) => f.key)).toEqual(expect.arrayContaining(['implantType', 'implantLocation', 'implantDetails', 'surgeryDate']))
    expect(docDef('PHYSIOTHERAPY_REFERRAL').fields.map((f) => f.key)).toEqual(expect.arrayContaining(['startDate', 'duration', 'endDate', 'instructions']))
  })
  it('lets drafts be incomplete but needs required fields to issue; nothing is auto-filled', () => {
    const mc = docDef('MEDICAL_CERTIFICATE')
    expect(validateDoc(mc, {}, false)).toEqual({})
    expect(validateDoc(mc, {}, true).condition).toBeTruthy()
    expect(validateDoc(mc, { condition: 'x' }, true)).toEqual({})
    expect(validateDoc(docDef('ADMISSION_ADVICE'), { diagnosis: 'ACL' }, true).plannedProcedure).toBeTruthy()
  })
  it('checks date order and the implant "at least one" rule', () => {
    expect(validateDoc(docDef('MEDICAL_CERTIFICATE'), { treatmentStart: '2030-02-01', treatmentEnd: '2030-01-01' }, false).treatmentEnd).toBeTruthy()
    expect(validateDoc(docDef('PHYSIOTHERAPY_REFERRAL'), { startDate: '2030-02-01', endDate: '2030-01-01' }, false).endDate).toBeTruthy()
    expect(validateDoc(docDef('ADMISSION_ADVICE'), { admissionDate: '2030-02-01', operationDate: '2030-01-31' }, false).operationDate).toBeTruthy()
    expect(validateDoc(docDef('IMPLANT_CERTIFICATE'), { notes: 'only a note' }, true)._form).toBeTruthy()
    expect(validateDoc(docDef('IMPLANT_CERTIFICATE'), { implantType: 'Plate' }, true)).toEqual({})
  })
})

describe('Printed content (pre-printed letterhead)', () => {
  const d = { docType: 'MEDICAL_CERTIFICATE' as const, documentDate: '2030-01-05', patientName: 'Asha Demo', patientCode: 'PAT-000001', doctorName: 'Dr Demo Munot', doctorQualification: 'MS Ortho', doctorRegistrationNumber: 'REG-1', content: { condition: 'Fracture left wrist', restAdvised: '7 days' } }

  it('prints only the document: title, patient, entered fields and the doctor signature block', () => {
    render(<DocumentBody d={d} />)
    const body = screen.getByTestId('document-body')
    expect(body).toHaveTextContent('MEDICAL CERTIFICATE')
    expect(body).toHaveTextContent('Asha Demo (Patient ID: PAT-000001)')
    expect(body).toHaveTextContent('Medical condition / reason: Fracture left wrist')
    expect(body).toHaveTextContent('Rest advised: 7 days')
    expect(body).toHaveTextContent('Signature')
    expect(body).toHaveTextContent('Dr Demo Munot')
    expect(body).toHaveTextContent('Reg. No: REG-1')
  })
  it('does not print fields the doctor left empty (nothing invented)', () => {
    render(<DocumentBody d={d} />)
    expect(screen.getByTestId('document-body')).not.toHaveTextContent('Treatment start date')
    expect(screen.getByTestId('document-body')).not.toHaveTextContent('Remarks')
  })
  it('contains no clinic branding, billing text, images, backgrounds or coloured design', () => {
    const { container } = render(<DocumentBody d={d} />)
    const text = container.textContent ?? ''
    for (const banned of [/orthopaedic care/i, /hospital/i, /clinic/i, /phone|tel\b|e-?mail|@/i, /address/i, /invoice|bill|payment|rs\.|₹/i]) expect(text).not.toMatch(banned)
    expect(container.querySelector('img, svg, canvas')).toBeNull()
    const html = container.innerHTML
    expect(html).not.toMatch(/background/i)
    expect(html).not.toMatch(/box-shadow|border-radius|opacity/i)
  })
})

describe('Print page', () => {
  beforeEach(reset)
  const renderPrint = (status: 'DRAFT' | 'ISSUED') => {
    apiMock.get.mockImplementation((url: string) => ok(url.endsWith('/print-settings') ? { top: 62, bottom: 33, left: 18, right: 22 } : doc({ status })))
    apiMock.post.mockReturnValue(ok({}))
    return render(<Providers route="/print/medical-document/7"><Routes><Route path="/print/medical-document/:id" element={<PrintMedicalDocument />} /></Routes></Providers>)
  }

  it('reserves the letterhead area with repeating header/footer spacers sized from the settings (every page keeps the margins)', () => {
    const html = renderToStaticMarkup(<PrintSheet d={doc({ status: 'ISSUED' })} m={{ top: 62, bottom: 33, left: 18, right: 22 }} />)
    expect(html).toMatch(/<thead>.*data-testid="spacer-top"[^>]*height:62mm/)       // header spacer repeats on every printed page
    expect(html).toMatch(/<tfoot>.*data-testid="spacer-bottom"[^>]*height:33mm/)    // footer spacer repeats on every printed page
    expect(html).toContain('padding:0 22mm 0 18mm')
    expect(html).toContain('width:210mm')
    expect(html).not.toMatch(/background(-color)?:(?!#fff)/)                       // the sheet itself is plain white, no artwork
  })

  it('sets A4 portrait with zero browser margins (which also drops the browser header/footer) and hides the toolbar when printing', async () => {
    renderPrint('ISSUED')
    await screen.findByTestId('print-sheet')
    const css = Array.from(document.querySelectorAll('style[data-munot-page-style]')).map((s) => s.textContent).join(' ')
    expect(css).toMatch(/@page\s*{[^}]*size:\s*A4 portrait/)
    expect(css).toMatch(/@page\s*{[^}]*margin:\s*0/)
    expect(css).toMatch(/\.no-print\s*{\s*display:\s*none/)
    expect(screen.getByText(/Margins: None/).closest('.no-print')).not.toBeNull()
    expect(screen.getByRole('button', { name: /print/i }).closest('.no-print')).not.toBeNull()
  })

  it('print notes in the spacers are screen-only', async () => {
    renderPrint('ISSUED')
    await screen.findByTestId('print-sheet')
    expect(screen.getByText(/Letterhead area \(62 mm\)/).className).toContain('no-print')
  })

  it('prints an issued document and records the print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderPrint('ISSUED')
    await userEvent.click(await screen.findByRole('button', { name: /^print$/i }))
    expect(printSpy).toHaveBeenCalled()
    expect(apiMock.post).toHaveBeenCalledWith('/medical-documents/7/printed')
  })

  it('refuses to print a draft', async () => {
    renderPrint('DRAFT')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Issue the document before printing/)
    expect(screen.getByRole('button', { name: /^print$/i })).toBeDisabled()
  })

  it('alignment sheet draws the content box at the saved margins', async () => {
    const html = renderToStaticMarkup(<AlignmentSheet m={{ top: 62, bottom: 33, left: 18, right: 22 }} />)
    expect(html).toMatch(/data-testid="content-box"[^>]*left:18mm;right:22mm;top:62mm;bottom:33mm/)
    apiMock.get.mockImplementation(() => ok({ top: 62, bottom: 33, left: 18, right: 22 }))
    render(<Providers><PrintAlignment /></Providers>)
    expect(await screen.findByTestId('content-box')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print test sheet/i })).toBeInTheDocument()
  })
})

describe('Medical documents (doctor)', () => {
  beforeEach(reset)

  it('offers the four documents but only after a patient is selected', async () => {
    page()
    const card = await screen.findByRole('button', { name: /Medical certificate/ })
    expect(card).toBeDisabled()
    expect(screen.getByRole('button', { name: /Physiotherapy certificate/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Implant certificate/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Admission \/ operation advice/ })).toBeDisabled()
    await choosePatient()
    expect(screen.getByRole('button', { name: /Medical certificate/ })).toBeEnabled()
  })

  it('saves a draft with only what the doctor typed', async () => {
    apiMock.post.mockReturnValue(ok(doc()))
    page()
    await choosePatient()
    await userEvent.click(screen.getByRole('button', { name: /Medical certificate/ }))
    await userEvent.type(await screen.findByLabelText(/Medical condition \/ reason/), 'Fracture left wrist')
    await userEvent.click(screen.getByRole('button', { name: /save draft/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/medical-documents', { patientId: 1, docType: 'MEDICAL_CERTIFICATE', documentDate: todayISO(), content: { condition: 'Fracture left wrist' } }))
    expect(await screen.findByText('Draft')).toBeInTheDocument()
  })

  it('will not save when dates are out of order, and shows why', async () => {
    page()
    await choosePatient()
    await userEvent.click(screen.getByRole('button', { name: /Medical certificate/ }))
    fireEvent.change(await screen.findByLabelText('Treatment start date'), { target: { value: '2030-02-01' } })
    fireEvent.change(screen.getByLabelText('Treatment end date'), { target: { value: '2030-01-01' } })
    expect(await screen.findByText('Cannot be before the treatment start date')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /save draft/i }))
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  it('needs the required fields before issuing', async () => {
    page()
    await choosePatient()
    await userEvent.click(screen.getByRole('button', { name: /Medical certificate/ }))
    await userEvent.click(await screen.findByRole('button', { name: /^issue$/i }))
    expect(await screen.findByText('Required before issuing')).toBeInTheDocument()
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  it('issues after confirmation (saves first), then locks the form and offers Print, PDF and Revise', async () => {
    apiMock.post.mockImplementation((url: string) => ok(url.endsWith('/issue') ? doc({ status: 'ISSUED', issuedAt: '2030-01-05T10:05:00' }) : doc()))
    page()
    await choosePatient()
    await userEvent.click(screen.getByRole('button', { name: /Medical certificate/ }))
    await userEvent.type(await screen.findByLabelText(/Medical condition \/ reason/), 'Fracture left wrist')
    await userEvent.click(screen.getByRole('button', { name: /^issue$/i }))
    const dlg = await screen.findByRole('dialog')
    await userEvent.click(within(dlg).getByRole('button', { name: /^issue$/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/medical-documents/7/issue'))
    expect(apiMock.post.mock.calls[0][0]).toBe('/medical-documents')      // saved before issuing
    expect(await screen.findByRole('button', { name: /^print$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /revise/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Medical condition \/ reason/)).toBeDisabled()
    expect(screen.queryByRole('button', { name: /save draft/i })).toBeNull()
  })

  it('cannot issue without a registration number on the doctor profile, but drafts are allowed', async () => {
    page({ reg: '' })
    await choosePatient()
    await userEvent.click(screen.getByRole('button', { name: /Medical certificate/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/registration number is not set/i)
    expect(screen.getByRole('button', { name: /^issue$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /save draft/i })).toBeEnabled()
  })

  it('an issued document opens read-only; Print opens the letterhead print page; PDF problems are explained; Revise starts a new draft', async () => {
    const issued = doc({ status: 'ISSUED', issuedAt: '2030-01-05T10:05:00' })
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    downloadFile.mockRejectedValueOnce({ message: "This document contains Marathi/Hindi characters ... Use Print and choose 'Save as PDF' instead." })
    apiMock.post.mockReturnValue(ok(doc({ id: 8, code: 'MD-000008', revisionOfId: 7 })))
    page({ docs: [issued] })
    await userEvent.click(await screen.findByRole('button', { name: 'View MD-000007' }))
    expect(await screen.findByLabelText(/Medical condition \/ reason/)).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /^print$/i }))
    expect(open).toHaveBeenCalledWith('/print/medical-document/7', '_blank')
    await userEvent.click(screen.getByRole('button', { name: /download pdf/i }))
    expect(downloadFile).toHaveBeenCalledWith('/medical-documents/7/pdf', 'MD-000007.pdf')
    expect(await screen.findByText(/Save as PDF/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /revise/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/medical-documents/7/revise'))
    expect((await screen.findAllByText(/MD-000008/)).length).toBeGreaterThan(0)
    expect(await screen.findByText('Draft')).toBeInTheDocument()
  })

  it('history lists drafts (edit/delete) and issued documents (view/print) and filters by type', async () => {
    page({ docs: [doc(), doc({ id: 9, code: 'MD-000009', docType: 'ADMISSION_ADVICE', status: 'ISSUED', content: { diagnosis: 'a', plannedProcedure: 'b' } })] })
    expect(await screen.findByRole('button', { name: 'Edit MD-000007' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete MD-000007' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print MD-000009' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete MD-000009' })).toBeNull()      // issued documents are never deleted
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'ADMISSION_ADVICE')
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/medical-documents', { params: { patientId: undefined, type: 'ADMISSION_ADVICE', status: undefined } }))
  })

  it('saves the letterhead print area', async () => {
    apiMock.put.mockReturnValue(ok({ top: 70, bottom: 30, left: 20, right: 20 }))
    page()
    await userEvent.click(await screen.findByRole('button', { name: /letterhead print area/i }))
    const dlg = await screen.findByRole('dialog')
    const top = within(dlg).getByLabelText(/Top/)
    await userEvent.clear(top)
    await userEvent.type(top, '70')
    await userEvent.click(within(dlg).getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/medical-documents/print-settings', { top: 70, bottom: 30, left: 20, right: 20 }))
  })
})
