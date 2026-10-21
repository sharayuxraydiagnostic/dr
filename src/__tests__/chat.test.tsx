import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { apiMock, ok, Providers } from './mocks'

vi.mock('../lib/api', () => ({ api: apiMock, TOKEN_KEY: 'munot_token', errMsg: (e: { message?: string }) => e?.message ?? 'error', downloadFile: vi.fn(), openFile: vi.fn(), fetchBlobUrl: vi.fn() }))
import { Chat } from '../pages/Chat'
import { AuthProvider } from '../context/AuthContext'
import { DashboardLayout } from '../components/Layouts'
import type { ChatMessageView } from '../lib/types'

const today = new Date()
const iso = (m: number) => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T10:${String(m).padStart(2, '0')}:00.000000`
const msg = (id: number, over: Partial<ChatMessageView> = {}): ChatMessageView => ({ id, senderId: 2, senderName: 'Rita', senderRole: 'RECEPTIONIST', body: `hello ${id}`, deleted: false, createdAt: iso(id), updatedAt: iso(id), mine: false, ...over })
const members = [{ id: 1, name: 'Dr Munot', role: 'DOCTOR' }, { id: 2, name: 'Rita', role: 'RECEPTIONIST' }]
const reset = () => { localStorage.clear(); Object.values(apiMock).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset()) }

function server(initial: ChatMessageView[], extra?: (params: Record<string, unknown>) => ChatMessageView[]) {
  apiMock.get.mockImplementation((url: string, cfg?: { params?: Record<string, unknown> }) => {
    if (url === '/chat/members') return ok(members)
    if (url === '/chat/messages') return ok(cfg?.params?.since && extra ? extra(cfg.params) : cfg?.params?.since ? [] : initial)
    return ok({})
  })
  apiMock.put.mockReturnValue(ok({}))
}
const setup = (pollMs = 5000) => render(<Providers><Chat pollMs={pollMs} /></Providers>)

describe('Doctor <-> Reception chat', () => {
  beforeEach(reset)

  it('shows the whole conversation: who sent what, with role, Marathi text and deleted placeholders', async () => {
    server([msg(1, { body: 'Patient Asha is waiting' }), msg(2, { body: 'रुग्ण आले आहेत' }), msg(3, { mine: true, senderId: 1, senderName: 'Dr Munot', senderRole: 'DOCTOR', body: 'Send her in' }), msg(4, { deleted: true, body: '' })])
    setup()
    expect(await screen.findByText('Patient Asha is waiting')).toBeInTheDocument()
    expect(screen.getByText('रुग्ण आले आहेत')).toBeInTheDocument()
    expect(screen.getByText('Send her in')).toBeInTheDocument()
    expect(screen.getByText('Message deleted')).toBeInTheDocument()
    expect(screen.getAllByText('Rita').length).toBeGreaterThan(0)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('In this chat:')).toBeInTheDocument()
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/chat/read'))   // opening the chat marks it read
  })

  it('sends a message with the Send button, clears the box and shows the message', async () => {
    server([])
    apiMock.post.mockImplementation((_u: string, b: { body: string }) => ok(msg(10, { mine: true, senderName: 'Dr Munot', senderRole: 'DOCTOR', body: b.body })))
    setup()
    const box = await screen.findByLabelText('Message')
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    await userEvent.type(box, '  Please send the next patient  ')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/chat/messages', { body: 'Please send the next patient' }))
    expect(await screen.findByText('Please send the next patient')).toBeInTheDocument()
    expect((box as HTMLTextAreaElement).value).toBe('')
  })

  it('Enter sends, Shift+Enter makes a new line, and blank text is never sent', async () => {
    server([])
    apiMock.post.mockImplementation((_u: string, b: { body: string }) => ok(msg(11, { mine: true, body: b.body })))
    setup()
    const box = (await screen.findByLabelText('Message')) as HTMLTextAreaElement
    await userEvent.type(box, 'line one{Shift>}{Enter}{/Shift}line two')
    expect(box.value).toBe('line one\nline two')
    expect(apiMock.post).not.toHaveBeenCalled()
    await userEvent.type(box, '{Enter}')
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/chat/messages', { body: 'line one\nline two' }))
    await userEvent.type(box, '   {Enter}')
    expect(apiMock.post).toHaveBeenCalledTimes(1)
  })

  it('shows a new message from the other person automatically, and marks it read', async () => {
    let arrived = false
    server([msg(1)], () => (arrived ? [msg(2, { body: 'Patient is at the counter' })] : []))
    setup(40)
    await screen.findByText('hello 1')
    apiMock.put.mockClear()
    arrived = true
    expect(await screen.findByText('Patient is at the counter')).toBeInTheDocument()
    const polled = apiMock.get.mock.calls.filter((c) => c[0] === '/chat/messages' && c[1]?.params?.since)
    expect(polled.length).toBeGreaterThan(0)
    expect(polled[0][1].params.since).toBe(iso(1))        // only changes since the last message are requested
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledWith('/chat/read'))
  })

  it('lets you delete only your own messages', async () => {
    server([msg(1, { body: 'from reception' }), msg(2, { mine: true, senderId: 1, senderName: 'Dr Munot', senderRole: 'DOCTOR', body: 'my note' })])
    apiMock.delete.mockReturnValue(ok({}))
    setup()
    await screen.findByText('my note')
    expect(screen.getAllByRole('button', { name: 'Delete message' })).toHaveLength(1)   // not on the other person's message
    await userEvent.click(screen.getByRole('button', { name: 'Delete message' }))
    const dlg = await screen.findByRole('dialog')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/chat/messages/2'))
    expect(await screen.findByText('Message deleted')).toBeInTheDocument()
    expect(screen.queryByText('my note')).toBeNull()
    expect(screen.getByText('from reception')).toBeInTheDocument()
  })

  it('loads older messages when there are more than a page', async () => {
    const page = Array.from({ length: 50 }, (_, i) => msg(51 + i, { body: `m${51 + i}` }))
    server(page)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: /load older messages/i }))
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/chat/messages', { params: { before: 51 } }))
  })
})

describe('Unread messages badge', () => {
  beforeEach(reset)

  function layout(count: number) {
    localStorage.setItem('munot_token', 't')
    let c = count
    apiMock.get.mockImplementation((url: string) => ok(url === '/auth/me' ? { id: 1, fullName: 'Dr Munot', email: 'd@x.com', role: 'DOCTOR', enabled: true } : url === '/chat/unread' ? { count: c } : {}))
    render(<Providers route="/doctor"><AuthProvider><Routes>
      <Route path="/doctor" element={<DashboardLayout title="Doctor" items={[{ to: '/doctor', label: 'Today', icon: <i />, end: true }, { to: '/doctor/chat', label: 'Messages', icon: <i /> }]} />}><Route index element={<div>DASH</div>} /></Route>
    </Routes></AuthProvider></Providers>)
    return (n: number) => { c = n }
  }

  it('shows unread count on the Messages menu item and in the top bar, and clears after reading', async () => {
    const set = layout(3)
    expect(await screen.findByLabelText('3 unread messages')).toBeInTheDocument()
    expect(screen.getByLabelText('Messages (3 unread)')).toBeInTheDocument()
    set(0)
    act(() => { window.dispatchEvent(new Event('munot:chat-read')) })
    await waitFor(() => expect(screen.queryByLabelText('3 unread messages')).toBeNull())
    expect(screen.getByLabelText('Messages (0 unread)')).toBeInTheDocument()
  })
})
