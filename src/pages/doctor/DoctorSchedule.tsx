import { useState } from 'react'
import { CalendarOff, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../lib/api'
import { useLoad } from '../../lib/hooks'
import type { AvailabilityDto } from '../../lib/types'
import { fmtDate, fmtTime, labelize, todayISO } from '../../lib/utils'
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Field, Input, PageHeader, PageLoader, useUI } from '../../components/ui'

interface BlockView { id: number; date: string; startTime?: string | null; endTime?: string | null; reason?: string; wholeDay: boolean; affectedAppointments: number }

/** Doctor blocks any date or time range at any moment. Blocked times vanish from patient and reception booking. */
export function DoctorSchedule() {
  const blocks = useLoad<BlockView[]>(() => api.get('/doctor/blocks').then((r) => r.data))
  const hours = useLoad<AvailabilityDto[]>(() => api.get('/doctor/availability').then((r) => r.data))
  const { toast, confirm } = useUI()
  const [date, setDate] = useState(todayISO())
  const [whole, setWhole] = useState(true)
  const [from, setFrom] = useState('13:00')
  const [to, setTo] = useState('14:00')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const invalid = !date || date < todayISO() || (!whole && (!from || !to || to <= from))

  const add = async () => {
    setBusy(true)
    try {
      const { data } = await api.post<BlockView>('/doctor/blocks', { date, startTime: whole ? undefined : from, endTime: whole ? undefined : to, reason: reason || undefined })
      if (data.affectedAppointments > 0) toast.info(`Blocked. ${data.affectedAppointments} existing appointment(s) fall in this time - decline or reschedule them from Today's clinic.`)
      else toast.success('Blocked. Patients can no longer book this time.')
      setReason(''); blocks.reload()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="Block slots" subtitle="Block a full day or a time range whenever you need. It takes effect immediately for patients and reception." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h3 className="font-semibold">Add a block</h3>
          <Field label="Date" error={date && date < todayISO() ? 'Choose today or a future date' : undefined}><Input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="flex gap-2" role="radiogroup" aria-label="Block type">
            {([[true, 'Whole day'], [false, 'Time range']] as const).map(([v, l]) => (
              <button key={l} type="button" role="radio" aria-checked={whole === v} onClick={() => setWhole(v)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${whole === v ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white hover:border-brand-400'}`}>{l}</button>))}
          </div>
          {!whole && <div className="grid grid-cols-2 gap-3"><Field label="From"><Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To" error={to <= from ? 'End must be after start' : undefined}><Input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>}
          <Field label="Reason (optional, private)"><Input maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Surgery, conference, personal" /></Field>
          <Button disabled={invalid} loading={busy} onClick={add}><CalendarOff className="h-4 w-4" /> Block {whole ? 'whole day' : 'this time'}</Button>
        </Card>
        <Card><CardHeader title="Upcoming blocks" />
          {blocks.loading ? <PageLoader /> : blocks.error ? <div className="p-4"><ErrorBox message={blocks.error} onRetry={blocks.reload} /></div> : (blocks.data ?? []).length === 0 ? <Empty title="Nothing blocked" icon={<CalendarOff />} /> :
            <ul className="divide-y divide-slate-100">{blocks.data!.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div><p className="font-medium">{fmtDate(b.date)} - {b.wholeDay ? 'Whole day' : `${fmtTime(b.startTime)} to ${fmtTime(b.endTime)}`}</p>
                  <p className="text-sm text-slate-500">{b.reason || 'No reason given'} {b.affectedAppointments > 0 && <Badge tone="red">{b.affectedAppointments} appointment(s) affected</Badge>}</p></div>
                <Button size="sm" variant="ghost" className="text-red-600" aria-label="Remove block" onClick={async () => { if (await confirm({ title: 'Unblock this time?', message: 'Patients will be able to book it again.', confirmLabel: 'Unblock' })) { try { await api.delete(`/doctor/blocks/${b.id}`); blocks.reload() } catch (e) { toast.error(errMsg(e)) } } }}><Trash2 className="h-4 w-4" /></Button></li>))}</ul>}
        </Card>
      </div>
      <Card className="mt-6"><CardHeader title="Your weekly hours" subtitle="Set by the admin. Ask the admin to change them." />
        {hours.loading ? <PageLoader /> : (hours.data ?? []).length === 0 ? <Empty title="No weekly hours set yet" /> :
          <ul className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">{hours.data!.filter((h) => h.active).map((h) => (
            <li key={h.dayOfWeek} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><b>{labelize(h.dayOfWeek)}</b>: {fmtTime(h.startTime)} - {fmtTime(h.endTime)}{h.breakStart ? ` (break ${fmtTime(h.breakStart)}-${fmtTime(h.breakEnd)})` : ''}</li>))}</ul>}
      </Card>
    </>
  )
}
