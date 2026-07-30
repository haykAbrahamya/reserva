import { useMemo } from 'react'
import { X, Phone, MapPin, ChevronRight } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { partnerBrandVars } from '../../partnerBrand'
import { useAppSelector } from '@/store/hooks'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { useI18n, useLocalized } from '@/i18n'
import s from './CallLocationModal.module.scss'

type CallableLocation = PublicPartner['locations'][number]

interface Props {
  partner: PublicPartner
  /** Branches to offer — already filtered to bookable/active by the caller. */
  locations: CallableLocation[]
  onClose: () => void
}

/**
 * "Which branch do you want to call?" picker.
 *
 * Shown when a partner has more than one location and the visitor taps a
 * general "Call" action (hero). Each row is a real `tel:` link so a phone dials
 * natively and desktop hands off to the OS. Matches the SpecialistModal shell:
 * centered card on desktop, bottom-sheet on mobile, branded gradient header.
 */
export function CallLocationModal({ partner, locations, onClose }: Props) {
  const [t1, t2] = partner.presentation.heroTints
  const { t } = useI18n()
  const loc = useLocalized()
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])

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
            aria-label={t('partner.callModal.title')}
          >
            <button className={s.closeBtn} onClick={requestClose} aria-label={t('partner.callModal.close')}>
              <X size={16} />
            </button>

            {/* Branded header */}
            <div className={s.header} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
              <div className={s.headerGrid} />
              <span className={s.headerIcon}><Phone size={20} /></span>
              <div className={s.headerText}>
                <div className={s.title}>{t('partner.callModal.title')}</div>
                <div className={s.subtitle}>{t('partner.callModal.subtitle')}</div>
              </div>
            </div>

            {/* Location list — each row dials that branch */}
            <div className={s.list}>
              {locations.map((l) => (
                <a
                  key={l.id}
                  className={s.row}
                  href={`tel:${l.phone.replace(/\s/g, '')}`}
                  onClick={requestClose}
                >
                  <span className={s.rowIcon}><MapPin size={17} /></span>
                  <span className={s.rowBody}>
                    <span className={s.rowName}>{loc(l.name, l.nameI18n)}</span>
                    {l.address && <span className={s.rowAddress}>{l.address}</span>}
                    <span className={s.rowPhone}>{l.phone}</span>
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
