import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ArrowRight, Bone, CalendarPlus, Mail, MapPin, Phone, Quote, Siren, Clock, BadgeCheck, HeartPulse, Activity, Stethoscope } from 'lucide-react'
import { isPlaceholder, useSite } from '../../context/SiteContext'
import { Hero3D } from '../../components/Hero3D'
import { Badge, Button } from '../../components/ui'
import { iconFor } from '../../lib/icons'
import { DoctorAvatar } from '../../components/Avatar'
import { money } from '../../lib/utils'
import { clinicPhotoUrl } from '../../lib/media'

const orthoAreas = [{ icon: Bone, title: 'Fracture & Trauma Care' }, { icon: HeartPulse, title: 'Joint Pain & Arthritis' }, { icon: Activity, title: 'Sports Injuries' }, { icon: Stethoscope, title: 'Spine & Back Pain' }]

export function Section({ title, subtitle, children, tone = 'white', id }: { title: string; subtitle?: string; children: ReactNode; tone?: 'white' | 'soft'; id?: string }) {
  return (
    <section id={id} className={tone === 'soft' ? 'bg-brand-50/40' : 'bg-white'}>
      <div className="container-page py-14 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.45 }}>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-3 text-slate-600">{subtitle}</p>}
          </div>
          {children}
        </motion.div>
      </div>
    </section>
  )
}

export function HeroSection() {
  const { settings, doctors } = useSite()
  const doc = doctors[0]
  const emergency = settings.emergency_phone
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge tone="teal">Orthopaedic care</Badge>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">{settings.hospital_name}</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">{settings.tagline}. Accurate diagnosis, clear communication and a structured path to recovery{doc ? `, led by ${doc.fullName}` : ''}.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/book"><Button size="lg"><CalendarPlus className="h-5 w-5" /> Book Appointment</Button></Link>
            <Link to="/login"><Button size="lg" variant="outline">Patient Login</Button></Link>
          </div>
          {doc && <div className="mt-6 flex items-center gap-3"><DoctorAvatar doctor={doc} className="h-20 w-20 rounded-full text-xl ring-4 ring-white shadow-lg" /><div><p className="font-medium text-slate-900">{doc.fullName}</p><p className="text-sm text-slate-500">{doc.specialization || doc.departmentName}</p></div></div>}
          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <Siren className="h-5 w-5 shrink-0" />
            <span>Emergency: <b>{isPlaceholder(emergency) ? emergency : <a href={`tel:${emergency.replace(/[^+\d]/g, '')}`}>{emergency}</a>}</b></span>
          </div>
        </motion.div>
        <Hero3D />
      </div>
    </section>
  )
}

export function AboutSection() {
  const { settings } = useSite()
  return (
    <Section title="About the hospital" subtitle="Care that is organised, transparent and centred on you." tone="soft">
      <div className="mx-auto max-w-3xl text-center text-slate-600"><p className="text-lg leading-relaxed">{settings.about_text}</p></div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {orthoAreas.map(({ icon: Icon, title }) => (
          <div key={title} className="card flex items-center gap-3 p-4"><div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></div><span className="text-sm font-medium">{title}</span></div>
        ))}
      </div>
    </Section>
  )
}

export function DoctorSection({ full }: { full?: boolean }) {
  const { doctors } = useSite()
  const d = doctors[0]
  if (!d) return <Section title="Our doctor"><p className="text-center text-slate-500">Doctor profile will appear here once added by the hospital.</p></Section>
  return (
    <Section title="Meet your doctor" subtitle="Experienced, approachable and focused on your recovery.">
      <div className="card mx-auto grid max-w-5xl items-center gap-8 p-6 md:grid-cols-[19rem_1fr] md:p-8">
        <DoctorAvatar doctor={d} className="mx-auto aspect-[4/5] w-full max-w-xs rounded-3xl text-6xl shadow-xl ring-4 ring-brand-50 md:max-w-none" />
        <div>
          <h3 className="text-2xl font-semibold">{d.fullName}</h3>
          <p className="text-brand-700">{d.specialization || d.departmentName}</p>
          {!isPlaceholder(d.qualification) && <p className="mt-1 text-sm text-slate-600">{d.qualification}</p>}
          {!isPlaceholder(d.registrationNumber) && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><BadgeCheck className="h-4 w-4 text-brand-600" /> Reg. No: {d.registrationNumber}</p>}
          {d.bio && <p className="mt-4 whitespace-pre-line text-slate-600">{d.bio}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to="/book"><Button><CalendarPlus className="h-4 w-4" /> Book with {d.fullName.split(' ').slice(0, 2).join(' ')}</Button></Link>
            {d.consultationFee > 0 && <span className="text-sm text-slate-500">Consultation fee: {money(d.consultationFee)}</span>}
            {!full && <Link to="/doctor-profile" className="text-sm font-medium text-brand-700 hover:underline">Full profile <ArrowRight className="inline h-4 w-4" /></Link>}
          </div>
        </div>
      </div>
    </Section>
  )
}

export function ServicesSection() {
  const { services } = useSite()
  return (
    <Section title="Orthopaedic services" subtitle="Evaluation and treatment planning for the most common bone, joint and spine conditions." tone="soft">
      {services.length === 0 ? (
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">{orthoAreas.map(({ icon: I, title }) => <div key={title} className="card flex items-center gap-3 p-5"><I className="h-6 w-6 text-brand-600" />{title}</div>)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <h3 className="font-semibold">{s.name}</h3>
              {s.description && <p className="mt-2 text-sm text-slate-600">{s.description}</p>}
              {s.price > 0 && <p className="mt-3 text-sm font-medium text-brand-700">From {money(s.price)}</p>}
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

export function FacilitiesSection({ hideWhenEmpty }: { hideWhenEmpty?: boolean }) {
  const { content } = useSite()
  const items = content.FACILITY
  if (hideWhenEmpty && items.length === 0) return null
  return (
    <Section title="Facilities" subtitle="Designed for comfort, safety and smooth patient flow.">
      {items.length === 0 ? <p className="text-center text-slate-500">Facility details will be added soon.</p> :
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => { const Icon = iconFor(f.icon); return (
          <div key={f.id} className="card p-6"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></div><h3 className="font-semibold">{f.title}</h3><p className="mt-2 text-sm text-slate-600">{f.body}</p></div>) })}
      </div>}
    </Section>
  )
}

export function WhySection({ hideWhenEmpty }: { hideWhenEmpty?: boolean }) {
  const { content } = useSite()
  const items = content.WHY_US
  if (hideWhenEmpty && items.length === 0) return null
  return (
    <Section title="Why choose us" tone="soft" subtitle="A modern, patient-friendly way to receive orthopaedic care.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((w) => { const Icon = iconFor(w.icon); return (
          <div key={w.id} className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-slate-200"><Icon className="h-5 w-5" /></div><div><h3 className="font-semibold">{w.title}</h3><p className="mt-1 text-sm text-slate-600">{w.body}</p></div></div>) })}
      </div>
    </Section>
  )
}

export function TestimonialsSection({ hideWhenEmpty }: { hideWhenEmpty?: boolean }) {
  const { content } = useSite()
  const items = content.TESTIMONIAL
  if (hideWhenEmpty && items.length === 0) return null
  return (
    <Section title="What patients say" subtitle="Feedback shared by our patients.">
      {items.length === 0 ? <p className="text-center text-slate-500">Patient testimonials will appear here.</p> :
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.id} className="card p-6"><Quote className="h-6 w-6 text-brand-300" /><blockquote className="mt-3 text-slate-700">{t.body}</blockquote>
            <figcaption className="mt-4 text-sm"><span className="font-medium">{t.title}</span>{t.subtitle && <span className="text-slate-500"> - {t.subtitle}</span>}</figcaption></figure>
        ))}
      </div>}
    </Section>
  )
}

export function BlogSection({ limit, hideWhenEmpty }: { limit?: number; hideWhenEmpty?: boolean }) {
  const { content } = useSite()
  const posts = content.HEALTH_TIP
  if (hideWhenEmpty && posts.length === 0) return null
  return (
    <Section title="Health tips" subtitle="General guidance for healthy bones and joints. Not a substitute for medical advice." tone="soft">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {posts.slice(0, limit ?? posts.length).map((p) => (
          <Link key={p.id} to={`/health-tips/${p.slug}`} className="card block p-6 transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="font-semibold">{p.title}</h3><p className="mt-2 text-sm text-slate-600">{p.subtitle}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">Read more <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
    </Section>
  )
}

export function ContactSection() {
  const { settings } = useSite()
  const map = settings.map_embed_url
  const safeMap = map && map.startsWith('https://www.google.com/maps/embed') ? map : ''
  const rows = [
    { icon: Phone, label: 'Phone', value: settings.phone }, { icon: Siren, label: 'Emergency', value: settings.emergency_phone },
    { icon: Mail, label: 'Email', value: settings.email }, { icon: MapPin, label: 'Address', value: settings.address }, { icon: Clock, label: 'Hours', value: settings.opening_hours },
  ]
  return (
    <Section title="Contact us" subtitle="We are here to help. Call us or book online.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          {rows.map(({ icon: I, label, value }) => (
            <div key={label} className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><I className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="text-slate-800">{value}</p></div></div>
          ))}
          <Link to="/book" className="block pt-2"><Button className="w-full"><CalendarPlus className="h-4 w-4" /> Book an appointment online</Button></Link>
        </div>
        <div className="card min-h-72 overflow-hidden">
          {safeMap ? <iframe title="Hospital location" src={safeMap} className="h-full min-h-72 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            : <div className="grid h-full min-h-72 place-items-center bg-slate-50 p-6 text-center text-sm text-slate-500"><div><MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />Map will appear here once a Google Maps embed link is added in Admin &gt; Settings.</div></div>}
        </div>
      </div>
    </Section>
  )
}

export function GallerySection({ hideWhenEmpty }: { hideWhenEmpty?: boolean }) {
  const { gallery } = useSite()
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % gallery.length))
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, gallery.length])
  if (hideWhenEmpty && gallery.length === 0) return null
  const cur = open === null ? null : gallery[open]
  return (
    <Section title="Our clinic" subtitle="A look inside the hospital. Click a photo to enlarge it." tone="soft">
      {gallery.length === 0 ? <p className="text-center text-slate-500">Photos of the clinic will appear here.</p> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((g, i) => (
            <button key={g.id} type="button" onClick={() => setOpen(i)} aria-label={`Enlarge photo: ${g.caption ?? 'Clinic photo'}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-200">
              <img src={clinicPhotoUrl(g)} alt={g.caption ?? 'Clinic photo'} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              {g.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-sm text-white">{g.caption}</span>}
            </button>))}
        </div>}
      {cur && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4" onClick={() => setOpen(null)}>
          <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setOpen(null)}><X className="h-6 w-6" /></button>
          {gallery.length > 1 && <button type="button" aria-label="Previous photo" className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setOpen((open! - 1 + gallery.length) % gallery.length) }}><ChevronLeft className="h-7 w-7" /></button>}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img src={clinicPhotoUrl(cur)} alt={cur.caption ?? 'Clinic photo'} className="max-h-[82vh] w-auto rounded-xl object-contain" />
            {cur.caption && <figcaption className="mt-3 text-center text-sm text-white">{cur.caption}</figcaption>}
          </figure>
          {gallery.length > 1 && <button type="button" aria-label="Next photo" className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setOpen((open! + 1) % gallery.length) }}><ChevronRight className="h-7 w-7" /></button>}
        </div>)}
    </Section>
  )
}
