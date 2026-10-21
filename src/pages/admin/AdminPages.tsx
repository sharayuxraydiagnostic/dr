import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarClock, CalendarDays, IndianRupee, Pencil, Plus, Trash2, UserCog, Users, Wallet } from 'lucide-react'
import { api, errMsg } from '../../lib/api'
import { useLoad } from '../../lib/hooks'
import type { AdminSummary, AuditView, AvailabilityDto, ClinicPhotoView, ContentType, ContentView, DepartmentView, DoctorView, LeaveView, PatientView, ServiceView, UserView } from '../../lib/types'
import { DoctorAvatar } from '../../components/Avatar'
import { AuthImage } from '../../components/AuthImage'
import { ICON_KEYS } from '../../lib/icons'
import { clean, fmtDate, fmtDateTime, labelize, money, todayISO } from '../../lib/utils'
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Field, Input, Modal, PageHeader, PageLoader, Select, Stat, Tabs, Textarea, useUI } from '../../components/ui'

/* ---------- Dashboard ---------- */
const COLORS = ['#148a8d', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#10b981', '#ec4899']
export function AdminHome() {
  const { data, loading, error, reload } = useLoad<AdminSummary>(() => api.get('/admin/summary').then((r) => r.data))
  if (loading) return <PageLoader />
  if (error || !data) return <ErrorBox message={error ?? 'No data'} onRetry={reload} />
  const appts = data.appointmentsPerDay.map((d) => ({ date: d.date.slice(5), count: d.value }))
  const rev = data.revenuePerDay.map((d) => ({ date: d.date.slice(5), amount: d.value }))
  const pie = Object.entries(data.statusBreakdown).map(([name, value]) => ({ name: labelize(name), value }))
  return (
    <>
      <PageHeader title="Overview" subtitle="Hospital activity for the last 30 days" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Patients" value={data.patients} icon={<Users />} /><Stat label="Active doctors" value={data.doctors} icon={<UserCog />} tone="sky" />
        <Stat label="Appointments today" value={data.appointmentsToday} icon={<CalendarDays />} /><Stat label="Completed today" value={data.completedToday} icon={<CalendarClock />} tone="sky" />
        <Stat label="Collected today" value={money(data.revenueToday)} icon={<IndianRupee />} tone="amber" /><Stat label="Pending dues" value={money(data.pendingAmount)} icon={<Wallet />} tone="rose" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Appointments per day" /><div className="h-72 p-4"><ResponsiveContainer><BarChart data={appts}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={11} interval={3} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="count" name="Appointments" fill="#148a8d" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Collections per day (Rs.)" /><div className="h-72 p-4"><ResponsiveContainer><LineChart data={rev}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={11} interval={3} /><YAxis fontSize={11} /><Tooltip formatter={(v) => money(Number(v))} /><Line type="monotone" dataKey="amount" name="Collected" stroke="#0ea5e9" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Card>
        <Card className="lg:col-span-2"><CardHeader title="Appointment outcomes" />{pie.length === 0 ? <Empty title="No appointments in this period" /> : <div className="h-72 p-4"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={100} label>{pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>}</Card>
      </div>
    </>
  )
}

/* ---------- Doctors ---------- */
const docSchema = z.object({
  fullName: z.string().min(2, 'Required'), email: z.string().email('Valid email required'), phone: z.string().regex(/^[+0-9 -]{10,15}$/, 'Valid phone required').or(z.literal('')),
  password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/, '8+ chars with a letter and a digit').or(z.literal('')),
  departmentId: z.string().optional(), specialization: z.string().max(150).optional(), qualification: z.string().max(255).optional(), registrationNumber: z.string().max(80).optional(),
  consultationFee: z.coerce.number().min(0), slotMinutes: z.coerce.number().int().min(5).max(120), maxPatientsPerSlot: z.coerce.number().int().min(1).max(20), bio: z.string().optional(), active: z.boolean(),
})
type DocForm = z.infer<typeof docSchema>

function DoctorForm({ initial, departments, onClose, onSaved }: { initial?: DoctorView; departments: DepartmentView[]; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const preview = photo ? URL.createObjectURL(photo) : null
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DocForm>({ resolver: zodResolver(docSchema) as never,
    defaultValues: { fullName: initial?.fullName ?? '', email: initial?.email ?? '', phone: initial?.phone ?? '', password: '', departmentId: initial?.departmentId ? String(initial.departmentId) : '', specialization: initial?.specialization ?? '',
      qualification: initial?.qualification ?? '', registrationNumber: initial?.registrationNumber ?? '', consultationFee: initial?.consultationFee ?? 0, slotMinutes: initial?.slotMinutes ?? 15, maxPatientsPerSlot: initial?.maxPatientsPerSlot ?? 1, bio: initial?.bio ?? '', active: initial?.active ?? true } })
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
      setError('')
      if (!initial && !v.password) return setError('Password is required for a new doctor')
      try {
        const body = clean({ ...v, departmentId: v.departmentId ? Number(v.departmentId) : undefined })
        const res = initial ? await api.put<DoctorView>(`/admin/doctors/${initial.id}`, body) : await api.post<DoctorView>('/admin/doctors', body)
        const id = res.data.id
        try {
          if (photo) { const fd = new FormData(); fd.append('file', photo); await api.post(`/admin/doctors/${id}/photo`, fd) }
          else if (removePhoto && initial?.hasPhoto) await api.delete(`/admin/doctors/${id}/photo`)
        } catch (pe) { setError('Doctor saved, but the photo failed: ' + errMsg(pe)); return }
        onSaved()
      } catch (e) { setError(errMsg(e)) }
    })}>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name (e.g. Dr. Name)" error={errors.fullName?.message}><Input {...register('fullName')} /></Field>
        <Field label="Login email" error={errors.email?.message}><Input type="email" {...register('email')} /></Field>
        <Field label="Phone" error={errors.phone?.message}><Input {...register('phone')} /></Field>
        <Field label={initial ? 'New password (leave blank to keep)' : 'Password'} error={errors.password?.message}><Input type="password" autoComplete="new-password" {...register('password')} /></Field>
        <Field label="Department"><Select {...register('departmentId')}><option value="">None</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        <Field label="Specialization"><Input {...register('specialization')} /></Field>
        <Field label="Qualifications" hint="Shown on the website and prescriptions"><Input {...register('qualification')} /></Field>
        <Field label="Registration number" hint="Shown on prescriptions"><Input {...register('registrationNumber')} /></Field>
        <Field label="Consultation fee (Rs.)" error={errors.consultationFee?.message}><Input type="number" step="0.01" {...register('consultationFee')} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Slot (minutes)" error={errors.slotMinutes?.message}><Input type="number" {...register('slotMinutes')} /></Field><Field label="Max patients / slot" error={errors.maxPatientsPerSlot?.message}><Input type="number" {...register('maxPatientsPerSlot')} /></Field></div>
      </div>
      <Field label="Biography"><Textarea rows={3} {...register('bio')} /></Field>
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-3">
        {preview ? <img src={preview} alt="New doctor photo preview" className="h-20 w-20 rounded-2xl object-cover" /> : initial && !removePhoto ? <DoctorAvatar doctor={initial} className="h-20 w-20 rounded-2xl text-xl" /> : <div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-100 text-xs text-slate-400">No photo</div>}
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-slate-700">Doctor photo (shown on the website)</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setPhoto(e.target.files?.[0] ?? null); setRemovePhoto(false) }} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800" />
          <p className="text-xs text-slate-500">JPG, PNG or WebP, up to 3 MB. A clear head-and-shoulders photo works best.</p>
          {initial?.hasPhoto && !photo && <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={removePhoto} onChange={(e) => setRemovePhoto(e.target.checked)} /> Remove current photo</label>}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('active')} /> Active (visible for booking)</label>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={isSubmitting}>Save doctor</Button></div>
    </form>
  )
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
function ScheduleModal({ doctor, onClose }: { doctor: DoctorView; onClose: () => void }) {
  const { toast, confirm } = useUI()
  const avail = useLoad<AvailabilityDto[]>(() => api.get(`/admin/doctors/${doctor.id}/availability`).then((r) => r.data), [doctor.id])
  const leaves = useLoad<LeaveView[]>(() => api.get(`/admin/doctors/${doctor.id}/leaves`).then((r) => r.data), [doctor.id])
  const [rows, setRows] = useState<AvailabilityDto[] | null>(null)
  const [leaveDate, setLeaveDate] = useState(todayISO())
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const list = rows ?? avail.data ?? []
  const byDay = (d: string) => list.find((r) => r.dayOfWeek === d)
  const setDay = (d: string, patch: Partial<AvailabilityDto> | null) => {
    const others = list.filter((r) => r.dayOfWeek !== d)
    setRows(patch === null ? others : [...others, { dayOfWeek: d, startTime: '10:00', endTime: '18:00', breakStart: '13:00', breakEnd: '14:00', active: true, ...byDay(d), ...patch }])
  }
  const save = async () => {
    setBusy(true)
    try { const body = list.map((r) => ({ ...r, startTime: r.startTime.slice(0, 5), endTime: r.endTime.slice(0, 5), breakStart: r.breakStart ? r.breakStart.slice(0, 5) : null, breakEnd: r.breakEnd ? r.breakEnd.slice(0, 5) : null }))
      await api.put(`/admin/doctors/${doctor.id}/availability`, body); toast.success('Working hours saved'); setRows(null); avail.reload() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} wide title={`Schedule - ${doctor.fullName}`}>
      <h4 className="mb-2 font-semibold">Weekly working hours</h4>
      <div className="space-y-2">{DAYS.map((d) => { const r = byDay(d); return (
        <div key={d} className="grid grid-cols-12 items-center gap-2 text-sm">
          <label className="col-span-12 flex items-center gap-2 font-medium sm:col-span-3"><input type="checkbox" checked={!!r && r.active} onChange={(e) => (e.target.checked ? setDay(d, { active: true }) : setDay(d, null))} />{labelize(d)}</label>
          {r ? <>
            <Input className="col-span-3 sm:col-span-2" type="time" value={r.startTime.slice(0, 5)} onChange={(e) => setDay(d, { startTime: e.target.value })} aria-label="Start" />
            <Input className="col-span-3 sm:col-span-2" type="time" value={r.endTime.slice(0, 5)} onChange={(e) => setDay(d, { endTime: e.target.value })} aria-label="End" />
            <Input className="col-span-3 sm:col-span-2" type="time" value={r.breakStart?.slice(0, 5) ?? ''} onChange={(e) => setDay(d, { breakStart: e.target.value || null })} aria-label="Break start" />
            <Input className="col-span-3 sm:col-span-2" type="time" value={r.breakEnd?.slice(0, 5) ?? ''} onChange={(e) => setDay(d, { breakEnd: e.target.value || null })} aria-label="Break end" /></> : <span className="col-span-12 text-slate-400 sm:col-span-9">Off</span>}
        </div>)})}
        <p className="text-xs text-slate-500">Columns: start, end, break start, break end. Slot length is {doctor.slotMinutes} min with up to {doctor.maxPatientsPerSlot} patient(s) per slot.</p></div>
      <div className="mt-3 flex justify-end"><Button loading={busy} disabled={rows === null} onClick={save}>Save working hours</Button></div>
      <h4 className="mb-2 mt-6 font-semibold">Leave dates</h4>
      <div className="mb-3 flex flex-wrap gap-2"><Input type="date" className="w-44" min={todayISO()} value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} /><Input className="w-56" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="outline" onClick={async () => { try { await api.post(`/admin/doctors/${doctor.id}/leaves`, { date: leaveDate, reason: reason || undefined }); setReason(''); leaves.reload(); toast.success('Leave added') } catch (e) { toast.error(errMsg(e)) } }}><Plus className="h-4 w-4" /> Add leave</Button></div>
      {(leaves.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No leave scheduled.</p> : <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{leaves.data!.map((l) => (
        <li key={l.id} className="flex items-center justify-between px-4 py-2 text-sm"><span>{fmtDate(l.date)}{l.reason ? ` - ${l.reason}` : ''}</span>
          <Button size="sm" variant="ghost" className="text-red-600" aria-label="Remove leave" onClick={async () => { if (await confirm({ title: 'Remove leave?', message: `Make ${fmtDate(l.date)} available for booking again?`, confirmLabel: 'Remove' })) { await api.delete(`/admin/leaves/${l.id}`); leaves.reload() } }}><Trash2 className="h-4 w-4" /></Button></li>))}</ul>}
    </Modal>
  )
}

export function AdminDoctors() {
  const { data, loading, error, reload } = useLoad<DoctorView[]>(() => api.get('/admin/doctors').then((r) => r.data))
  const deps = useLoad<DepartmentView[]>(() => api.get('/admin/departments').then((r) => r.data))
  const [edit, setEdit] = useState<DoctorView | 'new' | null>(null)
  const [sched, setSched] = useState<DoctorView | null>(null)
  const { toast } = useUI()
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  return (
    <>
      <PageHeader title="Doctors" subtitle="Profiles, fees, working hours and leave" action={<Button onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> Add doctor</Button>} />
      <Card>{(data ?? []).length === 0 ? <Empty title="No doctors yet" icon={<UserCog />} /> :
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Doctor</th><th className="th">Department</th><th className="th">Fee</th><th className="th">Slots</th><th className="th">Status</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-slate-100">{data!.map((d) => (
            <tr key={d.id}><td className="td"><div className="flex items-center gap-3"><DoctorAvatar doctor={d} className="h-10 w-10 rounded-full text-xs" /><div><p className="font-medium">{d.fullName}</p><p className="text-xs text-slate-500">{d.email}</p></div></div></td><td className="td">{d.departmentName ?? '-'}</td><td className="td">{money(d.consultationFee)}</td><td className="td">{d.slotMinutes} min x {d.maxPatientsPerSlot}</td><td className="td">{d.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
              <td className="td"><div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" onClick={() => setSched(d)}><CalendarClock className="h-4 w-4" /> Schedule</Button><Button size="sm" variant="outline" aria-label="Edit" onClick={() => setEdit(d)}><Pencil className="h-4 w-4" /></Button></div></td></tr>))}</tbody></table></div>}</Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} wide title={edit === 'new' ? 'Add doctor' : 'Edit doctor'}>
        {edit && <DoctorForm initial={edit === 'new' ? undefined : edit} departments={deps.data ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); toast.success('Doctor saved'); reload() }} />}</Modal>
      {sched && <ScheduleModal doctor={sched} onClose={() => setSched(null)} />}
    </>
  )
}

/* ---------- Staff & users ---------- */
const staffSchema = z.object({ fullName: z.string().min(2, 'Required'), email: z.string().email('Valid email required'), phone: z.string().regex(/^[+0-9 -]{10,15}$/, 'Valid phone required').or(z.literal('')),
  password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/, '8+ chars with a letter and a digit').or(z.literal('')), enabled: z.boolean() })
function StaffForm({ initial, onClose, onSaved }: { initial?: UserView; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof staffSchema>>({ resolver: zodResolver(staffSchema), defaultValues: { fullName: initial?.fullName ?? '', email: initial?.email ?? '', phone: initial?.phone ?? '', password: '', enabled: initial?.enabled ?? true } })
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
      setError(''); if (!initial && !v.password) return setError('Password is required')
      try { const body = clean(v); initial ? await api.put(`/admin/receptionists/${initial.id}`, body) : await api.post('/admin/receptionists', body); onSaved() } catch (e) { setError(errMsg(e)) } })}>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Field label="Full name" error={errors.fullName?.message}><Input {...register('fullName')} /></Field><Field label="Login email" error={errors.email?.message}><Input type="email" {...register('email')} /></Field>
      <Field label="Phone" error={errors.phone?.message}><Input {...register('phone')} /></Field><Field label={initial ? 'New password (leave blank to keep)' : 'Password'} error={errors.password?.message}><Input type="password" autoComplete="new-password" {...register('password')} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('enabled')} /> Account enabled</label>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={isSubmitting}>Save</Button></div></form>)
}

export function AdminStaff() {
  const [tab, setTab] = useState<'rec' | 'users'>('rec')
  const recs = useLoad<UserView[]>(() => api.get('/admin/receptionists').then((r) => r.data))
  const users = useLoad<UserView[]>(() => api.get('/admin/users').then((r) => r.data), [tab], { skip: tab !== 'users' })
  const [edit, setEdit] = useState<UserView | 'new' | null>(null)
  const { toast, confirm } = useUI()
  const toggle = async (u: UserView) => {
    if (!(await confirm({ title: u.enabled ? 'Disable account?' : 'Enable account?', message: `${u.fullName} (${u.email}) will ${u.enabled ? 'no longer be able to sign in' : 'be able to sign in again'}.`, danger: u.enabled, confirmLabel: u.enabled ? 'Disable' : 'Enable' }))) return
    try { await api.put(`/admin/users/${u.id}/enabled`, null, { params: { value: !u.enabled } }); users.reload(); recs.reload() } catch (e) { toast.error(errMsg(e)) }
  }
  const rows = tab === 'rec' ? recs.data : users.data
  return (
    <>
      <PageHeader title="Staff & users" subtitle="Receptionists and account access" action={<Button onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> Add receptionist</Button>} />
      <Card><div className="px-4 pt-2"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'rec', label: 'Receptionists' }, { id: 'users', label: 'All users' }]} /></div>
        {(tab === 'rec' ? recs.loading : users.loading) ? <PageLoader /> : (rows ?? []).length === 0 ? <Empty title="No users" icon={<Users />} /> :
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{rows!.map((u) => (<tr key={u.id}><td className="td font-medium">{u.fullName}</td><td className="td">{u.email}</td><td className="td"><Badge tone="teal">{labelize(u.role)}</Badge></td><td className="td">{u.enabled ? <Badge tone="green">Enabled</Badge> : <Badge tone="red">Disabled</Badge>}</td>
              <td className="td"><div className="flex justify-end gap-1.5">{u.role === 'RECEPTIONIST' && <Button size="sm" variant="outline" aria-label="Edit" onClick={() => setEdit(u)}><Pencil className="h-4 w-4" /></Button>}<Button size="sm" variant="outline" onClick={() => toggle(u)}>{u.enabled ? 'Disable' : 'Enable'}</Button></div></td></tr>))}</tbody></table></div>}</Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add receptionist' : 'Edit receptionist'}>
        {edit && <StaffForm initial={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); toast.success('Saved'); recs.reload(); users.reload() }} />}</Modal>
    </>
  )
}

export function AdminPatients() {
  const { data, loading, error, reload } = useLoad<PatientView[]>(() => api.get('/admin/patients').then((r) => r.data))
  const [q, setQ] = useState('')
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  const rows = (data ?? []).filter((p) => !q || `${p.fullName} ${p.phone} ${p.patientCode}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Patients" subtitle="Registered patient list (latest 200). Clinical details are visible to treating doctors only." />
      <Card><div className="border-b border-slate-100 p-4"><Input placeholder="Filter by name, phone or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter patients" /></div>
        {rows.length === 0 ? <Empty title="No patients" icon={<Users />} /> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">ID</th><th className="th">Name</th><th className="th">Phone</th><th className="th">Portal</th><th className="th">Registered</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((p) => <tr key={p.id}><td className="td font-medium">{p.patientCode}</td><td className="td">{p.fullName}</td><td className="td">{p.phone}</td><td className="td">{p.hasPortalAccount ? <Badge tone="green">Active</Badge> : <Badge>None</Badge>}</td><td className="td">{fmtDate(p.createdAt)}</td></tr>)}</tbody></table></div>}</Card>
    </>
  )
}

/* ---------- Services & departments ---------- */
export function AdminServices() {
  const deps = useLoad<DepartmentView[]>(() => api.get('/admin/departments').then((r) => r.data))
  const svcs = useLoad<ServiceView[]>(() => api.get('/admin/services').then((r) => r.data))
  const { toast, confirm } = useUI()
  const [svc, setSvc] = useState<Partial<ServiceView> | null>(null)
  const [dep, setDep] = useState<Partial<DepartmentView> | null>(null)
  const [busy, setBusy] = useState(false)
  const saveSvc = async () => {
    if (!svc?.name?.trim()) return toast.error('Service name is required')
    setBusy(true)
    try { const body = { name: svc.name, description: svc.description, departmentId: svc.departmentId || undefined, price: svc.price ?? 0, active: svc.active ?? true }
      svc.id ? await api.put(`/admin/services/${svc.id}`, body) : await api.post('/admin/services', body); setSvc(null); svcs.reload(); toast.success('Service saved') } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  const saveDep = async () => {
    if (!dep?.name?.trim()) return toast.error('Department name is required')
    setBusy(true)
    try { dep.id ? await api.put(`/admin/departments/${dep.id}`, dep) : await api.post('/admin/departments', dep); setDep(null); deps.reload(); toast.success('Department saved') } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  const del = async (kind: 'services' | 'departments', id: number, name: string) => {
    if (!(await confirm({ title: `Delete ${name}?`, message: 'This cannot be undone. Items that are in use cannot be deleted - deactivate services instead.', confirmLabel: 'Delete', danger: true }))) return
    try { await api.delete(`/admin/${kind}/${id}`); kind === 'services' ? svcs.reload() : deps.reload(); toast.success('Deleted') } catch (e) { toast.error(errMsg(e)) }
  }
  return (
    <>
      <PageHeader title="Services & departments" subtitle="Shown on the public website" />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card><CardHeader title="Services" action={<Button size="sm" onClick={() => setSvc({ active: true, price: 0 })}><Plus className="h-4 w-4" /> Add</Button>} />
          {svcs.loading ? <PageLoader /> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Service</th><th className="th">Department</th><th className="th">Price</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{(svcs.data ?? []).map((s) => <tr key={s.id}><td className="td font-medium">{s.name}</td><td className="td">{s.departmentName ?? '-'}</td><td className="td">{money(s.price)}</td><td className="td">{s.active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>}</td>
              <td className="td"><div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" aria-label="Edit" onClick={() => setSvc(s)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-red-600" aria-label="Delete" onClick={() => del('services', s.id, s.name)}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>}</Card>
        <Card><CardHeader title="Departments" action={<Button size="sm" onClick={() => setDep({})}><Plus className="h-4 w-4" /> Add</Button>} />
          <ul className="divide-y divide-slate-100">{(deps.data ?? []).map((d) => <li key={d.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{d.name}</span><span className="flex gap-1"><Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setDep(d)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-red-600" aria-label="Delete" onClick={() => del('departments', d.id, d.name)}><Trash2 className="h-4 w-4" /></Button></span></li>)}</ul></Card>
      </div>
      <Modal open={!!svc} onClose={() => setSvc(null)} title={svc?.id ? 'Edit service' : 'Add service'} footer={<><Button variant="outline" onClick={() => setSvc(null)}>Cancel</Button><Button loading={busy} onClick={saveSvc}>Save</Button></>}>
        {svc && <div className="space-y-3"><Field label="Name"><Input value={svc.name ?? ''} onChange={(e) => setSvc({ ...svc, name: e.target.value })} /></Field><Field label="Description"><Textarea rows={2} value={svc.description ?? ''} onChange={(e) => setSvc({ ...svc, description: e.target.value })} /></Field>
          <Field label="Department"><Select value={svc.departmentId ?? ''} onChange={(e) => setSvc({ ...svc, departmentId: e.target.value ? Number(e.target.value) : undefined })}><option value="">None</option>{(deps.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          <Field label="Starting price (Rs.)"><Input type="number" min={0} value={svc.price ?? 0} onChange={(e) => setSvc({ ...svc, price: Number(e.target.value) })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={svc.active ?? true} onChange={(e) => setSvc({ ...svc, active: e.target.checked })} /> Show on website</label></div>}</Modal>
      <Modal open={!!dep} onClose={() => setDep(null)} title={dep?.id ? 'Edit department' : 'Add department'} footer={<><Button variant="outline" onClick={() => setDep(null)}>Cancel</Button><Button loading={busy} onClick={saveDep}>Save</Button></>}>
        {dep && <div className="space-y-3"><Field label="Name"><Input value={dep.name ?? ''} onChange={(e) => setDep({ ...dep, name: e.target.value })} /></Field><Field label="Description"><Textarea rows={2} value={dep.description ?? ''} onChange={(e) => setDep({ ...dep, description: e.target.value })} /></Field></div>}</Modal>
    </>
  )
}

/* ---------- Settings ---------- */
const SETTING_FIELDS: { key: string; label: string; area?: boolean; hint?: string }[] = [
  { key: 'hospital_name', label: 'Hospital name' }, { key: 'tagline', label: 'Tagline' }, { key: 'address', label: 'Address', area: true }, { key: 'phone', label: 'Phone' },
  { key: 'emergency_phone', label: 'Emergency phone' }, { key: 'email', label: 'Email' }, { key: 'opening_hours', label: 'Opening hours' }, { key: 'about_text', label: 'About text', area: true },
  { key: 'map_embed_url', label: 'Google Maps embed URL', hint: 'Must start with https://www.google.com/maps/embed' },
  { key: 'cancellation_cutoff_hours', label: 'Patient cancel/reschedule cut-off (hours before visit)' }, { key: 'max_advance_days', label: 'How many days ahead patients may book', hint: 'Default 60' }, { key: 'max_active_appointments', label: 'Max upcoming appointments per patient', hint: 'Prevents spam bookings. Default 5' }, { key: 'invoice_footer', label: 'Invoice footer text', area: true },
]
export function AdminSettings() {
  const { data, loading, error, reload } = useLoad<Record<string, string>>(() => api.get('/admin/settings').then((r) => r.data))
  const [vals, setVals] = useState<Record<string, string> | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useUI()
  if (loading) return <PageLoader />
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />
  const v = vals ?? data
  return (
    <>
      <PageHeader title="Hospital settings" subtitle="These appear on the website, invoices and prescriptions. Replace every [placeholder] with real details." />
      <Card className="max-w-3xl space-y-4 p-5 sm:p-6">
        {SETTING_FIELDS.map((f) => <Field key={f.key} label={f.label} hint={f.hint}>{f.area ? <Textarea rows={3} value={v[f.key] ?? ''} onChange={(e) => setVals({ ...v, [f.key]: e.target.value })} /> : <Input value={v[f.key] ?? ''} onChange={(e) => setVals({ ...v, [f.key]: e.target.value })} />}</Field>)}
        <Button loading={busy} disabled={!vals} onClick={async () => { setBusy(true); try { await api.put('/admin/settings', vals); toast.success('Settings saved'); setVals(null); reload() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) } }}>Save settings</Button>
      </Card>
    </>
  )
}

/* ---------- Audit ---------- */
export function AdminAudit() {
  const { data, loading, error, reload } = useLoad<AuditView[]>(() => api.get('/admin/audit-logs').then((r) => r.data))
  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  return (
    <>
      <PageHeader title="Audit log" subtitle="Sign-ins, record access and changes (latest 100)" />
      <Card>{(data ?? []).length === 0 ? <Empty title="No activity yet" /> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">When</th><th className="th">User</th><th className="th">Action</th><th className="th">Record</th><th className="th">Details</th><th className="th">IP</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{data!.map((a) => <tr key={a.id}><td className="td whitespace-nowrap">{fmtDateTime(a.createdAt)}</td><td className="td">{a.username ?? '-'}</td><td className="td"><Badge tone="teal">{a.action}</Badge></td><td className="td">{a.entityType ? `${a.entityType} #${a.entityId ?? ''}` : '-'}</td><td className="td max-w-xs truncate">{a.details}</td><td className="td">{a.ipAddress}</td></tr>)}</tbody></table></div>}</Card>
    </>
  )
}

/* ---------- Website content ---------- */
const CONTENT_TABS: { id: ContentType; label: string; help: string }[] = [
  { id: 'FACILITY', label: 'Facilities', help: 'Only enable facilities your hospital really offers.' },
  { id: 'WHY_US', label: 'Why choose us', help: 'Short points shown with an icon.' },
  { id: 'TESTIMONIAL', label: 'Testimonials', help: 'Publish only genuine feedback with the patient\'s permission.' },
  { id: 'HEALTH_TIP', label: 'Health tips', help: 'Articles shown under Health Tips. Separate paragraphs with a blank line.' },
]
export function AdminContent() {
  const [tab, setTab] = useState<ContentType>('FACILITY')
  const { data, loading, error, reload } = useLoad<ContentView[]>(() => api.get('/admin/content', { params: { type: tab } }).then((r) => r.data), [tab])
  const [edit, setEdit] = useState<Partial<ContentView> | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast, confirm } = useUI()
  const meta = CONTENT_TABS.find((t) => t.id === tab)!
  const hasIcon = tab === 'FACILITY' || tab === 'WHY_US'
  const save = async () => {
    if (!edit?.title?.trim()) return toast.error('Title is required')
    setBusy(true)
    try {
      const body = { type: tab, slug: edit.slug || undefined, title: edit.title, subtitle: edit.subtitle || undefined, body: edit.body || undefined, icon: edit.icon || undefined, sortOrder: edit.sortOrder ?? 0, active: edit.active ?? true }
      edit.id ? await api.put(`/admin/content/${edit.id}`, body) : await api.post('/admin/content', body)
      setEdit(null); reload(); toast.success('Saved - the website is updated')
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) }
  }
  const labels = { title: tab === 'TESTIMONIAL' ? 'Patient name (as agreed)' : 'Title', subtitle: tab === 'TESTIMONIAL' ? 'Short detail (optional, e.g. treatment)' : tab === 'HEALTH_TIP' ? 'Short summary' : 'Subtitle (optional)', body: tab === 'TESTIMONIAL' ? 'Testimonial text' : tab === 'HEALTH_TIP' ? 'Article text' : 'Description' }
  return (
    <>
      <PageHeader title="Website content" subtitle="Edit what visitors see on the public website - no code changes needed" action={<Button onClick={() => setEdit({ active: true, sortOrder: (data?.length ?? 0) + 1 })}><Plus className="h-4 w-4" /> Add</Button>} />
      <Card><div className="px-4 pt-2"><Tabs value={tab} onChange={setTab} tabs={CONTENT_TABS.map((t) => ({ id: t.id, label: t.label }))} /></div>
        <p className="border-b border-slate-100 px-5 py-2 text-sm text-slate-500">{meta.help}</p>
        {loading ? <PageLoader /> : error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div> : (data ?? []).length === 0 ? <Empty title="Nothing here yet" hint="Click Add to create the first item." icon={<FileTextIcon />} /> :
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Order</th><th className="th">Title</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{data!.map((c) => (
              <tr key={c.id}><td className="td">{c.sortOrder}</td><td className="td"><p className="font-medium">{c.title}</p>{c.subtitle && <p className="max-w-md truncate text-xs text-slate-500">{c.subtitle}</p>}</td>
                <td className="td">{c.active ? <Badge tone="green">Visible</Badge> : <Badge>Hidden</Badge>}</td>
                <td className="td"><div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" aria-label="Edit" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-600" aria-label="Delete" onClick={async () => { if (await confirm({ title: 'Delete this item?', message: `"${c.title}" will be removed from the website. To keep it for later, hide it instead.`, confirmLabel: 'Delete', danger: true })) { try { await api.delete(`/admin/content/${c.id}`); reload() } catch (e) { toast.error(errMsg(e)) } } }}><Trash2 className="h-4 w-4" /></Button></div></td></tr>))}</tbody></table></div>}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} wide title={edit?.id ? 'Edit item' : 'Add item'} footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {edit && <div className="space-y-4">
          <Field label={labels.title}><Input value={edit.title ?? ''} maxLength={200} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          {tab !== 'WHY_US' && tab !== 'FACILITY' && <Field label={labels.subtitle}><Input value={edit.subtitle ?? ''} maxLength={200} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} /></Field>}
          <Field label={labels.body}><Textarea rows={tab === 'HEALTH_TIP' ? 10 : 4} value={edit.body ?? ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
          {hasIcon && <Field label="Icon"><Select value={edit.icon ?? ''} onChange={(e) => setEdit({ ...edit, icon: e.target.value })}><option value="">Default</option>{ICON_KEYS.map((k) => <option key={k} value={k}>{labelize(k)}</option>)}</Select></Field>}
          <div className="grid grid-cols-2 gap-3"><Field label="Display order" hint="Smaller numbers appear first"><Input type="number" min={0} value={edit.sortOrder ?? 0} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Show on website</label></div>
        </div>}
      </Modal>
    </>
  )
}
const FileTextIcon = () => <Pencil className="h-5 w-5" />

/* ---------- Clinic photos ---------- */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export function AdminGallery() {
  const { data, loading, error, reload } = useLoad<ClinicPhotoView[]>(() => api.get('/admin/clinic-photos').then((r) => r.data))
  const { toast, confirm } = useUI()
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState<ClinicPhotoView | null>(null)
  const [saving, setSaving] = useState(false)

  const upload = async () => {
    const bad = files.find((f) => f.size > MAX_PHOTO_BYTES || !/\.(jpe?g|png|webp)$/i.test(f.name))
    if (bad) return toast.error(`"${bad.name}" must be a JPG, PNG or WebP image up to 5 MB.`)
    setBusy(true)
    let done = 0
    try {
      for (const f of files) {
        const fd = new FormData()
        fd.append('file', f)
        if (files.length === 1 && caption.trim()) fd.append('caption', caption.trim())
        fd.append('sortOrder', String((data?.length ?? 0) + done + 1))
        await api.post('/admin/clinic-photos', fd)
        done++
      }
      toast.success(`${done} photo${done > 1 ? 's' : ''} added - live on the website`)
      setFiles([]); setCaption(''); reload()
    } catch (e) { toast.error(`${done} uploaded, then: ${errMsg(e)}`); reload() } finally { setBusy(false) }
  }
  const save = async () => {
    if (!edit) return
    setSaving(true)
    try { await api.put(`/admin/clinic-photos/${edit.id}`, { caption: edit.caption ?? '', sortOrder: edit.sortOrder, active: edit.active }); setEdit(null); reload(); toast.success('Saved') }
    catch (e) { toast.error(errMsg(e)) } finally { setSaving(false) }
  }
  return (
    <>
      <PageHeader title="Clinic photos" subtitle="Photos shown in the gallery on the website (home page and Facilities). JPG, PNG or WebP, up to 5 MB each." />
      <Card className="mb-6 space-y-4 p-5">
        <h3 className="font-semibold">Add photos</h3>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800" aria-label="Choose photos" />
        {files.length === 1 && <Field label="Caption (optional)"><Input maxLength={200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Reception and waiting area" /></Field>}
        {files.length > 1 && <p className="text-sm text-slate-500">{files.length} photos selected. Add captions afterwards with the edit button.</p>}
        <Button disabled={files.length === 0} loading={busy} onClick={upload}><Plus className="h-4 w-4" /> Upload {files.length > 1 ? `${files.length} photos` : 'photo'}</Button>
      </Card>
      {loading ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : (data ?? []).length === 0 ? <Card><Empty title="No photos yet" hint="Add your first clinic photo above." icon={<Pencil />} /></Card> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data!.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <AuthImage path={`/admin/clinic-photos/${p.id}/image`} alt={p.caption ?? 'Clinic photo'} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium">{p.caption || <span className="text-slate-400">No caption</span>}</p>
                <div className="flex items-center justify-between">{p.active ? <Badge tone="green">Shown</Badge> : <Badge>Hidden</Badge>}
                  <span className="flex gap-1"><Button size="sm" variant="outline" aria-label="Edit photo" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" aria-label="Delete photo" onClick={async () => { if (await confirm({ title: 'Delete this photo?', message: 'It is removed from the website and the server. Hide it instead if you may need it again.', confirmLabel: 'Delete', danger: true })) { try { await api.delete(`/admin/clinic-photos/${p.id}`); reload() } catch (e) { toast.error(errMsg(e)) } } }}><Trash2 className="h-4 w-4" /></Button></span></div>
              </div>
            </Card>))}
        </div>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit photo" footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
        {edit && <div className="space-y-4"><AuthImage path={`/admin/clinic-photos/${edit.id}/image`} alt="Preview" className="aspect-[4/3] w-full rounded-xl object-cover" />
          <Field label="Caption"><Input maxLength={200} value={edit.caption ?? ''} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Display order" hint="Smaller numbers first"><Input type="number" min={0} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Show on website</label></div></div>}
      </Modal>
    </>
  )
}
