import { useMemo, useState } from 'react'
import { ArrowLeft, Download, Eye, FilePlus2, FileSignature, Pencil, Printer, Repeat, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { api, downloadFile, errMsg } from '../../lib/api'
import { useLoad } from '../../lib/hooks'
import { useAuth } from '../../context/AuthContext'
import { DOC_TYPES, STATUS_LABEL, docDef, validateDoc } from '../../lib/medicalDocs'
import type { DoctorView, MedDocType, MedicalDocView, PatientView, PrintSettings } from '../../lib/types'
import { fmtDate, fmtDateTime, todayISO } from '../../lib/utils'
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Field, Input, Modal, PageHeader, PageLoader, Select, Textarea, useUI } from '../../components/ui'
import { PatientPicker } from '../../components/PatientParts'
import { SheetPreview } from '../../components/MedicalDocumentSheet'

const openPrint = (id: number) => window.open(`/print/medical-document/${id}`, '_blank')
const DEFAULT_MARGINS: PrintSettings = { top: 55, bottom: 30, left: 20, right: 20 }

/* ---------- Print area (letterhead) settings ---------- */
function PrintAreaModal({ initial, onClose, onSaved }: { initial: PrintSettings; onClose: () => void; onSaved: (p: PrintSettings) => void }) {
  const { toast } = useUI()
  const [m, setM] = useState(initial)
  const [busy, setBusy] = useState(false)
  const bad = m.top < 0 || m.top > 150 || m.bottom < 0 || m.bottom > 150 || m.left < 0 || m.left > 60 || m.right < 0 || m.right > 60 || Object.values(m).some((v) => !Number.isInteger(v))
  const num = (k: keyof PrintSettings, label: string, max: number) => (
    <Field label={`${label} (mm)`} error={m[k] < 0 || m[k] > max ? `0 to ${max}` : undefined}><Input type="number" min={0} max={max} value={m[k]} onChange={(e) => setM({ ...m, [k]: Number(e.target.value) })} /></Field>)
  return (
    <Modal open onClose={onClose} title="Letterhead print area" footer={<><Button variant="outline" onClick={() => window.open('/print/alignment', '_blank')}><Printer className="h-4 w-4" /> Print test sheet</Button>
      <Button disabled={bad} loading={busy} onClick={async () => { setBusy(true); try { const { data } = await api.put<PrintSettings>('/medical-documents/print-settings', m); toast.success('Print area saved'); onSaved(data) } catch (e) { toast.error(errMsg(e)) } finally { setBusy(false) } }}>Save</Button></>}>
      <p className="mb-4 text-sm text-slate-600">Your letterhead already carries the clinic name, logo, address and phone. Documents print only inside the blank area. Measure the printed header and footer on your paper and enter how many millimetres to leave empty.
        Save, then press <b>Print test sheet</b> on your letterhead to check the dashed box.</p>
      <div className="grid grid-cols-2 gap-3">{num('top', 'Top (below the letterhead header)', 150)}{num('bottom', 'Bottom (above the footer)', 150)}{num('left', 'Left', 60)}{num('right', 'Right', 60)}</div>
    </Modal>
  )
}

/* ---------- Editor ---------- */
function Editor({ type, patient, initial, doctor, margins, onClose, onChanged }: { type: MedDocType; patient: { id: number; fullName: string; patientCode: string }; initial: MedicalDocView | null; doctor?: DoctorView; margins: PrintSettings; onClose: () => void; onChanged: () => void }) {
  const def = docDef(type)
  const { toast, confirm } = useUI()
  const [doc, setDoc] = useState<MedicalDocView | null>(initial)
  const [content, setContent] = useState<Record<string, string>>(initial?.content ?? {})
  const [date, setDate] = useState(initial?.documentDate ?? todayISO())
  const [busy, setBusy] = useState<'save' | 'issue' | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const issued = doc?.status === 'ISSUED'
  const errs = useMemo(() => validateDoc(def, content, false), [def, content])
  const issueErrs = useMemo(() => validateDoc(def, content, true), [def, content])
  const shown = showErrors ? issueErrs : errs
  const regMissing = !doctor?.registrationNumber?.trim()

  const save = async (): Promise<MedicalDocView | null> => {
    if (Object.keys(errs).length) { setShowErrors(true); toast.error('Please correct the highlighted fields.'); return null }
    setBusy('save')
    try {
      const { data } = doc ? await api.put<MedicalDocView>(`/medical-documents/${doc.id}`, { documentDate: date, content }) : await api.post<MedicalDocView>('/medical-documents', { patientId: patient.id, docType: type, documentDate: date, content })
      setDoc(data); onChanged(); return data
    } catch (e) { toast.error(errMsg(e)); return null } finally { setBusy(null) }
  }
  const issue = async () => {
    setShowErrors(true)
    if (Object.keys(issueErrs).length) return toast.error('Fill the required fields before issuing.')
    if (!(await confirm({ title: 'Issue this document?', message: 'Once issued it becomes a read-only record and can be printed. To correct it later you will make a revised copy.', confirmLabel: 'Issue' }))) return
    const saved = await save()
    if (!saved) return
    setBusy('issue')
    try { const { data } = await api.post<MedicalDocView>(`/medical-documents/${saved.id}/issue`); setDoc(data); toast.success(`${data.code} issued`); onChanged() }
    catch (e) { toast.error(errMsg(e)) } finally { setBusy(null) }
  }
  const revise = async () => {
    try { const { data } = await api.post<MedicalDocView>(`/medical-documents/${doc!.id}/revise`); toast.success(`Revision ${data.code} created as a draft`); onChanged(); setDoc(data); setContent(data.content); setDate(data.documentDate) }
    catch (e) { toast.error(errMsg(e)) }
  }
  const pdf = () => downloadFile(`/medical-documents/${doc!.id}/pdf`, `${doc!.code}.pdf`).catch((e) => toast.error(errMsg(e)))
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this draft?', message: 'The draft will be removed. Issued documents cannot be deleted.', confirmLabel: 'Delete', danger: true }))) return
    try { await api.delete(`/medical-documents/${doc!.id}`); onChanged(); onClose() } catch (e) { toast.error(errMsg(e)) }
  }

  const sheet = { docType: type, documentDate: date, patientName: doc?.patientName ?? patient.fullName, patientCode: doc?.patientCode ?? patient.patientCode,
    doctorName: doc?.doctorName ?? doctor?.fullName ?? '', doctorQualification: doc?.doctorQualification ?? doctor?.qualification, doctorRegistrationNumber: doc?.doctorRegistrationNumber ?? doctor?.registrationNumber, content }

  return (
    <>
      <PageHeader title={def.title} subtitle={`${patient.fullName} (${patient.patientCode})${doc ? ` - ${doc.code}` : ''}`}
        action={<div className="flex items-center gap-2">{doc && <Badge tone={issued ? 'green' : 'amber'}>{STATUS_LABEL[doc.status]}</Badge>}<Button variant="outline" onClick={onClose}><ArrowLeft className="h-4 w-4" /> Back</Button></div>} />
      {regMissing && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Your medical registration number is not set. You can save drafts, but the admin must add it (Admin &gt; Doctors) before a document can be issued.</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Only what you type here is printed. Nothing is filled in automatically - please verify every entry before issuing.</p>
          <Field label="Document date"><Input type="date" disabled={issued} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          {def.fields.map((f) => (
            <Field key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} error={shown[f.key]}>
              {f.kind === 'date' ? <Input type="date" disabled={issued} invalid={!!shown[f.key]} value={content[f.key] ?? ''} onChange={(e) => setContent({ ...content, [f.key]: e.target.value })} />
                : f.kind === 'textarea' ? <Textarea rows={f.rows ?? 3} maxLength={f.max} disabled={issued} invalid={!!shown[f.key]} value={content[f.key] ?? ''} onChange={(e) => setContent({ ...content, [f.key]: e.target.value })} />
                : <Input maxLength={f.max} disabled={issued} invalid={!!shown[f.key]} placeholder={f.placeholder} value={content[f.key] ?? ''} onChange={(e) => setContent({ ...content, [f.key]: e.target.value })} />}
            </Field>))}
          {shown._form && <p role="alert" className="text-sm text-red-600">{shown._form}</p>}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {!issued && <><Button variant="outline" loading={busy === 'save'} onClick={save}><Save className="h-4 w-4" /> Save draft</Button>
              <Button loading={busy === 'issue'} disabled={regMissing} onClick={issue}><ShieldCheck className="h-4 w-4" /> Issue</Button></>}
            {issued && <><Button onClick={() => openPrint(doc!.id)}><Printer className="h-4 w-4" /> Print</Button><Button variant="outline" onClick={pdf}><Download className="h-4 w-4" /> Download PDF</Button>
              <Button variant="outline" onClick={revise}><Repeat className="h-4 w-4" /> Revise</Button></>}
            {doc && !issued && <Button variant="ghost" className="text-red-600" onClick={remove}><Trash2 className="h-4 w-4" /> Delete draft</Button>}
          </div>
          {issued && <p className="text-xs text-slate-500">Issued {fmtDateTime(doc!.issuedAt)} - printed {doc!.printCount} time(s). An issued document is a locked record; use Revise to correct it.</p>}
        </Card>
        <div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Eye className="h-4 w-4" /> Preview <span className="font-normal text-slate-500">(how it prints on your letterhead paper)</span></p><SheetPreview d={sheet} margins={margins} /></div>
      </div>
    </>
  )
}

/* ---------- Page ---------- */
export function MedicalDocuments() {
  const { user } = useAuth()
  const { toast, confirm } = useUI()
  const [patient, setPatient] = useState<PatientView | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<{ type: MedDocType; doc: MedicalDocView | null; patient: { id: number; fullName: string; patientCode: string } } | null>(null)
  const [areaOpen, setAreaOpen] = useState(false)

  const docs = useLoad<MedicalDocView[]>(() => api.get('/medical-documents', { params: { patientId: patient?.id, type: typeFilter || undefined, status: statusFilter || undefined } }).then((r) => r.data), [patient?.id, typeFilter, statusFilter])
  const doctors = useLoad<DoctorView[]>(() => api.get('/staff/doctors').then((r) => r.data))
  const margins = useLoad<PrintSettings>(() => api.get('/medical-documents/print-settings').then((r) => r.data))
  const me = (doctors.data ?? []).find((d) => d.id === user?.doctorId)
  const m = margins.data ?? DEFAULT_MARGINS

  if (editing) return <Editor key={editing.doc?.id ?? 'new'} type={editing.type} patient={editing.patient} initial={editing.doc} doctor={me} margins={m} onClose={() => { setEditing(null); docs.reload() }} onChanged={docs.reload} />

  const openDoc = (d: MedicalDocView) => setEditing({ type: d.docType, doc: d, patient: { id: d.patientId, fullName: d.patientName, patientCode: d.patientCode } })
  const removeDraft = async (d: MedicalDocView) => {
    if (!(await confirm({ title: 'Delete this draft?', message: `${d.code} will be removed.`, confirmLabel: 'Delete', danger: true }))) return
    try { await api.delete(`/medical-documents/${d.id}`); docs.reload() } catch (e) { toast.error(errMsg(e)) }
  }

  return (
    <>
      <PageHeader title="Medical documents" subtitle="Certificates, referral and admission advice - printed on your own letterhead paper"
        action={<Button variant="outline" onClick={() => setAreaOpen(true)}><FileSignature className="h-4 w-4" /> Letterhead print area</Button>} />

      <Card className="mb-6 space-y-4 p-5">
        <h3 className="font-semibold">Create a document</h3>
        <PatientPicker value={patient} onChange={setPatient} placeholder="1. Select the patient: name, phone, patient ID or appointment ID" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DOC_TYPES.map((t) => (
            <button key={t.id} type="button" disabled={!patient} onClick={() => patient && setEditing({ type: t.id, doc: null, patient })}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-400 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-50">
              <FilePlus2 className="mb-2 h-5 w-5 text-brand-600" /><p className="font-medium">{t.title}</p><p className="mt-1 text-xs text-slate-500">{t.description}</p>
            </button>))}
        </div>
        {!patient && <p className="text-xs text-slate-500">Select a patient first. Only patients who have an appointment with you can be chosen.</p>}
      </Card>

      <Card>
        <CardHeader title={patient ? `Documents for ${patient.fullName}` : 'Recent documents'} subtitle="Drafts can be edited; issued documents are locked records"
          action={<div className="flex gap-2"><Select className="w-48" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Type"><option value="">All types</option>{DOC_TYPES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select>
            <Select className="w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status"><option value="">All</option><option value="DRAFT">Drafts</option><option value="ISSUED">Issued</option></Select></div>} />
        {docs.loading ? <PageLoader /> : docs.error ? <div className="p-4"><ErrorBox message={docs.error} onRetry={docs.reload} /></div> : (docs.data ?? []).length === 0 ? <Empty title="No documents yet" icon={<FileSignature />} /> :
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100"><thead><tr><th className="th">Document</th><th className="th">Patient</th><th className="th">Date</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">{docs.data!.map((d) => (
              <tr key={d.id}><td className="td"><p className="font-medium">{docDef(d.docType).title}</p><p className="text-xs text-slate-500">{d.code}{d.revisionOfId ? ' (revision)' : ''}</p></td>
                <td className="td">{d.patientName}<br /><span className="text-xs text-slate-500">{d.patientCode}</span></td><td className="td">{fmtDate(d.documentDate)}</td>
                <td className="td"><Badge tone={d.status === 'ISSUED' ? 'green' : 'amber'}>{STATUS_LABEL[d.status]}</Badge></td>
                <td className="td"><div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="outline" aria-label={`${d.status === 'DRAFT' ? 'Edit' : 'View'} ${d.code}`} onClick={() => openDoc(d)}>{d.status === 'DRAFT' ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  {d.status === 'ISSUED' && <Button size="sm" variant="outline" aria-label={`Print ${d.code}`} onClick={() => openPrint(d.id)}><Printer className="h-4 w-4" /></Button>}
                  {d.status === 'DRAFT' && <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Delete ${d.code}`} onClick={() => removeDraft(d)}><Trash2 className="h-4 w-4" /></Button>}</div></td></tr>))}</tbody></table></div>}
      </Card>
      {areaOpen && <PrintAreaModal initial={m} onClose={() => setAreaOpen(false)} onSaved={() => { setAreaOpen(false); margins.reload() }} />}
    </>
  )
}
