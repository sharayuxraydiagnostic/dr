import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Download, Eye, FileText, Pencil, Phone, PhoneCall, Play, Plus, Printer, Receipt, Save, Stethoscope, Trash2, Upload, Users } from 'lucide-react'
import { api, downloadFile, errMsg, openFile } from '../../lib/api'
import { useLoad } from '../../lib/hooks'
import type { AppointmentView, CompleteResponse, ConsultationView, DiagnosisDto, HistoryView, PatientView, PrescriptionItemDto, PrescriptionLang, QueueView, TranslateResponse } from '../../lib/types'
import { LANGS, langName } from '../../lib/lang'
import { openPrescriptionPrint } from '../PrescriptionPrint'
import { fmtDate, fmtDateTime, fmtTime, labelize, money, todayISO } from '../../lib/utils'
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Field, Input, PageHeader, PageLoader, Stat, StatusBadge, Tabs, Textarea, useUI } from '../../components/ui'
import { PatientPicker } from '../../components/PatientParts'
import { PendingRequests } from '../../components/PendingRequests'
import { MedicineInput } from '../../components/MedicineInput'
import { VisitDetails } from '../../components/VisitDetails'
import { BillModal } from '../../components/BillModal'
import { AppointmentsByDate } from '../../components/AppointmentsByDate'
import { ageFromDob, formatAge } from '../../lib/age'
import { istToday } from '../../lib/istDate'
import { followUpDate, fmtLongDate, parseFollowUpDays } from '../../lib/followUp'

/* ---------- Dashboard ---------- */
export function DoctorHome() {
  const nav = useNavigate()
  const { toast } = useUI()
  const queue = useLoad<QueueView[]>(() => api.get('/queue').then((r) => r.data), [], { pollMs: 10000 })
  const appts = useLoad<AppointmentView[]>(() => api.get('/appointments').then((r) => r.data), [], { pollMs: 30000 })
  const [busy, setBusy] = useState<number | null>(null)
  if (queue.loading || appts.loading) return <PageLoader />
  if (queue.error) return <ErrorBox message={queue.error} onRetry={queue.reload} />
  const q = queue.data ?? []
  const inConsult = q.find((x) => x.status === 'IN_CONSULTATION')
  const waiting = q.filter((x) => x.status === 'WAITING')
  const todays = appts.data ?? []
  const upcoming = todays.filter((a) => ['BOOKED', 'CONFIRMED'].includes(a.status))
  const call = async (appointmentId: number) => {
    setBusy(appointmentId)
    try { const { data } = await api.post<ConsultationView>(`/queue/${appointmentId}/call`); nav(`/doctor/consultation/${data.id}`) } catch (e) { toast.error(errMsg(e)); queue.reload() } finally { setBusy(null) }
  }
  const continueConsult = async (appointmentId: number) => {
    const { data } = await api.post<ConsultationView>(`/queue/${appointmentId}/call`); nav(`/doctor/consultation/${data.id}`)
  }
  return (
    <>
      <PageHeader title="Today's clinic" subtitle={fmtDate(todayISO())} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Appointments today" value={todays.filter((a) => a.status !== 'CANCELLED').length} icon={<ClipboardList />} />
        <Stat label="Waiting" value={waiting.length} icon={<Users />} tone="amber" />
        <Stat label="Completed" value={todays.filter((a) => a.status === 'COMPLETED').length} icon={<CheckCircle2 />} tone="sky" />
        <Stat label="Yet to arrive" value={upcoming.length} icon={<Users />} tone="rose" />
      </div>
      <PendingRequests onChange={() => { appts.reload(); queue.reload() }} />
      {inConsult && (
        <Card className="mb-6 border-brand-300 bg-brand-50/50"><div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-xl font-semibold text-white">{inConsult.token}</span>
            <div><p className="text-xs uppercase tracking-wide text-brand-700">In consultation</p><p className="text-lg font-semibold">{inConsult.patientName}</p><p className="text-sm text-slate-500">{inConsult.patientCode}</p></div></div>
          <Button onClick={() => continueConsult(inConsult.appointmentId)}><Play className="h-4 w-4" /> Continue consultation</Button></div></Card>)}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Waiting queue" subtitle="Checked-in patients in token order" />
          {waiting.length === 0 ? <Empty title="No patients waiting" icon={<Users />} /> : <ul className="divide-y divide-slate-100">{waiting.map((w, i) => (
            <li key={w.id} className="flex items-center gap-4 px-5 py-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 font-semibold text-amber-800">{w.token}</span>
              <div className="flex-1"><p className="font-medium">{w.patientName}</p><p className="text-xs text-slate-500">{w.patientCode} - scheduled {fmtTime(w.scheduledTime)}</p></div>
              <Button size="sm" variant={i === 0 ? 'primary' : 'outline'} loading={busy === w.appointmentId} disabled={!!inConsult} onClick={() => call(w.appointmentId)}><PhoneCall className="h-4 w-4" /> Call in</Button></li>))}</ul>}
          {inConsult && waiting.length > 0 && <p className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500">Complete the current consultation to call the next patient.</p>}
        </Card>
        <Card><CardHeader title="Yet to arrive" />
          {upcoming.length === 0 ? <Empty title="Everyone has arrived" icon={<CheckCircle2 />} /> : <ul className="divide-y divide-slate-100">{upcoming.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-5 py-3"><div><p className="font-medium">{a.patientName}</p><p className="text-xs text-slate-500">{fmtTime(a.startTime)} - {labelize(a.type)}{a.reason ? ` - ${a.reason}` : ''}</p></div><StatusBadge status={a.status} /></li>))}</ul>}
        </Card>
      </div>
    </>
  )
}

/* ---------- Consultation ---------- */
export function Consultation() {
  const { id } = useParams()
  const { toast } = useUI()
  const { data: c, loading, error, reload } = useLoad<ConsultationView>(() => api.get(`/consultations/${id}`).then((r) => r.data), [id])
  const history = useLoad<HistoryView>(() => api.get(`/patients/${c!.patientId}/history`).then((r) => r.data), [c?.patientId], { skip: !c })
  const [form, setForm] = useState({ symptoms: '', examinationNotes: '', treatmentPlan: '', testsAdvised: '', advice: '', prescriptionNotes: '' })
  const [lang, setLang] = useState<PrescriptionLang>('EN')
  const [local, setLocal] = useState({ advice: '', tests: '' })
  const [translating, setTranslating] = useState(false)
  const [partial, setPartial] = useState(false)
  const [machine, setMachine] = useState(false)
  const [dx, setDx] = useState<DiagnosisDto[]>([{ name: '' }])
  const [meds, setMeds] = useState<PrescriptionItemDto[]>([])
  const [fuDays, setFuDays] = useState('') // "Follow-up After (Days)"; empty = no follow-up
  const [busy, setBusy] = useState<'save' | 'done' | 'edit' | null>(null)
  const [editing, setEditing] = useState(false) // editing an already completed consultation / prescription
  const [result, setResult] = useState<CompleteResponse | null>(null)
  const [openVisit, setOpenVisit] = useState<number | null>(null)

  const fill = (x: ConsultationView) => {
    setForm({ symptoms: x.symptoms ?? '', examinationNotes: x.examinationNotes ?? '', treatmentPlan: x.treatmentPlan ?? '', testsAdvised: x.testsAdvised ?? '', advice: x.advice ?? '', prescriptionNotes: x.prescriptionNotes ?? '' })
    setDx(x.diagnoses.length ? x.diagnoses : [{ name: '' }])
    setMeds(x.items)
    setLang(x.language ?? 'EN')
    setLocal({ advice: x.adviceLocal ?? '', tests: x.testsAdvisedLocal ?? '' })
    setFuDays(x.followUpDays ? String(x.followUpDays) : '')
  }
  useEffect(() => { if (c) fill(c) }, [c?.id]) // eslint-disable-line

  if (loading) return <PageLoader />
  if (error || !c) return <ErrorBox message={error ?? 'Consultation not found'} onRetry={reload} />

  const fuCheck = parseFollowUpDays(fuDays)
  /** Invalid follow-up days are never saved. */
  const fuValid = () => { if (fuCheck.error) { toast.error(fuCheck.error); return false } return true }
  const rxDate = (c.completedAt ?? '').slice(0, 10) || istToday() // the prescription date: completion day, or today while the consultation is open
  const fuTarget = fuCheck.days ? followUpDate(rxDate, fuCheck.days) : null
  const payload = () => ({
    ...form, followUpDays: fuCheck.days, language: lang, adviceLocal: lang === 'EN' ? undefined : local.advice, testsAdvisedLocal: lang === 'EN' ? undefined : local.tests,
    diagnoses: dx.filter((d) => d.name.trim()), items: meds.filter((m) => m.medicineName.trim()),
  })

  /** English -> Marathi/Hindi for advice, tests and each medicine's frequency/duration/instructions. The doctor can edit everything afterwards. */
  const translateAll = async (target: PrescriptionLang) => {
    if (target === 'EN') return
    const jobs: { key: string; text: string }[] = []
    if (form.advice.trim()) jobs.push({ key: 'advice', text: form.advice })
    if (form.testsAdvised.trim()) jobs.push({ key: 'tests', text: form.testsAdvised })
    meds.forEach((m, i) => (['frequency', 'duration', 'instructions'] as const).forEach((f) => { const t = (m[f] ?? '').trim(); if (t) jobs.push({ key: `${i}.${f}`, text: t }) }))
    if (jobs.length === 0) { toast.info('Nothing to translate yet. Type the advice and medicine instructions in English first, then choose the language.'); return }
    setTranslating(true)
    try {
      const { data } = await api.post<TranslateResponse>('/translate', { target, texts: jobs.map((j) => j.text) })
      const nextLocal = { advice: '', tests: '' }
      const nextMeds = meds.map((m) => ({ ...m, frequencyLocal: undefined, durationLocal: undefined, instructionsLocal: undefined } as PrescriptionItemDto))
      let anyPartial = false
      data.translations.forEach((t, idx) => {
        const k = jobs[idx].key
        if (!t.complete) anyPartial = true
        if (k === 'advice') nextLocal.advice = t.text
        else if (k === 'tests') nextLocal.tests = t.text
        else { const [i, f] = k.split('.'); (nextMeds[Number(i)] as unknown as Record<string, string>)[`${f}Local`] = t.text }
      })
      setLocal(nextLocal); setMeds(nextMeds); setPartial(anyPartial); setMachine(data.machineAvailable)
      if (anyPartial) toast.info('Some lines could not be translated automatically. Please type them in the local language or leave them in English.')
      else toast.success('Translated. Please check the text before saving.')
    } catch (e) { toast.error(errMsg(e)) } finally { setTranslating(false) }
  }
  const chooseLang = (l: PrescriptionLang) => { setLang(l); if (l !== 'EN') translateAll(l) }
  const save = async () => { if (!fuValid()) return; setBusy('save'); try { await api.put(`/consultations/${c.id}`, payload()); toast.success('Draft saved') } catch (e) { toast.error(errMsg(e)) } finally { setBusy(null) } }
  const complete = async () => {
    if (!fuValid()) return
    setBusy('done')
    try {
      const { data } = await api.post<CompleteResponse>(`/consultations/${c.id}/complete`, { consultation: payload(), followUp: fuCheck.days ? 'DAYS' : 'NONE' })
      setResult(data); toast.success('Consultation completed')
    } catch (e) { toast.error(errMsg(e)) } finally { setBusy(null) }
  }
  const completed = c.status === 'COMPLETED' || !!result
  const done = completed && !editing // fields stay read-only unless the doctor presses "Edit prescription"
  const saveEdit = async () => {
    if (!dx.some((d) => d.name.trim())) { toast.error('Keep at least one diagnosis.'); return }
    if (!fuValid()) return
    setBusy('edit')
    try { await api.put(`/consultations/${c.id}`, payload()); toast.success('Prescription updated'); setEditing(false); reload() } catch (e) { toast.error(errMsg(e)) } finally { setBusy(null) }
  }
  const cancelEdit = () => { fill(c); setEditing(false) }
  const setMed = (i: number, p: Partial<PrescriptionItemDto>) => setMeds(meds.map((m, k) => (k === i ? { ...m, ...p } : m)))
  const rxId = result?.consultation.prescriptionId ?? c.prescriptionId

  if (result) return (
    <div className="mx-auto max-w-2xl"><Card className="p-8 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><h1 className="mt-4 text-2xl font-semibold">Consultation completed</h1><p className="mt-2 text-slate-600">{result.followUpMessage}</p>
      {result.followUp && <div className="mx-auto mt-5 max-w-sm rounded-xl bg-sky-50 p-4 text-sm text-sky-900"><b>Follow-up:</b> {fmtDate(result.followUp.date)}{result.followUp.time ? ` at ${fmtTime(result.followUp.time)}` : ''} <StatusBadge status={result.followUp.status} /></div>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {rxId && <Button variant="outline" onClick={() => openPrescriptionPrint(rxId)}><Printer className="h-4 w-4" /> Print prescription{lang !== 'EN' ? ` (${langName(lang)})` : ''}</Button>}
        <Link to={`/doctor/billing?patientId=${result.consultation.patientId}&appointmentId=${result.consultation.appointmentId}`}><Button variant="outline"><Receipt className="h-4 w-4" /> Create bill</Button></Link>
        <Link to={`/doctor/documents?patientId=${result.consultation.patientId}`}><Button variant="outline"><Upload className="h-4 w-4" /> Upload report</Button></Link>
        <Link to="/doctor"><Button>Back to queue</Button></Link></div></Card></div>)

  return (
    <>
      <PageHeader title={`Consultation - ${c.patientName}`} subtitle={`Appointment ${c.appointmentCode} - started ${fmtDateTime(c.startedAt)}`} action={completed ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">{editing ? 'Editing' : 'Completed'}</Badge>
          {!editing && rxId && <Button variant="outline" size="sm" onClick={() => openPrescriptionPrint(rxId)}><Printer className="h-4 w-4" /> Print prescription</Button>}
          {!editing && <Button size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit prescription</Button>}
        </div>) : <Badge tone="blue">In progress</Badge>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card className="space-y-4 p-5"><h3 className="font-semibold">Clinical notes</h3>
            <Field label="Symptoms / complaints"><Textarea disabled={done} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} /></Field>
            <Field label="Examination notes"><Textarea disabled={done} value={form.examinationNotes} onChange={(e) => setForm({ ...form, examinationNotes: e.target.value })} /></Field></Card>
          <Card className="space-y-3 p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Diagnosis</h3><Button size="sm" variant="outline" disabled={done} onClick={() => setDx([...dx, { name: '' }])}><Plus className="h-4 w-4" /> Add</Button></div>
            {dx.map((d, i) => (<div key={i} className="grid grid-cols-12 gap-2"><Input className="col-span-12 sm:col-span-7" placeholder="Diagnosis" disabled={done} value={d.name} onChange={(e) => setDx(dx.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
              <Input className="col-span-9 sm:col-span-4" placeholder="ICD code (optional)" disabled={done} value={d.icdCode ?? ''} onChange={(e) => setDx(dx.map((x, k) => (k === i ? { ...x, icdCode: e.target.value } : x)))} />
              <Button className="col-span-3 sm:col-span-1" variant="ghost" size="sm" disabled={done || dx.length === 1} onClick={() => setDx(dx.filter((_, k) => k !== i))} aria-label="Remove diagnosis"><Trash2 className="h-4 w-4" /></Button></div>))}</Card>
          <Card className="space-y-4 p-5"><h3 className="font-semibold">Treatment plan &amp; tests</h3>
            <Field label="Treatment plan"><Textarea disabled={done} value={form.treatmentPlan} onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })} /></Field>
            <Field label="Tests / reports advised"><Textarea rows={2} disabled={done} value={form.testsAdvised} onChange={(e) => setForm({ ...form, testsAdvised: e.target.value })} placeholder="e.g. X-ray right knee AP/lateral, MRI..." /></Field>
            {lang !== 'EN' && <Field label={`Tests in ${langName(lang)} (editable)`}><Textarea className="font-indic" rows={2} disabled={done} value={local.tests} onChange={(e) => setLocal({ ...local, tests: e.target.value })} /></Field>}</Card>
          <Card className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold">Patient&apos;s language</h3><p className="text-sm text-slate-500">Write in English, then choose Marathi or Hindi. Advice, tests and medicine instructions are translated, you can edit the result, and it is saved and printed in that language.</p></div>
              <div className="flex gap-2" role="radiogroup" aria-label="Prescription language">{LANGS.map((l) => (
                <button key={l.id} type="button" role="radio" aria-checked={lang === l.id} disabled={done || translating} onClick={() => chooseLang(l.id)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${lang === l.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white hover:border-brand-400'} ${l.id !== 'EN' ? 'font-indic' : ''}`}>{l.native}</button>))}</div>
            </div>
            {lang !== 'EN' && !done && <div className="flex flex-wrap items-center gap-3 text-sm"><Button size="sm" variant="outline" loading={translating} onClick={() => translateAll(lang)}>Translate again</Button><span className="text-slate-500">Translating again replaces your edits to the {langName(lang)} text.</span></div>}
            {lang !== 'EN' && partial && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Some sentences are not in the built-in medical phrase list{machine ? '' : ' and automatic translation is not configured on the server'}, so they stay in English. Please type them in {langName(lang)} or keep English.</p>}
          </Card>
          <Card className="space-y-3 p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Prescription</h3><Button size="sm" variant="outline" disabled={done} onClick={() => setMeds([...meds, { medicineName: '' }])}><Plus className="h-4 w-4" /> Add medicine</Button></div>
            <datalist id="freq">{['Once daily', 'Twice daily', 'Three times daily', 'At bedtime', 'SOS (if needed)', '1-0-1', '1-1-1'].map((x) => <option key={x} value={x} />)}</datalist>
            <datalist id="dur">{['3 days', '5 days', '7 days', '10 days', '14 days', '1 month'].map((x) => <option key={x} value={x} />)}</datalist>
            {meds.length === 0 && <p className="text-sm text-slate-500">No medicines added.</p>}
            {meds.map((m, i) => (<div key={i} className="grid grid-cols-12 gap-2 rounded-xl border border-slate-100 p-3">
              <div className="col-span-12 sm:col-span-6"><MedicineInput value={m.medicineName} disabled={done} onChange={(name) => setMed(i, { medicineName: name })} onPick={(p) => setMed(i, p)} /></div>
              <Input className="col-span-12 sm:col-span-6" placeholder="Composition / contains (e.g. Paracetamol 500 mg)" aria-label="Composition" disabled={done} maxLength={300} value={m.composition ?? ''} onChange={(e) => setMed(i, { composition: e.target.value })} />
              <Input className="col-span-6 sm:col-span-3" placeholder="Dosage (e.g. 1 tablet)" aria-label="Dosage" disabled={done} value={m.dosage ?? ''} onChange={(e) => setMed(i, { dosage: e.target.value })} />
              <Input className="col-span-6 sm:col-span-3" list="freq" placeholder="Frequency" aria-label="Frequency" disabled={done} value={m.frequency ?? ''} onChange={(e) => setMed(i, { frequency: e.target.value })} />
              <Input className="col-span-6 sm:col-span-3" list="dur" placeholder="Duration" aria-label="Duration" disabled={done} value={m.duration ?? ''} onChange={(e) => setMed(i, { duration: e.target.value })} />
              <Input className="col-span-12 sm:col-span-2" placeholder="Instructions" aria-label="Instructions" disabled={done} value={m.instructions ?? ''} onChange={(e) => setMed(i, { instructions: e.target.value })} />
              {lang !== 'EN' && <>
                <Input className="font-indic col-span-12 sm:col-span-4" placeholder={`Frequency (${langName(lang)})`} aria-label={`Frequency in ${langName(lang)}`} disabled={done} value={m.frequencyLocal ?? ''} onChange={(e) => setMed(i, { frequencyLocal: e.target.value })} />
                <Input className="font-indic col-span-12 sm:col-span-4" placeholder={`Duration (${langName(lang)})`} aria-label={`Duration in ${langName(lang)}`} disabled={done} value={m.durationLocal ?? ''} onChange={(e) => setMed(i, { durationLocal: e.target.value })} />
                <Input className="font-indic col-span-12 sm:col-span-4" placeholder={`Instructions (${langName(lang)})`} aria-label={`Instructions in ${langName(lang)}`} disabled={done} value={m.instructionsLocal ?? ''} onChange={(e) => setMed(i, { instructionsLocal: e.target.value })} /></>}
              <Button className="col-span-6 sm:col-span-1" variant="ghost" size="sm" disabled={done} onClick={() => setMeds(meds.filter((_, k) => k !== i))} aria-label="Remove medicine"><Trash2 className="h-4 w-4" /></Button></div>))}
            <Field label="Advice / notes for patient"><Textarea rows={2} disabled={done} value={form.advice} onChange={(e) => setForm({ ...form, advice: e.target.value })} /></Field>
            {lang !== 'EN' && <Field label={`Advice in ${langName(lang)} (editable)`}><Textarea className="font-indic" rows={3} disabled={done} value={local.advice} onChange={(e) => setLocal({ ...local, advice: e.target.value })} /></Field>}</Card>
          <Card className="p-5"><h3 className="mb-3 font-semibold">Follow-up</h3>
            {completed && <p className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{c.followUp ? <>Follow-up already arranged for <b>{fmtDate(c.followUp.date)}</b>{c.followUp.time ? ` at ${fmtTime(c.followUp.time)}` : ''} <StatusBadge status={c.followUp.status} />. It is not changed by editing the prescription; reschedule it from the appointment if needed.</> : 'No follow-up was arranged. Editing the prescription does not create one.'}</p>}
            <div className="max-w-xs"><Field label="Follow-up After (Days)" error={fuCheck.error} hint="Leave empty for no follow-up">
              <Input inputMode="numeric" autoComplete="off" maxLength={3} placeholder="e.g. 7" disabled={done} invalid={!!fuCheck.error} value={fuDays} onChange={(e) => setFuDays(e.target.value)} /></Field></div>
            {fuTarget && <p data-testid="fu-date" className="mt-3 text-sm text-slate-600">Follow-up Date: <b>{fmtLongDate(fuTarget)}</b>{completed
              ? '. This is the follow-up advice on the prescription; it does not create, move or cancel any appointment.'
              : '. A follow-up appointment is booked automatically (the next working day with a free slot, if needed) and the patient gets reminders.'}</p>}</Card>
          {editing && <div className="sticky bottom-3 z-10 flex flex-wrap justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <Button variant="outline" disabled={busy === 'edit'} onClick={cancelEdit}>Cancel</Button>
            <Button loading={busy === 'edit'} onClick={saveEdit}><Save className="h-4 w-4" /> Save changes</Button></div>}
          {!completed && <div className="sticky bottom-3 z-10 flex flex-wrap justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <Button variant="outline" loading={busy === 'save'} onClick={save}><Save className="h-4 w-4" /> Save draft</Button>
            <Button loading={busy === 'done'} onClick={complete}><CheckCircle2 className="h-4 w-4" /> Complete consultation</Button></div>}
        </div>
        <aside className="space-y-4">
          <Card><CardHeader title="Patient" />{history.data ? <div className="space-y-1 px-5 py-4 text-sm"><p className="text-base font-semibold">{history.data.patient.fullName}</p><p className="text-slate-500">{history.data.patient.patientCode}</p>
            <p><Phone className="mr-1 inline h-3.5 w-3.5" />{history.data.patient.phone}</p>{ageFromDob(history.data.patient.dateOfBirth) !== null && <p>Patient Age: {formatAge(history.data.patient.dateOfBirth)}</p>}{history.data.patient.gender && <p>Gender: {history.data.patient.gender}</p>}{history.data.patient.bloodGroup && <p>Blood group: {history.data.patient.bloodGroup}</p>}</div> : <PageLoader />}</Card>
          <Card><CardHeader title="Previous visits" subtitle="Most recent first - click a visit to see everything" />
            {!history.data ? <PageLoader /> : history.data.consultations.filter((x) => x.id !== c.id).length === 0 ? <Empty title="First visit" /> :
              <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">{history.data.consultations.filter((x) => x.id !== c.id).map((x) => (
                <li key={x.id}>
                  <button type="button" aria-expanded={openVisit === x.id} onClick={() => setOpenVisit(openVisit === x.id ? null : x.id)} className="flex w-full items-start justify-between gap-2 px-5 py-3 text-left hover:bg-slate-50">
                    <span><span className="block text-sm font-medium">{fmtDate(x.startedAt)}</span><span className="block text-xs text-slate-500">{x.diagnoses.map((d) => d.name).join(', ') || 'No diagnosis recorded'}</span></span>
                    <span className="text-xs text-brand-700">{openVisit === x.id ? 'Hide' : 'View'}</span></button>
                  {openVisit === x.id && <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4"><VisitDetails c={x} compact /></div>}
                </li>))}</ul>}</Card>
          {history.data && history.data.reports.length > 0 && <Card><CardHeader title="Reports" /><ul className="divide-y divide-slate-100">{history.data.reports.slice(0, 5).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm"><span>{r.title}<br /><span className="text-xs text-slate-500">{labelize(r.reportType)} - {fmtDate(r.reportDate)}</span></span>{r.documentId && <Button size="sm" variant="outline" onClick={() => openFile(`/documents/${r.documentId}/download`).catch((e) => toast.error(errMsg(e)))}><Eye className="h-4 w-4" /></Button>}</li>))}</ul></Card>}
        </aside>
      </div>
    </>
  )
}

/* ---------- Patients & history ---------- */
export function DoctorPatients() {
  const [p, setP] = useState<PatientView | null>(null)
  const nav = useNavigate()
  return (
    <>
      <PageHeader title="Patient search" subtitle="Find your patients by name, phone, patient ID or appointment ID" />
      <Card className="max-w-2xl p-5"><PatientPicker value={p} onChange={(v) => { setP(v); if (v) nav(`/doctor/patients/${v.id}`) }} /></Card>
      <AppointmentsByDate />
    </>
  )
}

export function PatientHistory() {
  const { id } = useParams()
  const { data, loading, error, reload } = useLoad<HistoryView>(() => api.get(`/patients/${id}/history`).then((r) => r.data), [id])
  const { toast } = useUI()
  const [tab, setTab] = useState<'visits' | 'rx' | 'follow' | 'reports' | 'bills'>('visits')
  const [viewBill, setViewBill] = useState<import('../../lib/types').BillView | null>(null)
  if (loading) return <PageLoader />
  if (error || !data) return <ErrorBox message={error ?? 'Not found'} onRetry={reload} />
  const { patient: p } = data
  return (
    <>
      <PageHeader title={p.fullName} subtitle={`${p.patientCode} - ${p.phone}${p.dateOfBirth ? ` - Age ${formatAge(p.dateOfBirth)}` : ''}${p.gender ? ` - ${p.gender}` : ''}${p.bloodGroup ? ` - ${p.bloodGroup}` : ''}`} action={<Link to="/doctor/patients"><Button variant="outline">Search another</Button></Link>} />
      <Card><div className="px-4 pt-2"><Tabs value={tab} onChange={setTab} tabs={[
        { id: 'visits', label: 'Consultations', count: data.consultations.length }, { id: 'rx', label: 'Prescriptions', count: data.prescriptions.length },
        { id: 'follow', label: 'Appointments & follow-ups', count: data.appointments.length }, { id: 'reports', label: 'Reports', count: data.reports.length }, { id: 'bills', label: 'Billing', count: data.bills.length }]} /></div>
        <div className="p-5">
          {tab === 'visits' && (data.consultations.length === 0 ? <Empty title="No consultations yet" icon={<Stethoscope />} /> : <div className="space-y-4">{data.consultations.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{fmtDateTime(c.startedAt)}</p><span className="flex gap-2"><StatusBadge status={c.status} /><span className="text-xs text-slate-500">{c.doctorName}</span></span></div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">{([['Symptoms', c.symptoms], ['Examination', c.examinationNotes], ['Diagnosis', c.diagnoses.map((d) => d.name).join(', ')], ['Treatment plan', c.treatmentPlan], ['Tests advised', c.testsAdvised], ['Advice', c.advice]] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt><dd className="whitespace-pre-line text-slate-800">{v}</dd></div>)}</dl>
              {c.followUp && <p className="mt-3 text-sm text-sky-800">Follow-up: {fmtDate(c.followUp.date)} <StatusBadge status={c.followUp.status} /></p>}</div>))}</div>)}
          {tab === 'rx' && (data.prescriptions.length === 0 ? <Empty title="No prescriptions" icon={<FileText />} /> : <div className="space-y-4">{data.prescriptions.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex items-center justify-between"><p className="font-semibold">{r.code} - {fmtDate(r.date)}</p><div className="flex gap-2"><Link to={`/doctor/consultation/${r.consultationId}`}><Button size="sm" variant="outline"><Pencil className="h-4 w-4" /> Edit</Button></Link><Button size="sm" variant="outline" onClick={() => openPrescriptionPrint(r.id)}><Printer className="h-4 w-4" /> Print / PDF</Button></div></div>
              <ul className="list-inside list-disc text-sm text-slate-700">{r.items.map((i, k) => <li key={k}><b>{i.medicineName}</b>{i.composition && <span className="text-slate-500"> ({i.composition})</span>} {[i.dosage, i.frequencyLocal || i.frequency, i.durationLocal || i.duration, i.instructionsLocal || i.instructions].filter(Boolean).join(' - ')}</li>)}</ul></div>))}</div>)}
          {tab === 'follow' && <div className="overflow-x-auto"><table className="min-w-full"><thead><tr><th className="th">Date</th><th className="th">Type</th><th className="th">Reason</th><th className="th">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.appointments.map((a) => <tr key={a.id}><td className="td">{fmtDate(a.date)} {fmtTime(a.startTime)}</td><td className="td">{labelize(a.type)}</td><td className="td">{a.reason ?? '-'}</td><td className="td"><StatusBadge status={a.status} /></td></tr>)}</tbody></table></div>}
          {tab === 'reports' && (data.reports.length === 0 ? <Empty title="No reports uploaded" icon={<FileText />} /> : <ul className="divide-y divide-slate-100">{data.reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{r.title}</p><p className="text-xs text-slate-500">{labelize(r.reportType)} - {fmtDate(r.reportDate)}</p></div>
              {r.documentId && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openFile(`/documents/${r.documentId}/download`).catch((e) => toast.error(errMsg(e)))}><Eye className="h-4 w-4" /> View</Button><Button size="sm" variant="outline" onClick={() => downloadFile(`/documents/${r.documentId}/download`, r.fileName ?? 'report').catch((e) => toast.error(errMsg(e)))}><Download className="h-4 w-4" /></Button></div>}</li>))}</ul>)}
          {tab === 'bills' && (data.bills.length === 0 ? <Empty title="No bills" /> : <div className="overflow-x-auto"><table className="min-w-full"><thead><tr><th className="th">Invoice</th><th className="th">Date</th><th className="th">Total</th><th className="th">Pending</th><th className="th">Status</th><th className="th" /></tr></thead><tbody className="divide-y divide-slate-100">{data.bills.map((b) => <tr key={b.id}><td className="td">{b.billNumber}</td><td className="td">{fmtDate(b.createdAt)}</td><td className="td">{money(b.total)}</td><td className="td">{money(b.pending)}</td><td className="td"><StatusBadge status={b.status} /></td><td className="td text-right"><Button size="sm" variant="outline" onClick={() => setViewBill(b)}><Eye className="h-4 w-4" /> View</Button></td></tr>)}</tbody></table></div>)}
        </div></Card>
      <BillModal bill={viewBill} onClose={() => setViewBill(null)} />
    </>
  )
}
