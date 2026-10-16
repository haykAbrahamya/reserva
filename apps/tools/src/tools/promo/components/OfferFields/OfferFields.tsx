import { DatePicker, Input, NumberStepper } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { datePickerLabels, today, useCalendarWords } from '@/lib/dates'
import { DISCOUNT, LIMITS, type PromoDraft } from '../../model'
import type { PromoField } from '../../usePromoDraft'

/**
 * The discounts most promos use, one tap each; the stepper covers the rest.
 * Five, so they stay on one line on a phone.
 */
const QUICK = [10, 15, 20, 30, 50]

/** "−20%", with a real minus sign, as the story sets it. */
const percentOff = (value: number) => `−${value}%`

interface Props {
  draft: PromoDraft
  onDiscount: (discount: number) => void
  onChange: (field: PromoField, value: string) => void
}

/** How much off, on what, and until when. */
export function OfferFields({ draft, onDiscount, onChange }: Props) {
  const t = useT()
  const words = useCalendarWords()

  return (
    <FieldGrid>
      <FieldWide>
        <NumberStepper
          label={t('promo.fields.discount')}
          value={draft.discount}
          onChange={(value) => value !== null && onDiscount(value)}
          min={DISCOUNT.min}
          max={DISCOUNT.max}
          step={DISCOUNT.step}
          format={percentOff}
          quickPicks={QUICK.map((value) => ({ value, label: percentOff(value) }))}
          decrementLabel={t('promo.fields.less')}
          incrementLabel={t('promo.fields.more')}
        />
      </FieldWide>
      <FieldWide>
        <Input
          label={t('promo.fields.offer')}
          value={draft.offer}
          maxLength={LIMITS.offer}
          placeholder={t('promo.fields.offerPlaceholder')}
          onChange={(e) => onChange('offer', e.target.value)}
        />
      </FieldWide>
      <DatePicker
        label={t('promo.fields.until')}
        value={draft.until}
        min={today()}
        placeholder={t('promo.fields.untilPlaceholder')}
        onChange={(day) => onChange('until', day)}
        labels={datePickerLabels(words, {
          today: t('promo.fields.today'),
          clear: t('promo.fields.noEnd'),
        })}
      />
    </FieldGrid>
  )
}
