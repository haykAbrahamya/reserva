import { useId, useMemo } from 'react'
import { Copy, ExternalLink, MessageCircle, Send } from 'lucide-react'
import { Button, WhatsappIcon, useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import { toolEvents } from '@/lib/analytics/pulse'
import { copyText } from '@/lib/clipboard'
import { formatLongDay, useCalendarWords } from '@/lib/dates'
import { viberShareUrl, visitUrl, whatsAppShareUrl, type Visit } from '../../visitLink'
import s from './ShareActions.module.scss'

const events = toolEvents('appointmentCard')

interface Props {
  visit: Visit
  /** False until the card has a day, a time and a salon. */
  complete: boolean
}

/**
 * The ways to send the card. The phone's own share sheet first where there is
 * one (every messenger is in it), WhatsApp and Viber by name — they are how
 * salons in Armenia talk to clients — and a plain link to paste anywhere else.
 */
export function ShareActions({ visit, complete }: Props) {
  const t = useT()
  const toast = useToast()
  const words = useCalendarWords()
  const headingId = useId()
  const canShare = useMemo(() => typeof navigator !== 'undefined' && 'share' in navigator, [])

  const url = complete ? visitUrl(visit) : ''
  const message = t('appointmentCard.share.message', {
    salon: visit.salon.trim(),
    date: visit.date ? formatLongDay(visit.date, words) : '',
    time: visit.time,
  })
  const text = `${message}\n${url}`

  const copy = async () => {
    const copied = await copyText(url)
    if (copied) events.exported('copy')
    else events.failed('copy')
    toast(t(copied ? 'appointmentCard.share.copied' : 'export.failed'))
  }

  const share = async () => {
    try {
      await navigator.share({ text: message, url })
      events.exported('share')
    } catch {
      // Dismissed — nothing to do.
    }
  }

  const sendWith = (via: 'whatsapp' | 'viber', open: () => void) => () => {
    events.exported(via)
    open()
  }

  return (
    <div className={s.share} role="group" aria-labelledby={headingId}>
      <p id={headingId} className={s.heading}>
        {t('appointmentCard.share.heading')}
      </p>

      <Button variant="accent" className={s.primary} disabled={!complete} onClick={canShare ? share : copy}>
        {canShare ? <Send size={16} /> : <Copy size={16} />}
        {canShare ? t('appointmentCard.share.send') : t('appointmentCard.share.copy')}
      </Button>

      <div className={s.row}>
        <Button
          className={s.button}
          disabled={!complete}
          onClick={sendWith('whatsapp', () => window.open(whatsAppShareUrl(text), '_blank', 'noopener,noreferrer'))}
        >
          <WhatsappIcon size={16} />
          WhatsApp
        </Button>
        <Button
          className={s.button}
          disabled={!complete}
          onClick={sendWith('viber', () => (window.location.href = viberShareUrl(text)))}
        >
          <MessageCircle size={16} />
          Viber
        </Button>
        {canShare && (
          <Button
            className={s.iconButton}
            disabled={!complete}
            onClick={copy}
            aria-label={t('appointmentCard.share.copy')}
            title={t('appointmentCard.share.copy')}
          >
            <Copy size={16} />
          </Button>
        )}
      </div>

      {complete ? (
        <a
          className={s.open}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => events.action('open')}
        >
          <ExternalLink size={13} />
          {t('appointmentCard.share.open')}
        </a>
      ) : (
        <p className={s.missing}>{t('appointmentCard.share.missing')}</p>
      )}
    </div>
  )
}
