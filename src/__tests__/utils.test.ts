import { describe, expect, it } from 'vitest'
import { addDaysISO, clean, fmtTime, labelize, money } from '../lib/utils'

describe('utils', () => {
  it('formats 24h times as 12h', () => {
    expect(fmtTime('00:15:00')).toBe('12:15 AM')
    expect(fmtTime('10:30')).toBe('10:30 AM')
    expect(fmtTime('13:05:00')).toBe('1:05 PM')
    expect(fmtTime(undefined)).toBe('-')
  })
  it('adds days across month ends', () => {
    expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('labelizes enums', () => { expect(labelize('IN_CONSULTATION')).toBe('In Consultation') })
  it('formats rupees', () => { expect(money(1234.5)).toContain('1,234.50') })
  it('turns empty strings into undefined so optional fields are not sent blank', () => {
    expect(clean({ a: '', b: 'x', c: 0 })).toEqual({ a: undefined, b: 'x', c: 0 })
  })
})
