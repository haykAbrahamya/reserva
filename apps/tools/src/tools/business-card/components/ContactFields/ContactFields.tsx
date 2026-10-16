import { Chip, Input } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { LIMITS, MESSENGERS, type CardDraft, type Messenger } from '../../model'
import type { CardField } from '../../useCardDraft'
import s from './ContactFields.module.scss'

const MESSENGER_NAMES: Record<Messenger, string> = { whatsapp: 'WhatsApp', viber: 'Viber', telegram: 'Telegram' }

interface Props {
  draft: CardDraft
  onChange: (field: CardField, value: string) => void
  onMessenger: (messenger: Messenger) => void
}

/** How to reach them: Instagram, a phone and the messengers it is on, an address, a link. All optional. */
export function ContactFields({ draft, onChange, onMessenger }: Props) {
  const t = useT()

  return (
    <FieldGrid>
      <Input
        label="Instagram"
        value={draft.instagram}
        maxLength={LIMITS.instagram}
        placeholder="@yourname"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange('instagram', e.target.value)}
      />
      <Input
        label={t('businessCard.fields.phone')}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={draft.phone}
        maxLength={LIMITS.phone}
        placeholder="+374 …"
        onChange={(e) => onChange('phone', e.target.value)}
      />
      <FieldWide>
        <div className={s.messengers} role="group" aria-label={t('businessCard.fields.messengers')}>
          <span className={s.label}>{t('businessCard.fields.messengers')}</span>
          <div className={s.chips}>
            {MESSENGERS.map((messenger) => (
              <Chip
                key={messenger}
                size="sm"
                label={MESSENGER_NAMES[messenger]}
                selected={draft.messengers.includes(messenger)}
                onClick={() => onMessenger(messenger)}
              />
            ))}
          </div>
        </div>
      </FieldWide>
      <FieldWide>
        <Input
          label={t('businessCard.fields.address')}
          value={draft.address}
          maxLength={LIMITS.address}
          placeholder={t('businessCard.fields.addressPlaceholder')}
          autoComplete="street-address"
          onChange={(e) => onChange('address', e.target.value)}
        />
      </FieldWide>
      <FieldWide>
        <Input
          label={t('businessCard.fields.website')}
          value={draft.website}
          maxLength={LIMITS.website}
          placeholder={t('businessCard.fields.websitePlaceholder')}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => onChange('website', e.target.value)}
        />
      </FieldWide>
    </FieldGrid>
  )
}
