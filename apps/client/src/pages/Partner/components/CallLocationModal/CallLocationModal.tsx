import { useMemo } from 'react'
import { X, Phone, MapPin, ChevronRight } from 'lucide-react'
import { WhatsappIcon } from '@reserva/ui'
import type { PublicPartner } from '@/mock/partners'
import { partnerBrandVars } from '../../partnerBrand'
import { useAppSelector } from '@/store/hooks'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { useI18n, useLocalized } from '@/i18n'
import { track } from '@/services/analytics.service'
import s from './CallLocationModal.module.scss'

type CallableLocation = PublicPartner['locations'][number]

interface Props {
  partner: PublicPartner
  /** Branches to offer — already filtered to bookable/active by the caller
   *  (for WhatsApp: to the ones with their own number). */
  locations: CallableLocation[]
  /** The section that opened the picker — analytics credits the contact to it. */
  from: string
  /** What a row does: dial the branch (default) or open its WhatsApp chat. */
  channel?: 'call' | 'whatsapp'
  onClose: () => void
}

/**
 * "Which branch?" contact picker.
 *
 * Shown when a partner has more than one location and the visitor taps a
 * general "Call" action (hero) — or WhatsApp, when several branches have their
 * own number. Each row is a real link (`tel:` / `wa.me`) so a phone hands off
 * natively. Matches the SpecialistModal shell: centered card on desktop,
 * bottom-sheet on mobile, branded gradient header.
 */
export function CallLocationModal({ partner, locations, from, channel = 'call', onClose }: Props) {
  const [t1, t2] = partner.presentation.heroTints
  const { t } = useI18n()
  const loc = useLocalized()
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])
  const wa = channel === 'whatsapp'
  const copy = wa ? 'partner.whatsappModal' : 'partner.callModal'

  return (
    <ModalShell open onClose={onClose} closeDuration={280}>
      {({ closing, requestClose }) => (
        <div
          className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')}
          onClick={requestClose}
          style={brandVars}
        >
          <div
            className={[s.modal, closing ? s.closing : ''].filter(Boolean).join(' ')}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t(`${copy}.title`)}
          >
            <button className={s.closeBtn} onClick={requestClose} aria-label={t('partner.callModal.close')}>
              <X size={16} />
            </button>

            {/* Branded header */}
            <div className={s.header} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
              <div className={s.headerGrid} />
              <span className={s.headerIcon}>{wa ? <WhatsappIcon size={20} /> : <Phone size={20} />}</span>
              <div className={s.headerText}>
                <div className={s.title}>{t(`${copy}.title`)}</div>
                <div className={s.subtitle}>{t(`${copy}.subtitle`)}</div>
              </div>
            </div>

            {/* Location list — each row dials / messages that branch */}
            <div className={s.list}>
              {locations.map((l) => (
                <a
                  key={l.id}
                  className={s.row}
                  href={wa ? `https://wa.me/${l.whatsapp}` : `tel:${l.phone.replace(/\s/g, '')}`}
                  {...(wa && { target: '_blank', rel: 'noopener noreferrer' })}
                  onClick={() => { track('contact_click', { ch: channel, from, loc: l.id }); requestClose() }}
                >
                  <span className={s.rowIcon}><MapPin size={17} /></span>
                  <span className={s.rowBody}>
                    <span className={s.rowName}>{loc(l.name, l.nameI18n)}</span>
                    {l.address && <span className={s.rowAddress}>{l.address}</span>}
                    <span className={s.rowPhone}>{wa ? `+${l.whatsapp}` : l.phone}</span>
                  </span>
                  <span className={s.rowGo}><ChevronRight size={18} /></span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
