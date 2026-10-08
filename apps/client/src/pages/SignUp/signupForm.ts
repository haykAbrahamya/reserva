// ─────────────────────────────────────────────────────────────
// Pure helpers behind the sign-up flow: the page address made from a name
// (Armenian / Russian → Latin), an Armenian-first phone field, email typo
// hints, password strength, "open your inbox" links and the saved draft.
// No React and no DOM at import time — the page is also prerendered in Node.
// ─────────────────────────────────────────────────────────────

export type Kind = 'salon' | 'single'
export type Step = 'kind' | 'page' | 'account'

/** Backend rules (signup.dto.ts). */
export const MIN_PW = 8
export const SLUG_RE = /^[a-z0-9-]{2,60}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const E164_RE = /^\+[1-9]\d{6,14}$/

/** The business types offered as one-tap chips; anything else is "other". */
export const TYPE_KEYS: Record<Kind, readonly string[]> = {
  single: ['nails', 'hair', 'barber', 'lashes', 'makeup', 'cosmetology', 'massage'],
  salon: ['beauty', 'nails', 'hair', 'barber', 'lashes', 'cosmetology', 'spa'],
}

// ── Page address ──────────────────────────────────────────────

const HY: Record<string, string> = {
  ա: 'a', բ: 'b', գ: 'g', դ: 'd', ե: 'e', զ: 'z', է: 'e', ը: 'y', թ: 't', ժ: 'zh',
  ի: 'i', լ: 'l', խ: 'kh', ծ: 'ts', կ: 'k', հ: 'h', ձ: 'dz', ղ: 'gh', ճ: 'ch', մ: 'm',
  յ: 'y', ն: 'n', շ: 'sh', ո: 'o', չ: 'ch', պ: 'p', ջ: 'j', ռ: 'r', ս: 's', վ: 'v',
  տ: 't', ր: 'r', ց: 'ts', ւ: 'v', փ: 'p', ք: 'k', օ: 'o', ֆ: 'f', և: 'ev',
}
const RU: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

/** Lower-case Latin: Armenian and Cyrillic letters spelled out, accents dropped. */
function toLatin(text: string): string {
  return text
    .toLowerCase()
    .replace(/ու/g, 'u')
    .replace(/[ա-ևа-яё]/g, (ch) => HY[ch] ?? RU[ch] ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

/** "Անժելա Nails" → "anzhela-nails", "Салон Ирина" → "salon-irina". */
export function slugFromName(name: string): string {
  return toLatin(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

/** What someone types into the address field, kept valid as they type (a trailing dash may stay until they finish). */
export function slugInput(value: string): string {
  return toLatin(value)
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 60)
}

/** The address as it will be saved: no trailing dash. */
export function slugFinal(value: string): string {
  return value.replace(/-+$/, '')
}

/** Variants to offer when an address is taken, in the order they read best. */
export function slugVariants(base: string): string[] {
  return [`${base}-yerevan`, `${base}-am`, `${base}-2`, `${base}-3`].filter((v) => SLUG_RE.test(v))
}

// ── Phone ─────────────────────────────────────────────────────

export const AM_CODE = '+374'

/** Typed with "+" or "00": a number from abroad, kept as typed. */
export function isInternational(input: string): boolean {
  const v = input.trim()
  return v.startsWith('+') || v.startsWith('00')
}

/** Armenian digits as they type: "093813296" → "93 813 296" (the 0 and any 374 dropped). */
export function formatAmPhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('374') && digits.length > 8) digits = digits.slice(3)
  digits = digits.replace(/^0+/, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8)].filter(Boolean).join(' ')
}

/** The field's text → the backend's E.164 form ("+37493813296"); "" while empty. */
export function phoneToE164(input: string): string {
  const raw = input.trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (raw.startsWith('+')) return `+${digits}`
  if (raw.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('374') && digits.length === 11) return `+${digits}`
  return AM_CODE + digits.replace(/^0+/, '')
}

/** Armenian numbers have exactly 8 digits after +374; others just need to look like E.164. */
export function isPhoneValid(input: string): boolean {
  const e164 = phoneToE164(input)
  if (!E164_RE.test(e164)) return false
  return e164.startsWith(AM_CODE) ? e164.length === AM_CODE.length + 8 : true
}

// ── Email ─────────────────────────────────────────────────────

const COMMON_DOMAINS = [
  'gmail.com', 'mail.ru', 'yandex.ru', 'yandex.com', 'yahoo.com', 'icloud.com', 'me.com',
  'outlook.com', 'hotmail.com', 'live.com', 'inbox.ru', 'list.ru', 'bk.ru', 'rambler.ru',
  'proton.me', 'protonmail.com',
]

/** Edit distance where swapping two neighbours counts as one edit ("gmial" → "gmail"). */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/**
 * "anna@gmial.com" → "anna@gmail.com". Only near-misses of the big providers;
 * an Armenian ".am" domain is taken as meant unless it is one letter off.
 */
export function emailSuggestion(email: string): string | null {
  const value = email.trim()
  const at = value.lastIndexOf('@')
  if (at < 1) return null
  const domain = value.slice(at + 1).toLowerCase()
  if (domain.length < 4 || COMMON_DOMAINS.includes(domain)) return null
  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of COMMON_DOMAINS) {
    const dist = distance(domain, candidate)
    if (dist < bestDistance) {
      best = candidate
      bestDistance = dist
    }
  }
  const close = bestDistance === 1 || (bestDistance === 2 && !domain.endsWith('.am'))
  return best && close ? `${value.slice(0, at)}@${best}` : null
}

const INBOXES: { domains: string[]; name: string; url: string }[] = [
  { domains: ['gmail.com', 'googlemail.com'], name: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  { domains: ['mail.ru', 'inbox.ru', 'list.ru', 'bk.ru'], name: 'Mail.ru', url: 'https://e.mail.ru/inbox/' },
  { domains: ['yandex.ru', 'yandex.com', 'ya.ru'], name: 'Yandex Mail', url: 'https://mail.yandex.ru/' },
  { domains: ['outlook.com', 'hotmail.com', 'live.com'], name: 'Outlook', url: 'https://outlook.live.com/mail/' },
  { domains: ['yahoo.com'], name: 'Yahoo Mail', url: 'https://mail.yahoo.com/' },
  { domains: ['icloud.com', 'me.com'], name: 'iCloud Mail', url: 'https://www.icloud.com/mail' },
  { domains: ['proton.me', 'protonmail.com'], name: 'Proton Mail', url: 'https://mail.proton.me/' },
]

/** The web inbox for a big provider, so the success screen can open it in one tap. */
export function inboxFor(email: string): { name: string; url: string } | null {
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  const hit = INBOXES.find((inbox) => inbox.domains.includes(domain))
  return hit ? { name: hit.name, url: hit.url } : null
}

// ── Password ──────────────────────────────────────────────────

/** 0 = too short; then 1 fair · 2 good · 3 strong (length and variety). */
export function passwordScore(password: string): 0 | 1 | 2 | 3 {
  if (password.length < MIN_PW) return 0
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  const long = password.length >= 12
  if (long && variety >= 3) return 3
  if (long || variety >= 3) return 2
  return 1
}

// ── Draft ─────────────────────────────────────────────────────
// What they typed survives a closed tab or an Instagram in-app browser that
// reloads — never the password.

const DRAFT_KEY = 'rsv.signup.draft'
const DRAFT_DAYS = 14

export interface SignupDraft {
  kind: Kind | null
  company: string
  typeKey: string
  typeOther: string
  slug: string
  slugEdited: boolean
  accent: string
  name: string
  email: string
  phone: string
}

export function loadDraft(): Partial<SignupDraft> | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<SignupDraft> & { at?: number }
    if (typeof saved.at !== 'number' || Date.now() - saved.at > DRAFT_DAYS * 86_400_000) return null
    const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
    return {
      kind: saved.kind === 'salon' || saved.kind === 'single' ? saved.kind : null,
      company: text(saved.company, 120),
      typeKey: text(saved.typeKey, 20),
      typeOther: text(saved.typeOther, 80),
      slug: text(saved.slug, 60),
      slugEdited: saved.slugEdited === true,
      accent: typeof saved.accent === 'string' && /^#[0-9a-f]{6}$/i.test(saved.accent) ? saved.accent : undefined,
      name: text(saved.name, 120),
      email: text(saved.email, 254),
      phone: text(saved.phone, 24),
    }
  } catch {
    return null
  }
}

export function saveDraft(draft: SignupDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, at: Date.now() }))
  } catch {
    // Blocked storage: the form simply isn't remembered.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing to clear.
  }
}
