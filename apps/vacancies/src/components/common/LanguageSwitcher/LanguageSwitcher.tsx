import { LOCALES, LOCALE_META, useI18n, useT, type Locale } from '@/i18n'
import s from './LanguageSwitcher.module.scss'

/**
 * Three pills rather than a dropdown.
 *
 * With exactly three short codes a menu costs two taps to do what one tap can,
 * and hides the current language behind a click. The trade would flip at five
 * languages; at three, showing all of them is simply better.
 *
 * The choice is marked explicit, so it is remembered and no server-supplied
 * default can override it later.
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const t = useT()

  return (
    <div className={s.group} role="group" aria-label={t('nav.language')}>
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          type="button"
          className={[s.pill, l === locale ? s.on : ''].filter(Boolean).join(' ')}
          onClick={() => setLocale(l, true)}
          aria-pressed={l === locale}
          title={LOCALE_META[l].native}
        >
          {LOCALE_META[l].short}
        </button>
      ))}
    </div>
  )
}
