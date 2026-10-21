import { BellRing, Check, X } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useLoad } from '../lib/hooks'
import type { AppointmentView } from '../lib/types'
import { fmtDate, fmtTime } from '../lib/utils'
import { Button, Card, CardHeader, Empty, ErrorBox, PageLoader, useUI } from './ui'

/** Online requests that are not confirmed yet. Doctor or reception confirms or declines them. */
export function PendingRequests({ onChange }: { onChange?: () => void }) {
  const { data, loading, error, reload } = useLoad<AppointmentView[]>(() => api.get('/appointments/pending').then((r) => r.data), [], { pollMs: 30000 })
  const { toast, confirm } = useUI()
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); reload(); onChange?.() } catch (e) { toast.error(errMsg(e)) } }
  return (
    <Card className="mb-6 border-amber-200">
      <CardHeader title={<span className="flex items-center gap-2"><BellRing className="h-5 w-5 text-amber-600" /> Awaiting confirmation {data && data.length > 0 && <span className="rounded-full bg-amber-100 px-2 text-sm text-amber-800">{data.length}</span>}</span>}
        subtitle="Online requests are not confirmed until you accept them. The patient is notified either way." />
      {loading ? <PageLoader /> : error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div> : (data ?? []).length === 0 ? <Empty title="No requests waiting" icon={<Check />} /> :
        <ul className="divide-y divide-slate-100">{data!.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div><p className="font-medium">{a.patientName} <span className="text-sm font-normal text-slate-500">({a.patientCode})</span></p>
              <p className="text-sm text-slate-600">{fmtDate(a.date)} at {fmtTime(a.startTime)} - {a.doctorName}{a.reason ? ` - ${a.reason}` : ''}</p></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => act(() => api.put(`/appointments/${a.id}/confirm`), 'Appointment confirmed - patient notified')}><Check className="h-4 w-4" /> Confirm</Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={async () => { if (await confirm({ title: 'Decline this request?', message: `${a.patientName} will be told the appointment on ${fmtDate(a.date)} at ${fmtTime(a.startTime)} could not be kept.`, confirmLabel: 'Decline', danger: true })) act(() => api.put(`/appointments/${a.id}/cancel`, { reason: 'Declined by hospital' }), 'Request declined - patient notified') }}><X className="h-4 w-4" /> Decline</Button>
            </div></li>))}</ul>}
    </Card>
  )
}
