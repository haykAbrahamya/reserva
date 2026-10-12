import { RefreshCw } from 'lucide-react'
import { DatePicker, Input } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid } from '@/components/tools/FieldGrid/FieldGrid'
import { datePickerLabels, today, useCalendarWords } from '@/lib/dates'
import { LIMITS, type GiftDraft } from '../../model'
import type { GiftField } from '../../useGiftDraft'
import s from './TermsFields.module.scss'

interface Props {
  draft: GiftDraft
  onChange: (field: GiftField, value: string) => void
  onRenewCode: () => void
}

/**
 * Until when the gift can be used, and its number. The date is optional —
 * clearing it removes the line from the card — and the number has a one-tap
 * "new number" for the next certificate.
 */
export function TermsFields({ draft, onChange, onRenewCode }: Props) {
  const t = useT()
  const words = useCalendarWords()

  return (
    <FieldGrid>
      <DatePicker
        label={t('giftCertificate.fields.validUntil')}
        value={draft.validUntil}
        min={today()}
        placeholder={t('giftCertificate.fields.validUntilPlaceholder')}
        onChange={(day) => onChange('validUntil', day)}
        labels={datePickerLabels(words, {
          today: t('giftCertificate.fields.today'),
          clear: t('giftCertificate.fields.noExpiry'),
        })}
      />
      <Input
        label={t('giftCertificate.fields.code')}
        value={draft.code}
        maxLength={LIMITS.code}
        onChange={(e) => onChange('code', e.target.value)}
        trailing={
          <button
            type="button"
            className={s.renew}
            onClick={onRenewCode}
            aria-label={t('giftCertificate.fields.newCode')}
            title={t('giftCertificate.fields.newCode')}
          >
            <RefreshCw size={15} />
          </button>
        }
      />
    </FieldGrid>
  )
}
