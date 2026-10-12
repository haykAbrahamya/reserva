import type { Locale } from '@/i18n'
import { addDays } from '@/lib/dates'
import { DEFAULT_THEME_ID } from '@/lib/story/themes'
import { newCode, type GiftDraft } from './model'

const SAMPLES: Record<Locale, Pick<GiftDraft, 'heading' | 'recipient' | 'sender' | 'message'>> = {
  hy: {
    heading: 'Նվեր քարտ',
    recipient: 'Մարիամ',
    sender: 'Աննա',
    message: 'Թող այս օրը լինի միայն քեզ համար',
  },
  en: {
    heading: 'Gift certificate',
    recipient: 'Maria',
    sender: 'Anna',
    message: 'Treat yourself — this day is all yours',
  },
  ru: {
    heading: 'Подарочный сертификат',
    recipient: 'Мария',
    sender: 'Анна',
    message: 'Пусть этот день будет только для тебя',
  },
}

/** A first visit starts from a finished-looking card, valid for three months. */
export function sampleDraft(locale: Locale, today: string): GiftDraft {
  return {
    ...SAMPLES[locale],
    title: 'Anna Beauty',
    contact: '@anna.beauty',
    value: '20000',
    validUntil: addDays(today, 90),
    code: newCode(),
    themeId: DEFAULT_THEME_ID,
  }
}
