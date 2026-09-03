import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { useDebounced } from '@/lib/useAsync'
import s from './SearchField.module.scss'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Fills its container. Used in the mobile row under the header. */
  block?: boolean
}

/**
 * The board's main search field.
 *
 * Typing is local and debounced; the committed value only reaches the URL — and
 * therefore the query — once someone stops. A request per keystroke would both
 * hammer the endpoint and stack a history entry per character.
 *
 * The local draft also has to follow the URL back: pressing Back, or clearing
 * the search from the chip row, changes `value` from outside and the field must
 * show it. Without that sync the box keeps displaying text that no longer
 * filters anything.
 */
export function SearchField({ value, onChange, placeholder, block = false }: Props) {
  const t = useT()
  const [draft, setDraft] = useState(value)
  const debounced = useDebounced(draft, 350)

  // Outside change (Back, a removed chip, "clear all") wins over the draft.
  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (debounced !== value) onChange(debounced)
    // `value` is deliberately not a dependency: including it would re-fire the
    // moment the URL catches up and fight the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className={[s.wrap, block ? s.block : ''].filter(Boolean).join(' ')}>
      <Search size={15} className={s.icon} aria-hidden="true" />
      <input
        type="search"
        className={s.input}
        value={draft}
        placeholder={placeholder ?? t('search.placeholder')}
        onChange={(e) => setDraft(e.target.value)}
        // Enter commits immediately — someone who presses it is done typing and
        // should not wait out the debounce.
        onKeyDown={(e) => {
          if (e.key === 'Enter') onChange(draft)
        }}
        aria-label={t('search.placeholder')}
      />
      {draft && (
        <button
          type="button"
          className={s.clear}
          onClick={() => {
            setDraft('')
            onChange('')
          }}
          aria-label={t('search.clear')}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
