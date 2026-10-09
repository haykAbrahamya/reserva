import { Search, X, MapPin, Tags, FunnelX } from 'lucide-react'
import { Button, Select, MultiSelect, type SelectOption } from '@/components/ui'
import { useI18n } from '@/i18n'
import { isFiltering, type SpecialistFilter } from './specialistFilters'
import s from './SpecialistsFilterBar.module.scss'

interface Props {
  filter: SpecialistFilter
  onQueryChange: (v: string) => void
  onBranchChange: (id: string) => void
  onCategoriesChange: (values: string[]) => void
  onClear: () => void
  /** Branch choices. Fewer than two → the branch filter is hidden (nothing to narrow). */
  branches: SelectOption[]
  /** Category choices. Fewer than two → hidden, likewise. */
  categories: SelectOption[]
}

/** The "All branches" list option. Picking it maps back to '' (no filter), so the
 *  trigger falls back to its short muted label — the same idle look as the
 *  categories dropdown, while an active filter reads in full colour. */
const ALL = '__all__'

/**
 * Name search + branch + categories for the Specialists roster. Mobile-first:
 * on a phone the search takes a full row and the two dropdowns share the next;
 * on desktop everything sits on one row. "Clear filters" appears only while
 * something is actually filtering — a labelled button at the end of the row on
 * desktop, a square icon at the end of the search row on a phone (so clearing
 * never costs the page a line of its own).
 */
export function SpecialistsFilterBar({
  filter, onQueryChange, onBranchChange, onCategoriesChange, onClear, branches, categories,
}: Props) {
  const { t } = useI18n()
  const filtering = isFiltering(filter)

  return (
    <div className={s.bar}>
      <div className={s.searchRow}>
        <div className={s.searchField}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.searchInput}
            value={filter.query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder={t('specialists.filter.searchPlaceholder')}
            aria-label={t('specialists.filter.searchPlaceholder')}
            type="search"
            autoComplete="off"
          />
          {filter.query && (
            <button type="button" className={s.clearBtn} onClick={() => onQueryChange('')} aria-label={t('common.clear')}>
              <X size={15} />
            </button>
          )}
        </div>
        {/* Phones only (hidden by CSS on wider screens). */}
        {filtering && (
          <button
            type="button"
            className={s.resetIcon}
            onClick={onClear}
            aria-label={t('specialists.filter.clear')}
            title={t('specialists.filter.clear')}
          >
            <FunnelX size={17} />
          </button>
        )}
      </div>

      {branches.length > 1 && (
        <div className={s.field}>
          <Select
            value={filter.branchId}
            onChange={v => onBranchChange(v === ALL ? '' : v)}
            options={[{ value: ALL, label: t('specialists.filter.allBranches') }, ...branches]}
            placeholder={t('specialists.filter.branch')}
            icon={<MapPin size={14} />}
            searchPlaceholder={t('common.search')}
          />
        </div>
      )}

      {categories.length > 1 && (
        <div className={s.field}>
          <MultiSelect
            values={filter.categories}
            onChange={onCategoriesChange}
            options={categories}
            placeholder={t('specialists.filter.categories')}
            icon={<Tags size={14} />}
            searchable
            searchPlaceholder={t('specialists.filter.searchCategory')}
            clearLabel={t('common.clear')}
            emptyLabel={t('specialists.filter.noCategory')}
          />
        </div>
      )}

      {filtering && (
        <Button variant="ghost" className={s.reset} onClick={onClear}>
          <X size={14} /> {t('specialists.filter.clear')}
        </Button>
      )}
    </div>
  )
}
