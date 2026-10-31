import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { api } from '../lib/api'
import { useLoad } from '../lib/hooks'
import { usePageStyle } from '../lib/pageStyle'
import { useOptionalAuth } from '../context/AuthContext'
import { useSite } from '../context/SiteContext'
import type { PrescriptionView, PrintSettings } from '../lib/types'
import { fmtDate } from '../lib/utils'
import { formatAge } from '../lib/age'
import { followUpDate, fmtLongDate } from '../lib/followUp'
import { langName } from '../lib/lang'
import { Button, ErrorBox, PageLoader } from '../components/ui'
import { LangText } from '../components/LangText'

/**
 * Print-ready prescription (A4). Printing from the browser renders Marathi/Hindi correctly with the device's Devanagari fonts,
 * and "Save as PDF" in the print dialog gives the patient a PDF in their own language.
 */
/** Same A4 / zero-margin rules as the medical certificate print (PrintMedicalDocument). Only added to the page while letterhead mode is on. */
const LETTERHEAD_CSS = '@page { size: A4 portrait; margin: 0; } html, body { background: #fff !important; margin: 0 !important; } @media print { .no-print { display: none !important; } }'

export function PrescriptionPrint() {
  const { id } = useParams()
  const { settings } = useSite()
  const isDoctor = useOptionalAuth()?.user?.role === 'DOCTOR'
  // Letterhead mode (doctor only, same margins as the certificate print settings): the clinic header is already on the pre-printed paper.
  const [onLetterhead, setOnLetterhead] = useState(true)
  const { data: rx, loading, error, reload } = useLoad<PrescriptionView>(() => api.get(`/prescriptions/${id}`).then((r) => r.data), [id])
  const cfg = useLoad<PrintSettings>(() => api.get('/medical-documents/print-settings').then((r) => r.data), [], { skip: !isDoctor })
  const lh = isDoctor && onLetterhead && !!cfg.data
  usePageStyle(lh ? LETTERHEAD_CSS : '')
  if (loading || (isDoctor && cfg.loading)) return <PageLoader />
  if (error || !rx) return <div className="p-6"><ErrorBox message={error ?? 'Prescription not found'} onRetry={reload} /></div>
  const local = rx.language && rx.language !== 'EN'
  const m = cfg.data
  const body = (
    <div className={lh ? 'bg-white text-black' : 'mx-auto max-w-[210mm] bg-white p-6 text-slate-900 print:p-0'}>
      {!lh && <header className="border-b-2 border-brand-600 pb-3 text-center">
        <h1 className="text-xl font-semibold text-brand-700">{settings.hospital_name}</h1>
        <p className="text-xs text-slate-500">{settings.address} {settings.phone ? ` | Phone: ${settings.phone}` : ''}</p>
      </header>}

      <section className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div><p className="font-semibold">{rx.patientName} <span className="font-normal text-slate-500">({rx.patientCode})</span></p>
          <p className="text-slate-600">{[rx.patientGender, rx.patientDob ? `Patient Age: ${formatAge(rx.patientDob)}` : '', rx.patientPhone].filter(Boolean).join(' | ')}</p></div>
        <div className="text-right"><p className="font-semibold">{rx.code}</p><p className="text-slate-600">{fmtDate(rx.date)}</p></div>
      </section>

      {(rx.symptoms || rx.examinationNotes) && (
        <section data-testid="rx-clinical-notes" className="mt-3 space-y-1 text-sm">
          <p className="font-semibold">Clinical notes</p>
          {rx.symptoms && <p style={{ whiteSpace: 'pre-line' }}><b>Symptoms / complaints:</b> {rx.symptoms}</p>}
          {rx.examinationNotes && <p style={{ whiteSpace: 'pre-line' }}><b>Examination notes:</b> {rx.examinationNotes}</p>}
        </section>)}

      {rx.diagnoses.length > 0 && <p className="mt-3 text-sm"><b>Diagnosis:</b> {rx.diagnoses.join('; ')}</p>}

      <p className={`mt-3 text-2xl font-bold ${lh ? 'text-black' : 'text-brand-700'}`}>Rx</p>
      <table className="mt-1 w-full border-collapse text-sm">
        <thead><tr className={lh ? 'border-b border-black text-left text-xs text-black' : 'bg-brand-600 text-left text-xs text-white'}><th className="p-2">#</th><th className="p-2">Medicine</th><th className="p-2">Dosage</th><th className="p-2">Frequency</th><th className="p-2">Duration</th><th className="p-2">Instructions</th></tr></thead>
        <tbody>{rx.items.map((i, k) => (
          <tr key={k} className="border-b border-slate-200 align-top">
            <td className="p-2">{k + 1}</td>
            <td className="p-2"><b>{i.medicineName}</b>{i.composition && <span className="block text-xs text-slate-500">{i.composition}</span>}</td>
            <td className="p-2">{i.dosage}</td>
            <td className="p-2"><LangText en={i.frequency} local={i.frequencyLocal} /></td>
            <td className="p-2"><LangText en={i.duration} local={i.durationLocal} /></td>
            <td className="p-2"><LangText en={i.instructions} local={i.instructionsLocal} /></td>
          </tr>))}</tbody>
      </table>

      {(rx.testsAdvised || rx.testsAdvisedLocal) && <section className="mt-4 text-sm"><p className="font-semibold">{local ? 'Tests advised / तपासण्या' : 'Tests advised'}</p><LangText en={rx.testsAdvised} local={rx.testsAdvisedLocal} /></section>}
      {(rx.advice || rx.adviceLocal) && <section className="mt-3 text-sm"><p className="font-semibold">{local ? 'Advice / सल्ला' : 'Advice'}</p><LangText en={rx.advice} local={rx.adviceLocal} /></section>}
      {rx.notes && <p className="mt-3 text-sm"><b>Notes:</b> {rx.notes}</p>}
      {rx.followUpDays ? <p data-testid="rx-followup" className="mt-3 text-sm"><b>Follow-up:</b> after {rx.followUpDays} day{rx.followUpDays === 1 ? '' : 's'} ({fmtLongDate(followUpDate(rx.date.slice(0, 10), rx.followUpDays))})</p> : null}

      <footer className="mt-10 flex items-end justify-between text-sm">
        <p className="text-xs text-slate-400">Computer generated prescription. Please follow your doctor&apos;s advice.</p>
        <div className="text-right"><p className="font-semibold">{rx.doctorName}</p>
          {rx.doctorQualification && !rx.doctorQualification.startsWith('[') && <p className="text-slate-600">{rx.doctorQualification}</p>}
          {rx.doctorRegistrationNumber && <p className="text-slate-600">Reg. No: {rx.doctorRegistrationNumber}</p>}</div>
      </footer>
    </div>
  )
  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
        <div className="text-sm text-slate-600">
          <p>Language: <b>{langName(rx.language)}</b>. Use <b>Print</b>, and choose &quot;Save as PDF&quot; to download.</p>
          {isDoctor && <label className="mt-1 flex items-center gap-2"><input type="checkbox" checked={onLetterhead} onChange={(e) => setOnLetterhead(e.target.checked)} /> Print on my letterhead paper (hides the clinic header; uses the same margins as certificates)</label>}
          {lh && <p className="mt-1 text-xs text-slate-500">Paper A4, Portrait, Scale 100%, Margins: None, headers/footers and background graphics off.</p>}
        </div>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
      </div>
      {lh && m ? (
        <table data-testid="rx-print-sheet" style={{ width: '210mm', maxWidth: '100%', margin: '0 auto', borderCollapse: 'collapse', background: '#fff' }}>
          <thead><tr><td data-testid="rx-spacer-top" style={{ height: `${m.top}mm`, padding: 0 }}><span className="no-print" style={{ fontSize: '9pt', color: '#94a3b8' }}>&nbsp;Letterhead area ({m.top} mm) - not printed</span></td></tr></thead>
          <tbody><tr><td style={{ padding: `0 ${m.right}mm 0 ${m.left}mm`, verticalAlign: 'top' }}>{body}</td></tr></tbody>
          <tfoot><tr><td data-testid="rx-spacer-bottom" style={{ height: `${m.bottom}mm`, padding: 0 }}><span className="no-print" style={{ fontSize: '9pt', color: '#94a3b8' }}>&nbsp;Letterhead footer area ({m.bottom} mm) - not printed</span></td></tr></tfoot>
        </table>
      ) : body}
    </>
  )
}

export const openPrescriptionPrint = (id: number) => window.open(`/print/prescription/${id}`, '_blank', 'noopener')
