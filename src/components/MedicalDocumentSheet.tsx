import type { MedDocType } from '../lib/types'
import { docDef } from '../lib/medicalDocs'
import { fmtDate } from '../lib/utils'

export interface SheetData {
  docType: MedDocType; documentDate: string; patientName: string; patientCode: string
  doctorName: string; doctorQualification?: string; doctorRegistrationNumber?: string; content: Record<string, string>
}

const FONT = 'Arial, Helvetica, "Noto Sans Devanagari", "Nirmala UI", Mangal, sans-serif'

/**
 * ONLY the document content. The clinic's name, logo, address, phone and e-mail are already printed on the physical
 * letterhead, so nothing of that is rendered here - no header, footer, border, background or watermark. Plain black text only.
 */
export function DocumentBody({ d }: { d: SheetData }) {
  const def = docDef(d.docType)
  return (
    <div data-testid="document-body" style={{ fontFamily: FONT, fontSize: '11pt', lineHeight: 1.5, color: '#000' }}>
      <h1 style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 700, margin: '0 0 6mm', color: '#000' }}>{def.heading}</h1>
      <p style={{ margin: '0 0 1mm' }}><b>Patient:</b> {d.patientName} (Patient ID: {d.patientCode})</p>
      <p style={{ margin: '0 0 5mm' }}><b>Date:</b> {fmtDate(d.documentDate)}</p>
      {def.fields.filter((f) => (d.content[f.key] ?? '').trim()).map((f) => (
        <div key={f.key} style={{ margin: '0 0 3mm', breakInside: 'avoid' }}>
          <b>{f.label}:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{f.kind === 'date' ? fmtDate(d.content[f.key]) : d.content[f.key]}</span>
        </div>))}
      <div style={{ marginTop: '18mm', textAlign: 'right', breakInside: 'avoid' }}>
        <div style={{ display: 'inline-block', minWidth: '55mm', borderTop: '0.3mm solid #000', paddingTop: '1mm', textAlign: 'center' }}>Signature</div>
        <div style={{ marginTop: '2mm' }}><b>{d.doctorName}</b></div>
        {d.doctorQualification && <div>{d.doctorQualification}</div>}
        {d.doctorRegistrationNumber && <div>Reg. No: {d.doctorRegistrationNumber}</div>}
      </div>
    </div>
  )
}

/** On-screen preview of where the text lands on the paper. The shaded bands are screen-only hints and never print. */
export function SheetPreview({ d, margins }: { d: SheetData; margins: { top: number; bottom: number; left: number; right: number } }) {
  return (
    <div className="overflow-auto rounded-xl bg-slate-200 p-3" style={{ maxHeight: '80vh' }}>
      <div className="mx-auto bg-white shadow ring-1 ring-slate-300" style={{ width: '210mm', minHeight: '297mm', zoom: 0.62, position: 'relative', boxSizing: 'border-box' }}>
        <div className="no-print" style={{ height: `${margins.top}mm`, background: 'repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 4mm,#e2e8f0 4mm,#e2e8f0 8mm)', color: '#64748b', fontSize: '10pt', display: 'grid', placeItems: 'center' }}>
          Pre-printed letterhead area - not printed ({margins.top} mm)
        </div>
        <div style={{ padding: `0 ${margins.right}mm 0 ${margins.left}mm` }}><DocumentBody d={d} /></div>
        <div className="no-print" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${margins.bottom}mm`, background: 'repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 4mm,#e2e8f0 4mm,#e2e8f0 8mm)', color: '#64748b', fontSize: '10pt', display: 'grid', placeItems: 'center' }}>
          Pre-printed letterhead footer area - not printed ({margins.bottom} mm)
        </div>
      </div>
    </div>
  )
}
