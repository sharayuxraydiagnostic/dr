import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, TOKEN_KEY: 'munot_token', errMsg: () => 'error', downloadFile: vi.fn(), openFile: vi.fn(), fetchBlobUrl: vi.fn() }))
import { AuthProvider } from '../context/AuthContext'
import { DashboardLayout, PublicLayout } from '../components/Layouts'

const user = (role: string, name: string) => ({ id: 1, fullName: name, email: 'u@x.com', role, enabled: true })
function app(role: string, name: string, route: string) {
  localStorage.setItem('munot_token', 't')
  apiMock.get.mockImplementation((url: string) => ok(url === '/auth/me' ? user(role, name) : url === '/notifications/my/unread-count' ? { count: 2 } : {}))
  return render(
    <Providers route={route}><AuthProvider>
      <Routes>
        <Route path="/" element={<PublicLayout />}><Route index element={<div>WEBSITE HOME PAGE</div>} /></Route>
        <Route path="/doctor" element={<DashboardLayout title="Doctor" items={[{ to: '/doctor', label: "Today's clinic", icon: <i />, end: true }]} />}><Route index element={<div>DOCTOR DASHBOARD</div>} /></Route>
        <Route path="/portal" element={<DashboardLayout title="Patient portal" items={[{ to: '/portal', label: 'Overview', icon: <i />, end: true }]} />}><Route index element={<div>PORTAL</div>} /></Route>
      </Routes></AuthProvider></Providers>)
}
const reset = () => { localStorage.clear(); Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()) }

describe('Dashboard navbar', () => {
  beforeEach(reset)

  it('shows which role is signed in, and the user name, at the top of every dashboard', async () => {
    app('DOCTOR', 'Dr Munot', '/doctor')
    expect(await screen.findByText('DOCTOR DASHBOARD')).toBeInTheDocument()
    const header = screen.getByRole('banner')
    expect(within(header).getByTestId('role-badge')).toHaveTextContent('Doctor')
    expect(within(header).getByText('Dr Munot')).toBeInTheDocument()
  })

  it('has a Home link that takes the user back to the website from inside the dashboard', async () => {
    app('DOCTOR', 'Dr Munot', '/doctor')
    await screen.findByText('DOCTOR DASHBOARD')
    await userEvent.click(within(screen.getByRole('banner')).getByRole('link', { name: /home/i }))
    expect(await screen.findByText('WEBSITE HOME PAGE')).toBeInTheDocument()
  })

  it('also offers Website home in the side menu', async () => {
    app('DOCTOR', 'Dr Munot', '/doctor')
    await screen.findByText('DOCTOR DASHBOARD')
    const nav = screen.getByRole('navigation', { name: 'Dashboard' })
    await userEvent.click(within(nav).getByRole('link', { name: /website home/i }))
    expect(await screen.findByText('WEBSITE HOME PAGE')).toBeInTheDocument()
  })

  it('shows the notification bell to patients only', async () => {
    const { unmount } = app('PATIENT', 'Asha', '/portal')
    expect(await screen.findByLabelText(/Notifications \(2 unread\)/)).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByTestId('role-badge')).toHaveTextContent('Patient')
    unmount(); reset()
    app('DOCTOR', 'Dr Munot', '/doctor')
    await screen.findByText('DOCTOR DASHBOARD')
    expect(screen.queryByLabelText(/Notifications/)).toBeNull()
  })

  it('signs out from the navbar', async () => {
    app('DOCTOR', 'Dr Munot', '/doctor')
    await screen.findByText('DOCTOR DASHBOARD')
    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /sign out/i }))
    expect(localStorage.getItem('munot_token')).toBeNull()
  })
})

describe('Website navbar when signed in', () => {
  beforeEach(reset)

  it('shows the role and a way back to the dashboard', async () => {
    app('RECEPTIONIST', 'Rita', '/')
    expect(await screen.findByText('WEBSITE HOME PAGE')).toBeInTheDocument()
    expect(await screen.findByTestId('role-badge')).toHaveTextContent('Receptionist')
    expect(screen.getByRole('link', { name: /my dashboard/i })).toHaveAttribute('href', '/reception')
  })
})
