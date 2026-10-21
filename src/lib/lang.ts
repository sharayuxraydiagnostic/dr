import type { PrescriptionLang } from './types'

export const LANGS: { id: PrescriptionLang; label: string; native: string }[] = [
  { id: 'EN', label: 'English', native: 'English' },
  { id: 'MR', label: 'Marathi', native: 'मराठी' },
  { id: 'HI', label: 'Hindi', native: 'हिन्दी' },
]
export const langName = (l?: PrescriptionLang) => LANGS.find((x) => x.id === l)?.label ?? 'English'

/** Shows the patient-language text first and the English original in small print underneath. */
export function bilingual(en?: string, local?: string): { main: string; sub?: string } {
  if (local && local.trim() && local.trim() !== (en ?? '').trim()) return { main: local, sub: en || undefined }
  return { main: en ?? '' }
}
