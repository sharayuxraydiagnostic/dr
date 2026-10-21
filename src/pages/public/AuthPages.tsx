import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarPlus } from 'lucide-react'
import { homeFor, useAuth } from '../../context/AuthContext'
import { errMsg } from '../../lib/api'
import { Button, Card, ErrorBox, Field, Input, PageLoader } from '../../components/ui'
import { Logo } from '../../components/Layouts'
import { clean } from '../../lib/utils'
import { PatientBooking } from '../portal/PatientPages'

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-gradient-to-b from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Link to="/"><Logo /></Link></div>
        <Card className="p-6 sm:p-8"><h1 className="text-xl font-semibold">{title}</h1><p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>{children}</Card>
      </div>
    </div>
  )
}

const loginSchema = z.object({ email: z.string().min(1, 'Email is required').email('Enter a valid email'), password: z.string().min(1, 'Password is required') })

export function Login() {
  const { login, user, loading } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  if (loading) return <PageLoader />
  if (user) return <Navigate to={homeFor(user.role)} replace />
  const from = (loc.state as { from?: string } | null)?.from
  return (
    <AuthShell title="Sign in" subtitle="Patients, doctors, reception and admin staff sign in here.">
      <form className="space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
        setError('')
        try { const u = await login(v.email, v.password); nav(from ?? homeFor(u.role), { replace: true }) } catch (e) { setError(errMsg(e)) }
      })}>
        {error && <ErrorBox message={error} />}
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="username" invalid={!!errors.email} {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="current-password" invalid={!!errors.password} {...register('password')} /></Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">New patient? <Link className="font-medium text-brand-700 hover:underline" to="/register">Create an account</Link></p>
    </AuthShell>
  )
}

const regSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(120),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^[+0-9 -]{10,15}$/, 'Enter a valid phone number'),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters').regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Use letters and at least one digit'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export function Register() {
  const { register: signUp, user } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof regSchema>>({ resolver: zodResolver(regSchema) })
  if (user) return <Navigate to={homeFor(user.role)} replace />
  return (
    <AuthShell title="Create patient account" subtitle="Book appointments and access your prescriptions, reports and bills online.">
      <form className="space-y-4" noValidate onSubmit={handleSubmit(async ({ confirm, ...v }) => {
        setError('')
        try { const u = await signUp(clean(v)); nav(homeFor(u.role), { replace: true }) } catch (e) { setError(errMsg(e)) }
      })}>
        {error && <ErrorBox message={error} />}
        <Field label="Full name" error={errors.fullName?.message}><Input autoComplete="name" invalid={!!errors.fullName} {...register('fullName')} /></Field>
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} /></Field>
        <Field label="Mobile number" error={errors.phone?.message}><Input type="tel" autoComplete="tel" invalid={!!errors.phone} {...register('phone')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of birth"><Input type="date" {...register('dateOfBirth')} /></Field>
          <Field label="Gender"><select className="input" {...register('gender')}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
        </div>
        <Field label="Password" error={errors.password?.message}><Input type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} /></Field>
        <Field label="Confirm password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" invalid={!!errors.confirm} {...register('confirm')} /></Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Already registered? <Link className="font-medium text-brand-700 hover:underline" to="/login">Sign in</Link></p>
    </AuthShell>
  )
}

export function BookPublic() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return (
    <AuthShell title="Book an appointment" subtitle="Please sign in or create a free patient account to choose a doctor and time.">
      <div className="space-y-3">
        <Link to="/login" state={{ from: '/book' }}><Button className="w-full">Sign in</Button></Link>
        <Link to="/register"><Button variant="outline" className="w-full">Create patient account</Button></Link>
        <p className="pt-2 text-center text-xs text-slate-500">Prefer to call? Contact details are on the <Link className="text-brand-700 underline" to="/contact">Contact</Link> page.</p>
      </div>
    </AuthShell>
  )
  if (user.role !== 'PATIENT') return (
    <AuthShell title="Staff account" subtitle="Appointments for patients are created from your dashboard.">
      <Link to={homeFor(user.role)}><Button className="w-full"><CalendarPlus className="h-4 w-4" /> Go to dashboard</Button></Link>
    </AuthShell>
  )
  return <div className="container-page py-10"><PatientBooking /></div>
}
