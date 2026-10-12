// ─────────────────────────────────────────────────────────────
// Story styles. Fixed palettes rather than a free colour picker on purpose:
// every combination here has been chosen to look good and stay legible, so no
// visitor can make a price list nobody can read.
// ─────────────────────────────────────────────────────────────

export type StoryThemeId = 'mocha' | 'cream' | 'noir' | 'blush' | 'sage' | 'lavender'

export interface StoryTheme {
  id: StoryThemeId
  /** Background gradient, top → bottom. */
  bg: readonly [string, string]
  text: string
  muted: string
  /** Heading, prices, ornament and rings. */
  accent: string
  /** Leader dots between a service and its price. */
  line: string
  /** Strength of the accent glow in the corners. */
  glow: number
}

export const STORY_THEMES: readonly StoryTheme[] = [
  {
    id: 'mocha',
    bg: ['#3E2C23', '#251913'],
    text: '#F7ECE1',
    muted: '#CDB5A2',
    accent: '#E6B98C',
    line: 'rgba(247, 236, 225, 0.3)',
    glow: 0.22,
  },
  {
    id: 'cream',
    bg: ['#FBF6EF', '#F0E4D4'],
    text: '#2A2019',
    muted: '#7D6D5C',
    accent: '#A8784B',
    line: 'rgba(42, 32, 25, 0.28)',
    glow: 0.2,
  },
  {
    id: 'noir',
    bg: ['#1C1916', '#0E0C0A'],
    text: '#F6EEE4',
    muted: '#B5A797',
    accent: '#D6A972',
    line: 'rgba(246, 238, 228, 0.3)',
    glow: 0.22,
  },
  {
    id: 'blush',
    bg: ['#FCF1F3', '#F2D8DE'],
    text: '#3B2027',
    muted: '#8D6670',
    accent: '#B0566E',
    line: 'rgba(59, 32, 39, 0.26)',
    glow: 0.2,
  },
  {
    id: 'sage',
    bg: ['#F3F6F1', '#DCE6D7'],
    text: '#1E2A21',
    muted: '#5E7263',
    accent: '#4E7A5A',
    line: 'rgba(30, 42, 33, 0.26)',
    glow: 0.2,
  },
  {
    id: 'lavender',
    bg: ['#F6F2FB', '#E3D9F1'],
    text: '#251E33',
    muted: '#6E6383',
    accent: '#7A5A9E',
    line: 'rgba(37, 30, 51, 0.26)',
    glow: 0.2,
  },
]

/** The first style, and what a first-time visitor starts with. */
export const DEFAULT_THEME_ID: StoryThemeId = 'mocha'

export function isStoryThemeId(value: unknown): value is StoryThemeId {
  return STORY_THEMES.some((theme) => theme.id === value)
}

export function themeById(id: StoryThemeId): StoryTheme {
  return STORY_THEMES.find((theme) => theme.id === id) ?? STORY_THEMES[0]
}
