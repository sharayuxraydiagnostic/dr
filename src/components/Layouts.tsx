import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CalendarPlus, Globe, Home, LogIn, LogOut, Menu, MessageSquare, Phone, Siren, X } from 'lucide-react'
import { api } from '../lib/api'
import { homeFor, useAuth } from '../context/AuthContext'
import { isPlaceholder, useSite } from '../context/SiteContext'
import { cn, labelize } from '../lib/utils'
import { Button } from './ui'
import { RoleBadge } from './RoleBadge'

export function Logo({ light }: { light?: boolean }) {
  const { settings } = useSite()
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 64 64" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M22 14a6 6 0 0 1 6 6c0 1.6-.6 3-1.6 4L40 37.6c1-.6 2.4-1.2 4-1.2a6 6 0 1 1-6 6c0-1.6.6-3 1.2-4L24.4 24.8C23.4 25.4 22 26 20.8 26A6 6 0 0 1 22 14z" /></svg>
      </span>
      <span className={cn('text-[15px] font-semibold leading-tight', light ? 'text-white' : 'text-slate-900')}>{settings.hospital_name}</span>
    </span>
  )
}

const NAV = [
  ['/', 'Home'], ['/about', 'About'], ['/doctor-profile', 'Doctor'], ['/services', 'Services'], ['/facilities', 'Facilities'],
  ['/why-choose-us', 'Why Us'], ['/health-tips', 'Health Tips'], ['/contact', 'Contact'],
] as const

export function PublicLayout() {
  const { settings } = useSite()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  const emergency = settings.emergency_phone

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-brand-900 text-brand-50">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs">
          <span className="flex items-center gap-1.5"><Siren className="h-3.5 w-3.5" /> Emergency: {isPlaceholder(emergency) ? <span className="opacity-80">{emergency}</span> : <a className="font-semibold underline" href={`tel:${emergency.replace(/[^+\d]/g, '')}`}>{emergency}</a>}</span>
          <span className="hidden sm:block">{settings.opening_hours}</span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="Home"><Logo /></Link>
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100')}>{label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden items-center gap-2 text-sm text-slate-600 md:flex"><RoleBadge role={user.role} /><span className="max-w-[9rem] truncate">{user.fullName}</span></span>
                <Link to={homeFor(user.role)}><Button variant="outline" size="sm">My Dashboard</Button></Link>
                <Button variant="ghost" size="sm" onClick={logout} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
              </>
            ) : (
              <Link to="/login" className="hidden sm:block"><Button variant="outline" size="sm"><LogIn className="h-4 w-4" /> Patient Login</Button></Link>
            )}
            <Link to="/book"><Button size="sm"><CalendarPlus className="h-4 w-4" /> <span className="hidden sm:inline">Book</span> Appointment</Button></Link>
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden" aria-label="Mobile">
            {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{label}</NavLink>)}
            {!user && <NavLink to="/login" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700">Patient Login</NavLink>}
            {user && <div className="mt-2 flex items-center gap-2 border-t border-slate-100 px-3 pt-3 text-sm text-slate-600"><RoleBadge role={user.role} /> {user.fullName}</div>}
          </nav>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="bg-slate-900 text-slate-300">
        <div className="container-page grid gap-8 py-12 md:grid-cols-3">
          <div><Logo light /><p className="mt-4 max-w-xs text-sm text-slate-400">{settings.tagline}</p></div>
          <div className="text-sm"><h4 className="mb-3 font-semibold text-white">Contact</h4>
            <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" /> {settings.phone}</p>
            <p className="mt-2 text-slate-400">{settings.address}</p><p className="mt-2 text-slate-400">{settings.email}</p></div>
          <div className="text-sm"><h4 className="mb-3 font-semibold text-white">Quick links</h4>
            <ul className="space-y-1.5">{NAV.slice(1).map(([to, l]) => <li key={to}><Link className="hover:text-white" to={to}>{l}</Link></li>)}<li><Link className="hover:text-white" to="/book">Book Appointment</Link></li></ul></div>
        </div>
        <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} {settings.hospital_name}. In a medical emergency, call the emergency number above or visit the nearest hospital. Information on this site is general and not a substitute for medical advice.
        </div>
      </footer>
    </div>
  )
}

export interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

export function DashboardLayout({ items, title }: { items: NavItem[]; title: string }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [chatUnread, setChatUnread] = useState(0)
  const staffChat = user?.role === 'DOCTOR' || user?.role === 'RECEPTIONIST'
  const chatPath = user?.role === 'DOCTOR' ? '/doctor/chat' : user?.role === 'RECEPTIONIST' ? '/reception/chat' : null
  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => {
    if (user?.role !== 'PATIENT') return
    const load = () => api.get('/notifications/my/unread-count').then((r) => setUnread(r.data.count)).catch(() => {})
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [user?.role])
  useEffect(() => {
    if (!staffChat) return
    const load = () => api.get('/chat/unread').then((r) => setChatUnread(r.data.count)).catch(() => {})
    load()
    const id = setInterval(load, 15000)
    window.addEventListener('munot:chat-read', load)
    return () => { clearInterval(id); window.removeEventListener('munot:chat-read', load) }
  }, [staffChat])

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/" className="px-5 py-5"><Logo /></Link>
      <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Dashboard">
        <Link to="/" className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"><span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5"><Globe /></span>Website home</Link>
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100')}>
            <span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{i.icon}</span>{i.label}
            {i.to.endsWith('/chat') && chatUnread > 0 && <span aria-label={`${chatUnread} unread messages`} className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">{chatUnread}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-4">
        <p className="truncate text-sm font-medium text-slate-900">{user?.fullName}</p>
        <div className="mt-1">{user && <RoleBadge role={user.role} />}</div>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { logout(); nav('/login') }}><LogOut className="h-4 w-4" /> Sign out</Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="no-print sticky top-0 hidden h-screen border-r border-slate-200 bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-4">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <Link to="/" className="hidden items-center md:flex" aria-label="Hospital website"><Logo /></Link>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Home className="h-4 w-4" /> Home</Link>
          <div className="flex-1" />
          <span className="hidden max-w-[12rem] truncate text-sm text-slate-600 sm:inline">{user?.fullName}</span>
          {user && <RoleBadge role={user.role} />}
          {chatPath && (
            <Link to={chatPath} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={`Messages (${chatUnread} unread)`}>
              <MessageSquare className="h-5 w-5" />
              {chatUnread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{chatUnread}</span>}
            </Link>)}
          {user?.role === 'PATIENT' && (
            <Link to="/portal/notifications" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={`Notifications (${unread} unread)`}>
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
            </Link>)}
          <Button variant="ghost" size="sm" onClick={() => { logout(); nav('/login') }} aria-label="Sign out"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></Button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
