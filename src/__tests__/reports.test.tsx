import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, errMsg: () => 'error', downloadFile: vi.fn(), openFile: vi.fn(), fetchBlobUrl: vi.fn() }))
import { Reports, rowLabel } from '../pages/Reports'
import { toCsv } from '../lib/csv'

// recharts needs element sizes that jsdom does not have
vi.mock('recharts', async () => {
  const React = await import('react')
  const Pass = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children)
  return { ResponsiveContainer: Pass, BarChart: Pass, LineChart: Pass, Bar: Pass, Line: Pass, XAxis: Pass, YAxis: Pass, CartesianGrid: Pass, Tooltip: Pass, Legend: Pass }
})

const row = (start: string, end: string, n: number) => ({ start, end, appointments: n, completed: n - 1, cancelled: 1, noShow: 0, walkIns: 1, online: n - 2, followUps: 1, newPatients: 2, billed: n * 100, collected: n * 90 })
const report = (period: string) => ({
  period, from: '2026-10-01', to: '2026-10-02', outstandingNow: 1250,
  rows: [row('2026-10-01', '2026-10-01', 5), row('2026-10-02', '2026-10-02', 3)],
  totals: { ...row('2026-10-01', '2026-10-02', 8), appointments: 8, completed: 6, cancelled: 2, newPatients: 4, billed: 800, collected: 720 },
})
const reset = () => Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset())

describe('Reports (day / week / month)', () => {
  beforeEach(() => { reset(); apiMock.get.mockImplementation((_u: string, cfg: { params: { period: string } }) => ok(report(cfg.params.period))) })

  it('loads day-wise by default and shows totals and one row per day', async () => {
    render(<Providers><Reports /></Providers>)
    expect(await screen.findByText('Detailed table')).toBeInTheDocument()
    expect(apiMock.get).toHaveBeenCalledWith('/reports', { params: { period: 'DAY', from: undefined, to: undefined } })
    expect(screen.getByText('01 Oct 2026')).toBeInTheDocument()
    expect(screen.getByText('02 Oct 2026')).toBeInTheDocument()
    expect(screen.getByText('Total').closest('tr')).toHaveTextContent('8')
    expect(screen.getByText(/1,250/)).toBeInTheDocument()   // outstanding now
  })

  it('switches to week-wise and month-wise and asks the server for that period', async () => {
    render(<Providers><Reports /></Providers>)
    await screen.findByText('Detailed table')
    await userEvent.click(screen.getByRole('radio', { name: 'Week-wise' }))
    await waitFor(() => expect(apiMock.get).toHaveBeenLastCalledWith('/reports', { params: { period: 'WEEK', from: undefined, to: undefined } }))
    await userEvent.click(screen.getByRole('radio', { name: 'Month-wise' }))
    await waitFor(() => expect(apiMock.get).toHaveBeenLastCalledWith('/reports', { params: { period: 'MONTH', from: undefined, to: undefined } }))
  })

  it('sends the chosen date range and refuses a range that ends before it starts', async () => {
    render(<Providers><Reports /></Providers>)
    await screen.findByText('Detailed table')
    const [from, to] = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[]
    fireEvent.change(from, { target: { value: '2026-09-01' } })
    fireEvent.change(to, { target: { value: '2026-09-30' } })
    await waitFor(() => expect(apiMock.get).toHaveBeenLastCalledWith('/reports', { params: { period: 'DAY', from: '2026-09-01', to: '2026-09-30' } }))
    const calls = apiMock.get.mock.calls.length
    fireEvent.change(to, { target: { value: '2026-08-01' } })
    expect(await screen.findByText("'To' cannot be before 'From'")).toBeInTheDocument()
    expect(apiMock.get.mock.calls.length).toBe(calls)   // no request for an invalid range
  })

  it('formats period labels', () => {
    expect(rowLabel('DAY', { start: '2026-10-05', end: '2026-10-05' })).toBe('05 Oct 2026')
    expect(rowLabel('WEEK', { start: '2026-10-05', end: '2026-10-11' })).toBe('05 Oct 2026 - 11 Oct 2026')
    expect(rowLabel('MONTH', { start: '2026-10-01', end: '2026-10-31' })).toMatch(/October 2026/)
  })
})

describe('CSV export', () => {
  it('starts with a UTF-8 BOM, quotes commas and quotes, and uses Windows line breaks', () => {
    const csv = toCsv(['Period', 'Note'], [['05 Oct 2026 - 11 Oct 2026', 'He said "ok", twice'], ['TOTAL', 8]])
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
    expect(csv).toContain('Period,Note\r\n')
    expect(csv).toContain('"He said ""ok"", twice"')
    expect(csv.endsWith('TOTAL,8')).toBe(true)
  })
})
