/**
 * Links into the public vacancies board.
 *
 * The board is a different host from this backoffice, so a relative path cannot
 * reach it. Configurable rather than hardcoded — this app is deployed against a
 * staging API too, and a "view profile" link that always points at production
 * would send a tester to a stranger's real page.
 *
 * The one place that knows the board's origin. `PublicLinkBar` still builds
 * `https://<slug>.reserva.am` inline; that is the CLIENT app's host and a
 * separate question.
 */
const VACANCIES_URL = import.meta.env.VITE_VACANCIES_URL || 'https://vacancies.reserva.am'

/**
 * A specialist's public profile.
 *
 * Only ever called with an id the SERVER decided may be linked — it returns
 * `account.profileId` as null for anyone who has not published — so this
 * function never has to make that judgement.
 */
export function specialistProfileUrl(profileId: string): string {
  return `${VACANCIES_URL}/specialists/${encodeURIComponent(profileId)}`
}
