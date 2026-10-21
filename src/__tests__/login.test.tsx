import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, TOKEN_KEY: 'munot_token', errMsg: (e: { message?: string }) => e?.message ?? 'error', downloadFile: vi.fn(), openFile: vi.fn() }))

import { AuthProvider } from '../context/AuthContext'
import { Login } from '../pages/public/AuthPages'

const setup = () => render(<Providers route="/login"><AuthProvider><Login /></AuthProvider></Providers>)

describe('Login form validation', () => {
  beforeEach(() => { localStorage.clear(); Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()) })

  it('requires email and password and does not call the API', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  it('rejects a malformed email', async () => {
    setup()
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('Password'), 'x')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  it('posts credentials and stores the token on success', async () => {
    apiMock.post.mockReturnValue(ok({ token: 'jwt-123', user: { id: 1, fullName: 'Doc', email: 'd@x.com', role: 'DOCTOR', enabled: true } }))
    setup()
    await userEvent.type(screen.getByLabelText('Email'), 'd@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/auth/login', { email: 'd@x.com', password: 'Secret123' }))
    expect(localStorage.getItem('munot_token')).toBe('jwt-123')
  })

  it('shows the server error for wrong credentials', async () => {
    apiMock.post.mockRejectedValue({ message: 'Invalid email or password' })
    setup()
    await userEvent.type(screen.getByLabelText('Email'), 'd@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'bad')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })
})
