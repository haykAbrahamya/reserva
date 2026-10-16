import type { Locale } from '@/i18n'
import { addDays } from '@/lib/dates'
import { SAMPLE_INSTAGRAM } from '@/lib/instagram'
import { DEFAULT_THEME_ID } from '@/lib/story/themes'
import { DISCOUNT, PROMO_LAYOUTS, newItem, type PromoDraft } from './model'

/**
 * What a first-time visitor starts from: a finished promo in their language,
 * with services already priced at the discount, so the one thing to try first
 * — changing the percent — visibly reprices everything.
 */
const SAMPLES: Record<Locale, { heading: string; offer: string; note: string; items: [string, string][] }> = {
  hy: {
    heading: 'Ակցիա',
    offer: 'Մատնահարդարման և ոտնահարդարման համար',
    note: 'Ամրագրման համար գրեք direct',
    items: [
      ['Գել-լաք', '8000'],
      ['Ֆրենչ', '10000'],
      ['Ոտնահարդարում', '12000'],
    ],
  },
  en: {
    heading: 'Special offer',
    offer: 'On manicure & pedicure',
    note: 'DM to book',
    items: [
      ['Gel polish', '8000'],
      ['French manicure', '10000'],
      ['Pedicure', '12000'],
    ],
  },
  ru: {
    heading: 'Акция',
    offer: 'На маникюр и педикюр',
    note: 'Пишите в директ для записи',
    items: [
      ['Покрытие гель-лаком', '8000'],
      ['Френч', '10000'],
      ['Педикюр', '12000'],
    ],
  },
}

/** Two weeks from today: long enough to plan a visit, short enough to feel urgent. */
export function sampleDraft(locale: Locale, today: string): PromoDraft {
  const { items, ...sample } = SAMPLES[locale]
  return {
    ...sample,
    title: 'Anna Beauty',
    contact: `@${SAMPLE_INSTAGRAM}`,
    layout: PROMO_LAYOUTS[0],
    themeId: DEFAULT_THEME_ID,
    discount: DISCOUNT.sample,
    items: items.map(([name, price]) => newItem(name, price)),
    until: addDays(today, 14),
  }
}
