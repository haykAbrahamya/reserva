import { readText } from '@/lib/storage'

/**
 * The three lines every story carries: what it is, who it is from, and how to
 * reach them. Each story tool's draft extends this, so they share one form
 * (BrandFields) and one header and footer (drawStoryHeader / drawStoryFooter).
 */
export interface StoryBrand {
  /** The small tracked line above the title, e.g. "Price list". */
  heading: string
  /** The business or specialist name — the story's headline. */
  title: string
  /** Phone or Instagram handle, at the foot of the story. */
  contact: string
}

export type BrandField = keyof StoryBrand

export const BRAND_LIMITS: Record<BrandField, number> = {
  heading: 32,
  title: 40,
  contact: 48,
}

/** The brand lines of a stored draft, length-checked. */
export function parseBrand(stored: Record<string, unknown>): StoryBrand {
  return {
    heading: readText(stored.heading, BRAND_LIMITS.heading),
    title: readText(stored.title, BRAND_LIMITS.title),
    contact: readText(stored.contact, BRAND_LIMITS.contact),
  }
}

/** The brand lines as the story draws them, for the font loader. */
export function brandText(brand: StoryBrand): string {
  return `${brand.heading.toUpperCase()} ${brand.title} ${brand.contact}`
}
