import { Globe } from 'lucide-react'
import { Select } from '@reserva/ui'
import { LOCALES, LOCALE_META, useI18n, useT, type Locale } from '@/i18n'
import { track } from '@/lib/analytics/pulse'
import s from './LanguageSwitcher.module.scss'

/**
 * The language control: one compact dropdown at every width — the same globe,
 * code and chevron a visitor already knows from reserva.am and the backoffice.
 *
 * It is the shared `Select`, which renders in a portal, so it can hang below the
 * blurred sticky header without being clipped by it. The choice is marked
 * explicit, so it is remembered from then on.
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const t = useT()

  return (
    /* Select carries no label prop, so the group around it does the naming — a
       bare control announces only its value. Same pattern as the other public sites.

       The list names each language in ITSELF, with the English name beneath:
       someone hunting for Russian in an Armenian interface is looking for
       «Русский», not for a translation of it. The trigger falls back to the
       two-letter code, which is all that fits. */
    <div className={s.wrap} role="group" aria-label={t('nav.language')}>
      <Select
        value={locale}
        onChange={(v) => {
          if (v !== locale) track('pref_change', { what: 'lang', v })
          setLocale(v as Locale, true)
        }}
        options={LOCALES.map((l: Locale) => ({
          value: l,
          label: LOCALE_META[l].native,
          sub: LOCALE_META[l].english,
          short: LOCALE_META[l].short,
        }))}
        size="compact"
        icon={<Globe size={13} />}
        searchable={false}
        panelMinWidth={196}
      />
    </div>
  )
}
