import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, UserRound, X } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useDebounced, useLoad } from '../lib/hooks'
import type { PatientView } from '../lib/types'
import { clean } from '../lib/utils'
import { Button, Empty, Field, Input, Select, Spinner, Textarea } from './ui'

export function PatientPicker({ value, onChange, placeholder = 'Search by name, phone, patient ID or appointment ID' }: { value: PatientView | null; onChange: (p: PatientView | null) => void; placeholder?: string }) {
  const [q, setQ] = useState('')
  const dq = useDebounced(q.trim())
  const { data, loading } = useLoad<PatientView[]>(() => api.get('/patients/search', { params: { q: dq } }).then((r) => r.data), [dq], { skip: dq.length < 2 })
  if (value) return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
      <div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-brand-700" /><div><p className="font-medium">{value.fullName}</p><p className="text-sm text-slate-600">{value.patientCode} - {value.phone}</p></div></div>
      <button type="button" aria-label="Clear patient" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
    </div>
  )
  return (
    <div>
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search patient" /></div>
      {dq.length >= 2 && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {loading ? <div className="flex items-center gap-2 p-4 text-sm text-slate-500"><Spinner className="h-4 w-4" /> Searching...</div>
            : !data?.length ? <Empty title="No patient found" hint="Check the spelling or register the patient first." />
            : <ul className="divide-y divide-slate-100">{data.map((p) => (
              <li key={p.id}><button type="button" className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50" onClick={() => onChange(p)}>
                <span><span className="font-medium">{p.fullName}</span><span className="ml-2 text-sm text-slate-500">{p.patientCode}</span></span><span className="text-sm text-slate-500">{p.phone}</span></button></li>))}</ul>}
        </div>
      )}
    </div>
  )
}

const schema = z.object({
  fullName: z.string().min(2, 'Enter the full name').max(120),
  phone: z.string().regex(/^[+0-9 -]{10,15}$/, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().max(300).optional(),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: z.string().regex(/^[+0-9 -]{10,15}$/, 'Enter a valid phone number').or(z.literal('')).optional(),
})
type FormData = z.infer<typeof schema>

export function PatientForm({ initial, onSaved, onCancel }: { initial?: PatientView; onSaved: (p: PatientView) => void; onCancel: () => void }) {
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: initial?.fullName ?? '', phone: initial?.phone ?? '', email: initial?.email ?? '', dateOfBirth: initial?.dateOfBirth ?? '', gender: initial?.gender ?? '',
      bloodGroup: initial?.bloodGroup ?? '', address: initial?.address ?? '', emergencyContactName: initial?.emergencyContactName ?? '', emergencyContactPhone: initial?.emergencyContactPhone ?? '' },
  })
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
      setError('')
      try {
        const body = clean(v)
        const r = initial ? await api.put<PatientView>(`/patients/${initial.id}`, body) : await api.post<PatientView>('/patients', body)
        onSaved(r.data)
      } catch (e) { setError(errMsg(e)) }
    })}>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *" error={errors.fullName?.message}><Input invalid={!!errors.fullName} {...register('fullName')} /></Field>
        <Field label="Mobile number *" error={errors.phone?.message}><Input type="tel" invalid={!!errors.phone} {...register('phone')} /></Field>
        <Field label="Email" error={errors.email?.message}><Input type="email" invalid={!!errors.email} {...register('email')} /></Field>
        <Field label="Date of birth"><Input type="date" {...register('dateOfBirth')} /></Field>
        <Field label="Gender"><Select {...register('gender')}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></Select></Field>
        <Field label="Blood group"><Select {...register('bloodGroup')}><option value="">Unknown</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</Select></Field>
        <Field label="Emergency contact name"><Input {...register('emergencyContactName')} /></Field>
        <Field label="Emergency contact phone" error={errors.emergencyContactPhone?.message}><Input type="tel" {...register('emergencyContactPhone')} /></Field>
      </div>
      <Field label="Address"><Textarea rows={2} {...register('address')} /></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" loading={isSubmitting}>{initial ? 'Save changes' : 'Register patient'}</Button></div>
    </form>
  )
}
