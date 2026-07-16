import { useState } from 'react'
import { Input, Textarea } from '@/components/ui'
import type { LocalizedText } from '@/types'
import { LOCALES, LOCALE_META, useI18n, type Locale } from '@/i18n'
import s from './I18nField.module.scss'

interface Props {
  label: string
  /** Base (default / fallback) value — the existing single-language field. */
  value: string
  onChange: (v: string) => void
  /** Per-language overrides blob (may be null/undefined). */
  i18n?: LocalizedText | null
  onI18nChange: (next: LocalizedText | null) => void
  placeholder?: string
  error?: string
  /** Render a multi-line textarea instead of a single-line input. */
  multiline?: boolean
  rows?: number
  /** Existing values to offer as autocomplete suggestions on the BASE input
   *  (e.g. existing service categories). Free text is still allowed. */
  suggestions?: string[]
}

/**
 * A translatable text field: the base value plus optional per-language
 * overrides, edited via inline "Base / EN / HY / RU" pills. Selecting a locale
 * pill edits that language's override (blank = falls back to Base at read time);
 * a filled dot marks languages that already have a translation. Keeps the form
 * calm — Base is selected by default, translations are opt-in.
 */
let i18nFieldSeq = 0

export function I18nField({
  label, value, onChange, i18n, onI18nChange, placeholder, error, multiline, rows, suggestions,
}: Props) {
  const { t } = useI18n()
  // `active === null` → editing the base value; otherwise a locale override.
  const [active, setActive] = useState<Locale | null>(null)
  // Stable datalist id for the (optional) base-value autocomplete.
  const [listId] = useState(() => `i18n-sug-${++i18nFieldSeq}`)
  // Suggestions only make sense on the base value (translations are free text).
  const showSuggestions = !multiline && active === null && !!suggestions?.length

  const setOverride = (locale: Locale, v: string) => {
    const next: LocalizedText = { ...(i18n ?? {}) }
    if (v.trim()) next[locale] = v
    else delete next[locale]
    onI18nChange(Object.keys(next).length ? next : null)
  }

  const filled = (locale: Locale) => {
    const v = i18n?.[locale]
    return typeof v === 'string' && v.trim().length > 0
  }

  const activeValue = active === null ? value : (i18n?.[active] ?? '')
  const handleChange = (v: string) => (active === null ? onChange(v) : setOverride(active, v))
  const activePlaceholder =
    active === null
      ? placeholder
      : t('i18nField.translatePlaceholder', { lang: LOCALE_META[active].native })

  return (
    <div className={s.wrap}>
      <div className={[s.head, label ? '' : s.headNoLabel].filter(Boolean).join(' ')}>
        {label && <span className={s.label}>{label}</span>}
        <div className={s.pills}>
          <button
            type="button"
            className={[s.pill, active === null ? s.pillActive : ''].filter(Boolean).join(' ')}
            onClick={() => setActive(null)}
            title={t('i18nField.base')}
          >
            {t('i18nField.base')}
          </button>
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              className={[s.pill, active === l ? s.pillActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActive(l)}
              title={LOCALE_META[l].native}
            >
              {LOCALE_META[l].short}
              {filled(l) && <span className={s.dot} />}
            </button>
          ))}
        </div>
      </div>

      {multiline ? (
        <Textarea
          value={activeValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={activePlaceholder}
          error={active === null ? error : undefined}
          rows={rows ?? 4}
        />
      ) : (
        <>
          <Input
            value={activeValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={activePlaceholder}
            error={active === null ? error : undefined}
            list={showSuggestions ? listId : undefined}
            autoComplete="off"
          />
          {showSuggestions && (
            <datalist id={listId}>
              {suggestions!.map((sug) => <option key={sug} value={sug} />)}
            </datalist>
          )}
        </>
      )}

      {active !== null && (
        <span className={s.hint}>{t('i18nField.overrideHint')}</span>
      )}
    </div>
  )
}
