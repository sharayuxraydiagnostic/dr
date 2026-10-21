import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, errMsg: () => 'error' }))
import { MedicineInput } from '../components/MedicineInput'
import type { PrescriptionItemDto } from '../lib/types'

const saved = [{ id: 1, name: 'Dolo 650 Tablet', composition: 'Paracetamol 650 mg', useCount: 4 }]

function Harness({ start }: { start?: PrescriptionItemDto }) {
  const [item, setItem] = useState<PrescriptionItemDto>(start ?? { medicineName: '' })
  return (<Providers><MedicineInput value={item.medicineName} onChange={(n) => setItem({ ...item, medicineName: n })} onPick={(p) => setItem({ ...item, ...p })} />
    <output data-testid="item">{JSON.stringify(item)}</output></Providers>)
}

describe('Medicine auto-suggest (name + composition only)', () => {
  beforeEach(() => { apiMock.get.mockReset(); apiMock.get.mockImplementation(() => ok(saved)) })

  it('suggests saved medicines with their composition while typing', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByRole('combobox'), 'dol')
    expect(await screen.findByText('Dolo 650 Tablet')).toBeInTheDocument()
    expect(screen.getByText('Paracetamol 650 mg')).toBeInTheDocument()
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/medicines/search', { params: { q: 'dol' } }))
  })

  it('fills the medicine name and composition on pick', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByRole('combobox'), 'dol')
    await userEvent.click(await screen.findByText('Dolo 650 Tablet'))
    const item = JSON.parse(screen.getByTestId('item').textContent!)
    expect(item).toMatchObject({ medicineName: 'Dolo 650 Tablet', composition: 'Paracetamol 650 mg' })
  })

  it('never auto-fills dosage, frequency, duration or instructions', async () => {
    render(<Harness start={{ medicineName: '', dosage: '2 tablets', frequency: 'Once daily' }} />)
    await userEvent.type(screen.getByRole('combobox'), 'dol')
    await userEvent.click(await screen.findByText('Dolo 650 Tablet'))
    const item = JSON.parse(screen.getByTestId('item').textContent!)
    expect(item.dosage).toBe('2 tablets')          // doctor's manual entry is untouched
    expect(item.frequency).toBe('Once daily')
    expect(item.duration).toBeUndefined()
    expect(item.instructions).toBeUndefined()
  })
})
