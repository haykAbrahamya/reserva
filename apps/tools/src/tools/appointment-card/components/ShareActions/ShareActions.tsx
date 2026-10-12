import { useMemo } from 'react'
import { Copy, ExternalLink, MessageCircle, Send } from 'lucide-react'
import { Button, WhatsappIcon, useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import { copyText } from '@/lib/clipboard'
import { formatLongDay, useCalendarWords } from '@/lib/dates'
import { viberShareUrl, visitUrl, whatsAppShareUrl, type Visit } from '../../visitLink'
import s from './ShareActions.module.scss'

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
  const canShare = useMemo(() => typeof navigator !== 'undefined' && 'share' in navigator, [])

  const url = complete ? visitUrl(visit) : ''
  const message = t('appointmentCard.share.message', {
    salon: visit.salon.trim(),
    date: visit.date ? formatLongDay(visit.date, words) : '',
    time: visit.time,
  })
  const text = `${message}\n${url}`

  const copy = async () => {
    toast(t((await copyText(url)) ? 'appointmentCard.share.copied' : 'export.failed'))
  }

  const share = async () => {
    try {
      await navigator.share({ text: message, url })
    } catch {
      // Dismissed — nothing to do.
    }
  }

  return (
    <div className={s.share}>
      <Button variant="accent" className={s.primary} disabled={!complete} onClick={canShare ? share : copy}>
        {canShare ? <Send size={16} /> : <Copy size={16} />}
        {canShare ? t('appointmentCard.share.send') : t('appointmentCard.share.copy')}
      </Button>

      <div className={s.row}>
        <Button
          className={s.button}
          disabled={!complete}
          onClick={() => window.open(whatsAppShareUrl(text), '_blank', 'noopener,noreferrer')}
        >
          <WhatsappIcon size={16} />
          WhatsApp
        </Button>
        <Button className={s.button} disabled={!complete} onClick={() => (window.location.href = viberShareUrl(text))}>
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
        <a className={s.open} href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={13} />
          {t('appointmentCard.share.open')}
        </a>
      ) : (
        <p className={s.missing}>{t('appointmentCard.share.missing')}</p>
      )}
    </div>
  )
}
