import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarCheck, Download, IndianRupee, Printer, UserPlus, Wallet, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import { useLoad } from '../lib/hooks'
import { downloadCsv, toCsv } from '../lib/csv'
import type { ReportPeriod, ReportRow } from '../lib/types'
import { addDaysISO, cn, fmtDate, money, todayISO } from '../lib/utils'
import { Button, Card, CardHeader, Empty, ErrorBox, Field, Input, PageHeader, PageLoader, Stat } from '../components/ui'

const PERIODS: { id: ReportPeriod; label: string }[] = [{ id: 'DAY', label: 'Day-wise' }, { id: 'WEEK', label: 'Week-wise' }, { id: 'MONTH', label: 'Month-wise' }]

export function rowLabel(period: ReportPeriod, r: Pick<ReportRow, 'start' | 'end'>) {
  if (period === 'DAY') return fmtDate(r.start)
  if (period === 'MONTH') return new Date(r.start + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  return `${fmtDate(r.start)} - ${fmtDate(r.end)}`
}

/** Hospital reports by day, week or month. Same page and same data for Admin and Doctor. */
export function Reports() {
  const [period, setPeriod] = useState<ReportPeriod>('DAY')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const rangeInvalid = !!from && !!to && to < from
  const { data, loading, error, reload } = useLoad(() => api.get('/reports', { params: { period, from: from || undefined, to: to || undefined } }).then((r) => r.data as import('../lib/types').ReportResponse),
    [period, from, to], { skip: rangeInvalid })

  const chart = useMemo(() => (data?.rows ?? []).map((r) => ({ name: period === 'MONTH' ? r.start.slice(0, 7) : r.start.slice(5), appointments: r.appointments, completed: r.completed, collected: r.collected })), [data, period])
  const preset = (days: number) => { setTo(todayISO()); setFrom(addDaysISO(todayISO(), -days)) }

  const exportCsv = () => {
    if (!data) return
    const head = ['Period', 'From', 'To', 'Appointments', 'Completed', 'Cancelled', 'No-show', 'Walk-in', 'Online', 'Follow-up', 'New patients', 'Billed (Rs.)', 'Collected (Rs.)']
    const lines = [...data.rows, { ...data.totals }].map((r, i) => [i === data.rows.length ? 'TOTAL' : rowLabel(period, r), r.start, r.end, r.appointments, r.completed, r.cancelled, r.noShow, r.walkIns, r.online, r.followUps, r.newPatients, r.billed, r.collected])
    downloadCsv(`report-${period.toLowerCase()}-${data.from}-to-${data.to}.csv`, toCsv(head, lines))
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Appointments, outcomes, new patients, billing and collections - by day, week or month"
        action={<div className="no-print flex gap-2"><Button variant="outline" disabled={!data} onClick={exportCsv}><Download className="h-4 w-4" /> Download CSV</Button><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button></div>} />

      <Card className="no-print mb-6 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div role="radiogroup" aria-label="Report period" className="flex overflow-hidden rounded-lg border border-slate-200">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={period === p.id} onClick={() => setPeriod(p.id)}
                className={cn('px-4 py-2 text-sm font-medium transition', period === p.id ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>{p.label}</button>))}
          </div>
          <Field label="From"><Input type="date" max={todayISO()} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To" error={rangeInvalid ? "'To' cannot be before 'From'" : undefined}><Input type="date" max={todayISO()} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <div className="flex gap-2 pb-0.5">
            <Button size="sm" variant="outline" onClick={() => preset(6)}>Last 7 days</Button><Button size="sm" variant="outline" onClick={() => preset(29)}>Last 30 days</Button><Button size="sm" variant="outline" onClick={() => preset(89)}>Last 90 days</Button>
            {(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo('') }}>Reset</Button>}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Leave the dates empty for the default: last 30 days, 12 weeks or 12 months.</p>
      </Card>

      {loading ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data ? null : (
        <>
          <p className="mb-3 text-sm text-slate-600">{rowLabel('DAY', { start: data.from, end: data.from })} to {rowLabel('DAY', { start: data.to, end: data.to })}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Appointments" value={data.totals.appointments} icon={<CalendarCheck />} />
            <Stat label="Completed" value={data.totals.completed} icon={<CalendarCheck />} tone="sky" />
            <Stat label="Cancelled / no-show" value={data.totals.cancelled + data.totals.noShow} icon={<XCircle />} tone="rose" />
            <Stat label="New patients" value={data.totals.newPatients} icon={<UserPlus />} />
            <Stat label="Collected" value={money(data.totals.collected)} icon={<IndianRupee />} tone="amber" />
            <Stat label="Outstanding now" value={money(data.outstandingNow)} icon={<Wallet />} tone="rose" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card><CardHeader title="Appointments" /><div className="h-64 p-4"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend /><Bar dataKey="appointments" name="Booked" fill="#148a8d" radius={[4, 4, 0, 0]} /><Bar dataKey="completed" name="Completed" fill="#0ea5e9" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
            <Card><CardHeader title="Collections (Rs.)" /><div className="h-64 p-4"><ResponsiveContainer><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v) => money(Number(v))} /><Line type="monotone" dataKey="collected" name="Collected" stroke="#f59e0b" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Card>
          </div>

          <Card className="mt-6">
            <CardHeader title="Detailed table" subtitle={`${data.rows.length} ${period === 'DAY' ? 'days' : period === 'WEEK' ? 'weeks' : 'months'}`} />
            {data.rows.length === 0 ? <Empty title="No data in this range" /> : (
              <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100">
                <thead><tr>{['Period', 'Appts', 'Completed', 'Cancelled', 'No-show', 'Walk-in', 'Online', 'Follow-up', 'New patients', 'Billed', 'Collected'].map((h, i) => <th key={h} className={cn('th', i > 0 && 'text-right')}>{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((r) => (
                    <tr key={r.start}><td className="td whitespace-nowrap font-medium">{rowLabel(period, r)}</td><td className="td text-right">{r.appointments}</td><td className="td text-right">{r.completed}</td><td className="td text-right">{r.cancelled}</td><td className="td text-right">{r.noShow}</td><td className="td text-right">{r.walkIns}</td><td className="td text-right">{r.online}</td><td className="td text-right">{r.followUps}</td><td className="td text-right">{r.newPatients}</td><td className="td text-right">{money(r.billed)}</td><td className="td text-right">{money(r.collected)}</td></tr>))}
                  <tr className="bg-slate-50 font-semibold"><td className="td">Total</td><td className="td text-right">{data.totals.appointments}</td><td className="td text-right">{data.totals.completed}</td><td className="td text-right">{data.totals.cancelled}</td><td className="td text-right">{data.totals.noShow}</td><td className="td text-right">{data.totals.walkIns}</td><td className="td text-right">{data.totals.online}</td><td className="td text-right">{data.totals.followUps}</td><td className="td text-right">{data.totals.newPatients}</td><td className="td text-right">{money(data.totals.billed)}</td><td className="td text-right">{money(data.totals.collected)}</td></tr>
                </tbody></table></div>)}
          </Card>
        </>)}
    </>
  )
}
