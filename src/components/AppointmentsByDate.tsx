import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, FileText, History } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import type { AppointmentView } from '../lib/types'
import { istToday, shiftISO } from '../lib/istDate'
import { fmtDate, fmtTime } from '../lib/utils'
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Field, Input, Spinner, StatusBadge } from './ui'

/* ---------- date helpers (clinic time: Asia/Kolkata; plain YYYY-MM-DD strings, no browser-timezone surprises) ---------- */

export type RangeKey = 'TODAY' | 'YESTERDAY' | 'LAST_7' | 'LAST_10' | 'LAST_15' | 'LAST_18' | 'THIS_WEEK' | 'LAST_WEEK' | 'CUSTOM'

export const RANGES: { id: RangeKey; label: string }[] = [
  { id: 'TODAY', label: 'Today' }, { id: 'YESTERDAY', label: 'Yesterday' }, { id: 'LAST_7', label: 'Last 7 days' }, { id: 'LAST_10', label: 'Last 10 days' },
  { id: 'LAST_15', label: 'Last 15 days' }, { id: 'LAST_18', label: 'Last 18 days' }, { id: 'THIS_WEEK', label: 'This week' }, { id: 'LAST_WEEK', label: 'Last week' }, { id: 'CUSTOM', label: 'Custom range' },
]

export { istToday, shiftISO }

const mondayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = Sunday
  return shiftISO(iso, -((dow + 6) % 7))
}

export const MAX_DAYS = 31 // one request per day (the existing API takes a single date), so custom ranges are capped

/** Inclusive [from, to]. "Last N days" INCLUDES today (e.g. Last 7 days = today and the 6 days before). Weeks run Monday to Sunday. */
export function rangeFor(key: RangeKey, today: string, customFrom = '', customTo = ''): { from: string; to: string } {
  switch (key) {
    case 'TODAY': return { from: today, to: today }
    case 'YESTERDAY': { const y = shiftISO(today, -1); return { from: y, to: y } }
    case 'LAST_7': return { from: shiftISO(today, -6), to: today }
    case 'LAST_10': return { from: shiftISO(today, -9), to: today }
    case 'LAST_15': return { from: shiftISO(today, -14), to: today }
    case 'LAST_18': return { from: shiftISO(today, -17), to: today }
    case 'THIS_WEEK': { const m = mondayOf(today); return { from: m, to: shiftISO(m, 6) } }
    case 'LAST_WEEK': { const m = shiftISO(mondayOf(today), -7); return { from: m, to: shiftISO(m, 6) } }
    default: return { from: customFrom, to: customTo }
  }
}

export function daysIn(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to && out.length <= MAX_DAYS; d = shiftISO(d, 1)) out.push(d)
  return out
}

/** The appointment record only carries the appointment status and a consultation id, so the consultation state is derived from those. */
export function consultationState(a: AppointmentView): { label: string; tone: string } {
  if (!a.consultationId) return { label: 'Not started', tone: 'slate' }
  return a.status === 'COMPLETED' ? { label: 'Completed', tone: 'green' } : { label: 'In progress', tone: 'blue' }
}

/** Doctor's appointments for a date range. The server already limits /appointments to the signed-in doctor. */
export function AppointmentsByDate() {
  const [key, setKey] = useState<RangeKey>('TODAY')
  const [cFrom, setCFrom] = useState('')
  const [cTo, setCTo] = useState('')
  const [rows, setRows] = useState<AppointmentView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const today = istToday()
  const { from, to } = rangeFor(key, today, cFrom, cTo)
  const invalid = key === 'CUSTOM' && (!from || !to ? 'Choose both a From date and a To date.' : from > to ? 'From date must not be after To date.' : daysIn(from, to).length > MAX_DAYS ? `Please choose at most ${MAX_DAYS} days at a time.` : '')
  const days = useMemo(() => (invalid ? [] : daysIn(from, to)), [from, to, invalid])

  useEffect(() => {
    if (invalid || days.length === 0) { setRows([]); setLoading(false); setError(null); return }
    let stale = false
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const all: AppointmentView[] = []
        for (let i = 0; i < days.length; i += 8) { // a few days at a time, politely
          const chunk = await Promise.all(days.slice(i, i + 8).map((d) => api.get<AppointmentView[]>('/appointments', { params: { date: d } }).then((r) => r.data)))
          chunk.forEach((c) => all.push(...c))
        }
        all.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
        if (!stale) setRows(all)
      } catch (e) { if (!stale) setError(errMsg(e)) } finally { if (!stale) setLoading(false) }
    })()
    return () => { stale = true } // a newer filter choice wins over a slower older one
  }, [days, invalid, tick])

  return (
    <Card className="mt-6">
      <CardHeader title="Patients by date" subtitle={invalid || days.length === 0 ? 'Choose a period' : from === to ? fmtDate(from) : `${fmtDate(from)} - ${fmtDate(to)}`} />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date filter">
          {RANGES.map((r) => <Button key={r.id} size="sm" variant={key === r.id ? 'primary' : 'outline'} aria-pressed={key === r.id} onClick={() => setKey(r.id)}>{r.label}</Button>)}
        </div>
        <p className="text-xs text-slate-500">&quot;Last N days&quot; includes today. Weeks run Monday to Sunday. Dates follow Indian time (Asia/Kolkata).</p>
        {key === 'CUSTOM' && (
          <div className="grid max-w-md grid-cols-2 gap-3">
            <Field label="From date"><Input type="date" value={cFrom} max={cTo || undefined} onChange={(e) => setCFrom(e.target.value)} /></Field>
            <Field label="To date"><Input type="date" value={cTo} min={cFrom || undefined} onChange={(e) => setCTo(e.target.value)} /></Field>
          </div>)}
        {invalid && <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{invalid}</p>}

        {!invalid && (loading ? <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Loading appointments...</div>
          : error ? <ErrorBox message={error} onRetry={() => setTick((t) => t + 1)} />
          : rows.length === 0 ? <Empty title="No appointments in this period" icon={<CalendarRange />} />
          : (
            <>
              <p className="text-sm text-slate-600"><b>{rows.length}</b> appointment{rows.length === 1 ? '' : 's'}, <b>{rows.filter((r) => r.status === 'COMPLETED').length}</b> completed</p>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead><tr><th className="th">Patient</th><th className="th">Patient ID</th><th className="th">Date</th><th className="th">Time</th><th className="th">Appointment</th><th className="th">Consultation</th><th className="th" /></tr></thead>
                  <tbody className="divide-y divide-slate-100">{rows.map((a) => {
                    const cs = consultationState(a)
                    return (
                      <tr key={a.id}>
                        <td className="td font-medium">{a.patientName}</td><td className="td">{a.patientCode}</td><td className="td">{fmtDate(a.date)}</td><td className="td">{fmtTime(a.startTime)}</td>
                        <td className="td"><StatusBadge status={a.status} /></td><td className="td"><Badge tone={cs.tone}>{cs.label}</Badge></td>
                        <td className="td"><div className="flex justify-end gap-2">
                          <Link to={`/doctor/patients/${a.patientId}`}><Button size="sm" variant="outline" aria-label={`History of ${a.patientName}`}><History className="h-4 w-4" /> History</Button></Link>
                          {a.consultationId && <Link to={`/doctor/consultation/${a.consultationId}`}><Button size="sm" variant="outline" aria-label={`Consultation of ${a.patientName}`}><FileText className="h-4 w-4" /> Consultation</Button></Link>}
                        </div></td>
                      </tr>)
                  })}</tbody>
                </table>
              </div>
            </>))}
      </div>
    </Card>
  )
}
