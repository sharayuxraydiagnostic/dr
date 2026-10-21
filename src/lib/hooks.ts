import { useCallback, useEffect, useRef, useState } from 'react'
import { errMsg } from './api'

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = [], opts: { pollMs?: number; skip?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!opts.skip)
  const [error, setError] = useState<string | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      setData(await fnRef.current())
      setError(null)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (opts.skip) { setLoading(false); return }
    run()
    if (opts.pollMs) {
      const id = setInterval(() => run(true), opts.pollMs)
      return () => clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, opts.skip])

  return { data, loading, error, reload: () => run(true), setData }
}

export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id) }, [value, ms])
  return v
}
