import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, SearchX, SlidersHorizontal } from 'lucide-react'
import { Button, Empty, Modal, Select } from '@reserva/ui'
import { fetchMeta, fetchVacancies } from '@/api/board.api'
import type { VacancyCard as Card } from '@/api/types'
import { ActiveFilters } from '@/components/filters/ActiveFilters/ActiveFilters'
import { FilterPanel } from '@/components/filters/FilterPanel/FilterPanel'
import { VacancyList, VacancyListSkeleton } from '@/components/board/VacancyList/VacancyList'
import { SearchField } from '@/components/common/SearchField/SearchField'
import { Header } from '@/components/layout/Header/Header'
import { useLocalized, useT } from '@/i18n'
import { describeFilters } from '@/lib/describeFilters'
import { SORTS, toSearchParams, type SortKey } from '@/lib/filters'
import { useAsync } from '@/lib/useAsync'
import { useFilters } from '@/lib/useFilters'
import { useSeo } from '@/lib/useSeo'
import { BoardHero } from './BoardHero'
import s from './Board.module.scss'

const PAGE_SIZE = 12

/**
 * The board.
 *
 * Two data sources with deliberately different lifetimes. The META (taxonomies,
 * facet counts, money bounds) is fetched ONCE and cached by HTTP — it describes
 * the board, not the query, so refetching it per filter change would be a
 * second request for an answer that has not changed. The LIST is refetched
 * whenever the filters change, which is what the URL already encodes.
 *
 * Pages ACCUMULATE rather than replace, because "load more" is the right
 * gesture for a feed: numbered pagination on a board asks the visitor to
 * remember which page had the good listing. The accumulator resets whenever the
 * query changes, keyed on the serialized filters — deriving that key from the
 * same function the URL uses means the reset can never miss a filter someone
 * added later.
 */
export function Board() {
  const t = useT()
  const loc = useLocalized()
  const control = useFilters()
  const { filters, activeCount, patch, clear } = control

  const [page, setPage] = useState(1)
  const [accumulated, setAccumulated] = useState<Card[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)

  // The identity of the current query. Anything that changes it starts the
  // results over.
  const queryKey = useMemo(() => toSearchParams(filters).toString(), [filters])

  /*
   * A new query resets the PAGE but deliberately does NOT clear the results.
   *
   * This was the cause of the page lurching on every filter click. Emptying the
   * list here produced one render with nothing in it, so the results column
   * collapsed to its minimum height and the browser clamped the scroll
   * position — then the response arrived, the column grew back, and the whole
   * page appeared to jump.
   *
   * Leaving the previous results in place means the swap happens in a single
   * render: the old list stays visible (dimmed by `refreshing`) and is replaced
   * by the new one, which the append effect below does whenever it receives
   * page 1. The height barely moves and the reader keeps their place.
   */
  useEffect(() => {
    setPage(1)
  }, [queryKey])

  /*
   * Nothing scrolls the page on a filter change, deliberately.
   *
   * An earlier version anchored the results to just under the header whenever
   * the query changed. Measured, that turned out to be the WORSE behaviour: it
   * produced a 650px jump on the first click from a scrolled position, where
   * simply reserving a viewport of height in the results column (see
   * Board.module.scss) produced no movement at all. The reserved height stops
   * the document from shrinking below the scroll offset, so the browser never
   * clamps and there is nothing to correct.
   *
   * Route changes DO scroll to the top — that is `useScrollTop`, keyed on the
   * pathname only, so it never fires for a query-string rewrite.
   */

  const meta = useAsync((signal) => fetchMeta(signal), [], { keepPrevious: true })

  const results = useAsync(
    (signal) => fetchVacancies(filters, page, PAGE_SIZE, signal),
    [queryKey, page],
    { keepPrevious: true },
  )

  // Append each page as it lands. Guarded against duplicate ids because a
  // listing published between two page fetches shifts the offset window, and an
  // unguarded append would render the same card twice.
  useEffect(() => {
    const data = results.data
    if (!data) return
    setAccumulated((prev) => {
      if (data.page === 1) return data.items
      const seen = new Set(prev.map((v) => v.id))
      return [...prev, ...data.items.filter((v) => !seen.has(v.id))]
    })
  }, [results.data])

  const chips = useMemo(
    () => describeFilters({ filters, meta: meta.data, loc, t, patch }),
    [filters, meta.data, loc, t, patch],
  )

  const total = results.data?.total ?? 0
  const hasMore = accumulated.length < total
  const coldLoading = results.loading && accumulated.length === 0

  const loadMore = useCallback(() => setPage((p) => p + 1), [])

  const sortOptions = SORTS.map((key) => ({ value: key, label: t(`sort.${key}`) }))

  /*
   * A FILTERED board is deliberately kept out of the index: every filter
   * combination is a distinct URL over near-identical content, and crawling
   * them would spend on duplicates the budget the listing pages need. The bare
   * board is indexed.
   */
  useSeo({
    title: `${t('hero.title')} — ${t('app.name')} ${t('app.product')}`,
    description: t('hero.subtitle'),
    canonicalPath: '/',
    noIndex: activeCount > 0,
  })

  const resultsBody = () => {
    if (results.error && accumulated.length === 0) {
      return (
        <Empty
          icon={AlertTriangle}
          title={t('results.errorTitle')}
          description={t('results.errorBody')}
          action={
            <Button variant="accent" onClick={() => setPage(1)}>
              {t('results.retry')}
            </Button>
          }
        />
      )
    }

    if (coldLoading) return <VacancyListSkeleton />

    if (accumulated.length === 0) {
      // Two different empties. "Nothing matches your filters" is actionable;
      // "no listings yet" is not, and offering to clear filters that are not
      // set would be nonsense.
      const filtered = activeCount > 0
      return (
        <Empty
          icon={SearchX}
          title={filtered ? t('results.emptyTitle') : t('results.emptyBoardTitle')}
          description={filtered ? t('results.emptyBody') : t('results.emptyBoardBody')}
          action={
            filtered ? (
              <Button variant="accent" onClick={clear}>
                {t('results.emptyAction')}
              </Button>
            ) : undefined
          }
        />
      )
    }

    return (
      <>
        <VacancyList items={accumulated} refreshing={results.loading} />
        {hasMore ? (
          <div className={s.more}>
            <Button onClick={loadMore} disabled={results.loading}>
              {results.loading ? t('results.loadingMore') : t('results.loadMore')}
            </Button>
          </div>
        ) : (
          accumulated.length > PAGE_SIZE && <p className={s.allShown}>{t('results.allShown')}</p>
        )}
      </>
    )
  }

  return (
    <>
      {/* One SearchField node, handed to the header, which renders it in the
          wide slot or the narrow row depending on width — so there is never a
          second instance holding a different draft. */}
      <Header search={<SearchField value={filters.q} onChange={(q) => patch({ q })} />} />

      <BoardHero meta={meta.data} loading={meta.loading} control={control} />

      <div className={s.body}>
        {/* Desktop rail. One FilterPanel instance is rendered here and another
            in the sheet below — same component, so the two layouts cannot
            offer different filters. */}
        <aside className={s.rail} aria-label={t('a11y.filterPanel')}>
          <div className={s.railPanel}>
            {/* The rail is a titled panel rather than bare text on the page.
                Without the frame the sections read as unstyled labels, and the
                clear-all has nowhere to live that is not next to a filter it
                would be mistaken for. */}
            <div className={s.railHead}>
              <span className={s.railTitle}>{t('filters.title')}</span>
              {activeCount > 0 && (
                <button type="button" className={s.railClear} onClick={clear}>
                  {t('filters.clearAll')}
                </button>
              )}
            </div>
            <div className={s.railBody}>
              <FilterPanel meta={meta.data} control={control} />
            </div>
          </div>
        </aside>

        <main className={s.results} id="results" aria-label={t('a11y.results')}>
          <div className={s.toolbar}>
            <div className={s.count}>
              {results.loading && accumulated.length === 0
                ? t('results.loading')
                : t('results.count', { count: total })}
            </div>

            <div className={s.tools}>
              {/* Mobile only — on desktop the rail is always visible. */}
              <button
                type="button"
                className={s.filterButton}
                onClick={() => setSheetOpen(true)}
              >
                <SlidersHorizontal size={14} />
                {activeCount > 0 ? t('filters.openWithCount', { count: activeCount }) : t('filters.open')}
              </button>

              {/* Select carries no label prop, so the group around it does the
                  naming — a bare sort control announces only its value. */}
              <div className={s.sort} role="group" aria-label={t('sort.label')}>
                <Select
                  value={filters.sort}
                  options={sortOptions}
                  onChange={(v) => patch({ sort: v as SortKey })}
                  size="sm"
                  searchable={false}
                  panelMinWidth={196}
                />
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <div className={s.chips}>
              <ActiveFilters chips={chips} onClearAll={clear} />
            </div>
          )}

          {resultsBody()}
        </main>
      </div>

      {/* The shared Modal becomes a bottom sheet at 768px and under, so the
          mobile filter experience is the platform's own sheet rather than a
          second layout to maintain. */}
      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('filters.title')}
        footer={
          <div className={s.sheetFooter}>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={clear}>
                {t('filters.clearAll')}
              </Button>
            )}
            <Button variant="accent" onClick={() => setSheetOpen(false)}>
              {total > 0 ? t('filters.apply', { count: total }) : t('filters.applyNone')}
            </Button>
          </div>
        }
      >
        <FilterPanel meta={meta.data} control={control} />
      </Modal>

      {/* Announced for screen readers, which otherwise get no signal that a
          filter changed the result count. */}
      <span className={s.srOnly} role="status" aria-live="polite">
        {t('results.count', { count: total })}
      </span>
    </>
  )
}
