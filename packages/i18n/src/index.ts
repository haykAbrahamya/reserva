// ─────────────────────────────────────────────────────────────
// @reserva/i18n — the shared localization ENGINE.
//
// Deliberately ships no messages. Each app builds its own instance with its own
// locale union, its own bundles and its own storage key:
//
//   export const { I18nProvider, useT, useLocalized } = createI18n({ ... })
//
// so the machinery (dotted keys, {placeholders}, plurals, remote-with-bundled-
// fallback loading, explicit-choice-wins persistence) exists once, while the
// wording stays per app.
// ─────────────────────────────────────────────────────────────

export { createI18n } from './createI18n'
export type { I18nValue } from './createI18n'
export type { I18nConfig, LocaleMeta, Messages, Vars } from './types'
