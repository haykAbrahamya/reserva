import {
  EXPERIENCE_LEVELS,
  PAY_TYPES,
  SCHEDULE_TYPES,
  type Experience,
  type PayType,
  type ScheduleType,
} from '@/api/types'

// ─────────────────────────────────────────────────────────────
// Filter state, and its codec to and from the query string.
//
// THE URL IS THE STORE. There is no filter reducer and no context holding a
// selection, because a board's state is exactly the state that should be
// shareable: a link to "colourists in Arabkir paying over 250,000" has to
// survive being pasted into a chat, bookmarked, and hit by a crawler. Keeping
// it anywhere else means writing back-button handling by hand and getting it
// subtly wrong.
//
// Everything in this file is pure, so the round trip is testable without a
// browser.
// ─────────────────────────────────────────────────────────────

export const SORTS = ['newest', 'pay_high', 'pay_low'] as const
export type SortKey = (typeof SORTS)[number]

/**
 * A money range, or null for "not set".
 *
 * null is NOT the same as [min, max]: a range sitting at its full extent is an
 * untouched control and must not appear in the URL or narrow the query, while
 * an explicit range that happens to span everything should. Collapsing the two
 * is what produces a "clear filters" button that never becomes enabled.
 */
export type Range = [number, number] | null

export interface BoardFilters {
  q: string
  area: string[]
  specialty: string[]
  group: string[]
  salon: string[]
  payType: PayType[]
  salary: Range
  rent: Range
  percent: Range
  experience: Experience[]
  schedule: ScheduleType[]
  perks: string[]
  sort: SortKey
}

export const EMPTY_FILTERS: BoardFilters = {
  q: '',
  area: [],
  specialty: [],
  group: [],
  salon: [],
  payType: [],
  salary: null,
  rent: null,
  percent: null,
  experience: [],
  schedule: [],
  perks: [],
  sort: 'newest',
}

/** Which keys are list-valued — used by the generic toggle and the codec. */
export type ListKey = 'area' | 'specialty' | 'group' | 'salon' | 'payType' | 'experience' | 'schedule' | 'perks'

const LIST_KEYS: ListKey[] = [
  'area',
  'specialty',
  'group',
  'salon',
  'payType',
  'experience',
  'schedule',
  'perks',
]

export type RangeKey = 'salary' | 'rent' | 'percent'
const RANGE_KEYS: RangeKey[] = ['salary', 'rent', 'percent']

/** Query-param names for a range's two ends. Kept next to the codec so the
 *  backend contract and the URL never disagree. */
const RANGE_PARAMS: Record<RangeKey, [string, string]> = {
  salary: ['salaryMin', 'salaryMax'],
  rent: ['rentMin', 'rentMax'],
  percent: ['percentMin', 'percentMax'],
}

const oneOf = <T extends string>(values: readonly T[], v: string): v is T =>
  (values as readonly string[]).includes(v)

/** Comma-joined lists keep a shared link short enough to read. */
const splitList = (raw: string | null): string[] =>
  raw
    ? [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))]
    : []

function readInt(raw: string | null): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? Math.trunc(n) : undefined
}

function readRange(params: URLSearchParams, key: RangeKey): Range {
  const [lo, hi] = RANGE_PARAMS[key]
  const min = readInt(params.get(lo))
  const max = readInt(params.get(hi))
  if (min == null && max == null) return null
  // A half-open range in the URL is legitimate (someone hand-edited it, or an
  // older link). Fill the missing end generously rather than dropping the whole
  // filter — the server treats an absent bound as unbounded anyway.
  return [min ?? 0, max ?? Number.MAX_SAFE_INTEGER]
}

/** Read filter state out of a query string. Never throws: an unknown value is
 *  dropped, because a bad link must still render a board. */
export function parseFilters(params: URLSearchParams): BoardFilters {
  const sortRaw = params.get('sort') ?? ''

  return {
    q: (params.get('q') ?? '').slice(0, 140),
    area: splitList(params.get('area')),
    specialty: splitList(params.get('specialty')),
    group: splitList(params.get('group')),
    salon: splitList(params.get('salon')),
    payType: splitList(params.get('payType')).filter((v): v is PayType => oneOf(PAY_TYPES, v)),
    salary: readRange(params, 'salary'),
    rent: readRange(params, 'rent'),
    percent: readRange(params, 'percent'),
    experience: splitList(params.get('experience')).filter((v): v is Experience =>
      oneOf(EXPERIENCE_LEVELS, v),
    ),
    schedule: splitList(params.get('schedule')).filter((v): v is ScheduleType =>
      oneOf(SCHEDULE_TYPES, v),
    ),
    perks: splitList(params.get('perks')),
    sort: oneOf(SORTS, sortRaw) ? sortRaw : 'newest',
  }
}

/**
 * Serialize filter state to a query string, omitting everything at its
 * default.
 *
 * Omission is the point: an unfiltered board must be a bare URL, so the address
 * bar stays a readable summary of what the visitor did rather than a wall of
 * empty parameters.
 */
export function toSearchParams(f: BoardFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  for (const key of LIST_KEYS) {
    const list = f[key]
    if (list.length) p.set(key, list.join(','))
  }
  for (const key of RANGE_KEYS) {
    const range = f[key]
    if (!range) continue
    const [lo, hi] = RANGE_PARAMS[key]
    p.set(lo, String(range[0]))
    // MAX_SAFE_INTEGER is the internal stand-in for "open ended"; it should
    // never reach a URL or the server.
    if (range[1] < Number.MAX_SAFE_INTEGER) p.set(hi, String(range[1]))
  }
  if (f.sort !== 'newest') p.set('sort', f.sort)
  return p
}

/**
 * How many filters are active, for the "Filters (3)" button and to decide
 * whether "clear all" is offered.
 *
 * Each LIST counts once however many values it holds, because that is how a
 * person counts them: choosing three districts is one decision about location,
 * not three filters. Sort is excluded — it reorders, it does not filter.
 */
export function countActiveFilters(f: BoardFilters): number {
  let n = 0
  if (f.q.trim()) n += 1
  for (const key of LIST_KEYS) if (f[key].length) n += 1
  for (const key of RANGE_KEYS) if (f[key]) n += 1
  return n
}

/** Add or remove one value from a list filter. */
export function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** Reset everything except the sort order, which is a display preference and
 *  survives clearing a search. */
export function clearFilters(f: BoardFilters): BoardFilters {
  return { ...EMPTY_FILTERS, sort: f.sort }
}
