import { RangeSlider } from '@reserva/ui'
import { useT } from '@/i18n'
import { facetMap } from '@/lib/areas'
import { fmtCompactAMD, niceBounds, stepFor } from '@/lib/money'
import type { BoardMeta, Bounds, PayType } from '@/api/types'
import { PAY_TYPES } from '@/api/types'
import type { BoardFilters, Range, RangeKey } from '@/lib/filters'
import { ChipGroup } from '../ChipGroup/ChipGroup'
import s from './PayFilter.module.scss'

interface Props {
  meta: BoardMeta
  filters: BoardFilters
  onTogglePayType: (value: string) => void
  onSetRange: (key: RangeKey, range: Range) => void
}

/**
 * Money — the filter people came for, and the one most boards get wrong.
 *
 * THREE ranges, not one. A salary, a chair rent and a commission split are
 * different questions on different scales: a 40,000 rent and a 400,000 salary
 * share a slider only at the cost of making both ends useless, and a single
 * "min-max" applied across all three would filter out every listing of the
 * other two kinds. So each pay type owns its control, and each control appears
 * only when the board holds listings of that kind.
 */
export function PayFilter({ meta, filters, onTogglePayType, onSetRange }: Props) {
  const t = useT()
  const payCounts = facetMap(meta.payTypes)

  const typeOptions = PAY_TYPES.map((key: PayType) => ({
    value: key,
    label: t(`pay.type.${key}`),
    count: payCounts.get(key) ?? 0,
  }))

  /**
   * One money range.
   *
   * Bounds come from the board's real data, rounded outwards to legible
   * numbers — never from a guess. A slider running 0 to 1,000,000 when every
   * listing sits between 150,000 and 320,000 hands the visitor a control where
   * four fifths of the travel does nothing.
   *
   * `invert` exists for exactly one caller, and it is worth the parameter. The
   * database stores the share the SALON keeps, because that is what a salon
   * owner types into the backoffice. The person reading this board is the other
   * side of that split and thinks in terms of what THEY keep. So the slider
   * shows their share while the URL and the API keep the salon's — the whole
   * conversion lives in these few lines, and nothing downstream has to
   * remember which way round the number is.
   *
   * Releasing the thumbs at the full extent CLEARS the filter rather than
   * sending the widest possible range, so dragging out to explore and back
   * again leaves nothing behind in the URL.
   */
  const renderRange = (
    key: RangeKey,
    label: string,
    bounds: Bounds | null,
    format: (n: number) => string,
    opts: { invert?: boolean; hint?: string } = {},
  ) => {
    if (!bounds) return null

    const { invert = false, hint } = opts

    // Bounds as the SLIDER shows them.
    const shown = invert ? { min: 100 - bounds.max, max: 100 - bounds.min } : bounds
    const [lo, hi] = invert
      ? [Math.max(0, shown.min), Math.min(100, shown.max)]
      : niceBounds(shown.min, shown.max)

    // A single listing gives min === max, which is not a range anyone can drag.
    if (hi <= lo) return null

    const toShown = (stored: [number, number]): [number, number] => {
      const high = stored[1] === Number.MAX_SAFE_INTEGER ? hi : stored[1]
      return invert ? [100 - high, 100 - stored[0]] : [stored[0], high]
    }
    const toStored = (v: [number, number]): [number, number] =>
      invert ? [100 - v[1], 100 - v[0]] : v

    const stored = filters[key]
    const raw = stored ? toShown(stored) : ([lo, hi] as [number, number])
    const value: [number, number] = [
      Math.max(lo, Math.min(hi, raw[0])),
      Math.max(lo, Math.min(hi, raw[1])),
    ]

    return (
      <RangeSlider
        key={key}
        label={label}
        hint={hint}
        min={lo}
        max={hi}
        step={invert ? 5 : stepFor(lo, hi)}
        value={value}
        format={format}
        onChange={(next) => onSetRange(key, toStored(next))}
        onCommit={(next) =>
          onSetRange(key, next[0] <= lo && next[1] >= hi ? null : toStored(next))
        }
        minLabel={label}
        maxLabel={label}
      />
    )
  }

  const salary = renderRange('salary', t('filters.pay.salaryRange'), meta.pay.salary, fmtCompactAMD)
  const rent = renderRange('rent', t('filters.pay.rentRange'), meta.pay.rent, fmtCompactAMD)
  const percent = renderRange(
    'percent',
    t('filters.pay.percentRange'),
    meta.pay.percent,
    (n) => `${n}%`,
    { invert: true, hint: t('filters.pay.percentHint') },
  )

  const anyRange = Boolean(salary || rent || percent)

  return (
    <div className={s.wrap}>
      <div className={s.block}>
        <span className={s.label}>{t('filters.pay.typeLabel')}</span>
        <ChipGroup options={typeOptions} selected={filters.payType} onToggle={onTogglePayType} />
      </div>

      {anyRange ? (
        <div className={s.ranges}>
          {salary}
          {rent}
          {percent}
          <p className={s.note}>{t('filters.pay.impliedNote')}</p>
        </div>
      ) : (
        <p className={s.note}>{t('filters.pay.noneAvailable')}</p>
      )}
    </div>
  )
}
