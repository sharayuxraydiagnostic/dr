import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, openFile } from '../lib/api'

describe('openFile (view a protected PDF in a new tab)', () => {
  beforeEach(() => {
    ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:pdf-1')
    ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it('opens the tab immediately on click, then loads the PDF into it (pop-up blockers allow this)', async () => {
    const win = { opener: {}, location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window)
    let release!: (v: unknown) => void
    vi.spyOn(api, 'get').mockReturnValue(new Promise((r) => { release = r }) as never)
    const p = openFile('/bills/12/pdf')
    expect(open).toHaveBeenCalledTimes(1)      // tab opened BEFORE the file has arrived
    expect(win.location.href).toBe('')
    release({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) })
    await p
    expect(win.location.href).toBe('blob:pdf-1')
    expect(win.opener).toBeNull()
  })

  it('closes the empty tab and reports the error if the file cannot be fetched', async () => {
    const win = { opener: {}, location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window)
    vi.spyOn(api, 'get').mockRejectedValue(new Error('403'))
    await expect(openFile('/bills/99/pdf')).rejects.toThrow('403')
    expect(win.close).toHaveBeenCalled()
  })

  it('falls back to a normal download when pop-ups are blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    vi.spyOn(api, 'get').mockResolvedValue({ data: new Blob(['x'], { type: 'application/pdf' }) } as never)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await openFile('/bills/12/pdf')
    expect(click).toHaveBeenCalledTimes(1)
  })
})
