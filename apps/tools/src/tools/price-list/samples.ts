import type { Locale } from '@/i18n'
import { DEFAULT_THEME_ID } from '@/lib/story/themes'
import { newItem, type PriceListDraft } from './model'

/**
 * What a first-time visitor starts from: a filled-in example in their language,
 * so the very first thing they see is a finished, good-looking story — and
 * editing it is obviously how to make their own.
 */
const SAMPLES: Record<Locale, { heading: string; items: [string, string][] }> = {
  hy: {
    heading: 'Գնացուցակ',
    items: [
      ['Մատնահարդարում', '5000'],
      ['Գել-լաք', '8000'],
      ['Ֆրենչ', '10000'],
      ['Ոտնահարդարում', '12000'],
      ['Եղունգների լիցք', '15000'],
    ],
  },
  en: {
    heading: 'Price list',
    items: [
      ['Manicure', '5000'],
      ['Gel polish', '8000'],
      ['French manicure', '10000'],
      ['Pedicure', '12000'],
      ['Nail extensions', '15000'],
    ],
  },
  ru: {
    heading: 'Прайс-лист',
    items: [
      ['Маникюр', '5000'],
      ['Покрытие гель-лаком', '8000'],
      ['Френч', '10000'],
      ['Педикюр', '12000'],
      ['Наращивание ногтей', '15000'],
    ],
  },
}

export function sampleDraft(locale: Locale): PriceListDraft {
  const sample = SAMPLES[locale]
  return {
    heading: sample.heading,
    title: 'Anna Beauty',
    contact: '@anna.beauty',
    items: sample.items.map(([name, price]) => newItem(name, price)),
    themeId: DEFAULT_THEME_ID,
  }
}
