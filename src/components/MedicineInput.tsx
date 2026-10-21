import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useDebounced } from '../lib/hooks'
import type { MedicineView, PrescriptionItemDto } from '../lib/types'
import { Input, useUI } from './ui'

/** Medicine name box that suggests previously saved medicines and auto-fills ONLY the composition. Dose, frequency and duration are always typed by the doctor. */
export function MedicineInput({ value, disabled, onChange, onPick }: { value: string; disabled?: boolean; onChange: (name: string) => void; onPick: (m: Partial<PrescriptionItemDto>) => void }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<MedicineView[]>([])
  const [active, setActive] = useState(-1)
  const dq = useDebounced(value, 200)
  const justPicked = useRef(false)
  const { toast, confirm } = useUI()

  useEffect(() => {
    if (!open || disabled) return
    if (justPicked.current) { justPicked.current = false; return }
    api.get<MedicineView[]>('/medicines/search', { params: { q: dq } }).then((r) => { setList(r.data); setActive(-1) }).catch(() => setList([]))
  }, [dq, open, disabled])

  const pick = (m: MedicineView) => {
    justPicked.current = true
    onPick({ medicineName: m.name, composition: m.composition })
    setOpen(false)
  }
  const forget = async (m: MedicineView) => {
    if (!(await confirm({ title: 'Remove from suggestions?', message: `"${m.name}" will no longer be suggested. Old prescriptions are not affected.`, confirmLabel: 'Remove', danger: true }))) return
    try { await api.delete(`/medicines/${m.id}`); setList((l) => l.filter((x) => x.id !== m.id)) } catch (e) { toast.error(errMsg(e)) }
  }

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <Input placeholder="Medicine name (type to search saved medicines)" disabled={disabled} value={value} role="combobox" aria-expanded={open} aria-autocomplete="list" autoComplete="off"
        onFocus={() => setOpen(true)} onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onKeyDown={(e) => {
          if (!open || list.length === 0) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(list[active]) }
          else if (e.key === 'Escape') setOpen(false)
        }} />
      {open && !disabled && list.length > 0 && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full min-w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {list.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === active} className={`flex items-start justify-between gap-2 px-3 py-2 text-sm ${i === active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
              <button type="button" className="flex-1 text-left" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(m)}>
                <span className="font-medium">{m.name}</span>
                <span className="block text-xs text-slate-500">{m.composition || 'No composition saved'}</span>
              </button>
              <button type="button" aria-label={`Remove ${m.name} from suggestions`} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" onMouseDown={(e) => e.preventDefault()} onClick={() => forget(m)}><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
