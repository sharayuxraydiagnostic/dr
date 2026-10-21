import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, CalendarPlus, Download, Eye, FileText, Pill, Printer, Receipt, Repeat, Stethoscope } from 'lucide-react'
import { api, downloadFile, errMsg, openFile } from '../../lib/api'
import { useLoad } from '../../lib/hooks'
import { useAuth } from '../../context/AuthContext'
import type { AppointmentView, BillView, ConsultationView, FollowUpView, NotificationView, PrescriptionView, ReportView } from '../../lib/types'
import { addDaysISO, fmtDate, fmtDateTime, fmtTime, labelize, money, todayISO } from '../../lib/utils'
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Field, Input, Modal, PageHeader, PageLoader, Select, Stat, StatusBadge, Textarea, useUI } from '../../components/ui'
import { SlotPicker, useDoctors } from '../../components/Booking'
import { VisitDetails } from '../../components/VisitDetails'
import { BillModal } from '../../components/BillModal'
import { LangText } from '../../components/LangText'
import { openPrescriptionPrint } from '../PrescriptionPrint'

/* ---------- Booking (also used by /book) ---------- */
export function PatientBooking() {
  const { data: doctors, loading } = useDoctors()
  const { toast } = useUI()
  const nav = useNavigate()
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [date, setDate] = useState(addDaysISO(todayISO(), 1))
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  if (loading) return <PageLoader />
  const docs = doctors ?? []
  const selected = doctorId || (docs.length === 1 ? docs[0].id : '')

  const submit = async () => {
    setBusy(true)
    try {
      await api.post('/appointments', { doctorId: selected, date, startTime: time, reason: reason || undefined })
      toast.success('Request sent. Your appointment is NOT confirmed until the hospital confirms it - we will notify you.')
      nav('/portal/appointments')
    } catch (e) { toast.error(errMsg(e)); setTime('') } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Book an appointment" subtitle="Pick a doctor, a date and an available time. The hospital will confirm your request and notify you." />
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doctor">
            <Select value={selected} onChange={(e) => { setDoctorId(Number(e.target.value)); setTime('') }}>
              <option value="">Select doctor</option>
              {docs.map((d) => <option key={d.id} value={d.id}>{d.fullName}{d.specialization ? ` - ${d.specialization}` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Date"><Input type="date" min={todayISO()} max={addDaysISO(todayISO(), 60)} value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} /></Field>
        </div>
        <div><p className="mb-2 text-sm font-medium text-slate-700">Available times</p><SlotPicker doctorId={selected} date={date} value={time} onChange={setTime} /></div>
        <Field label="Reason for visit (optional)"><Textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. knee pain for two weeks" /></Field>
        <Button disabled={!selected || !time} loading={busy} onClick={submit}><CalendarPlus className="h-4 w-4" /> Request appointment{time ? ` for ${fmtTime(time)}` : ''}</Button>
      </Card>
    </div>
  )
}

/* ---------- Reschedule modal ---------- */
function RescheduleModal({ appt, onClose, onDone }: { appt: AppointmentView; onClose: () => void; onDone: () => void }) {
  const { toast } = useUI()
  const [date, setDate] = useState(appt.date)
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open onClose={onClose} title="Reschedule appointment" footer={<><Button variant="outline" onClick={onClose}>Close</Button>
      <Button disabled={!time} loading={busy} onClick={async () => {
        setBusy(true)
        try { await api.put(`/appointments/${appt.id}/reschedule`, { date, startTime: time }); toast.success('Appointment rescheduled'); onDone() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
      }}>Reschedule</Button></>}>
      <p className="mb-4 text-sm text-slate-600">Currently {fmtDate(appt.date)} at {fmtTime(appt.startTime)} with {appt.doctorName}.</p>
      <Field label="New date" className="mb-4"><Input type="date" min={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} /></Field>
      <SlotPicker doctorId={appt.doctorId} date={date} value={time} onChange={setTime} />
    </Modal>
  )
}

/* ---------- Dashboard ---------- */
export function PatientHome() {
  const { user } = useAuth()
  const appts = useLoad<AppointmentView[]>(() => api.get('/appointments/my').then((r) => r.data))
  const fus = useLoad<FollowUpView[]>(() => api.get('/followups/my').then((r) => r.data))
  const bills = useLoad<BillView[]>(() => api.get('/bills/my').then((r) => r.data))
  const notes = useLoad<NotificationView[]>(() => api.get('/notifications/my').then((r) => r.data))
  const visits = useLoad<ConsultationView[]>(() => api.get('/visits/my').then((r) => r.data))
  if (appts.loading || fus.loading) return <PageLoader />
  const upcoming = (appts.data ?? []).filter((a) => ['BOOKED', 'CONFIRMED', 'WAITING', 'IN_CONSULTATION'].includes(a.status) && a.date >= todayISO()).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
  const nextFu = (fus.data ?? []).filter((f) => f.date >= todayISO() && f.status !== 'CANCELLED').sort((a, b) => a.date.localeCompare(b.date))[0]
  const pending = (bills.data ?? []).filter((b) => b.pending > 0).reduce((s, b) => s + b.pending, 0)
  return (
    <>
      <PageHeader title={`Hello, ${user?.fullName.split(' ')[0]}`} subtitle="Here is a summary of your care." action={<Link to="/portal/book"><Button><CalendarPlus className="h-4 w-4" /> Book appointment</Button></Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Upcoming visits" value={upcoming.length} icon={<CalendarClock />} />
        <Stat label="Next follow-up" value={nextFu ? fmtDate(nextFu.date) : 'None'} icon={<Repeat />} tone="sky" />
        <Stat label="Pending bills" value={money(pending)} icon={<Receipt />} tone="amber" />
        <Stat label="Unread alerts" value={(notes.data ?? []).filter((n) => !n.read).length} icon={<Bell />} tone="rose" />
      </div>
      {visits.data && visits.data[0] && <Card className="mt-6"><CardHeader title="Latest visit" subtitle={`${fmtDate(visits.data[0].startedAt)} - ${visits.data[0].doctorName}`} action={<Link className="text-sm font-medium text-brand-700" to="/portal/visits">All visits</Link>} />
        <div className="px-5 py-4"><VisitDetails c={visits.data[0]} compact /></div></Card>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Upcoming appointments" action={<Link className="text-sm font-medium text-brand-700" to="/portal/appointments">View all</Link>} />
          {upcoming.length === 0 ? <Empty title="No upcoming appointments" hint="Book a visit with your doctor." icon={<CalendarClock />} /> :
            <ul className="divide-y divide-slate-100">{upcoming.slice(0, 4).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-medium">{fmtDate(a.date)} at {fmtTime(a.startTime)}</p><p className="text-sm text-slate-500">{a.doctorName} {a.type === 'FOLLOW_UP' && '(follow-up)'}</p></div><StatusBadge status={a.status} /></li>))}</ul>}
        </Card>
        <Card><CardHeader title="Recent notifications" action={<Link className="text-sm font-medium text-brand-700" to="/portal/notifications">View all</Link>} />
          {(notes.data ?? []).length === 0 ? <Empty title="No notifications yet" icon={<Bell />} /> :
            <ul className="divide-y divide-slate-100">{(notes.data ?? []).slice(0, 4).map((n) => <li key={n.id} className="px-5 py-3"><p className="text-sm font-medium">{n.title}</p><p className="text-sm text-slate-500">{n.message}</p></li>)}</ul>}
        </Card>
      </div>
    </>
  )
}

/* ---------- Appointments ---------- */
export function PatientAppointments() {
  const { data, loading, error, reload } = useLoad<AppointmentView[]>(() => api.get('/appointments/my').then((r) => r.data))
  const fus = useLoad<FollowUpView[]>(() => api.get('/followups/my').then((r) => r.data))
  const { toast, confirm } = useUI()
  const [resched, setResched] = useState<AppointmentView | null>(null)
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  const cancel = async (a: AppointmentView) => {
    if (!(await confirm({ title: 'Cancel appointment?', message: `Cancel your visit on ${fmtDate(a.date)} at ${fmtTime(a.startTime)}?`, confirmLabel: 'Cancel appointment', danger: true }))) return
    try { await api.put(`/appointments/${a.id}/cancel`, { reason: 'Cancelled by patient' }); toast.success('Appointment cancelled'); reload() } catch (e) { toast.error(errMsg(e)) }
  }
  return (
    <>
      <PageHeader title="My appointments" action={<Link to="/portal/book"><Button><CalendarPlus className="h-4 w-4" /> Book new</Button></Link>} />
      {(fus.data ?? []).filter((f) => f.status !== 'CANCELLED' && f.date >= todayISO()).map((f) => (
        <div key={f.id} className="mb-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><Repeat className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-medium">Follow-up advised by {f.doctorName}: {fmtDate(f.date)}{f.time ? ` at ${fmtTime(f.time)}` : ''}</p>
            <p>{f.status === 'SCHEDULED' ? 'Your follow-up appointment is booked below.' : 'Please contact the hospital or book a slot to confirm a time.'}</p></div></div>))}
      {(data ?? []).some((a) => a.status === 'BOOKED') && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Appointments marked <b>Awaiting confirmation</b> are requests. They are confirmed only after the doctor or reception accepts them - you will get a notification.</div>}
      <Card>
        {(data ?? []).length === 0 ? <Empty title="No appointments yet" icon={<CalendarClock />} /> :
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Date &amp; time</th><th className="th">Doctor</th><th className="th">Type</th><th className="th">Token</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{data!.map((a) => (
              <tr key={a.id}><td className="td"><b>{fmtDate(a.date)}</b><br /><span className="text-slate-500">{fmtTime(a.startTime)} - {a.code}</span></td><td className="td">{a.doctorName}</td>
                <td className="td">{labelize(a.type)}</td><td className="td">{a.tokenNumber ?? '-'}</td><td className="td"><StatusBadge status={a.status} /></td>
                <td className="td text-right">{a.canModify && <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setResched(a)}>Reschedule</Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => cancel(a)}>Cancel</Button></div>}</td></tr>))}</tbody></table></div>}
      </Card>
      {resched && <RescheduleModal appt={resched} onClose={() => setResched(null)} onDone={() => { setResched(null); reload() }} />}
    </>
  )
}

/* ---------- Prescriptions ---------- */
export function PatientPrescriptions() {
  const { data, loading, error, reload } = useLoad<PrescriptionView[]>(() => api.get('/prescriptions/my').then((r) => r.data))
  const { toast } = useUI()
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  return (
    <>
      <PageHeader title="My prescriptions" />
      {(data ?? []).length === 0 ? <Card><Empty title="No prescriptions yet" hint="Prescriptions from your consultations appear here." icon={<Pill />} /></Card> :
        <div className="space-y-4">{data!.map((p) => (
          <Card key={p.id}><CardHeader title={`${p.code} - ${fmtDate(p.date)}`} subtitle={`${p.doctorName}${p.diagnoses.length ? ' - ' + p.diagnoses.join(', ') : ''}`}
            action={<Button size="sm" variant="outline" onClick={() => openPrescriptionPrint(p.id)}><Printer className="h-4 w-4" /> Print / Save PDF</Button>} />
            <div className="overflow-x-auto"><table className="min-w-full"><thead><tr><th className="th">Medicine</th><th className="th">Dosage</th><th className="th">Frequency</th><th className="th">Duration</th><th className="th">Instructions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{p.items.map((i, k) => <tr key={k}><td className="td"><span className="font-medium">{i.medicineName}</span>{i.composition && <span className="block text-xs text-slate-500">{i.composition}</span>}</td><td className="td">{i.dosage}</td><td className="td"><LangText en={i.frequency} local={i.frequencyLocal} /></td><td className="td"><LangText en={i.duration} local={i.durationLocal} /></td><td className="td"><LangText en={i.instructions} local={i.instructionsLocal} /></td></tr>)}</tbody></table></div>
            {(p.advice || p.adviceLocal) && <div className="border-t border-slate-100 px-5 py-3 text-sm"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Advice</p><LangText en={p.advice} local={p.adviceLocal} /></div>}
            {p.notes && <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">{p.notes}</p>}</Card>))}</div>}
    </>
  )
}

/* ---------- Reports ---------- */
export function PatientReports() {
  const { data, loading, error, reload } = useLoad<ReportView[]>(() => api.get('/documents/my').then((r) => r.data))
  const { toast } = useUI()
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  return (
    <>
      <PageHeader title="My reports" subtitle="X-rays, MRI, blood tests and other documents uploaded by the hospital." />
      <Card>{(data ?? []).length === 0 ? <Empty title="No reports yet" icon={<FileText />} /> :
        <ul className="divide-y divide-slate-100">{data!.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium">{r.title}</p><p className="text-sm text-slate-500">{labelize(r.reportType)} - {fmtDate(r.reportDate)}{r.notes ? ` - ${r.notes}` : ''}</p></div>
            {r.documentId && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openFile(`/documents/${r.documentId}/download`).catch((e) => toast.error(errMsg(e)))}><Eye className="h-4 w-4" /> View</Button>
              <Button size="sm" variant="outline" onClick={() => downloadFile(`/documents/${r.documentId}/download`, r.fileName ?? 'report').catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /></Button></div>}</li>))}</ul>}</Card>
    </>
  )
}

/* ---------- Bills ---------- */
export function PatientBills() {
  const { data, loading, error, reload } = useLoad<BillView[]>(() => api.get('/bills/my').then((r) => r.data))
  const { toast } = useUI()
  const [viewing, setViewing] = useState<BillView | null>(null)
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  return (
    <>
      <PageHeader title="My bills" />
      <Card>{(data ?? []).length === 0 ? <Empty title="No bills yet" icon={<Receipt />} /> :
        <div className="overflow-x-auto"><table className="min-w-full"><thead><tr><th className="th">Invoice</th><th className="th">Date</th><th className="th">Total</th><th className="th">Paid</th><th className="th">Pending</th><th className="th">Status</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-slate-100">{data!.map((b) => (
            <tr key={b.id}><td className="td font-medium">{b.billNumber}</td><td className="td">{fmtDate(b.createdAt)}</td><td className="td">{money(b.total)}</td><td className="td">{money(b.paid)}</td><td className="td">{money(b.pending)}</td><td className="td"><StatusBadge status={b.status} /></td>
              <td className="td"><div className="flex justify-end gap-1.5"><Button size="sm" onClick={() => setViewing(b)}><Eye className="h-4 w-4" /> View</Button><Button size="sm" variant="outline" aria-label={`Download invoice ${b.billNumber}`} onClick={() => downloadFile(`/bills/${b.id}/pdf`, `${b.billNumber}.pdf`).catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /> Download</Button></div></td></tr>))}</tbody></table></div>}</Card>
      <BillModal bill={viewing} onClose={() => setViewing(null)} />
    </>
  )
}

/* ---------- Notifications ---------- */
export function PatientNotifications() {
  const { data, loading, error, reload } = useLoad<NotificationView[]>(() => api.get('/notifications/my').then((r) => r.data))
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  return (
    <>
      <PageHeader title="Notifications" action={<Button variant="outline" size="sm" onClick={async () => { await api.put('/notifications/my/read-all'); reload() }}>Mark all read</Button>} />
      <Card>{(data ?? []).length === 0 ? <Empty title="No notifications" hint="Appointment confirmations, reminders and prescription alerts show up here." icon={<Bell />} /> :
        <ul className="divide-y divide-slate-100">{data!.map((n) => (
          <li key={n.id} className="flex items-start gap-3 px-5 py-4"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-slate-200' : 'bg-brand-500'}`} />
            <button className="flex-1 text-left" onClick={async () => { if (!n.read) { await api.put(`/notifications/${n.id}/read`); reload() } }}>
              <p className="text-sm font-medium">{n.title} <Badge tone="slate">{labelize(n.type)}</Badge></p><p className="text-sm text-slate-600">{n.message}</p><p className="mt-1 text-xs text-slate-400">{fmtDateTime(n.scheduledAt)}</p></button></li>))}</ul>}</Card>
    </>
  )
}

/* ---------- My visits (what the doctor recorded and advised) ---------- */
export function PatientVisits() {
  const { data, loading, error, reload } = useLoad<ConsultationView[]>(() => api.get('/visits/my').then((r) => r.data))
  const [open, setOpen] = useState<number | null>(null)
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  const list = data ?? []
  return (
    <>
      <PageHeader title="My visits" subtitle="Your consultation summaries: diagnosis, treatment plan, advice, medicines and follow-up" />
      {list.length === 0 ? <Card><Empty title="No completed visits yet" hint="After your consultation, the doctor's summary appears here." icon={<Stethoscope />} /></Card> :
        <div className="space-y-3">{list.map((c, i) => (
          <Card key={c.id}>
            <button type="button" aria-expanded={open === c.id || (open === null && i === 0)} onClick={() => setOpen(open === c.id ? -1 : c.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
              <span><span className="block font-semibold">{fmtDate(c.startedAt)} - {c.doctorName}</span><span className="block text-sm text-slate-500">{c.diagnoses.map((d) => d.name).join(', ') || 'Consultation'}</span></span>
              <span className="text-sm text-brand-700">{open === c.id || (open === null && i === 0) ? 'Hide' : 'View'}</span></button>
            {(open === c.id || (open === null && i === 0)) && <div className="border-t border-slate-100 px-5 py-4"><VisitDetails c={c} /></div>}
          </Card>))}</div>}
    </>
  )
}
