import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiMock, ok, Providers } from './mocks'

const downloadFile = vi.fn(() => Promise.resolve())
const openFile = vi.fn(() => Promise.resolve())
vi.mock('../lib/api', () => ({ api: apiMock, errMsg: () => 'error', downloadFile: (...a: unknown[]) => (downloadFile as (...x: unknown[]) => unknown)(...a), openFile: (...a: unknown[]) => (openFile as (...x: unknown[]) => unknown)(...a), fetchBlobUrl: vi.fn() }))
import { PatientBills } from '../pages/portal/PatientPages'
import { ReceptionBilling } from '../pages/reception/ReceptionPages'
import type { BillView } from '../lib/types'

const bill: BillView = {
  id: 12, billNumber: 'INV-000012', patientId: 1, patientName: 'Asha Demo', patientCode: 'PAT-000001', createdAt: '2030-01-02T11:00:00',
  items: [{ id: 1, category: 'CONSULTATION', description: 'Orthopaedic consultation', quantity: 1, unitPrice: 500, amount: 500 }, { id: 2, category: 'DIAGNOSTIC', description: 'X-ray knee', quantity: 1, unitPrice: 300, amount: 300 }],
  subtotal: 800, discount: 50, taxPercent: 0, tax: 0, total: 750, paid: 500, pending: 250, status: 'PARTIAL', notes: 'Demo',
  payments: [{ id: 1, amount: 500, method: 'CASH', paidAt: '2030-01-02T11:05:00' }],
}
const reset = () => { Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()); downloadFile.mockClear(); openFile.mockClear() }

describe('Viewing a bill (not only downloading)', () => {
  beforeEach(() => { reset(); apiMock.get.mockImplementation(() => ok([bill])) })

  it('patient: View shows the itemised bill on screen without downloading anything', async () => {
    render(<Providers><PatientBills /></Providers>)
    await userEvent.click(await screen.findByRole('button', { name: 'View' }))
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getByText('Bill INV-000012')).toBeInTheDocument()
    expect(within(dlg).getByText('Orthopaedic consultation')).toBeInTheDocument()
    expect(within(dlg).getByText('X-ray knee')).toBeInTheDocument()
    expect(within(dlg).getByText('Partial')).toBeInTheDocument()
    expect(within(dlg).getByText(/Pending/)).toBeInTheDocument()
    expect(within(dlg).getByText(/250\.00/)).toBeInTheDocument()
    expect(downloadFile).not.toHaveBeenCalled()
    expect(openFile).not.toHaveBeenCalled()
  })

  it('patient: the Download button still downloads the invoice PDF directly', async () => {
    render(<Providers><PatientBills /></Providers>)
    await userEvent.click(await screen.findByRole('button', { name: /download invoice INV-000012/i }))
    expect(downloadFile).toHaveBeenCalledWith('/bills/12/pdf', 'INV-000012.pdf')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('inside the bill view the user can open the PDF in a new tab or download it', async () => {
    render(<Providers><PatientBills /></Providers>)
    await userEvent.click(await screen.findByRole('button', { name: 'View' }))
    const dlg = await screen.findByRole('dialog')
    await userEvent.click(within(dlg).getByRole('button', { name: /open pdf/i }))
    expect(openFile).toHaveBeenCalledWith('/bills/12/pdf')
    await userEvent.click(within(dlg).getByRole('button', { name: /download pdf/i }))
    expect(downloadFile).toHaveBeenCalledWith('/bills/12/pdf', 'INV-000012.pdf')
  })

  it('reception/doctor billing list also has View next to Download', async () => {
    render(<Providers><ReceptionBilling /></Providers>)
    await userEvent.click(await screen.findByRole('button', { name: /view bill INV-000012/i }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Asha Demo')
    expect(downloadFile).not.toHaveBeenCalled()
  })
})
