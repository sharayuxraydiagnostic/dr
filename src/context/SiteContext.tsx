import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import type { ClinicPhotoView, ContentType, ContentView, DoctorView, ServiceView } from '../lib/types'

export interface SiteData {
  settings: Record<string, string>
  doctors: DoctorView[]
  services: ServiceView[]
  content: Record<ContentType, ContentView[]>
  gallery: ClinicPhotoView[]
  loaded: boolean
}
const FALLBACK: Record<string, string> = {
  hospital_name: "Dr. Munot's Orthopaedic Care Hospital",
  tagline: 'Bone, joint and spine care with a personal touch',
  address: '[Hospital address - update in Admin > Settings]',
  phone: '[Hospital phone - update in Admin > Settings]',
  emergency_phone: '[Emergency phone - update in Admin > Settings]',
  email: '[Hospital email - update in Admin > Settings]',
  opening_hours: '[Opening hours - update in Admin > Settings]',
  about_text: 'An orthopaedic care hospital focused on accurate diagnosis, clear communication and structured recovery.',
}
const EMPTY: Record<ContentType, ContentView[]> = { FACILITY: [], WHY_US: [], TESTIMONIAL: [], HEALTH_TIP: [] }
const Ctx = createContext<SiteData>({ settings: FALLBACK, doctors: [], services: [], content: EMPTY, gallery: [], loaded: false })
export const useSite = () => useContext(Ctx)

/** True when a setting still holds the "[... update in Admin]" placeholder. */
export const isPlaceholder = (v?: string) => !v || v.trim().startsWith('[')

const TYPES: ContentType[] = ['FACILITY', 'WHY_US', 'TESTIMONIAL', 'HEALTH_TIP']

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData>({ settings: FALLBACK, doctors: [], services: [], content: EMPTY, gallery: [], loaded: false })
  useEffect(() => {
    Promise.allSettled([api.get('/public/settings'), api.get('/public/doctors'), api.get('/public/services'), api.get('/public/clinic-photos'),
      ...TYPES.map((t) => api.get('/public/content', { params: { type: t } }))]).then((r) => {
      const ok = <T,>(x: PromiseSettledResult<{ data: T }>, fb: T) => (x.status === 'fulfilled' ? x.value.data : fb)
      const content = { ...EMPTY }
      TYPES.forEach((t, i) => { content[t] = ok<ContentView[]>(r[4 + i] as PromiseSettledResult<{ data: ContentView[] }>, []) })
      setData({
        settings: { ...FALLBACK, ...ok<Record<string, string>>(r[0] as PromiseSettledResult<{ data: Record<string, string> }>, {}) },
        doctors: ok<DoctorView[]>(r[1] as PromiseSettledResult<{ data: DoctorView[] }>, []),
        services: ok<ServiceView[]>(r[2] as PromiseSettledResult<{ data: ServiceView[] }>, []),
        gallery: ok<ClinicPhotoView[]>(r[3] as PromiseSettledResult<{ data: ClinicPhotoView[] }>, []),
        content, loaded: true,
      })
    })
  }, [])
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}
