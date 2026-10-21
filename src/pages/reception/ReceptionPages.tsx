import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarPlus, ClipboardCheck, Download, Eye, FilePlus2, Pencil, Plus, Receipt, Trash2, Upload, UserPlus, Users } from 'lucide-react'
import { api, downloadFile, errMsg } from '../../lib/api'
import { useLoad } from '../../lib/hooks'
import type { AppointmentView, BillCategory, BillView, DoctorView, PatientView, PaymentMethod, QueueView, ReportView, ReportType } from '../../lib/types'
import { addDaysISO, fmtDate, fmtDateTime, fmtTime, labelize, money, todayISO } from '../../lib/utils'
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Field, Input, Modal, PageHeader, PageLoader, Select, Stat, StatusBadge, Textarea, useUI } from '../../components/ui'
import { PatientForm, PatientPicker } from '../../components/PatientParts'
import { PendingRequests } from '../../components/PendingRequests'
import { BillModal } from '../../components/BillModal'
import { SlotPicker, useDoctors } from '../../components/Booking'

/* ---------- Today's appointments ---------- */
export function ReceptionHome() {
  const [date, setDate] = useState(todayISO())
  const [doctorId, setDoctorId] = useState('')
  const docs = useDoctors('/staff/doctors')
  const { data, loading, error, reload } = useLoad<AppointmentView[]>(() => api.get('/appointments', { params: { date, doctorId: doctorId || undefined } }).then((r) => r.data), [date, doctorId], { pollMs: 30000 })
  const queue = useLoad<QueueView[]>(() => api.get('/queue', { params: { date } }).then((r) => r.data), [date], { pollMs: 15000 })
  const { toast, confirm } = useUI()
  const act = async (label: string, fn: () => Promise<unknown>) => { try { await fn(); toast.success(label); reload(); queue.reload() } catch (e) { toast.error(errMsg(e)) } }
  const list = data ?? []
  const waiting = (queue.data ?? []).filter((q) => q.status === 'WAITING').length
  return (
    <>
      <PageHeader title="Reception desk" subtitle="Appointments, check-in and live queue" action={<Link to="/reception/appointments/new"><Button><CalendarPlus className="h-4 w-4" /> New appointment</Button></Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Appointments" value={list.length} icon={<ClipboardCheck />} />
        <Stat label="Waiting now" value={waiting} icon={<Users />} tone="amber" />
        <Stat label="Completed" value={list.filter((a) => a.status === 'COMPLETED').length} icon={<ClipboardCheck />} tone="sky" />
        <Stat label="Yet to arrive" value={list.filter((a) => ['BOOKED', 'CONFIRMED'].includes(a.status)).length} icon={<Users />} tone="rose" />
      </div>
      <PendingRequests onChange={() => { reload(); queue.reload() }} />
      <Card>
        <CardHeader title="Appointments" action={<div className="flex flex-wrap gap-2">
          <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          <Select className="w-48" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Doctor"><option value="">All doctors</option>{(docs.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}</Select></div>} />
        {loading ? <PageLoader /> : error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div> : list.length === 0 ? <Empty title="No appointments for this day" icon={<ClipboardCheck />} /> :
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Time</th><th className="th">Patient</th><th className="th">Doctor</th><th className="th">Type</th><th className="th">Token</th><th className="th">Status</th><th className="th">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{list.map((a) => {
              const open = ['BOOKED', 'CONFIRMED'].includes(a.status)
              return (
                <tr key={a.id}><td className="td whitespace-nowrap font-medium">{fmtTime(a.startTime)}</td>
                  <td className="td"><p className="font-medium">{a.patientName}</p><p className="text-xs text-slate-500">{a.patientCode} - {a.patientPhone}</p></td>
                  <td className="td">{a.doctorName}</td><td className="td">{labelize(a.type)}</td><td className="td">{a.tokenNumber ?? '-'}</td><td className="td"><StatusBadge status={a.status} /></td>
                  <td className="td"><div className="flex flex-wrap gap-1.5">
                    {open && date === todayISO() && <Button size="sm" onClick={() => act(`${a.patientName} checked in`, () => api.post(`/appointments/${a.id}/check-in`))}>Check-in</Button>}
                    {a.status === 'BOOKED' && <Button size="sm" variant="outline" onClick={() => act('Appointment confirmed - patient notified', () => api.put(`/appointments/${a.id}/confirm`))}>Confirm</Button>}
                    {open && <Button size="sm" variant="ghost" onClick={async () => { if (await confirm({ title: 'Mark no-show?', message: `Mark ${a.patientName} as a no-show?`, confirmLabel: 'Mark no-show' })) act('Marked as no-show', () => api.put(`/appointments/${a.id}/no-show`)) }}>No-show</Button>}
                    {open && <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => { if (await confirm({ title: 'Cancel appointment?', message: `Cancel ${a.patientName}'s appointment at ${fmtTime(a.startTime)}?`, confirmLabel: 'Cancel appointment', danger: true })) act('Appointment cancelled', () => api.put(`/appointments/${a.id}/cancel`, { reason: 'Cancelled by reception' })) }}>Cancel</Button>}
                    {a.status === 'COMPLETED' && <Link to={`/reception/billing?patientId=${a.patientId}&appointmentId=${a.id}`}><Button size="sm" variant="outline"><Receipt className="h-4 w-4" /> Bill</Button></Link>}
                  </div></td></tr>)})}</tbody></table></div>}
      </Card>
    </>
  )
}

/* ---------- Patients ---------- */
export function ReceptionPatients() {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<PatientView[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState<PatientView | 'new' | null>(null)
  const recent = useLoad<PatientView[]>(() => api.get('/patients/recent').then((r) => r.data))
  const { toast } = useUI()
  const search = async () => {
    if (q.trim().length < 2) return toast.info('Type at least 2 characters')
    setBusy(true)
    try { setFound((await api.get('/patients/search', { params: { q } })).data) } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  const rows = found ?? recent.data ?? []
  return (
    <>
      <PageHeader title="Patients" subtitle="Search, register and update patient records" action={<Button onClick={() => setEdit('new')}><UserPlus className="h-4 w-4" /> Register patient</Button>} />
      <Card className="mb-6 p-4"><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search() }}>
        <Input placeholder="Name, phone, patient ID (PAT-...) or appointment ID (APT-...)" value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) setFound(null) }} aria-label="Search patients" />
        <Button type="submit" loading={busy}>Search</Button></form></Card>
      <Card><CardHeader title={found ? `Search results (${rows.length})` : 'Recently registered'} />
        {recent.loading && !found ? <PageLoader /> : rows.length === 0 ? <Empty title="No patients found" icon={<Users />} /> :
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Patient ID</th><th className="th">Name</th><th className="th">Phone</th><th className="th">DOB</th><th className="th">Portal</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((p) => (
              <tr key={p.id}><td className="td font-medium">{p.patientCode}</td><td className="td">{p.fullName}</td><td className="td">{p.phone}</td><td className="td">{fmtDate(p.dateOfBirth)}</td><td className="td">{p.hasPortalAccount ? <Badge tone="green">Active</Badge> : <Badge>None</Badge>}</td>
                <td className="td"><div className="flex justify-end gap-1.5"><Link to={`/reception/appointments/new?patientId=${p.id}`}><Button size="sm" variant="outline"><CalendarPlus className="h-4 w-4" /></Button></Link>
                  <Link to={`/reception/documents?patientId=${p.id}`}><Button size="sm" variant="outline"><FilePlus2 className="h-4 w-4" /></Button></Link>
                  <Button size="sm" variant="outline" onClick={() => setEdit(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button></div></td></tr>))}</tbody></table></div>}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Register new patient' : 'Edit patient'} wide>
        {edit && <PatientForm initial={edit === 'new' ? undefined : edit} onCancel={() => setEdit(null)} onSaved={(p) => { toast.success(`${p.fullName} saved (${p.patientCode})`); setEdit(null); setFound(null); recent.reload() }} />}
      </Modal>
    </>
  )
}

/* ---------- New appointment (online / phone / walk-in) ---------- */
export function NewAppointment() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { toast } = useUI()
  const docs = useDoctors('/staff/doctors')
  const [patient, setPatient] = useState<PatientView | null>(null)
  const pre = useLoad<PatientView>(() => api.get(`/patients/${sp.get('patientId')}`).then((r) => { setPatient(r.data); return r.data }), [], { skip: !sp.get('patientId') })
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [type, setType] = useState<'WALK_IN' | 'ONLINE'>('WALK_IN')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [reg, setReg] = useState(false)
  const list = docs.data ?? []
  const doc = doctorId || (list.length === 1 ? list[0].id : '')

  const submit = async (checkIn: boolean) => {
    setBusy(true)
    try {
      const { data } = await api.post<AppointmentView>('/appointments', { patientId: patient!.id, doctorId: doc, date, startTime: time, reason: reason || undefined, type })
      if (checkIn) { const q = await api.post<QueueView>(`/appointments/${data.id}/check-in`); toast.success(`Booked and checked in. Token #${q.data.token}`) } else toast.success(`Appointment ${data.code} booked`)
      nav('/reception')
    } catch (e) { toast.error(errMsg(e)); setTime('') } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="New appointment" subtitle="Walk-in or phone/online booking on behalf of a patient" />
      <div className="grid max-w-4xl gap-6">
        <Card className="space-y-5 p-5 sm:p-6">
          <div><div className="mb-1.5 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Patient</span><button type="button" className="text-sm font-medium text-brand-700" onClick={() => setReg(true)}>+ Register new patient</button></div>
            <PatientPicker value={patient} onChange={setPatient} /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Doctor"><Select value={doc} onChange={(e) => { setDoctorId(Number(e.target.value)); setTime('') }}><option value="">Select doctor</option>{list.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}</Select></Field>
            <Field label="Date"><Input type="date" min={todayISO()} value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} /></Field>
            <Field label="Visit type"><Select value={type} onChange={(e) => { setType(e.target.value as 'WALK_IN' | 'ONLINE'); setTime('') }}><option value="WALK_IN">Walk-in</option><option value="ONLINE">Phone / online request</option></Select></Field>
          </div>
          <div><p className="mb-2 text-sm font-medium text-slate-700">Available times</p><SlotPicker doctorId={doc} date={date} value={time} onChange={setTime} walkIn={type === 'WALK_IN'} /></div>
          <Field label="Reason for visit"><Textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!patient || !doc || !time} loading={busy} onClick={() => submit(false)}><CalendarPlus className="h-4 w-4" /> Book appointment</Button>
            {date === todayISO() && <Button variant="secondary" disabled={!patient || !doc || !time} loading={busy} onClick={() => submit(true)}><ClipboardCheck className="h-4 w-4" /> Book &amp; check-in now</Button>}
          </div>
        </Card>
      </div>
      <Modal open={reg} onClose={() => setReg(false)} title="Register new patient" wide>
        <PatientForm onCancel={() => setReg(false)} onSaved={(p) => { setPatient(p); setReg(false); toast.success(`${p.fullName} registered (${p.patientCode})`) }} />
      </Modal>
    </>
  )
}

/* ---------- Queue ---------- */
export function ReceptionQueue() {
  const { data, loading, error, reload } = useLoad<QueueView[]>(() => api.get('/queue').then((r) => r.data), [], { pollMs: 10000 })
  const { toast, confirm } = useUI()
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  const col = (s: QueueView['status'][]) => (data ?? []).filter((q) => s.includes(q.status))
  const Block = ({ title, items, tone }: { title: string; items: QueueView[]; tone: string }) => (
    <Card><CardHeader title={title} action={<Badge tone={tone}>{items.length}</Badge>} />
      {items.length === 0 ? <Empty title="Nobody here" /> : <ul className="divide-y divide-slate-100">{items.map((q) => (
        <li key={q.id} className="flex items-center gap-4 px-5 py-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-lg font-semibold text-white">{q.token}</span>
          <div className="flex-1"><p className="font-medium">{q.patientName}</p><p className="text-xs text-slate-500">{q.patientCode} - {q.doctorName} - checked in {fmtTime(q.checkedInAt.slice(11, 16))}</p></div>
          {q.status === 'WAITING' && <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => { if (await confirm({ title: 'Remove from queue?', message: `Skip ${q.patientName}? They will be marked as no-show.`, confirmLabel: 'Skip patient', danger: true })) { try { await api.post(`/queue/${q.appointmentId}/skip`); toast.success('Removed from queue'); reload() } catch (e) { toast.error(errMsg(e)) } } }}>Skip</Button>}
        </li>))}</ul>}</Card>)
  return (
    <>
      <PageHeader title="Live queue" subtitle="Today's token queue. Refreshes automatically." />
      <div className="grid gap-6 lg:grid-cols-3"><Block title="In consultation" items={col(['IN_CONSULTATION'])} tone="blue" /><Block title="Waiting" items={col(['WAITING'])} tone="amber" /><Block title="Completed / skipped" items={col(['COMPLETED', 'SKIPPED'])} tone="slate" /></div>
    </>
  )
}

/* ---------- Billing ---------- */
interface Line { category: BillCategory; description: string; quantity: number; unitPrice: number }
const CATS: BillCategory[] = ['CONSULTATION', 'PROCEDURE', 'DIAGNOSTIC', 'PHYSIOTHERAPY', 'MEDICINE', 'OTHER']
const METHODS: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']

function BillCreator({ patientId, appointmentId, onClose, onDone }: { patientId?: number; appointmentId?: number; onClose: () => void; onDone: () => void }) {
  const { toast } = useUI()
  const [patient, setPatient] = useState<PatientView | null>(null)
  useLoad<PatientView>(() => api.get(`/patients/${patientId}`).then((r) => { setPatient(r.data); return r.data }), [patientId], { skip: !patientId })
  const appt = useLoad<AppointmentView>(() => api.get(`/appointments/${appointmentId}`).then((r) => r.data), [appointmentId], { skip: !appointmentId })
  const [lines, setLines] = useState<Line[]>([{ category: 'CONSULTATION', description: 'Consultation fee', quantity: 1, unitPrice: 0 }])
  const [prefilled, setPrefilled] = useState(false)
  if (appt.data && !prefilled) { setPrefilled(true); setLines([{ category: 'CONSULTATION', description: `Consultation - ${appt.data.doctorName}`, quantity: 1, unitPrice: appt.data.consultationFee }]) }
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [pay, setPay] = useState(0)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const taxable = Math.max(subtotal - discount, 0)
  const taxAmt = Math.round(taxable * tax) / 100
  const total = taxable + taxAmt
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)))

  const save = async () => {
    setBusy(true)
    try {
      await api.post('/bills', { patientId: patient!.id, appointmentId, items: lines, discount, taxPercent: tax, notes: notes || undefined,
        initialPayment: pay > 0 ? { amount: pay, method, reference: ref || undefined } : undefined })
      toast.success('Bill created'); onDone()
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} wide title="Create bill" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!patient || total <= 0 || lines.some((l) => !l.description.trim())} onClick={save}>Create bill</Button></>}>
      <div className="space-y-4">
        <PatientPicker value={patient} onChange={setPatient} />
        <div className="space-y-2">{lines.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <Select className="col-span-12 sm:col-span-3" value={l.category} onChange={(e) => setLine(i, { category: e.target.value as BillCategory })} aria-label="Category">{CATS.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}</Select>
            <Input className="col-span-12 sm:col-span-4" placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} aria-label="Description" />
            <Input className="col-span-4 sm:col-span-1" type="number" min={1} value={l.quantity} onChange={(e) => setLine(i, { quantity: Math.max(1, Number(e.target.value)) })} aria-label="Quantity" />
            <Input className="col-span-5 sm:col-span-3" type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Math.max(0, Number(e.target.value)) })} aria-label="Unit price" />
            <Button className="col-span-3 sm:col-span-1" variant="ghost" size="sm" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, k) => k !== i))} aria-label="Remove line"><Trash2 className="h-4 w-4" /></Button>
          </div>))}
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { category: 'PROCEDURE', description: '', quantity: 1, unitPrice: 0 }])}><Plus className="h-4 w-4" /> Add line</Button></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Discount (Rs.)"><Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} /></Field>
          <Field label="Tax % (if applicable)"><Input type="number" min={0} max={100} value={tax} onChange={(e) => setTax(Math.min(100, Math.max(0, Number(e.target.value))))} /></Field>
          <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between"><span>Tax</span><span>{money(taxAmt)}</span></div><div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{money(total)}</span></div></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Amount received now (Rs.)"><Input type="number" min={0} max={total} value={pay} onChange={(e) => setPay(Math.min(total, Math.max(0, Number(e.target.value))))} /></Field>
          <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{METHODS.map((m) => <option key={m} value={m}>{labelize(m)}</option>)}</Select></Field>
          <Field label="Reference / txn ID"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        </div>
        <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} /></Field>
      </div>
    </Modal>
  )
}

export function ReceptionBilling() {
  const [sp, setSp] = useSearchParams()
  const [pendingOnly, setPendingOnly] = useState(false)
  const { data, loading, error, reload } = useLoad<BillView[]>(() => api.get('/bills', { params: { pendingOnly } }).then((r) => r.data), [pendingOnly])
  const [creating, setCreating] = useState(!!sp.get('patientId') || !!sp.get('appointmentId'))
  const [paying, setPaying] = useState<BillView | null>(null)
  const [viewing, setViewing] = useState<BillView | null>(null)
  const { toast } = useUI()
  const close = () => { setCreating(false); setSp({}) }
  return (
    <>
      <PageHeader title="Billing" subtitle="Create invoices and record payments" action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New bill</Button>} />
      <Card><CardHeader title={pendingOnly ? 'Pending & partial bills' : 'Recent bills'} action={<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} /> Pending only</label>} />
        {loading ? <PageLoader /> : error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div> : (data ?? []).length === 0 ? <Empty title="No bills" icon={<Receipt />} /> :
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Invoice</th><th className="th">Patient</th><th className="th">Date</th><th className="th">Total</th><th className="th">Paid</th><th className="th">Pending</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{data!.map((b) => (
              <tr key={b.id}><td className="td font-medium">{b.billNumber}</td><td className="td">{b.patientName}<br /><span className="text-xs text-slate-500">{b.patientCode}</span></td><td className="td">{fmtDate(b.createdAt)}</td><td className="td">{money(b.total)}</td><td className="td">{money(b.paid)}</td><td className="td">{money(b.pending)}</td><td className="td"><StatusBadge status={b.status} /></td>
                <td className="td"><div className="flex justify-end gap-1.5">{b.pending > 0 && <Button size="sm" onClick={() => setPaying(b)}>Record payment</Button>}
                  <Button size="sm" variant="outline" aria-label={`View bill ${b.billNumber}`} onClick={() => setViewing(b)}><Eye className="h-4 w-4" /> View</Button>
                  <Button size="sm" variant="outline" aria-label="Download invoice" onClick={() => downloadFile(`/bills/${b.id}/pdf`, `${b.billNumber}.pdf`).catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /></Button></div></td></tr>))}</tbody></table></div>}
      </Card>
      {creating && <BillCreator patientId={Number(sp.get('patientId')) || undefined} appointmentId={Number(sp.get('appointmentId')) || undefined} onClose={close} onDone={() => { close(); reload() }} />}
      <BillModal bill={viewing} onClose={() => setViewing(null)} />
      {paying && <PaymentModal bill={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); reload() }} />}
    </>
  )
}

function PaymentModal({ bill, onClose, onDone }: { bill: BillView; onClose: () => void; onDone: () => void }) {
  const { toast } = useUI()
  const [amount, setAmount] = useState(bill.pending)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open onClose={onClose} title={`Record payment - ${bill.billNumber}`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button loading={busy} disabled={amount <= 0 || amount > bill.pending} onClick={async () => { setBusy(true); try { await api.post(`/bills/${bill.id}/payments`, { amount, method, reference: ref || undefined }); toast.success('Payment recorded'); onDone() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) } }}>Save payment</Button></>}>
      <p className="mb-4 text-sm text-slate-600">{bill.patientName} - Total {money(bill.total)}, paid {money(bill.paid)}, <b>pending {money(bill.pending)}</b></p>
      <div className="space-y-3"><Field label="Amount (Rs.)"><Input type="number" min={0.01} max={bill.pending} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{METHODS.map((m) => <option key={m} value={m}>{labelize(m)}</option>)}</Select></Field>
        <Field label="Reference / txn ID"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field></div>
    </Modal>
  )
}

/* ---------- Documents ---------- */
export function ReceptionDocuments() {
  const [sp] = useSearchParams()
  const [patient, setPatient] = useState<PatientView | null>(null)
  useLoad<PatientView>(() => api.get(`/patients/${sp.get('patientId')}`).then((r) => { setPatient(r.data); return r.data }), [], { skip: !sp.get('patientId') })
  const docs = useLoad<ReportView[]>(() => api.get(`/patients/${patient!.id}/documents`).then((r) => r.data), [patient?.id], { skip: !patient })
  const { toast } = useUI()
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<ReportType>('XRAY')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const upload = async () => {
    if (!file || !patient) return
    const fd = new FormData()
    fd.append('patientId', String(patient.id)); fd.append('file', file); fd.append('reportType', type)
    if (title) fd.append('title', title)
    if (notes) fd.append('notes', notes)
    setBusy(true)
    try { await api.post('/documents', fd); toast.success('Document uploaded'); setFile(null); setTitle(''); setNotes(''); docs.reload() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <>
      <PageHeader title="Reports & documents" subtitle="Upload X-rays, MRI, blood reports and other documents (PDF, PNG, JPG up to 15 MB)" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5"><PatientPicker value={patient} onChange={setPatient} />
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Report type"><Select value={type} onChange={(e) => setType(e.target.value as ReportType)}><option value="XRAY">X-Ray</option><option value="MRI">MRI</option><option value="BLOOD">Blood report</option><option value="OTHER">Other</option></Select></Field>
            <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Right knee X-ray" /></Field></div>
          <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <Field label="File"><input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800" /></Field>
          <Button disabled={!patient || !file} loading={busy} onClick={upload}><Upload className="h-4 w-4" /> Upload</Button></Card>
        <Card><CardHeader title="Uploaded documents" />
          {!patient ? <Empty title="Select a patient" icon={<FilePlus2 />} /> : docs.loading ? <PageLoader /> : (docs.data ?? []).length === 0 ? <Empty title="No documents yet" icon={<FilePlus2 />} /> :
            <ul className="divide-y divide-slate-100">{docs.data!.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-medium">{r.title}</p><p className="text-xs text-slate-500">{labelize(r.reportType)} - {fmtDate(r.reportDate)}</p></div>
              {r.documentId && <Button size="sm" variant="outline" onClick={() => downloadFile(`/documents/${r.documentId}/download`, r.fileName ?? 'document').catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /></Button>}</li>)}</ul>}</Card>
      </div>
    </>
  )
}

/* ---------- Doctor availability (read-only view for reception) ---------- */
export function ReceptionAvailability() {
  const docs = useDoctors('/staff/doctors')
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [date, setDate] = useState(todayISO())
  const list: DoctorView[] = docs.data ?? []
  const doc = doctorId || (list.length === 1 ? list[0].id : '')
  const slots = useLoad<{ startTime: string; endTime: string; remaining: number }[]>(() => api.get('/appointments/slots', { params: { doctorId: doc, date, walkIn: true } }).then((r) => r.data), [doc, date], { skip: !doc })
  return (
    <>
      <PageHeader title="Doctor availability" subtitle="Free and booked slots, including breaks and leave days" />
      <Card className="p-5"><div className="mb-5 grid gap-3 sm:grid-cols-3"><Field label="Doctor"><Select value={doc} onChange={(e) => setDoctorId(Number(e.target.value))}><option value="">Select doctor</option>{list.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" min={todayISO()} max={addDaysISO(todayISO(), 90)} value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
        {!doc ? <p className="text-sm text-slate-500">Select a doctor.</p> : slots.loading ? <PageLoader /> : (slots.data ?? []).length === 0 ? <Empty title="No slots on this date" hint="The doctor may not work this day, may be on leave, or the day has passed." /> :
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">{slots.data!.map((s) => (
            <div key={s.startTime} className={`rounded-lg border px-2 py-2 text-center text-sm ${s.remaining > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-400 line-through'}`}>{fmtTime(s.startTime)}</div>))}</div>}
      </Card>
    </>
  )
}
