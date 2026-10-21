import { Download, ExternalLink } from 'lucide-react'
import { downloadFile, errMsg, openFile } from '../lib/api'
import type { BillView } from '../lib/types'
import { fmtDate, fmtDateTime, labelize, money } from '../lib/utils'
import { Button, Modal, StatusBadge, useUI } from './ui'

/** Itemised bill shown on screen. From here the user can also open the PDF in a new tab or download it. */
export function BillModal({ bill, onClose }: { bill: BillView | null; onClose: () => void }) {
  const { toast } = useUI()
  if (!bill) return null
  const fail = (e: unknown) => toast.error(errMsg(e))
  return (
    <Modal open onClose={onClose} wide title={`Bill ${bill.billNumber}`}
      footer={<>
        <Button variant="outline" onClick={() => openFile(`/bills/${bill.id}/pdf`).catch(fail)}><ExternalLink className="h-4 w-4" /> Open PDF</Button>
        <Button onClick={() => downloadFile(`/bills/${bill.id}/pdf`, `${bill.billNumber}.pdf`).catch(fail)}><Download className="h-4 w-4" /> Download PDF</Button>
      </>}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="text-base font-semibold">{bill.patientName}</p><p className="text-slate-500">{bill.patientCode} - {fmtDate(bill.createdAt)}</p></div>
          <StatusBadge status={bill.status} />
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-xs font-semibold text-slate-500">Description</th><th className="px-3 py-2 text-xs font-semibold text-slate-500">Category</th><th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Qty</th><th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Rate</th><th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{bill.items.map((i) => (
              <tr key={i.id}><td className="px-3 py-2">{i.description}</td><td className="px-3 py-2 text-slate-500">{labelize(i.category)}</td><td className="px-3 py-2 text-right">{i.quantity}</td><td className="px-3 py-2 text-right">{money(i.unitPrice)}</td><td className="px-3 py-2 text-right font-medium">{money(i.amount)}</td></tr>))}</tbody>
          </table>
        </div>
        <dl className="ml-auto w-full max-w-xs space-y-1">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{money(bill.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd>- {money(bill.discount)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Tax ({bill.taxPercent}%)</dt><dd>{money(bill.tax)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold"><dt>Total</dt><dd>{money(bill.total)}</dd></div>
          <div className="flex justify-between text-emerald-700"><dt>Paid</dt><dd>{money(bill.paid)}</dd></div>
          <div className="flex justify-between font-semibold text-rose-700"><dt>Pending</dt><dd>{money(bill.pending)}</dd></div>
        </dl>
        {bill.payments.length > 0 && (
          <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Payments</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{bill.payments.map((p) => (
              <li key={p.id} className="flex justify-between px-3 py-2"><span>{fmtDateTime(p.paidAt)} - {labelize(p.method)}{p.reference ? ` (${p.reference})` : ''}</span><span className="font-medium">{money(p.amount)}</span></li>))}</ul></div>)}
        {bill.notes && <p className="text-slate-500">Note: {bill.notes}</p>}
      </div>
    </Modal>
  )
}
