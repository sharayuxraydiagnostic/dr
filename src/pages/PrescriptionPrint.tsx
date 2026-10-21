import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { api } from '../lib/api'
import { useLoad } from '../lib/hooks'
import { useSite } from '../context/SiteContext'
import type { PrescriptionView } from '../lib/types'
import { fmtDate } from '../lib/utils'
import { langName } from '../lib/lang'
import { Button, ErrorBox, PageLoader } from '../components/ui'
import { LangText } from '../components/LangText'

/**
 * Print-ready prescription (A4). Printing from the browser renders Marathi/Hindi correctly with the device's Devanagari fonts,
 * and "Save as PDF" in the print dialog gives the patient a PDF in their own language.
 */
export function PrescriptionPrint() {
  const { id } = useParams()
  const { settings } = useSite()
  const { data: rx, loading, error, reload } = useLoad<PrescriptionView>(() => api.get(`/prescriptions/${id}`).then((r) => r.data), [id])
  if (loading) return <PageLoader />
  if (error || !rx) return <div className="p-6"><ErrorBox message={error ?? 'Prescription not found'} onRetry={reload} /></div>
  const local = rx.language && rx.language !== 'EN'
  return (
    <div className="mx-auto max-w-[210mm] bg-white p-6 text-slate-900 print:p-0">
      <div className="no-print mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
        <p className="text-sm text-slate-600">Language: <b>{langName(rx.language)}</b>. Use <b>Print</b>, and choose &quot;Save as PDF&quot; to download.</p>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
      </div>

      <header className="border-b-2 border-brand-600 pb-3 text-center">
        <h1 className="text-xl font-semibold text-brand-700">{settings.hospital_name}</h1>
        <p className="text-xs text-slate-500">{settings.address} {settings.phone ? ` | Phone: ${settings.phone}` : ''}</p>
      </header>

      <section className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div><p className="font-semibold">{rx.patientName} <span className="font-normal text-slate-500">({rx.patientCode})</span></p>
          <p className="text-slate-600">{[rx.patientGender, rx.patientDob ? `DOB ${fmtDate(rx.patientDob)}` : '', rx.patientPhone].filter(Boolean).join(' | ')}</p></div>
        <div className="text-right"><p className="font-semibold">{rx.code}</p><p className="text-slate-600">{fmtDate(rx.date)}</p></div>
      </section>

      {rx.diagnoses.length > 0 && <p className="mt-3 text-sm"><b>Diagnosis:</b> {rx.diagnoses.join('; ')}</p>}

      <p className="mt-3 text-2xl font-bold text-brand-700">Rx</p>
      <table className="mt-1 w-full border-collapse text-sm">
        <thead><tr className="bg-brand-600 text-left text-xs text-white"><th className="p-2">#</th><th className="p-2">Medicine</th><th className="p-2">Dosage</th><th className="p-2">Frequency</th><th className="p-2">Duration</th><th className="p-2">Instructions</th></tr></thead>
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

      <footer className="mt-10 flex items-end justify-between text-sm">
        <p className="text-xs text-slate-400">Computer generated prescription. Please follow your doctor&apos;s advice.</p>
        <div className="text-right"><p className="font-semibold">{rx.doctorName}</p>
          {rx.doctorQualification && !rx.doctorQualification.startsWith('[') && <p className="text-slate-600">{rx.doctorQualification}</p>}
          {rx.doctorRegistrationNumber && <p className="text-slate-600">Reg. No: {rx.doctorRegistrationNumber}</p>}</div>
      </footer>
    </div>
  )
}

export const openPrescriptionPrint = (id: number) => window.open(`/print/prescription/${id}`, '_blank', 'noopener')
