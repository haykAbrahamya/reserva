import { Search, X } from 'lucide-react'
import { useT } from '@/i18n'
import s from './FilterSearch.module.scss'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder: string
}

/**
 * The small search box inside a filter section.
 *
 * Purely local — it narrows the OPTIONS in front of you, never the results.
 * That distinction is why it is a separate component from the board's main
 * search field: this one issues no request, so it has no debounce and no
 * loading state, and conflating the two would put a spinner on a list of twelve
 * districts.
 */
export function FilterSearch({ value, onChange, placeholder }: Props) {
  const t = useT()

  return (
    <div className={s.wrap}>
      <Search size={13} className={s.icon} aria-hidden="true" />
      <input
        type="search"
        className={s.input}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t('filters.searchIn')}
      />
      {value && (
        <button
          type="button"
          className={s.clear}
          onClick={() => onChange('')}
          aria-label={t('search.clear')}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
