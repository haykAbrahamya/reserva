import { Check, Info } from 'lucide-react'
import { useT } from '@/i18n'
import { isExpectedPerk } from '@/lib/vacancy'
import s from './PerkChips.module.scss'

interface Props {
  perks: string[]
  /** Cap the visible count and summarize the rest. Cards do; the detail page
   *  shows everything. */
  max?: number
  size?: 'sm' | 'md'
}

/**
 * Perks as small tags.
 *
 * A tick for something the salon GIVES, an info mark for something it WANTS.
 * The two are visually distinct because rendering them identically is how a
 * professional reads "own client base" as a benefit and finds out otherwise on
 * the phone.
 */
export function PerkChips({ perks, max, size = 'sm' }: Props) {
  const t = useT()
  if (perks.length === 0) return null

  const shown = max != null ? perks.slice(0, max) : perks
  const hidden = perks.length - shown.length

  return (
    <ul className={[s.list, s[size]].join(' ')}>
      {shown.map((key) => {
        const expected = isExpectedPerk(key)
        return (
          <li key={key} className={[s.chip, expected ? s.expected : ''].filter(Boolean).join(' ')}>
            {expected ? <Info size={11} /> : <Check size={11} />}
            {t(`perks.${key}`)}
          </li>
        )
      })}
      {hidden > 0 && <li className={s.more}>{t('card.morePerks', { count: hidden })}</li>}
    </ul>
  )
}
