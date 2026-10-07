import type { SessionDetail, SessionRow } from '@/services/analytics.service'
import { fmtInt } from './format'
import s from './Analytics.module.scss'

// ─────────────────────────────────────────────────────────────
// One anonymous "person" across the console: a short tag from the random
// visitorId ("#7F3A") plus a small mark, the same in the Events table, the
// Sessions list and a session's header. Never a name or phone — only what the
// tracker made up.
// ─────────────────────────────────────────────────────────────

/** FNV-1a: tiny, and stable everywhere, so a visitor keeps their mark. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** '#7F3A' — the last four hex characters of the id. Legacy ids
 *  ('legacy-' + md5) end in hex too, so they read the same way. */
export function visitorTag(visitorId: string): string {
  const hex = visitorId.replace(/[^0-9a-f]/gi, '')
  const tail = hex.length >= 4 ? hex.slice(-4) : hash(visitorId).toString(16).padStart(4, '0').slice(-4)
  return `#${tail.toUpperCase()}`
}

/**
 * The mark: 3 hues × 3 shapes. Any two rows can sit side by side, so every
 * pair must stay tellable apart — and only three hues manage that for
 * colour-blind readers too (more collapse into each other); the shape carries
 * the rest. Nine marks; the tag text is what really identifies.
 */
function visitorMark(visitorId: string): { hue: number; shape: number } {
  const n = hash(visitorId) % 9
  return { hue: n % 3, shape: Math.floor(n / 3) }
}

const SHAPE_NAME = ['circle', 'square', 'diamond']

export function VisitorTag({ visitorId, prefix, suffix, onOpen }: {
  visitorId: string
  /** Words before the tag, e.g. "Visitor" in a heading. */
  prefix?: string
  /** Quiet text after the tag, e.g. "3 visits". */
  suffix?: string
  /** Makes the tag a button (e.g. open this visit's journey). */
  onOpen?: () => void
}) {
  const tag = visitorTag(visitorId)
  const { hue, shape } = visitorMark(visitorId)
  const body = (
    <>
      <span className={`${s.vMark} ${s[`vHue${hue}`]} ${s[`vShape${shape}`]}`} aria-hidden="true" data-shape={SHAPE_NAME[shape]} />
      {prefix && <span className={s.vPrefix}>{prefix}</span>}
      <span className={s.vTag}>{tag}</span>
      {suffix && <span className={s.vSuffix}>{suffix}</span>}
    </>
  )
  if (!onOpen) {
    return <span className={s.visitor} title={`Anonymous visitor ${tag}`}>{body}</span>
  }
  return (
    <button
      type="button"
      className={`${s.visitor} ${s.visitorBtn}`}
      title={`Anonymous visitor ${tag} — open this visit`}
      onClick={(e) => {
        // Inside a clickable row: the tag has its own job.
        e.stopPropagation()
        onOpen()
      }}
    >
      {body}
    </button>
  )
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th, 21st. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'
  return `${fmtInt(n)}${suffix}`
}

/**
 * Which of the person's visits this one is, or null when it can't be told:
 * the other visits come newest first and capped at 20, so when every listed
 * one is newer, older ones may simply be missing from the list.
 */
export function visitNumber(session: SessionRow, others: SessionDetail['otherSessions']): number | null {
  const newer = others.filter((o) => o.startedAt > session.startedAt).length
  if (others.length >= 20 && newer === others.length) return null
  return Math.max(1, session.visitorSessions - newer)
}
