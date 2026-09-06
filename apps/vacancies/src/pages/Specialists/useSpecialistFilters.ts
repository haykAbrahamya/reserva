import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  EMPTY_SPECIALIST_FILTERS,
  activeSpecialistFilterCount,
  type SpecialistFilters,
  type SpecialistSort,
} from '@/api/directory.api'
import { useScrollSafeSetParams } from '@/lib/useScrollSafeParams'

const SORTS: SpecialistSort[] = ['relevant', 'newest', 'experience']

/** `?k=a,b` and `?k=a&k=b` both, matching how the API parses them. */
function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.getAll(key).flatMap((v) => v.split(','))
  return [...new Set(raw.map((v) => v.trim()).filter(Boolean))]
}

function parse(params: URLSearchParams): SpecialistFilters {
  const years = Number(params.get('experienceMin'))
  return {
    q: params.get('q') ?? '',
    specialty: readList(params, 'specialty'),
    group: readList(params, 'group'),
    area: readList(params, 'area'),
    // An unparseable or negative value is treated as absent rather than as
    // zero: a hand-edited URL should degrade to "no filter", not to one that
    // silently excludes nobody while looking active in the panel.
    experienceMin: Number.isFinite(years) && years > 0 ? Math.min(60, Math.trunc(years)) : null,
    withPhotos: params.get('withPhotos') === 'true',
    sort: SORTS.includes(params.get('sort') as SpecialistSort)
      ? (params.get('sort') as SpecialistSort)
      : 'relevant',
    page: Math.max(1, Number(params.get('page')) || 1),
  }
}

function write(f: SpecialistFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.specialty.length) p.set('specialty', f.specialty.join(','))
  if (f.group.length) p.set('group', f.group.join(','))
  if (f.area.length) p.set('area', f.area.join(','))
  if (f.experienceMin != null) p.set('experienceMin', String(f.experienceMin))
  if (f.withPhotos) p.set('withPhotos', 'true')
  if (f.sort !== 'relevant') p.set('sort', f.sort)
  if (f.page > 1) p.set('page', String(f.page))
  return p
}

export interface UseSpecialistFilters {
  filters: SpecialistFilters
  activeCount: number
  patch: (part: Partial<SpecialistFilters>) => void
  /**
   * Turn to a page.
   *
   * Separate from `patch` because it is a different KIND of change. Narrowing a
   * filter should leave the reader exactly where they were; turning a page
   * should take them to the top of the new one — they have just asked for
   * twelve listings they have never seen, and leaving them at the bottom of the
   * page means scrolling back up past all of them first.
   */
  setPage: (page: number) => void
  clear: () => void
}

/**
 * Directory filters, read from and written to the URL.
 *
 * The same arrangement the board uses, for the same reason: a filtered search
 * is a thing people send to a colleague, and state that lives only in React
 * cannot be sent anywhere. Deriving from the URL rather than mirroring it in
 * state keeps one source of truth, so a pasted link and a click on a chip
 * produce byte-identical results.
 */
export function useSpecialistFilters(): UseSpecialistFilters {
  const [params] = useSearchParams()
  const writeParams = useScrollSafeSetParams()

  const filters = useMemo(() => parse(params), [params])

  const patch = useCallback(
    (part: Partial<SpecialistFilters>) => {
      const next = { ...filters, ...part }
      /*
       * Any change other than the page itself returns to page 1.
       *
       * Otherwise narrowing a search while on page 3 lands on an empty page —
       * which reads as "no specialists match", when in fact there were plenty
       * two screens back.
       */
      if (!('page' in part)) next.page = 1
      writeParams(write(next))
    },
    [filters, writeParams],
  )

  const setPage = useCallback(
    (page: number) => {
      // No scroll hold: the caller scrolls to the top of the results instead.
      writeParams(write({ ...filters, page }), { preserveScroll: false })
    },
    [filters, writeParams],
  )

  const clear = useCallback(
    () => writeParams(write({ ...EMPTY_SPECIALIST_FILTERS, sort: filters.sort })),
    [filters.sort, writeParams],
  )

  return {
    filters,
    activeCount: activeSpecialistFilterCount(filters),
    patch,
    setPage,
    clear,
  }
}
