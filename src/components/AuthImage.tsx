import { useEffect, useState } from 'react'
import { fetchBlobUrl } from '../lib/api'

/** Image from a protected endpoint (needs the login token, so a plain <img src> cannot be used). */
export function AuthImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked = false
    let created: string | null = null
    fetchBlobUrl(path).then((r) => { if (revoked) URL.revokeObjectURL(r.url); else { created = r.url; setUrl(r.url) } }).catch(() => setUrl(null))
    return () => { revoked = true; if (created) URL.revokeObjectURL(created) }
  }, [path])
  return url ? <img src={url} alt={alt} className={className} /> : <div className={`${className ?? ''} animate-pulse bg-slate-100`} aria-hidden />
}
