import axios, { AxiosError } from 'axios'

export const TOKEN_KEY = 'munot_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  timeout: 20000,
})

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY)
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (e: AxiosError) => {
    if (e.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('munot:logout'))
    }
    return Promise.reject(e)
  },
)

interface ApiError { message?: string; fieldErrors?: Record<string, string> | null }

export function errMsg(e: unknown): string {
  const ax = e as AxiosError<ApiError>
  if (ax?.response?.data) {
    const d = ax.response.data
    if (d.fieldErrors && Object.keys(d.fieldErrors).length) return Object.values(d.fieldErrors).join('. ')
    if (d.message) return d.message
  }
  if (ax?.code === 'ERR_NETWORK') return 'Cannot reach the server. Please check your connection.'
  return 'Something went wrong. Please try again.'
}

/** Fetches a protected file with the auth header and returns an object URL. */
export async function fetchBlobUrl(path: string): Promise<{ url: string; type: string }> {
  const res = await api.get(path, { responseType: 'blob' })
  return { url: URL.createObjectURL(res.data), type: res.data.type }
}

export async function downloadFile(path: string, filename: string) {
  const { url } = await fetchBlobUrl(path)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Opens a protected file (invoice PDF, report, image) in a new tab so it can be VIEWED, not just downloaded.
 * The tab is opened synchronously on the click (browsers block pop-ups opened after an await) and filled once the file arrives.
 */
export async function openFile(path: string) {
  const win = window.open('', '_blank')
  try {
    const { url } = await fetchBlobUrl(path)
    if (win) {
      win.opener = null
      win.location.href = url
    } else {
      // pop-ups are blocked: fall back to a normal download so the user still gets the file
      const a = document.createElement('a')
      a.href = url
      a.download = path.split('/').filter(Boolean).slice(-2, -1)[0] ?? 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000)
  } catch (e) {
    win?.close()
    throw e
  }
}
