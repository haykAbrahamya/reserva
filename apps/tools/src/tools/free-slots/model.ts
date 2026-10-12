import { isDay } from '@/lib/dates'
import { asRecord, readText } from '@/lib/storage'
import { brandText, parseBrand, type StoryBrand } from '@/lib/story/brand'
import { DEFAULT_THEME_ID, isStoryThemeId, type StoryThemeId } from '@/lib/story/themes'
import { sortTimes } from './time'

export interface FreeSlotsDraft extends StoryBrand {
  /** The day the slots are on, 'YYYY-MM-DD'. */
  date: string
  /** Free times, 'HH:MM', sorted and unique. */
  slots: string[]
  /** How to book, in the accent above the contact — "DM to book". */
  note: string
  themeId: StoryThemeId
}

/** Twelve times read well on one story — four rows of three. */
export const LIMITS = { slots: 12, note: 48 } as const

/** Every character the story may draw, for the font loader. */
export function draftText(draft: FreeSlotsDraft, dateLine: string): string {
  return `${brandText(draft)} ${draft.note} ${dateLine} ${draft.slots.join(' ')} 0123456789: …`
}

/**
 * A stored draft, checked field by field. A day already in the past moves to
 * `today`: a free-slots story is always about now, and yesterday's free times
 * are not anyone's.
 */
export function parseDraft(value: unknown, today: string): FreeSlotsDraft | null {
  const stored = asRecord(value)
  if (!stored || !Array.isArray(stored.slots)) return null

  return {
    ...parseBrand(stored),
    date: isDay(stored.date) && stored.date >= today ? stored.date : today,
    slots: sortTimes(stored.slots).slice(0, LIMITS.slots),
    note: readText(stored.note, LIMITS.note),
    themeId: isStoryThemeId(stored.themeId) ? stored.themeId : DEFAULT_THEME_ID,
  }
}
