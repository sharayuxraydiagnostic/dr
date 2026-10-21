import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useLoad } from '../lib/hooks'
import type { DoctorView, SlotView } from '../lib/types'
import { cn, fmtTime } from '../lib/utils'
import { ErrorBox, Spinner } from './ui'

export function SlotPicker({ doctorId, date, value, onChange, walkIn }: { doctorId?: number | ''; date: string; value: string; onChange: (t: string) => void; walkIn?: boolean }) {
  const enabled = !!doctorId && !!date
  const { data, loading, error } = useLoad<SlotView[]>(
    () => api.get('/appointments/slots', { params: { doctorId, date, walkIn: !!walkIn } }).then((r) => r.data),
    [doctorId, date, walkIn], { skip: !enabled })

  useEffect(() => { if (value && data && !data.some((s) => s.startTime.startsWith(value) && s.remaining > 0)) onChange('') }, [data]) // eslint-disable-line

  if (!enabled) return <p className="text-sm text-slate-500">Choose a doctor and a date to see available times.</p>
  if (loading) return <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Loading slots...</div>
  if (error) return <ErrorBox message={error} />
  if (!data?.length) return <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">No slots on this date (doctor may be off or fully booked). Try another date.</p>
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" role="radiogroup" aria-label="Available time slots">
      {data.map((s) => {
        const t = s.startTime.slice(0, 5)
        const full = s.remaining <= 0
        return (
          <button type="button" key={t} role="radio" aria-checked={value === t} disabled={full} onClick={() => onChange(t)}
            className={cn('rounded-lg border px-2 py-2 text-sm font-medium transition',
              full ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through' : value === t ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50')}>
            {fmtTime(s.startTime)}
          </button>
        )
      })}
    </div>
  )
}

export function useDoctors(path = '/public/doctors') {
  return useLoad<DoctorView[]>(() => api.get(path).then((r) => r.data), [path])
}
