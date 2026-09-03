/**
 * A translation bundle: an arbitrarily-nested map of strings, addressed by a
 * dotted key ("board.filters.area").
 */
export type Messages = { [key: string]: string | Messages }

/** Values interpolated into a message: `{count} listings`. */
export type Vars = Record<string, string | number>

/** How one language presents itself in a switcher. */
export interface LocaleMeta {
  /** BCP-47 tag applied to <html lang>. */
  lang: string
  /** Native language name, as speakers of it write it. */
  native: string
  /** Short English name, for admin surfaces. */
  english: string
  /** Two-letter code for the compact pill. */
  short: string
  /** Small flag glyph, for flair only — never the only cue. */
  flag: string
}

export interface I18nConfig<L extends string> {
  /** Supported locales, in switcher order. */
  locales: readonly L[]
  /**
   * The locale a first-time visitor gets. This is an Armenian-market product,
   * so it is deliberately NOT derived from `navigator.language`: a visitor sees
   * Armenian until they choose otherwise, and their choice is then remembered.
   */
  defaultLocale: L
  meta: Record<L, LocaleMeta>
  /** Bundled messages, always shipped so the UI is never blank. */
  bundled: Record<L, Messages>
  /**
   * localStorage key for the last applied locale. Per app, so the backoffice
   * and a public page do not fight over one value.
   */
  storageKey: string
  /**
   * Where remote bundles live, once translations are served rather than built
   * in. Empty means "bundled only" — the switch is this one string.
   */
  remoteBaseUrl?: string
}
