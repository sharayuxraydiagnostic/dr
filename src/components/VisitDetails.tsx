import { Printer } from 'lucide-react'
import { openPrescriptionPrint } from '../pages/PrescriptionPrint'
import { LangText } from './LangText'
import { langName } from '../lib/lang'
import type { ConsultationView } from '../lib/types'
import { fmtDate, fmtDateTime, fmtTime } from '../lib/utils'
import { Button, StatusBadge } from './ui'

/** Full read-only record of one visit: what was noted, diagnosed, advised and prescribed. */
export function VisitDetails({ c, compact }: { c: ConsultationView; compact?: boolean }) {
  const rows: [string, string | undefined][] = [
    ['Complaint / symptoms', c.symptoms], ['Examination', c.examinationNotes],
    ['Diagnosis', c.diagnoses.map((d) => (d.icdCode ? `${d.name} (${d.icdCode})` : d.name)).join(', ') || undefined],
    ['Treatment plan', c.treatmentPlan],
  ]
  return (
    <div className="space-y-4 text-sm">
      <dl className={compact ? 'space-y-2' : 'grid gap-4 sm:grid-cols-2'}>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt><dd className="mt-0.5 whitespace-pre-line text-slate-800">{v}</dd></div>
        ))}
      </dl>
      {(c.testsAdvised || c.testsAdvisedLocal) && <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tests / reports advised</p><LangText en={c.testsAdvised} local={c.testsAdvisedLocal} /></div>}
      {(c.advice || c.adviceLocal) && <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Advice</p><LangText en={c.advice} local={c.adviceLocal} /></div>}
      {c.items.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Medicines</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left"><thead className="bg-slate-50"><tr><th className="px-3 py-1.5 text-xs font-semibold text-slate-500">Medicine</th><th className="px-3 py-1.5 text-xs font-semibold text-slate-500">Dosage</th><th className="px-3 py-1.5 text-xs font-semibold text-slate-500">Frequency</th><th className="px-3 py-1.5 text-xs font-semibold text-slate-500">Duration</th><th className="px-3 py-1.5 text-xs font-semibold text-slate-500">Instructions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{c.items.map((m, i) => <tr key={i}><td className="px-3 py-1.5"><span className="font-medium">{m.medicineName}</span>{m.composition && <span className="block text-xs text-slate-500">{m.composition}</span>}</td><td className="px-3 py-1.5">{m.dosage}</td><td className="px-3 py-1.5"><LangText en={m.frequency} local={m.frequencyLocal} /></td><td className="px-3 py-1.5"><LangText en={m.duration} local={m.durationLocal} /></td><td className="px-3 py-1.5"><LangText en={m.instructions} local={m.instructionsLocal} /></td></tr>)}</tbody></table>
          </div>
        </div>
      )}
      {c.prescriptionNotes && <p><span className="text-slate-500">Prescription notes: </span>{c.prescriptionNotes}</p>}
      {c.followUp && <p className="rounded-lg bg-sky-50 px-3 py-2 text-sky-900">Follow-up: <b>{fmtDate(c.followUp.date)}{c.followUp.time ? ` at ${fmtTime(c.followUp.time)}` : ''}</b> <StatusBadge status={c.followUp.status} /></p>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{c.doctorName} - {fmtDateTime(c.startedAt)}</span>
        {c.language && c.language !== 'EN' && <span>Prescription language: {langName(c.language)}</span>}
        {c.prescriptionId && <Button size="sm" variant="outline" onClick={() => openPrescriptionPrint(c.prescriptionId!)}><Printer className="h-4 w-4" /> Print / Save PDF</Button>}
      </div>
    </div>
  )
}
