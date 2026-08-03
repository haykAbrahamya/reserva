import { Search, X } from 'lucide-react'
import { Select, type SelectOption } from '@/components/ui'
import { useI18n } from '@/i18n'
import s from './ServicesFilterBar.module.scss'

interface Props {
  /** Current (raw) search text — controlled by the page. */
  search: string
  onSearchChange: (v: string) => void
  /** Selected category filter. '' = a real "uncategorized" value; the ALL
   *  sentinel is handled by the page, so here '' just means no category picked. */
  category: string
  onCategoryChange: (v: string) => void
  /** Distinct category values for this partner (base values). */
  categories: string[]
}

/** Sentinel for "no category filter" (shows every category). Kept distinct from
 *  the empty string, which is a legitimate "uncategorized" value. */
export const ALL_CATEGORIES = '__all__'

/**
 * Search + category filter bar for the Services page. Design-system `Input` +
 * `Select`, mobile-first: on a phone the search field is full-width and the
 * category dropdown sits beneath it; on desktop they share one row.
 */
export function ServicesFilterBar({
  search, onSearchChange, category, onCategoryChange, categories,
}: Props) {
  const { t } = useI18n()

  const options: SelectOption[] = [
    { value: ALL_CATEGORIES, label: t('services.filter.allCategories') },
    ...categories.map((c) => ({ value: c, label: c })),
  ]

  return (
    <div className={s.bar}>
      <div className={s.searchField}>
        <Search size={16} className={s.searchIcon} />
        <input
          className={s.searchInput}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('services.filter.searchPlaceholder')}
          aria-label={t('services.filter.searchPlaceholder')}
          type="search"
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            className={s.clearBtn}
            onClick={() => onSearchChange('')}
            aria-label={t('services.filter.clear')}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Only offer the category filter when the partner actually has categories. */}
      {categories.length > 0 && (
        <div className={s.categoryField}>
          <Select
            value={category}
            onChange={onCategoryChange}
            options={options}
            panelMinWidth={220}
            searchPlaceholder={t('services.filter.searchCategory')}
          />
        </div>
      )}
    </div>
  )
}
