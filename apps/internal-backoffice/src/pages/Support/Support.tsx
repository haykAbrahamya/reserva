import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LifeBuoy, Send, Loader2, ArrowLeft, Trash2, MessageSquare, Check, CheckCheck } from 'lucide-react'
import { Empty, Button, ConfirmDialog, useToast } from '@/components/ui'
import { SupportPushToggle } from './SupportPushToggle'
import {
  supportService,
  type SupportThreadSummary,
  type SupportMessage,
} from '@/services/support.service'
import { onSupportMessage, onSupportBadge, onSupportTyping, onSupportRead, onSupportClosed, emitTyping } from '@/services/supportSocket'
import s from './Support.module.scss'

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString()
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Support() {
  const [threads, setThreads] = useState<SupportThreadSummary[] | null>(null)
  const [params, setParams] = useSearchParams()
  const activeId = params.get('thread')

  const loadThreads = useCallback(() => {
    supportService.threads().then(setThreads).catch(() => setThreads([]))
  }, [])

  useEffect(() => { loadThreads() }, [loadThreads])

  useEffect(() => {
    const off1 = onSupportMessage(() => loadThreads())
    const off2 = onSupportBadge(() => loadThreads())
    // A closed ticket vanishes: drop it from the list and, if it's the open one,
    // clear the conversation pane.
    const off3 = onSupportClosed((d) => {
      setThreads((prev) => (prev ?? []).filter((t) => t.partnerId !== d.partnerId))
      setParams((p) => {
        const cur = new URLSearchParams(p)
        // If the closed thread is the active one, close the pane.
        return cur
      }, { replace: true })
    })
    return () => { off1(); off2(); off3() }
  }, [loadThreads, setParams])

  const select = (id: string) => setParams(id ? { thread: id } : {}, { replace: true })

  return (
    <div className={s.page}>
      <div className={s.toolbar}>
        <SupportPushToggle />
      </div>
      <div className={[s.wrap, activeId ? s.hasActive : ''].filter(Boolean).join(' ')}>
        <aside className={s.list}>
          <div className={s.listHead}><LifeBuoy size={16} /> Support</div>
          {threads === null ? (
            <div className={s.center}><Loader2 size={20} className={s.spin} /></div>
          ) : threads.length === 0 ? (
            <div className={s.center}>
              <Empty icon={MessageSquare} title="No conversations" description="Partner questions will appear here." />
            </div>
          ) : (
            <div className={s.threadItems}>
              {threads.map((t) => (
                <button
                  key={t.id}
                  className={[s.threadItem, t.id === activeId ? s.threadActive : ''].filter(Boolean).join(' ')}
                  onClick={() => select(t.id)}
                >
                  <div className={s.threadTop}>
                    <span className={s.threadName}>{t.partnerName}</span>
                    <span className={s.threadTime}>{fmtRelative(t.lastMessageAt)}</span>
                  </div>
                  <div className={s.threadBottom}>
                    <span className={s.threadPreview}>{t.lastMessage ?? '—'}</span>
                    {t.platformUnread > 0 && <span className={s.unreadPill}>{t.platformUnread}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={s.convo}>
          {activeId ? (
            <Conversation key={activeId} threadId={activeId} onBack={() => select('')} onChanged={loadThreads} onClosed={() => select('')} />
          ) : (
            <div className={s.placeholder}><LifeBuoy size={30} /><p>Select a conversation</p></div>
          )}
        </section>
      </div>
    </div>
  )
}

function Conversation({
  threadId,
  onBack,
  onChanged,
  onClosed,
}: {
  threadId: string
  onBack: () => void
  onChanged: () => void
  onClosed: () => void
}) {
  const toast = useToast()
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)
  const [partnerName, setPartnerName] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peerTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  useEffect(() => {
    let alive = true
    supportService.messages(threadId).then((v) => {
      if (!alive) return
      setMessages(v.messages)
      const first = v.messages.find((m) => m.senderType === 'partner')
      if (first) { setPartnerName(first.senderName) }
      scrollToBottom()
      supportService.markRead(threadId).then(onChanged).catch(() => undefined)
    }).catch(() => alive && setMessages([]))
    return () => { alive = false }
  }, [threadId, scrollToBottom, onChanged])

  // Resolve partnerId for typing emits (from the thread list via a fresh fetch).
  useEffect(() => {
    supportService.threads().then((ts) => {
      const t = ts.find((x) => x.id === threadId)
      if (t) setPartnerId(t.partnerId)
    }).catch(() => undefined)
  }, [threadId])

  useEffect(() => {
    const offMsg = onSupportMessage((m) => {
      if (m.threadId !== threadId) return
      setMessages((prev) => {
        const list = prev ?? []
        return list.some((x) => x.id === m.id) ? list : [...list, m]
      })
      if (m.senderType === 'partner') {
        setPeerTyping(false)
        supportService.markRead(threadId).then(onChanged).catch(() => undefined)
      }
      scrollToBottom()
    })
    const offTyping = onSupportTyping((d) => {
      if (d.from !== 'partner' || d.partnerId !== partnerId) return
      setPeerTyping(d.typing)
      if (d.typing) {
        if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current)
        peerTypingTimer.current = setTimeout(() => setPeerTyping(false), 5000)
        scrollToBottom()
      }
    })
    const offRead = onSupportRead((d) => {
      if (d.partnerId !== partnerId || d.reader !== 'partner') return
      setMessages((prev) =>
        (prev ?? []).map((m) =>
          m.senderType === 'platform' && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
        ),
      )
    })
    const offClosed = onSupportClosed((d) => {
      if (d.partnerId === partnerId) onClosed()
    })
    return () => {
      offMsg(); offTyping(); offRead(); offClosed()
      if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current)
    }
  }, [threadId, partnerId, scrollToBottom, onChanged, onClosed])

  const signalTyping = () => {
    if (!partnerId) return
    if (!isTypingRef.current) { isTypingRef.current = true; emitTyping(partnerId, true) }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => { isTypingRef.current = false; emitTyping(partnerId, false) }, 1800)
  }
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current) }, [])

  const sendBody = async (body: string) => {
    if (!body || sending) return
    setSending(true)
    setText('')
    if (isTypingRef.current && partnerId) { isTypingRef.current = false; emitTyping(partnerId, false) }
    try {
      const msg = await supportService.reply(threadId, body)
      setMessages((prev) => {
        const list = prev ?? []
        return list.some((x) => x.id === msg.id) ? list : [...list, msg]
      })
      scrollToBottom()
      onChanged()
    } catch { setText(body) } finally { setSending(false) }
  }
  const send = () => void sendBody(text.trim())

  // Enter = send, Shift+Enter = newline; IME-safe.
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
  }
  // Mobile fallback: "Send" key that inserts a trailing newline → send.
  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    if (v.endsWith('\n') && !v.slice(0, -1).includes('\n')) {
      const body = v.replace(/\n+$/, '').trim()
      setText('')
      signalTyping()
      if (body) void sendBody(body)
      return
    }
    setText(v)
    signalTyping()
  }

  const doClose = async () => {
    setClosing(true)
    try {
      await supportService.close(threadId)
      toast('Ticket closed and conversation deleted')
      onChanged()
      onClosed()
    } catch {
      toast('Could not close the ticket')
    } finally {
      setClosing(false)
      setConfirmClose(false)
    }
  }

  return (
    <div className={s.conversation}>
      <header className={s.convoHead}>
        <button className={s.backBtn} onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button>
        <div className={s.convoTitle}>
          {partnerName || 'Partner'}
          {peerTyping && <span className={s.typingLabel}>typing…</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirmClose(true)}><Trash2 size={14} /> Close ticket</Button>
      </header>

      <div className={s.msgs} ref={listRef}>
        {messages === null ? (
          <div className={s.center}><Loader2 size={20} className={s.spin} /></div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
            const mine = m.senderType === 'platform'
            return (
              <div key={m.id}>
                {showDay && <div className={s.daySep}><span>{new Date(m.createdAt).toLocaleDateString()}</span></div>}
                <div className={[s.msg, mine ? s.mine : s.theirs].join(' ')}>
                  {!mine && <div className={s.msgName}>{m.senderName}</div>}
                  <div className={s.bubble}>{m.body}</div>
                  <div className={s.metaLine}>
                    <span className={s.time}>{fmtTime(m.createdAt)}</span>
                    {mine && (m.readAt ? <CheckCheck size={13} className={s.seen} /> : <Check size={13} className={s.sent} />)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        {peerTyping && (
          <div className={[s.msg, s.theirs].join(' ')}>
            <div className={[s.bubble, s.typingBubble].join(' ')}>
              <span className={s.typingDot} /><span className={s.typingDot} /><span className={s.typingDot} />
            </div>
          </div>
        )}
      </div>

      <div className={s.composer}>
        <textarea
          className={s.input}
          value={text}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          enterKeyHint="send"
          placeholder="Reply to the partner…"
          rows={1}
        />
        <button className={s.send} onClick={send} disabled={!text.trim() || sending} aria-label="Send">
          {sending ? <Loader2 size={17} className={s.spin} /> : <Send size={17} />}
        </button>
      </div>

      <ConfirmDialog
        open={confirmClose}
        variant="danger"
        title="Close this ticket?"
        message="This permanently deletes the conversation from the database. The partner's chat resets to empty — they can start a new question anytime. This cannot be undone."
        confirmLabel={closing ? 'Closing…' : 'Close & delete'}
        cancelLabel="Cancel"
        loading={closing}
        onConfirm={doClose}
        onClose={() => !closing && setConfirmClose(false)}
      />
    </div>
  )
}
