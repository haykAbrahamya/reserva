import { Input, Textarea } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { LIMITS, type GiftDraft } from '../../model'
import type { GiftField } from '../../useGiftDraft'

interface Props {
  draft: GiftDraft
  onChange: (field: GiftField, value: string) => void
}

/** What the gift is, who it is for and from, and a few words. */
export function GiftFields({ draft, onChange }: Props) {
  const t = useT()

  return (
    <FieldGrid>
      <FieldWide>
        <Input
          label={t('giftCertificate.fields.value')}
          value={draft.value}
          maxLength={LIMITS.value}
          placeholder={t('giftCertificate.fields.valuePlaceholder')}
          help={t('giftCertificate.fields.valueHint')}
          onChange={(e) => onChange('value', e.target.value)}
        />
      </FieldWide>
      <Input
        label={t('giftCertificate.fields.recipient')}
        value={draft.recipient}
        maxLength={LIMITS.recipient}
        placeholder={t('giftCertificate.fields.recipientPlaceholder')}
        onChange={(e) => onChange('recipient', e.target.value)}
      />
      <Input
        label={t('giftCertificate.fields.sender')}
        value={draft.sender}
        maxLength={LIMITS.sender}
        placeholder={t('giftCertificate.fields.senderPlaceholder')}
        onChange={(e) => onChange('sender', e.target.value)}
      />
      <FieldWide>
        <Textarea
          label={t('giftCertificate.fields.message')}
          value={draft.message}
          maxLength={LIMITS.message}
          rows={2}
          placeholder={t('giftCertificate.fields.messagePlaceholder')}
          onChange={(e) => onChange('message', e.target.value)}
        />
      </FieldWide>
    </FieldGrid>
  )
}
