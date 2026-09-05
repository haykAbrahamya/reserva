import type { LocalizedText } from '@reserva/shared'
import type { BoardMeta } from '@/api/types'
import { fmtCompactAMD } from './money'
import type { BoardFilters, ListKey, RangeKey } from './filters'

// ─────────────────────────────────────────────────────────────
// Turning filter state into readable chips.
//
// Pure, and separate from the component that renders them, because this is
// where the KEYS become words: an area key means nothing without the catalog,
// and the catalog only arrives with the meta payload. Keeping the translation
// here means the chip row, and anything else that ever needs to describe a
// selection, cannot disagree about what a filter says.
// ─────────────────────────────────────────────────────────────

type Localizer = (base: string, i18n?: LocalizedText | null) => string
type Translate = (key: string, vars?: Record<string, string | number>) => string

export interface FilterChip {
  /** Stable identity for React, and for the remove handler. */
  id: string
  /** Which filter this belongs to — "Location", "Pay". */
  kind: string
  label: string
  /** How to clear just this one. */
  remove: () => void
}

interface Ctx {
  filters: BoardFilters
  meta: BoardMeta | null
  loc: Localizer
  t: Translate
  patch: (part: Partial<BoardFilters>) => void
}

/** Drop one value from a list filter. */
function without(filters: BoardFilters, key: ListKey, value: string): Partial<BoardFilters> {
  const list = filters[key] as string[]
  return { [key]: list.filter((v) => v !== value) } as Partial<BoardFilters>
}

/**
 * Every active filter, as a chip.
 *
 * Order follows the panel, not the order the visitor happened to click, so the
 * row stays stable while they work: a chip that jumps position when you add
 * another filter is a chip you click by mistake.
 */
export function describeFilters({ filters, meta, loc, t, patch }: Ctx): FilterChip[] {
  const chips: FilterChip[] = []

  if (filters.q.trim()) {
    chips.push({
      id: 'q',
      kind: t('search.placeholderShort'),
      label: `“${filters.q.trim()}”`,
      remove: () => patch({ q: '' }),
    })
  }

  // ── Whole specialty groups, then individual roles.
  for (const key of filters.group) {
    const group = meta?.specialtyGroups.find((g) => g.key === key)
    chips.push({
      id: `group:${key}`,
      kind: t('filters.sections.specialty'),
      label: group ? loc(group.name, group.nameI18n) : key,
      remove: () => patch(without(filters, 'group', key)),
    })
  }

  for (const key of filters.specialty) {
    const found = meta?.specialtyGroups
      .flatMap((g) => g.specialties)
      .find((sp) => sp.key === key)
    chips.push({
      id: `specialty:${key}`,
      kind: t('filters.sections.specialty'),
      label: found ? loc(found.roleName, found.roleNameI18n) : key,
      remove: () => patch(without(filters, 'specialty', key)),
    })
  }

  // ── Places. Resolved through the tree so a district shows its city.
  for (const key of filters.area) {
    let label = key
    for (const node of meta?.areaTree ?? []) {
      if (node.key === key) {
        label = loc(node.name, node.nameI18n)
        break
      }
      const child = node.children.find((c) => c.key === key)
      if (child) {
        label = `${loc(child.name, child.nameI18n)}, ${loc(node.name, node.nameI18n)}`
        break
      }
    }
    chips.push({
      id: `area:${key}`,
      kind: t('filters.sections.location'),
      label,
      remove: () => patch(without(filters, 'area', key)),
    })
  }

  // ── Pay type, then the ranges.
  for (const key of filters.payType) {
    chips.push({
      id: `payType:${key}`,
      kind: t('filters.sections.pay'),
      label: t(`pay.type.${key}`),
      remove: () => patch(without(filters, 'payType', key)),
    })
  }

  const rangeChip = (key: RangeKey, label: string, format: (n: number) => string) => {
    const range = filters[key]
    if (!range) return
    const [lo, hi] = range
    const open = hi >= Number.MAX_SAFE_INTEGER
    chips.push({
      id: `range:${key}`,
      kind: label,
      label: open ? `${format(lo)}+` : `${format(lo)} – ${format(hi)}`,
      remove: () => patch({ [key]: null } as Partial<BoardFilters>),
    })
  }

  rangeChip('salary', t('filters.pay.salaryRange'), fmtCompactAMD)
  rangeChip('rent', t('filters.pay.rentRange'), fmtCompactAMD)
  // Inverted back to the professional's share, matching the slider they moved.
  // Showing the stored salon figure here would contradict the control.
  if (filters.percent) {
    const [salonLow, salonHigh] = filters.percent
    const high = salonHigh >= Number.MAX_SAFE_INTEGER ? 100 : salonHigh
    chips.push({
      id: 'range:percent',
      kind: t('filters.pay.percentRange'),
      label: `${100 - high}% – ${100 - salonLow}%`,
      remove: () => patch({ percent: null }),
    })
  }

  for (const key of filters.schedule) {
    chips.push({
      id: `schedule:${key}`,
      kind: t('filters.sections.schedule'),
      label: t(`schedule.${key}`),
      remove: () => patch(without(filters, 'schedule', key)),
    })
  }

  for (const key of filters.experience) {
    chips.push({
      id: `experience:${key}`,
      kind: t('filters.sections.experience'),
      label: t(`experience.${key}`),
      remove: () => patch(without(filters, 'experience', key)),
    })
  }

  for (const key of filters.perks) {
    chips.push({
      id: `perks:${key}`,
      kind: t('filters.sections.perks'),
      label: t(`perks.${key}`),
      remove: () => patch(without(filters, 'perks', key)),
    })
  }

  for (const id of filters.salon) {
    const salon = meta?.salons.find((x) => x.id === id)
    chips.push({
      id: `salon:${id}`,
      kind: t('filters.sections.salons'),
      label: salon ? loc(salon.name, salon.nameI18n) : id,
      remove: () => patch(without(filters, 'salon', id)),
    })
  }

  return chips
}
