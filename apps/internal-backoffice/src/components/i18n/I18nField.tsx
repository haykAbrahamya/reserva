import { useState } from 'react'
import { Input, Textarea } from '@/components/ui'
import s from './I18nField.module.scss'

/** The languages every catalog row must carry. `en` lives in the row's base
 *  column; `hy`/`ru` live in its `*I18n` blob. */
export const CATALOG_LOCALES = ['en', 'hy', 'ru'] as const
export type CatalogLocale = (typeof CATALOG_LOCALES)[number]

const META: Record<CatalogLocale, { short: string; native: string }> = {
  en: { short: 'EN', native: 'English' },
  hy: { short: 'HY', native: 'Հայերեն' },
  ru: { short: 'RU', native: 'Русский' },
}

interface Props {
  label: string
  /** English — the row's base column, source of truth for search and sort. */
  en: string
  onEnChange: (v: string) => void
  /** The required { hy, ru } blob. */
  i18n: { hy: string; ru: string }
  onI18nChange: (next: { hy: string; ru: string }) => void
  placeholder?: string
  hint?: string
  /** Marks the locales that failed validation, so the pill shows where to look. */
  invalid?: Partial<Record<CatalogLocale, boolean>>
  multiline?: boolean
  rows?: number
}

/**
 * One translatable catalog field: a label, three language pills, one input.
 *
 * Mirrors the partner backoffice's I18nField so the two consoles feel like one
 * product — but with the opposite contract. There, translations are optional
 * OVERRIDES on partner content and the pills are decorated with a "filled" dot.
 * Here they are REQUIRED DATA: this vocabulary is rendered to every partner in
 * the country in their own language, so a blank Armenian name is a validation
 * error, not a fallback. The pills therefore flag what is MISSING rather than
 * what is present, which is the thing staff need to see at a glance.
 */
export function I18nField({
  label, en, onEnChange, i18n, onI18nChange,
  placeholder, hint, invalid, multiline, rows,
}: Props) {
  const [active, setActive] = useState<CatalogLocale>('en')

  const valueOf = (l: CatalogLocale) => (l === 'en' ? en : i18n[l])
  const filled = (l: CatalogLocale) => valueOf(l).trim().length > 0

  const handleChange = (v: string) => {
    if (active === 'en') onEnChange(v)
    else onI18nChange({ ...i18n, [active]: v })
  }

  const Field = multiline ? Textarea : Input

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <span className={s.label}>{label}</span>
        <div className={s.pills} role="tablist" aria-label={label}>
          {CATALOG_LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={active === l}
              title={META[l].native}
              className={[
                s.pill,
                active === l ? s.pillActive : '',
                // An empty or rejected locale is called out — with three
                // required languages, silence is the failure mode.
                !filled(l) || invalid?.[l] ? s.pillMissing : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setActive(l)}
            >
              {META[l].short}
              {(!filled(l) || invalid?.[l]) && <span className={s.warn} aria-hidden />}
            </button>
          ))}
        </div>
      </div>

      <Field
        value={valueOf(active)}
        onChange={(e: { target: { value: string } }) => handleChange(e.target.value)}
        placeholder={active === 'en' ? placeholder : `${label} — ${META[active].native}`}
        rows={multiline ? (rows ?? 3) : undefined}
      />

      {hint && <span className={s.hint}>{hint}</span>}
    </div>
  )
}
