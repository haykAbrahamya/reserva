import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Send, Loader2, LifeBuoy, Check, CheckCheck } from 'lucide-react'
import { useT } from '@/i18n'
import { supportService, type SupportMessage } from '@/services/support.service'
import {
  onSupportMessage,
  onSupportTyping,
  onSupportRead,
  onSupportClosed,
  emitTyping,
} from '@/services/supportSocket'
import s from './SupportPanel.module.scss'

interface Props {
  onClose: () => void
  mobile?: boolean
}

/** Compact clock time, e.g. "14:05". */
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
/** Day label for separators: Today / Yesterday / date. */
function dayLabel(iso: string, t: (k: string) => string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, now)) return t('support.today')
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (sameDay(d, y)) return t('support.yesterday')
  return d.toLocaleDateString()
}

/**
 * Full support chat (partner side): live messages, typing indicator, read
 * receipts (sent ✓ / seen ✓✓), day separators + timestamps, optimistic send.
 * The socket is opened by the provider when the panel opens and closed when it
 * closes, so listeners here are only live while mounted.
 */
export function SupportPanel({ onClose, mobile }: Props) {
  const t = useT()
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
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

  // Initial load.
  useEffect(() => {
    let alive = true
    supportService
      .thread()
      .then((v) => {
        if (!alive) return
        setMessages(v.messages)
        scrollToBottom()
      })
      .catch(() => alive && setMessages([]))
    return () => {
      alive = false
    }
  }, [scrollToBottom])

  // Live events.
  useEffect(() => {
    const offMsg = onSupportMessage((m) => {
      setMessages((prev) => {
        const list = prev ?? []
        return list.some((x) => x.id === m.id) ? list : [...list, m]
      })
      if (m.senderType === 'platform') {
        setPeerTyping(false)
        supportService.markRead().catch(() => undefined)
      }
      scrollToBottom()
    })
    const offTyping = onSupportTyping((d) => {
      if (d.from !== 'platform') return
      setPeerTyping(d.typing)
      if (d.typing) {
        if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current)
        // Safety auto-clear if a "stopped" event is missed.
        peerTypingTimer.current = setTimeout(() => setPeerTyping(false), 5000)
        scrollToBottom()
      }
    })
    const offRead = onSupportRead((d) => {
      // Platform read our messages → mark all my sent messages seen.
      if (d.reader === 'platform') {
        setMessages((prev) =>
          (prev ?? []).map((m) =>
            m.senderType === 'partner' && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
          ),
        )
      }
    })
    const offClosed = onSupportClosed(() => {
      // Ticket deleted by platform → reset to a fresh, empty conversation.
      setMessages([])
      setPeerTyping(false)
    })
    return () => {
      offMsg(); offTyping(); offRead(); offClosed()
      if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current)
    }
  }, [scrollToBottom])

  // Debounced typing emit: fire "typing" on input, "stopped" after 1.8s idle.
  const signalTyping = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      emitTyping(true)
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false
      emitTyping(false)
    }, 1800)
  }
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current) }, [])

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setText('')
    // Stop typing immediately on send.
    if (isTypingRef.current) { isTypingRef.current = false; emitTyping(false) }
    try {
      const msg = await supportService.send(body)
      setMessages((prev) => {
        const list = prev ?? []
        return list.some((x) => x.id === msg.id) ? list : [...list, msg]
      })
      scrollToBottom()
    } catch {
      setText(body)
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  return (
    <div className={[s.panel, mobile ? s.mobile : ''].filter(Boolean).join(' ')}>
      {mobile && <div className={s.grab} />}
      <header className={s.head}>
        <div className={s.headTitle}>
          <span className={s.headIcon}><LifeBuoy size={17} /></span>
          <div>
            <div className={s.headName}>{t('support.title')}</div>
            <div className={s.headSub}>{peerTyping ? t('support.typing') : t('support.subtitle')}</div>
          </div>
        </div>
        <button className={s.close} onClick={onClose} aria-label={t('support.close')}>
          <X size={18} />
        </button>
      </header>

      <div className={s.list} ref={listRef}>
        {messages === null ? (
          <div className={s.loading}><Loader2 size={20} className={s.spin} /></div>
        ) : messages.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}><LifeBuoy size={26} /></span>
            <div className={s.emptyTitle}>{t('support.emptyTitle')}</div>
            <div className={s.emptyText}>{t('support.emptyText')}</div>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1]
            const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
            const mine = m.senderType === 'partner'
            return (
              <div key={m.id}>
                {showDay && <div className={s.daySep}><span>{dayLabel(m.createdAt, t)}</span></div>}
                <div className={[s.msg, mine ? s.mine : s.theirs].join(' ')}>
                  {!mine && <div className={s.msgName}>{m.senderName}</div>}
                  <div className={s.bubble}>{m.body}</div>
                  <div className={s.meta}>
                    <span className={s.time}>{fmtTime(m.createdAt)}</span>
                    {mine && (
                      m.readAt
                        ? <CheckCheck size={13} className={s.seen} />
                        : <Check size={13} className={s.sent} />
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {peerTyping && (
          <div className={[s.msg, s.theirs].join(' ')}>
            <div className={[s.bubble, s.typingBubble].join(' ')}>
              <span className={s.typingDot} />
              <span className={s.typingDot} />
              <span className={s.typingDot} />
            </div>
          </div>
        )}
      </div>

      <div className={s.composer}>
        <textarea
          className={s.input}
          value={text}
          onChange={(e) => { setText(e.target.value); signalTyping() }}
          onKeyDown={onKeyDown}
          placeholder={t('support.placeholder')}
          rows={1}
        />
        <button className={s.send} onClick={send} disabled={!text.trim() || sending} aria-label={t('support.send')}>
          {sending ? <Loader2 size={17} className={s.spin} /> : <Send size={17} />}
        </button>
      </div>
    </div>
  )
}
