import { Plus } from 'lucide-react'
import { DatePicker, Input } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { datePickerLabels, useCalendarWords } from '@/lib/dates'
import { LIMITS, type CertificateDraft } from '../../model'
import type { CertField } from '../../useCertificateDraft'
import s from './CertificateFields.module.scss'

interface Props {
  draft: CertificateDraft
  onChange: (field: CertField, value: string) => void
  onNextNumber: () => void
}

/**
 * What the certificate says: who it is for — first, the one field that
 * changes with every student — the course, the wording, and when and where
 * it was issued, with its number.
 */
export function CertificateFields({ draft, onChange, onNextNumber }: Props) {
  const t = useT()
  const words = useCalendarWords()

  return (
    <FieldGrid>
      <FieldWide>
        <Input
          label={t('courseCertificate.fields.recipient')}
          value={draft.recipient}
          maxLength={LIMITS.recipient}
          placeholder={t('courseCertificate.fields.recipientPlaceholder')}
          autoComplete="off"
          onChange={(e) => onChange('recipient', e.target.value)}
        />
      </FieldWide>
      <FieldWide>
        <Input
          label={t('courseCertificate.fields.course')}
          value={draft.course}
          maxLength={LIMITS.course}
          placeholder={t('courseCertificate.fields.coursePlaceholder')}
          onChange={(e) => onChange('course', e.target.value)}
        />
      </FieldWide>
      <FieldWide>
        <Input
          label={t('courseCertificate.fields.wording')}
          value={draft.wording}
          maxLength={LIMITS.wording}
          placeholder={t('courseCertificate.fields.wordingPlaceholder')}
          onChange={(e) => onChange('wording', e.target.value)}
        />
      </FieldWide>
      <Input
        label={t('courseCertificate.fields.details')}
        value={draft.details}
        maxLength={LIMITS.details}
        placeholder={t('courseCertificate.fields.detailsPlaceholder')}
        onChange={(e) => onChange('details', e.target.value)}
      />
      <Input
        label={t('courseCertificate.fields.heading')}
        value={draft.heading}
        maxLength={LIMITS.heading}
        placeholder={t('courseCertificate.fields.headingPlaceholder')}
        onChange={(e) => onChange('heading', e.target.value)}
      />
      <DatePicker
        label={t('courseCertificate.fields.date')}
        value={draft.date}
        placeholder={t('courseCertificate.fields.noDate')}
        onChange={(day) => onChange('date', day)}
        labels={datePickerLabels(words, {
          today: t('courseCertificate.fields.today'),
          clear: t('courseCertificate.fields.noDate'),
        })}
      />
      <Input
        label={t('courseCertificate.fields.city')}
        value={draft.city}
        maxLength={LIMITS.city}
        placeholder={t('courseCertificate.fields.cityPlaceholder')}
        onChange={(e) => onChange('city', e.target.value)}
      />
      <Input
        label={t('courseCertificate.fields.number')}
        value={draft.number}
        maxLength={LIMITS.number}
        onChange={(e) => onChange('number', e.target.value)}
        trailing={
          <button
            type="button"
            className={s.next}
            onClick={onNextNumber}
            aria-label={t('courseCertificate.fields.nextNumber')}
            title={t('courseCertificate.fields.nextNumber')}
          >
            <Plus size={15} />
          </button>
        }
      />
    </FieldGrid>
  )
}
