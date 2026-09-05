import { useMemo } from 'react'
import { useT } from '@/i18n'
import { facetMap } from '@/lib/areas'
import { orderPerks } from '@/lib/vacancy'
import type { BoardMeta } from '@/api/types'
import { EXPERIENCE_LEVELS, SCHEDULE_TYPES } from '@/api/types'
import type { UseFilters } from '@/lib/useFilters'
import { AreaFilter } from '../AreaFilter/AreaFilter'
import { ChipGroup } from '../ChipGroup/ChipGroup'
import { FilterSection } from '../FilterSection/FilterSection'
import { PayFilter } from '../PayFilter/PayFilter'
import { SalonFilter } from '../SalonFilter/SalonFilter'
import { SpecialtyFilter } from '../SpecialtyFilter/SpecialtyFilter'
import s from './FilterPanel.module.scss'

interface Props {
  meta: BoardMeta | null
  control: UseFilters
}

/**
 * The whole filter panel.
 *
 * Composition only — every section is its own component, and this file's job is
 * to decide which are open on arrival and to hand each one its slice of the
 * meta payload. That is why it stays readable at seven sections: adding an
 * eighth is one `FilterSection` here plus one component of its own, not another
 * hundred lines in a growing file.
 *
 * ONE instance serves both layouts. The desktop rail and the mobile sheet
 * render this same component, so the two can never drift apart — the usual
 * failure being a filter that exists on desktop and quietly does not on a
 * phone, where most of the traffic is.
 *
 * Role comes FIRST, then location, then pay.
 *
 * This is a job board, and the question a visitor arrives with is "is there
 * work for a barber", not "is there work in Arabkir". People identify by their
 * craft — it is the one filter almost everyone sets, and the one that makes the
 * rest of the panel worth reading. Location is the second cut, applied to a
 * list that already only contains work you can do.
 *
 * Those three open by default; the rest stay shut so the panel is scannable
 * rather than endless.
 */
export function FilterPanel({ meta, control }: Props) {
  const t = useT()
  const { filters, patch, toggle, setRange } = control

  const scheduleCounts = useMemo(() => facetMap(meta?.schedule), [meta])
  const experienceCounts = useMemo(() => facetMap(meta?.experience), [meta])
  const perkCounts = useMemo(() => facetMap(meta?.perks), [meta])

  const scheduleOptions = SCHEDULE_TYPES.map((key) => ({
    value: key,
    label: t(`schedule.${key}`),
    count: scheduleCounts.get(key) ?? 0,
  }))

  const experienceOptions = EXPERIENCE_LEVELS.map((key) => ({
    value: key,
    label: t(`experience.${key}`),
    count: experienceCounts.get(key) ?? 0,
  }))

  // Only perks something actually offers, in the product's own display order
  // (what a salon gives first, what it demands last).
  const perkOptions = useMemo(() => {
    const present = (meta?.perkVocabulary ?? []).filter((k) => (perkCounts.get(k) ?? 0) > 0)
    return orderPerks(present).map((key) => ({
      value: key,
      label: t(`perks.${key}`),
      count: perkCounts.get(key) ?? 0,
    }))
  }, [meta, perkCounts, t])

  if (!meta) return <PanelSkeleton />

  return (
    <div className={s.panel}>
      <FilterSection
        title={t('filters.sections.specialty')}
        activeCount={filters.specialty.length + filters.group.length}
        defaultOpen
      >
        <SpecialtyFilter
          groups={meta.specialtyGroups}
          specialtyCounts={meta.specialties}
          groupCounts={meta.groups}
          selectedSpecialties={filters.specialty}
          selectedGroups={filters.group}
          onChangeSpecialties={(specialty) => patch({ specialty })}
          onChangeGroups={(group) => patch({ group })}
        />
      </FilterSection>

      <FilterSection
        title={t('filters.sections.location')}
        activeCount={filters.area.length}
        defaultOpen
      >
        <AreaFilter
          tree={meta.areaTree}
          counts={meta.areas}
          selected={filters.area}
          onChange={(area) => patch({ area })}
        />
      </FilterSection>

      <FilterSection
        title={t('filters.sections.pay')}
        activeCount={
          filters.payType.length +
          (filters.salary ? 1 : 0) +
          (filters.rent ? 1 : 0) +
          (filters.percent ? 1 : 0)
        }
        defaultOpen
      >
        <PayFilter
          meta={meta}
          filters={filters}
          onTogglePayType={(v) => toggle('payType', v)}
          onSetRange={setRange}
        />
      </FilterSection>

      <FilterSection title={t('filters.sections.schedule')} activeCount={filters.schedule.length}>
        <ChipGroup
          options={scheduleOptions}
          selected={filters.schedule}
          onToggle={(v) => toggle('schedule', v)}
        />
      </FilterSection>

      <FilterSection
        title={t('filters.sections.experience')}
        activeCount={filters.experience.length}
      >
        <ChipGroup
          options={experienceOptions}
          selected={filters.experience}
          onToggle={(v) => toggle('experience', v)}
        />
      </FilterSection>

      <FilterSection title={t('filters.sections.perks')} activeCount={filters.perks.length}>
        <ChipGroup
          options={perkOptions}
          selected={filters.perks}
          onToggle={(v) => toggle('perks', v)}
          max={6}
          emptyLabel={t('filters.nothingHere')}
        />
      </FilterSection>

      <FilterSection title={t('filters.sections.salons')} activeCount={filters.salon.length}>
        <SalonFilter
          salons={meta.salons}
          selected={filters.salon}
          onChange={(salon) => patch({ salon })}
        />
      </FilterSection>
    </div>
  )
}

/**
 * Placeholder headers while the meta loads.
 *
 * Section titles are static copy, so they can be shown immediately — only the
 * counts and options are waiting. That makes the wait feel like loading rather
 * than like an empty page.
 */
function PanelSkeleton() {
  const t = useT()
  const titles = [
    'filters.sections.specialty',
    'filters.sections.location',
    'filters.sections.pay',
    'filters.sections.schedule',
    'filters.sections.experience',
    'filters.sections.perks',
    'filters.sections.salons',
  ]

  return (
    <div className={[s.panel, s.loading].join(' ')} aria-busy="true">
      {titles.map((key) => (
        <div key={key} className={s.skRow}>
          {t(key)}
        </div>
      ))}
    </div>
  )
}
