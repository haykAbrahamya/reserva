import { SegmentedFilter } from '@reserva/ui'
import { useT } from '@/i18n'
import type { Arrangement, BeforeAfterDraft, Format } from '../../model'
import s from './LayoutOptions.module.scss'

interface Props {
  draft: BeforeAfterDraft
  onFormat: (format: Format) => void
  onArrangement: (arrangement: Arrangement) => void
}

/** Where it will be posted, and how the two photos sit together. */
export function LayoutOptions({ draft, onFormat, onArrangement }: Props) {
  const t = useT()

  return (
    <div className={s.layout}>
      <div className={s.options}>
        <div className={s.option}>
          <span className={s.label}>{t('beforeAfter.layout.format')}</span>
          <SegmentedFilter<Format>
            value={draft.format}
            onChange={onFormat}
            ariaLabel={t('beforeAfter.layout.format')}
            options={[
              { value: 'post', label: t('beforeAfter.layout.post') },
              { value: 'story', label: t('beforeAfter.layout.story') },
            ]}
          />
        </div>
        <div className={s.option}>
          <span className={s.label}>{t('beforeAfter.layout.arrangement')}</span>
          <SegmentedFilter<Arrangement>
            value={draft.arrangement}
            onChange={onArrangement}
            ariaLabel={t('beforeAfter.layout.arrangement')}
            options={[
              { value: 'side', label: t('beforeAfter.layout.side') },
              { value: 'stacked', label: t('beforeAfter.layout.stacked') },
            ]}
          />
        </div>
      </div>
      <p className={s.hint}>{t('beforeAfter.layout.hint')}</p>
    </div>
  )
}
