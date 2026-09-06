import { Globe } from 'lucide-react'
import { Select } from '@reserva/ui'
import { LOCALES, LOCALE_META, useI18n, useT, type Locale } from '@/i18n'
import s from './LanguageSwitcher.module.scss'

/**
 * The language control: one dropdown, at every width.
 *
 * It used to be three pills — «ՀԱ EN RU» side by side — on the argument that
 * with only three options a menu costs two taps to do what one tap can. What
 * that argument left out is width: the group was 106px, and in a header that
 * also carries the mark, «Աշխատատեղեր» and two icon buttons it was the reason
 * the product pill ran underneath the controls at 360px.
 *
 * Collapsing it only below 560px fixed the phone and left two different
 * controls to reason about, which is a worse trade than the tap it saved. The
 * same 34px trigger now serves everywhere, and it is the one a visitor arriving
 * from reserva.am or the backoffice has already used: globe, current code,
 * chevron.
 *
 * The dropdown itself is the shared `Select` — the same one the board's sort
 * opens — so it is themed, positioned and dismissed by code that is already
 * used elsewhere, and it renders in a portal, which is what lets it hang below
 * a `backdrop-filter` header without being clipped by it.
 *
 * The choice is marked explicit, so it is remembered and no server-supplied
 * default can override it later.
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const t = useT()

  return (
    /* Select carries no label prop, so the group around it does the naming — a
       bare control announces only its value. Same pattern as the board's sort.

       The list names each language in ITSELF, with the English name beneath:
       someone hunting for Russian in an Armenian interface is looking for
       «Русский», not for a translation of it. The trigger falls back to the
       two-letter code, which is all that fits. */
    <div className={s.wrap} role="group" aria-label={t('nav.language')}>
      <Select
        value={locale}
        onChange={(v) => setLocale(v as Locale, true)}
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
