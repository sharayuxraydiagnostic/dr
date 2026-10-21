import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react'
import { cn, labelize } from '../lib/utils'

/* ---------- Button ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' | 'lg'; loading?: boolean }
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  }[variant]
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }[size]
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60', v, s, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

/* ---------- Layout bits ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>
}
export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
export function Stat({ label, value, icon, tone = 'brand' }: { label: string; value: ReactNode; icon?: ReactNode; tone?: 'brand' | 'sky' | 'amber' | 'rose' }) {
  const t = { brand: 'bg-brand-50 text-brand-700', sky: 'bg-sky-50 text-sky-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' }[tone]
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        {icon && <div className={cn('grid h-11 w-11 place-items-center rounded-xl', t)}>{icon}</div>}
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  )
}

/* ---------- Badges ---------- */
const TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  teal: 'bg-brand-50 text-brand-800 ring-brand-600/20',
}
export function Badge({ tone = 'slate', children }: { tone?: keyof typeof TONES | string; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone] ?? TONES.slate)}>{children}</span>
}
const STATUS_TONE: Record<string, string> = {
  BOOKED: 'blue', CONFIRMED: 'teal', CHECKED_IN: 'amber', WAITING: 'amber', IN_CONSULTATION: 'blue', COMPLETED: 'green', CANCELLED: 'red', NO_SHOW: 'slate',
  PAID: 'green', PARTIAL: 'amber', PENDING: 'red', SCHEDULED: 'teal', IN_PROGRESS: 'blue', SKIPPED: 'slate', SENT: 'green', FAILED: 'red', SKIPPED_: 'slate',
}
export const STATUS_LABEL: Record<string, string> = { BOOKED: 'Awaiting confirmation', NO_SHOW: 'No-show', IN_CONSULTATION: 'In consultation' }
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === 'BOOKED' ? 'amber' : STATUS_TONE[status] ?? 'slate'}>{STATUS_LABEL[status] ?? labelize(status)}</Badge>
}

/* ---------- Form controls ---------- */
export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...p }, ref) {
  return <input ref={ref} className={cn('input', invalid && 'input-error', className)} {...p} />
})
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select({ className, invalid, children, ...p }, ref) {
  return <select ref={ref} className={cn('input', invalid && 'input-error', className)} {...p}>{children}</select>
})
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ className, invalid, ...p }, ref) {
  return <textarea ref={ref} rows={3} className={cn('input', invalid && 'input-error', className)} {...p} />
})

/* ---------- States ---------- */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} aria-label="Loading" />
}
export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500" role="status"><Spinner /> {label}</div>
}
export function Empty({ title, hint, icon, action }: { title: string; hint?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">{icon}</div>}
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {message}</span>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  )
}
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100">{children}</table></div>
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={cn('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Toasts + confirm dialogs ---------- */
interface Toast { id: number; kind: 'success' | 'error' | 'info'; text: string }
interface ConfirmOpts { title: string; message: string; confirmLabel?: string; danger?: boolean }
interface UICtx {
  toast: { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void }
  confirm: (o: ConfirmOpts) => Promise<boolean>
}
const Ctx = createContext<UICtx | null>(null)
export function useUI() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI must be used inside UIProvider')
  return c
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const idRef = useRef(0)

  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), [])
  const value: UICtx = {
    toast: { success: (t) => push('success', t), error: (t) => push('error', t), info: (t) => push('info', t) },
    confirm,
  }
  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null) }

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3 text-sm shadow-lg',
            t.kind === 'success' && 'border-emerald-200', t.kind === 'error' && 'border-red-200', t.kind === 'info' && 'border-sky-200')}>
            {t.kind === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
            {t.kind === 'error' && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
            {t.kind === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />}
            <p className="flex-1 text-slate-700">{t.text}</p>
          </div>
        ))}
      </div>
      <Modal open={!!dlg} onClose={() => close(false)} title={dlg?.title ?? ''}
        footer={<><Button variant="outline" onClick={() => close(false)}>Cancel</Button><Button variant={dlg?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{dlg?.confirmLabel ?? 'Confirm'}</Button></>}>
        <p className="text-sm text-slate-600">{dlg?.message}</p>
      </Modal>
    </Ctx.Provider>
  )
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition', value === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
