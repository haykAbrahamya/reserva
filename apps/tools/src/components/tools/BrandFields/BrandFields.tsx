import { Input } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { BRAND_LIMITS, type BrandField, type StoryBrand } from '@/lib/story/brand'

interface Props {
  value: StoryBrand
  onChange: (field: BrandField, value: string) => void
  /** The tool's own heading, e.g. "Price list" — the one line that differs per tool. */
  headingPlaceholder: string
}

/** Who the story is from: name, the line above it, and how to reach them. */
export function BrandFields({ value, onChange, headingPlaceholder }: Props) {
  const t = useT()

  return (
    <FieldGrid>
      <FieldWide>
        <Input
          label={t('brand.title')}
          value={value.title}
          maxLength={BRAND_LIMITS.title}
          placeholder={t('brand.titlePlaceholder')}
          autoComplete="organization"
          onChange={(e) => onChange('title', e.target.value)}
        />
      </FieldWide>
      <Input
        label={t('brand.heading')}
        value={value.heading}
        maxLength={BRAND_LIMITS.heading}
        placeholder={headingPlaceholder}
        onChange={(e) => onChange('heading', e.target.value)}
      />
      <Input
        label={t('brand.contact')}
        value={value.contact}
        maxLength={BRAND_LIMITS.contact}
        placeholder={t('brand.contactPlaceholder')}
        onChange={(e) => onChange('contact', e.target.value)}
      />
    </FieldGrid>
  )
}
