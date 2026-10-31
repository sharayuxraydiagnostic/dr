import { isLeapYear, istToday, shiftISO } from './istDate'

/**
 * Patients are registered with an AGE in years. The database keeps a date (patients.date_of_birth), so the age is stored as the date
 * "that many years before today"; the age is always shown as completed years calculated from it. The date itself is never displayed.
 */
export const MAX_AGE = 120

/** Strict: digits only (no sign, decimal point, spaces or text), 0 to 120. */
export function parseAge(input: string): { age: number | null; error?: string } {
  const v = input.trim()
  if (!v) return { age: null, error: 'Enter the age in years' }
  if (!/^\d{1,3}$/.test(v)) return { age: null, error: 'Age must be a whole number (no decimals, signs or text)' }
  const n = Number(v)
  if (n > MAX_AGE) return { age: null, error: `Enter an age between 0 and ${MAX_AGE}` }
  return { age: n }
}

/** The date to store so that the patient is exactly `age` completed years old today (India). */
export function dobFromAge(age: number, today = istToday()): string {
  if (age <= 0) return shiftISO(today, -1) // a baby under one year; yesterday keeps the date safely in the past on any server clock
  const [y, m, d] = today.split('-').map(Number)
  const ty = y - age
  const day = m === 2 && d === 29 && !isLeapYear(ty) ? 28 : d
  return `${String(ty).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Completed years today (India), or null when there is no valid stored date. */
export function ageFromDob(dob?: string | null, today = istToday()): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}/.test(dob)) return null
  const [by, bm, bd] = dob.slice(0, 10).split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age -= 1
  return age < 0 ? null : age
}

/** "25 Years" / "1 Year", or '' when unknown. */
export function formatAge(dob?: string | null, today = istToday()): string {
  const a = ageFromDob(dob, today)
  return a === null ? '' : `${a} ${a === 1 ? 'Year' : 'Years'}`
}
