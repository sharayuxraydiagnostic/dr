import { api } from './api'
import type { ClinicPhotoView, DoctorView } from './types'

export function doctorPhotoUrl(d?: Pick<DoctorView, 'id' | 'hasPhoto' | 'photoVersion'> | null): string | null {
  if (!d || !d.hasPhoto) return null
  return `${api.defaults.baseURL}/public/doctors/${d.id}/photo?v=${d.photoVersion}`
}

export const clinicPhotoUrl = (p: Pick<ClinicPhotoView, 'id' | 'version'>) => `${api.defaults.baseURL}/public/clinic-photos/${p.id}/image?v=${p.version}`
