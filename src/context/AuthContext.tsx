// import { createContext, useCallback, useContext, useEffect, useState } from 'react'
// import type { ReactNode } from 'react'
// import { api, TOKEN_KEY } from '../lib/api'
// import type { AuthResponse, UserView } from '../lib/types'

// interface AuthCtx {
//   user: UserView | null
//   loading: boolean
//   login: (email: string, password: string) => Promise<UserView>
//   register: (data: Record<string, unknown>) => Promise<UserView>
//   logout: () => void
// }
// const Ctx = createContext<AuthCtx | null>(null)

// export const homeFor = (role: UserView['role']) =>
//   ({ ADMIN: '/admin', DOCTOR: '/doctor', RECEPTIONIST: '/reception', PATIENT: '/portal' })[role]

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<UserView | null>(null)
//   const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY))

//   const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setUser(null) }, [])

//   useEffect(() => {
//     if (!localStorage.getItem(TOKEN_KEY)) return
//     api.get<UserView>('/auth/me').then((r) => setUser(r.data)).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false))
//   }, [])

//   useEffect(() => {
//     const h = () => setUser(null)
//     window.addEventListener('munot:logout', h)
//     return () => window.removeEventListener('munot:logout', h)
//   }, [])

//   const accept = (r: AuthResponse) => { localStorage.setItem(TOKEN_KEY, r.token); setUser(r.user); return r.user }
//   const login = async (email: string, password: string) => accept((await api.post<AuthResponse>('/auth/login', { email, password })).data)
//   const register = async (data: Record<string, unknown>) => accept((await api.post<AuthResponse>('/auth/register', data)).data)

//   return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
// }

// export function useAuth() {
//   const c = useContext(Ctx)
//   if (!c) throw new Error('useAuth must be used inside AuthProvider')
//   return c
// }

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, TOKEN_KEY } from '../lib/api'
import type { AuthResponse, UserView } from '../lib/types'

interface AuthCtx {
  user: UserView | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserView>
  register: (data: Record<string, unknown>) => Promise<UserView>
  logout: () => void
}
const Ctx = createContext<AuthCtx | null>(null)

export const homeFor = (role: UserView['role']) =>
  ({ ADMIN: '/admin', DOCTOR: '/doctor', RECEPTIONIST: '/reception', PATIENT: '/portal' })[role]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null)
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY))

  const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setUser(null) }, [])

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return
    api.get<UserView>('/auth/me').then((r) => setUser(r.data)).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const h = () => setUser(null)
    window.addEventListener('munot:logout', h)
    return () => window.removeEventListener('munot:logout', h)
  }, [])

  const accept = (r: AuthResponse) => { localStorage.setItem(TOKEN_KEY, r.token); setUser(r.user); return r.user }
  const login = async (email: string, password: string) => accept((await api.post<AuthResponse>('/auth/login', { email, password })).data)
  const register = async (data: Record<string, unknown>) => accept((await api.post<AuthResponse>('/auth/register', data)).data)

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}

/** Like useAuth, but returns null instead of throwing when there is no AuthProvider (for shared print pages that must also render stand-alone). */
export function useOptionalAuth() {
  return useContext(Ctx)
}
