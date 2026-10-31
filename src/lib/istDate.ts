/** Plain YYYY-MM-DD date helpers in clinic time (Asia/Kolkata). No browser-timezone or daylight-saving surprises: arithmetic is done in UTC. */

/** Today's date in India, whatever timezone the computer is set to. */
export const istToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

/** Adds (or subtracts) whole days; handles month ends, year ends and leap years. */
export function shiftISO(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
