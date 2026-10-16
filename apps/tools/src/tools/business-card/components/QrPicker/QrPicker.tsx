import { useId, type ReactNode } from 'react'
import { Ban, Globe, Instagram } from 'lucide-react'
import { WhatsappIcon } from '@reserva/ui'
import { useT } from '@/i18n'
import { QR_TARGETS, qrUrl, type CardDraft, type QrTarget } from '../../model'
import s from './QrPicker.module.scss'

const ICON: Record<QrTarget, (props: { size: number }) => ReactNode> = {
  instagram: ({ size }) => <Instagram size={size} strokeWidth={1.8} />,
  whatsapp: ({ size }) => <WhatsappIcon size={size - 2} />,
  website: ({ size }) => <Globe size={size} strokeWidth={1.8} />,
  none: ({ size }) => <Ban size={size} strokeWidth={1.8} />,
}

interface Props {
  draft: CardDraft
  onChange: (target: QrTarget) => void
}

/**
 * What the QR code on the back opens — Instagram, a WhatsApp chat, the
 * website, or no code at all — and, under the choice, exactly the link it
 * will hold, or which field it is waiting for.
 *
 * Native radio inputs: arrow keys move between the four, as in the style picker.
 */
export function QrPicker({ draft, onChange }: Props) {
  const t = useT()
  const name = useId()
  const url = qrUrl(draft)

  const hint =
    draft.qr === 'none'
      ? t('businessCard.qr.noneHint')
      : url
        ? t('businessCard.qr.opens', { link: url.replace(/^https?:\/\//, '') })
        : t(`businessCard.qr.missing.${draft.qr}`)

  return (
    <div className={s.picker}>
      <div className={s.container}>
        <div className={s.grid} role="radiogroup" aria-label={t('businessCard.sections.qr')}>
          {QR_TARGETS.map((target) => {
            const Icon = ICON[target]
            return (
              <label key={target} className={s.option}>
                <input
                  type="radio"
                  name={name}
                  className={s.input}
                  value={target}
                  checked={draft.qr === target}
                  onChange={() => onChange(target)}
                />
                <span className={s.tile}>
                  <Icon size={18} />
                  <span className={s.name}>{t(`businessCard.qr.${target}`)}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>
      <p className={[s.hint, url || draft.qr === 'none' ? '' : s.missing].filter(Boolean).join(' ')} aria-live="polite">
        {hint}
      </p>
    </div>
  )
}
