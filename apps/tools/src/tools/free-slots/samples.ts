import type { Locale } from '@/i18n'
import { SAMPLE_INSTAGRAM } from '@/lib/instagram'
import { DEFAULT_THEME_ID } from '@/lib/story/themes'
import type { FreeSlotsDraft } from './model'

const SAMPLES: Record<Locale, { heading: string; note: string }> = {
  hy: { heading: 'Ազատ ժամեր', note: 'Ամրագրման համար գրեք direct' },
  en: { heading: 'Free slots', note: 'DM to book' },
  ru: { heading: 'Свободные окошки', note: 'Пишите в директ для записи' },
}

/** A first visit starts from a finished-looking story for today. */
export function sampleDraft(locale: Locale, today: string): FreeSlotsDraft {
  return {
    ...SAMPLES[locale],
    title: 'Anna Beauty',
    contact: `@${SAMPLE_INSTAGRAM}`,
    date: today,
    slots: ['11:00', '13:30', '16:00', '18:30'],
    themeId: DEFAULT_THEME_ID,
  }
}
