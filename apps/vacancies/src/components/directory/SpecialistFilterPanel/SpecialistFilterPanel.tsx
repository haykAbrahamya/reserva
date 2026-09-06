import { Images, MapPin, Scissors, Sparkles } from 'lucide-react'
import { Toggle } from '@reserva/ui'
import type { SpecialistFilters } from '@/api/directory.api'
import { AreaPicker } from '@/components/common/AreaPicker/AreaPicker'
import { SpecialtyPicker } from '@/components/common/SpecialtyPicker/SpecialtyPicker'
import { FilterSection } from '@/components/filters/FilterSection/FilterSection'
import { useT } from '@/i18n'
import type { Taxonomy } from '@/lib/taxonomy'
import s from './SpecialistFilterPanel.module.scss'

interface Props {
  filters: SpecialistFilters
  patch: (part: Partial<SpecialistFilters>) => void
  taxonomy: Taxonomy
}

/** The floors a salon actually thinks in. Nobody searches for "at least 7". */
const EXPERIENCE_STEPS: (number | null)[] = [null, 1, 3, 5, 10]

/**
 * The directory's filters, as one component.
 *
 * ONE instance serves both layouts — the desktop rail renders it, and so does
 * the mobile sheet. That is the same arrangement the board uses and for the
 * same reason: the usual failure is a filter that exists on desktop and quietly
 * does not on a phone, which is where most of the traffic is.
 *
 * `FilterSection` is the board's collapsible block, reused rather than
 * reimplemented, so a section header behaves identically on both pages — it
 * keeps its content MOUNTED when collapsed, which matters here because these
 * sections hold comboboxes with typed queries in them.
 *
 * Specialty comes first. A salon arrives asking "who does colour", not "who is
 * in Arabkir": the craft is the filter almost everyone sets and the one that
 * makes the rest of the panel worth reading.
 */
export function SpecialistFilterPanel({ filters, patch, taxonomy }: Props) {
  const t = useT()
  const { groups, areaTree, loading } = taxonomy

  return (
    <div className={s.panel}>
      <FilterSection
        title={t('specialist.specialties')}
        activeCount={filters.specialty.length}
        defaultOpen
      >
        <SpecialtyPicker
          groups={groups}
          selected={filters.specialty}
          onChange={(specialty) => patch({ specialty })}
          loading={loading}
        />
      </FilterSection>

      <FilterSection title={t('specialist.areas')} activeCount={filters.area.length} defaultOpen>
        <AreaPicker
          tree={areaTree}
          selected={filters.area}
          onChange={(area) => patch({ area })}
          loading={loading}
        />
      </FilterSection>

      <FilterSection
        title={t('directory.minExperience')}
        activeCount={filters.experienceMin != null ? 1 : 0}
      >
        <div className={s.chips}>
          {EXPERIENCE_STEPS.map((years) => {
            const on = filters.experienceMin === years
            return (
              <button
                key={String(years)}
                type="button"
                className={[s.chip, on ? s.chipOn : ''].filter(Boolean).join(' ')}
                onClick={() => patch({ experienceMin: years })}
                aria-pressed={on}
              >
                {years == null ? (
                  t('directory.anyExperience')
                ) : (
                  <>
                    <Sparkles size={12} />
                    {years}+
                  </>
                )}
              </button>
            )
          })}
        </div>
      </FilterSection>

      {/*
        Not in a collapsible section: it is one switch, and a fold costs more
        taps than the row it would hide. It reads as a row of the panel rather
        than as a section with one thing in it.
      */}
      <label className={s.switchRow}>
        <span className={s.switchIcon}>
          <Images size={15} />
        </span>
        <span className={s.switchText}>
          <span className={s.switchTitle}>{t('directory.withPhotos')}</span>
          <span className={s.switchBody}>{t('directory.withPhotosBody')}</span>
        </span>
        <Toggle
          checked={filters.withPhotos}
          onChange={(withPhotos) => patch({ withPhotos })}
          ariaLabel={t('directory.withPhotos')}
        />
      </label>
    </div>
  )
}

/**
 * The chosen filters, as removable chips above the results.
 *
 * The panel is behind a button on a phone, so without this a narrowed search
 * looks identical to an empty one — the reason "no specialists found" reads as
 * "this directory is empty" rather than as "your filter is too tight".
 */
export function ActiveSpecialistChips({ filters, patch, taxonomy }: Props) {
  const t = useT()
  const { specialtyNames, areaNames } = taxonomy

  const chips: { key: string; label: string; icon: typeof Scissors; clear: () => void }[] = [
    ...specialtyNames(filters.specialty).map((label, i) => ({
      key: `sp-${filters.specialty[i]}`,
      label,
      icon: Scissors,
      clear: () => patch({ specialty: filters.specialty.filter((_, j) => j !== i) }),
    })),
    ...areaNames(filters.area).map((label, i) => ({
      key: `ar-${filters.area[i]}`,
      label,
      icon: MapPin,
      clear: () => patch({ area: filters.area.filter((_, j) => j !== i) }),
    })),
  ]

  if (filters.experienceMin != null) {
    chips.push({
      key: 'exp',
      label: `${filters.experienceMin}+`,
      icon: Sparkles,
      clear: () => patch({ experienceMin: null }),
    })
  }
  if (filters.withPhotos) {
    chips.push({
      key: 'photos',
      label: t('directory.withPhotos'),
      icon: Images,
      clear: () => patch({ withPhotos: false }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className={s.active}>
      {chips.map((chip) => (
        <button key={chip.key} type="button" className={s.activeChip} onClick={chip.clear}>
          <chip.icon size={12} />
          {chip.label}
          <span className={s.activeX} aria-hidden="true">
            ×
          </span>
          <span className={s.srOnly}>{t('filters.clearOne')}</span>
        </button>
      ))}
    </div>
  )
}
