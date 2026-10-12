import { Input } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { LIMITS, type BeforeAfterDraft } from '../../model'

type TextField = 'beforeLabel' | 'afterLabel' | 'handle'

interface Props {
  draft: BeforeAfterDraft
  onChange: (field: TextField, value: string) => void
}

/** The words on the image. Empty labels fall back to "Before" / "After". */
export function LabelFields({ draft, onChange }: Props) {
  const t = useT()

  return (
    <FieldGrid>
      <Input
        label={t('beforeAfter.fields.beforeLabel')}
        value={draft.beforeLabel}
        maxLength={LIMITS.label}
        placeholder={t('beforeAfter.defaults.before')}
        onChange={(e) => onChange('beforeLabel', e.target.value)}
      />
      <Input
        label={t('beforeAfter.fields.afterLabel')}
        value={draft.afterLabel}
        maxLength={LIMITS.label}
        placeholder={t('beforeAfter.defaults.after')}
        onChange={(e) => onChange('afterLabel', e.target.value)}
      />
      <FieldWide>
        <Input
          label={t('beforeAfter.fields.handle')}
          value={draft.handle}
          maxLength={LIMITS.handle}
          placeholder={t('beforeAfter.fields.handlePlaceholder')}
          onChange={(e) => onChange('handle', e.target.value)}
        />
      </FieldWide>
    </FieldGrid>
  )
}
