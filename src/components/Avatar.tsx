import { useState } from 'react'
import { doctorPhotoUrl } from '../lib/media'
import type { DoctorView } from '../lib/types'
import { cn } from '../lib/utils'

export function DoctorAvatar({ doctor, className }: { doctor: Pick<DoctorView, 'id' | 'fullName' | 'hasPhoto' | 'photoVersion'>; className?: string }) {
  const [failed, setFailed] = useState(false)
  const url = doctorPhotoUrl(doctor)
  const initials = doctor.fullName.replace(/^dr\.?\s*/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('')
  if (url && !failed) return <img src={url} alt={doctor.fullName} onError={() => setFailed(true)} className={cn('object-cover object-top', className)} />
  return <div aria-label={doctor.fullName} className={cn('grid place-items-center bg-gradient-to-br from-brand-500 to-sky-600 font-semibold text-white', className)}>{initials}</div>
}
