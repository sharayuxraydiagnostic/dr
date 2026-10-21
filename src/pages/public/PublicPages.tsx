import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AboutSection, BlogSection, ContactSection, DoctorSection, FacilitiesSection, GallerySection, HeroSection, ServicesSection, TestimonialsSection, WhySection } from './Sections'
import { useSite } from '../../context/SiteContext'
import { Section } from './Sections'

export const Home = () => (<><HeroSection /><AboutSection /><DoctorSection /><ServicesSection /><FacilitiesSection hideWhenEmpty /><GallerySection hideWhenEmpty /><WhySection hideWhenEmpty /><TestimonialsSection hideWhenEmpty /><BlogSection limit={3} hideWhenEmpty /><ContactSection /></>)
export const About = () => <><AboutSection /><WhySection hideWhenEmpty /></>
export const DoctorProfile = () => <DoctorSection full />
export const Services = () => <ServicesSection />
export const Facilities = () => <><FacilitiesSection /><GallerySection hideWhenEmpty /></>
export const WhyUs = () => <WhySection />
export const Testimonials = () => <TestimonialsSection />
export const HealthTips = () => <BlogSection />
export const Contact = () => <ContactSection />

export function HealthTip() {
  const { slug } = useParams()
  const { content } = useSite()
  const p = content.HEALTH_TIP.find((x) => x.slug === slug)
  return (
    <Section title={p?.title ?? 'Article not found'}>
      <article className="mx-auto max-w-2xl space-y-4 text-slate-700">
        {p ? (p.body ?? '').split(/\n\s*\n/).map((t, i) => <p key={i} className="leading-relaxed">{t}</p>) : <p>This article does not exist.</p>}
        {p && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">This article is for general information only and is not a substitute for professional medical advice.</p>}
        <Link to="/health-tips" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"><ArrowLeft className="h-4 w-4" /> All health tips</Link>
      </article>
    </Section>
  )
}
