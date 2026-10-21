import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { api } from '../lib/api'
import { useLoad } from '../lib/hooks'
import { usePageStyle } from '../lib/pageStyle'
import type { MedicalDocView, PrintSettings } from '../lib/types'
import { ErrorBox, PageLoader, Button } from '../components/ui'
import { DocumentBody } from '../components/MedicalDocumentSheet'


/** The printed page: spacer rows reserve the letterhead area (repeated on every page); the document sits between them. */
export function PrintSheet({ d, m }: { d: MedicalDocView; m: PrintSettings }) {
  return (
      <table data-testid="print-sheet" style={{ width: '210mm', maxWidth: '100%', margin: '0 auto', borderCollapse: 'collapse', background: '#fff' }}>
        <thead><tr><td data-testid="spacer-top" style={{ height: `${m.top}mm`, padding: 0 }}><span className="no-print" style={{ fontSize: '9pt', color: '#94a3b8' }}>&nbsp;Letterhead area ({m.top} mm) - not printed</span></td></tr></thead>
        <tbody><tr><td style={{ padding: `0 ${m.right}mm 0 ${m.left}mm`, verticalAlign: 'top' }}>
          <DocumentBody d={{ docType: d.docType, documentDate: d.documentDate, patientName: d.patientName, patientCode: d.patientCode, doctorName: d.doctorName, doctorQualification: d.doctorQualification, doctorRegistrationNumber: d.doctorRegistrationNumber, content: d.content }} />
        </td></tr></tbody>
        <tfoot><tr><td data-testid="spacer-bottom" style={{ height: `${m.bottom}mm`, padding: 0 }}><span className="no-print" style={{ fontSize: '9pt', color: '#94a3b8' }}>&nbsp;Letterhead footer area ({m.bottom} mm) - not printed</span></td></tr></tfoot>
      </table>
  )
}

/** A4 portrait, zero browser margins (this also removes the browser's own header/footer text); the blank area comes from the table spacers. */
const PAGE_CSS = '@page { size: A4 portrait; margin: 0; } html, body { background: #fff !important; margin: 0 !important; } @media print { .no-print { display: none !important; } }'

/**
 * Prints ONLY the document, positioned inside the blank area of the clinic's pre-printed letterhead.
 * The header/footer spacer rows repeat on every page, so a second page keeps the same clear margins.
 */
export function PrintMedicalDocument() {
  const { id } = useParams()
  usePageStyle(PAGE_CSS)
  const doc = useLoad<MedicalDocView>(() => api.get(`/medical-documents/${id}`).then((r) => r.data), [id])
  const cfg = useLoad<PrintSettings>(() => api.get('/medical-documents/print-settings').then((r) => r.data))
  if (doc.loading || cfg.loading) return <PageLoader />
  if (doc.error || !doc.data || !cfg.data) return <div className="p-6"><ErrorBox message={doc.error ?? cfg.error ?? 'Document not found'} /></div>
  const d = doc.data
  const m = cfg.data
  const issued = d.status === 'ISSUED'

  const print = () => {
    api.post(`/medical-documents/${id}/printed`).catch(() => {})
    window.print()
  }

  return (
    <div style={{ background: '#fff' }}>
      <div className="no-print mx-auto max-w-3xl space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <div className="text-sm text-slate-700">
            <p className="font-medium">{d.code} - {issued ? 'Issued' : 'Draft'}</p>
            <p className="text-slate-500">Load your letterhead paper. In the print window choose <b>A4</b>, <b>Portrait</b>, <b>Scale 100%</b>, <b>Margins: None</b>, and switch <b>off</b> &quot;Headers and footers&quot; and &quot;Background graphics&quot;.</p>
          </div>
          <Button onClick={print} disabled={!issued}><Printer className="h-4 w-4" /> Print</Button>
        </div>
        {!issued && <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This is a draft. Issue the document before printing it.</p>}
      </div>

      <PrintSheet d={d} m={m} />
    </div>
  )
}

/** Printable alignment sheet: millimetre rulers plus the content rectangle, to check against the real letterhead before printing documents. */
export function PrintAlignment() {
  usePageStyle(PAGE_CSS)
  const cfg = useLoad<PrintSettings>(() => api.get('/medical-documents/print-settings').then((r) => r.data))
  if (cfg.loading) return <PageLoader />
  if (cfg.error || !cfg.data) return <div className="p-6"><ErrorBox message={cfg.error ?? 'Settings not found'} /></div>
  const m = cfg.data
  return (
    <div style={{ background: '#fff' }}>
      <div className="no-print mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-slate-600">Print this sheet on your letterhead (A4, Portrait, Scale 100%, Margins: None, headers/footers off). The dashed box is where document text will go. Adjust the margins if it touches the printed letterhead.</p>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print test sheet</Button>
      </div>
      <AlignmentSheet m={m} />
    </div>
  )
}

export function AlignmentSheet({ m }: { m: PrintSettings }) {
  const ticks = Array.from({ length: 30 }, (_, i) => i * 10)
  const line = '0.2mm solid #000'
  return (
    <div data-testid="alignment-sheet" style={{ position: 'relative', width: '210mm', height: '297mm', margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: '7pt', color: '#000', overflow: 'hidden' }}>
        {ticks.map((mm) => <div key={`h${mm}`} style={{ position: 'absolute', left: `${mm}mm`, top: 0, height: mm % 50 === 0 ? '6mm' : '3mm', borderLeft: line }}>{mm % 50 === 0 && <span style={{ position: 'absolute', top: '6mm', left: '0.5mm' }}>{mm}</span>}</div>)}
        {ticks.map((mm) => <div key={`v${mm}`} style={{ position: 'absolute', top: `${mm}mm`, left: 0, width: mm % 50 === 0 ? '6mm' : '3mm', borderTop: line }}>{mm % 50 === 0 && <span style={{ position: 'absolute', left: '6.5mm', top: '-1.5mm' }}>{mm}</span>}</div>)}
        <div data-testid="content-box" style={{ position: 'absolute', left: `${m.left}mm`, right: `${m.right}mm`, top: `${m.top}mm`, bottom: `${m.bottom}mm`, border: '0.3mm dashed #000' }}>
          <div style={{ padding: '2mm', fontSize: '9pt' }}>Document text area<br />Top {m.top} mm - Bottom {m.bottom} mm - Left {m.left} mm - Right {m.right} mm</div>
        </div>
    </div>
  )
}
