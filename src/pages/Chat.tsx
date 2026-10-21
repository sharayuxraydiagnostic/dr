import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useLoad } from '../lib/hooks'
import type { ChatMember, ChatMessageView } from '../lib/types'
import { cn, fmtDate, fmtTime, todayISO } from '../lib/utils'
import { Button, Card, Empty, ErrorBox, PageHeader, PageLoader, Textarea, useUI } from '../components/ui'
import { RoleBadge } from '../components/RoleBadge'

const MAX = 1000
const timeOf = (iso: string) => fmtTime(iso.slice(11, 16))
const dayLabel = (iso: string) => (iso.slice(0, 10) === todayISO() ? 'Today' : fmtDate(iso.slice(0, 10)))

function merge(list: ChatMessageView[], incoming: ChatMessageView[]) {
  const map = new Map(list.map((m) => [m.id, m]))
  incoming.forEach((m) => map.set(m.id, m))
  return [...map.values()].sort((a, b) => a.id - b.id)
}
const latestUpdate = (list: ChatMessageView[]) => list.reduce<string | null>((acc, m) => (!acc || m.updatedAt > acc ? m.updatedAt : acc), null)
const announceRead = () => window.dispatchEvent(new Event('munot:chat-read'))

/** One shared channel for doctor(s) and reception. Everybody in the channel sees every message. */
export function Chat({ pollMs = 4000 }: { pollMs?: number }) {
  const { toast, confirm } = useUI()
  const [msgs, setMsgs] = useState<ChatMessageView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const since = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const members = useLoad<ChatMember[]>(() => api.get('/chat/members').then((r) => r.data))

  const markRead = useCallback(() => { api.put('/chat/read').then(announceRead).catch(() => {}) }, [])

  useEffect(() => {
    let alive = true
    api.get<ChatMessageView[]>('/chat/messages').then((r) => {
      if (!alive) return
      setMsgs(r.data); since.current = latestUpdate(r.data); setHasMore(r.data.length >= 50); setLoading(false); markRead()
    }).catch((e) => { if (alive) { setError(errMsg(e)); setLoading(false) } })
    return () => { alive = false }
  }, [markRead])

  useEffect(() => {
    if (loading || error) return
    const id = setInterval(() => {
      api.get<ChatMessageView[]>('/chat/messages', { params: { since: since.current ?? undefined } }).then((r) => {
        if (r.data.length === 0) return
        setMsgs((cur) => merge(cur, r.data))
        since.current = latestUpdate(r.data) ?? since.current
        if (r.data.some((m) => !m.mine && !m.deleted) && document.visibilityState === 'visible') markRead()
      }).catch(() => {})
    }, pollMs)
    return () => clearInterval(id)
  }, [loading, error, pollMs, markRead])

  useLayoutEffect(() => {
    const el = listRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [msgs])

  const onScroll = () => {
    const el = listRef.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const { data } = await api.post<ChatMessageView>('/chat/messages', { body })
      stick.current = true
      setMsgs((cur) => merge(cur, [data])); since.current = latestUpdate([data]) && (!since.current || data.updatedAt > since.current) ? data.updatedAt : since.current
      setText(''); announceRead()
    } catch (e) { toast.error(errMsg(e)) } finally { setSending(false) }
  }

  const loadOlder = async () => {
    const first = msgs[0]?.id
    if (!first) return
    stick.current = false
    try {
      const { data } = await api.get<ChatMessageView[]>('/chat/messages', { params: { before: first } })
      setMsgs((cur) => merge(cur, data)); setHasMore(data.length >= 50)
    } catch (e) { toast.error(errMsg(e)) }
  }

  const remove = async (m: ChatMessageView) => {
    if (!(await confirm({ title: 'Delete this message?', message: 'It is removed for everyone. A "message deleted" note stays in the conversation.', confirmLabel: 'Delete', danger: true }))) return
    try { await api.delete(`/chat/messages/${m.id}`); setMsgs((cur) => cur.map((x) => (x.id === m.id ? { ...x, deleted: true, body: '' } : x))) } catch (e) { toast.error(errMsg(e)) }
  }

  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} />

  let lastDay = ''
  return (
    <>
      <PageHeader title="Messages" subtitle="Doctor and reception conversation. Everyone in this chat can see all messages." />
      <Card className="flex h-[calc(100vh-14rem)] min-h-[26rem] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
          <span>In this chat:</span>
          {(members.data ?? []).map((m) => <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5"><RoleBadge role={m.role} /> {m.name}</span>)}
        </div>
        <div ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-label="Conversation" className="flex-1 space-y-2 overflow-y-auto bg-slate-50/60 px-4 py-4">
          {hasMore && <div className="text-center"><Button size="sm" variant="outline" onClick={loadOlder}>Load older messages</Button></div>}
          {msgs.length === 0 && <Empty title="No messages yet" hint="Say hello - for example, tell the doctor a patient has arrived." />}
          {msgs.map((m) => {
            const day = dayLabel(m.createdAt)
            const sep = day !== lastDay
            lastDay = day
            return (
              <div key={m.id}>
                {sep && <p className="my-3 text-center text-xs font-medium text-slate-400">{day}</p>}
                <div className={cn('group flex', m.mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]', m.mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800')}>
                    {!m.mine && <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">{m.senderName} <RoleBadge role={m.senderRole} /></p>}
                    {m.deleted ? <p className={cn('italic', m.mine ? 'text-brand-100' : 'text-slate-400')}>Message deleted</p> : <p className="font-indic whitespace-pre-wrap break-words">{m.body}</p>}
                    <p className={cn('mt-1 flex items-center justify-end gap-2 text-[11px]', m.mine ? 'text-brand-100' : 'text-slate-400')}>
                      {timeOf(m.createdAt)}
                      {m.mine && !m.deleted && <button type="button" aria-label="Delete message" onClick={() => remove(m)} className="opacity-0 transition focus:opacity-100 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </p>
                  </div>
                </div>
              </div>)
          })}
        </div>
        <form className="flex items-end gap-2 border-t border-slate-100 bg-white p-3" onSubmit={(e) => { e.preventDefault(); send() }}>
          <div className="flex-1">
            <Textarea aria-label="Message" rows={2} maxLength={MAX} value={text} placeholder="Type a message... (Enter to send, Shift+Enter for a new line)" className="font-indic resize-none"
              onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
            <p className="mt-0.5 text-right text-[11px] text-slate-400">{text.length}/{MAX}</p>
          </div>
          <Button type="submit" disabled={!text.trim()} loading={sending}><Send className="h-4 w-4" /> Send</Button>
        </form>
      </Card>
      <p className="mt-2 text-xs text-slate-500">Visible only to doctors and reception. Share patient details only when needed for care.</p>
    </>
  )
}
