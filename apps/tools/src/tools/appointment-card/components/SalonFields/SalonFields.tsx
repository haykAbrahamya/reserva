import { Input } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { LIMITS, type Appointment } from '../../model'

type SalonField = 'salon' | 'address' | 'phone'

interface Props {
  draft: Appointment
  onChange: (field: SalonField, value: string) => void
}

/** Who and where — filled in once, remembered for every card after. */
export function SalonFields({ draft, onChange }: Props) {
  const t = useT()

  return (
    <FieldGrid>
      <FieldWide>
        <Input
          label={t('appointmentCard.fields.salon')}
          value={draft.salon}
          maxLength={LIMITS.salon}
          placeholder={t('appointmentCard.fields.salonPlaceholder')}
          autoComplete="organization"
          onChange={(e) => onChange('salon', e.target.value)}
        />
      </FieldWide>
      <Input
        label={t('appointmentCard.fields.address')}
        value={draft.address}
        maxLength={LIMITS.address}
        placeholder={t('appointmentCard.fields.addressPlaceholder')}
        autoComplete="street-address"
        onChange={(e) => onChange('address', e.target.value)}
      />
      <Input
        label={t('appointmentCard.fields.phone')}
        type="tel"
        inputMode="tel"
        value={draft.phone}
        maxLength={LIMITS.phone}
        placeholder={t('appointmentCard.fields.phonePlaceholder')}
        autoComplete="tel"
        onChange={(e) => onChange('phone', e.target.value)}
      />
    </FieldGrid>
  )
}
