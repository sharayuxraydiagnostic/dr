import { shiftISO } from './istDate'

export const MAX_FOLLOW_UP_DAYS = 365

/** Empty = no follow-up. Otherwise a positive whole number only: rejects 0, negatives, decimals, signs, text and absurdly large values. */
export function parseFollowUpDays(input: string): { days: number | null; error?: string } {
  const v = input.trim()
  if (!v) return { days: null }
  if (!/^\d+$/.test(v)) return { days: null, error: 'Enter a whole number of days (for example 7). No decimals, minus sign or text.' }
  const n = Number(v)
  if (n < 1) return { days: null, error: 'Follow-up days must be 1 or more. Leave it empty for no follow-up.' }
  if (n > MAX_FOLLOW_UP_DAYS) return { days: null, error: `Follow-up days cannot be more than ${MAX_FOLLOW_UP_DAYS}.` }
  return { days: n }
}

/** Prescription date + N days (YYYY-MM-DD). */
export const followUpDate = (prescriptionDate: string, days: number) => shiftISO(prescriptionDate, days)

/** 2026-11-06 -> "06 November 2026" */
export function fmtLongDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}
