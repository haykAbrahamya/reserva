import type { Locale } from '@/i18n'
import { SAMPLE_INSTAGRAM } from '@/lib/instagram'
import { DEFAULT_THEME_ID } from '@/lib/story/themes'
import { CARD_LAYOUTS, type CardDraft } from './model'

/**
 * What a first-time visitor starts from: a finished card in their language.
 * No phone number, as in every sample here: a made-up one would be someone's
 * real number.
 */
const SAMPLES: Record<Locale, Pick<CardDraft, 'name' | 'role' | 'address'>> = {
  hy: { name: 'Աննա Պետրոսյան', role: 'Մատնահարդարման վարպետ', address: 'Թումանյան 20, Երևան' },
  en: { name: 'Anna Petrosyan', role: 'Nail artist', address: '20 Tumanyan St, Yerevan' },
  ru: { name: 'Анна Петросян', role: 'Мастер маникюра', address: 'ул. Туманяна 20, Ереван' },
}

export function sampleDraft(locale: Locale): CardDraft {
  return {
    ...SAMPLES[locale],
    layout: CARD_LAYOUTS[0],
    themeId: DEFAULT_THEME_ID,
    instagram: `@${SAMPLE_INSTAGRAM}`,
    phone: '',
    messengers: ['whatsapp', 'viber'],
    website: '',
    qr: 'instagram',
  }
}
