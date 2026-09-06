import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchX, SlidersHorizontal, UserRoundSearch } from 'lucide-react'
import { Button, Empty, Modal, Select } from '@reserva/ui'
import { searchSpecialists } from '@/api/directory.api'
import { SpecialistCard } from '@/components/directory/SpecialistCard/SpecialistCard'
import {
  ActiveSpecialistChips,
  SpecialistFilterPanel,
} from '@/components/directory/SpecialistFilterPanel/SpecialistFilterPanel'
import { SearchField } from '@/components/common/SearchField/SearchField'
import { Header } from '@/components/layout/Header/Header'
import { useT } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { useSeo } from '@/lib/useSeo'
import { useTaxonomy } from '@/lib/taxonomy'
import { useSpecialistFilters } from './useSpecialistFilters'
import s from './Specialists.module.scss'

const PAGE_SIZE = 12

/**
 * The specialist directory: salons looking for people.
 *
 * The mirror of the board, and deliberately built from the same parts — the
 * same key vocabularies, the same pickers, the same URL-as-store filters, and
 * now the same filter arrangement: a rail on a desktop, a sheet behind a button
 * on a phone, with ONE panel component rendered into both. Two search pages
 * that behaved differently would be two products sharing a domain.
 *
 * Where it differs is the filter set, and the omissions are the design. There
 * is no pay filter and no schedule filter, because those are properties of a
 * JOB; mirroring them onto a person would mean asking everyone to publish a
 * salary expectation in order to be findable at all, which is a worse deal than
 * it looks for the side of this market with less leverage.
 */
export function Specialists() {
  const t = useT()
  const { filters, activeCount, patch, setPage, clear } = useSpecialistFilters()
  const taxonomy = useTaxonomy()
  const [sheetOpen, setSheetOpen] = useState(false)

  useSeo({
    title: t('directory.seoTitle'),
    description: t('directory.seoDescription'),
    canonicalPath: '/specialists/',
  })

  const results = useAsync(
    (signal) => searchSpecialists(filters, signal, PAGE_SIZE),
    [
      // Primitive deps: the filters object is rebuilt on every URL read, so
      // depending on it directly would refetch on every render.
      filters.q,
      filters.specialty.join(','),
      filters.group.join(','),
      filters.area.join(','),
      filters.experienceMin,
      filters.withPhotos,
      filters.sort,
      filters.page,
    ],
    // Hold the current grid while the next one loads: dropping to skeletons on
    // every filter click collapses the page height and throws away the reader's
    // place, which is exactly what the scroll-safe URL write is protecting.
    { keepPrevious: true },
  )

  const sortOptions = useMemo(
    () => [
      { value: 'relevant', label: t('directory.sort.relevant') },
      { value: 'newest', label: t('directory.sort.newest') },
      { value: 'experience', label: t('directory.sort.experience') },
    ],
    [t],
  )

  const data = results.data
  const total = data?.total ?? 0
  const totalPages = data ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1

  const resultsRef = useRef<HTMLElement>(null)
  /**
   * The page number a turn is waiting on, or null when none is in flight.
   *
   * A number rather than a boolean, and compared against the page the SERVER
   * confirmed. A boolean plus `!loading` looked equivalent and was not: the
   * click re-renders before the fetch effect has run, so at that moment
   * `loading` is still false from the previous request and the guard passed
   * immediately — consuming the flag on the old grid and never firing on the
   * new one.
   */
  const turningTo = useRef<number | null>(null)

  /*
   * Put the top of the RESULTS just under the sticky header.
   *
   * Not the top of the document: the hero is a 400px band that has already been
   * read, and scrolling back through it on every page turn is its own
   * annoyance. The header's height is read from `--header-h` rather than
   * hardcoded, so the offset cannot drift from the header itself.
   */
  const scrollToResults = useCallback(() => {
    const el = resultsRef.current
    if (!el) return
    const headerH =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 60
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - 12
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
  }, [])

  /*
   * Turning a page takes you to the top of it.
   *
   * Measured before this existed: from the pager at scrollY 1535, clicking
   * "next" settled at 1083 — not because anything scrolled, but because page
   * two was shorter and the document simply clamped. Either way the reader
   * ended up at the BOTTOM of twelve results they had never seen.
   *
   * Scrolled TWICE, deliberately. The first call starts the moment the button
   * is pressed, so the response is immediate. But a smooth scroll is an
   * animation the browser abandons when the document resizes underneath it —
   * and that is exactly what happens a few hundred milliseconds later, when
   * twelve cards are replaced by seven and the page gets shorter. Measured: the
   * animation stopped dead at 1083 of a 350 target. So the effect below runs it
   * again once the new grid has rendered; if the first one survived, the second
   * is a no-op, and if it did not, this is the one that arrives.
   */
  const goToPage = useCallback(
    (page: number) => {
      turningTo.current = page
      setPage(page)
      scrollToResults()
    },
    [setPage, scrollToResults],
  )

  useEffect(() => {
    if (turningTo.current === null || results.loading) return
    // `data.page` is the page the server actually answered with, so this cannot
    // fire on the outgoing result set.
    if (data?.page !== turningTo.current) return
    turningTo.current = null

    /*
     * Two frames, not zero.
     *
     * An effect runs after React commits but before the browser has laid the
     * new grid out, so a smooth scroll started here is still racing the resize
     * that cancels it — measured as a page turn that stopped dead at 1083 of a
     * 350 target, intermittently, depending on how fast the request came back.
     * One frame gets us past the commit, the second past the layout, so by the
     * time the animation starts the document is its final height and nothing
     * interrupts it.
     */
    const raf = requestAnimationFrame(() => requestAnimationFrame(scrollToResults))
    return () => cancelAnimationFrame(raf)
  }, [results.loading, data?.page, scrollToResults])

  return (
    <>
      <Header />

      <div className={s.hero}>
        <div className={s.heroInner}>
          <p className={s.eyebrow}>{t('directory.eyebrow')}</p>
          <h1 className={s.title}>{t('directory.title')}</h1>
          <p className={s.lede}>{t('directory.lede')}</p>

          <div className={s.heroSearch}>
            <SearchField
              value={filters.q}
              onChange={(q) => patch({ q })}
              placeholder={t('directory.searchPlaceholder')}
              block
            />
          </div>
        </div>
      </div>

      <div className={s.page}>
        {/* Desktop rail. The same panel is rendered into the sheet below, so the
            two layouts cannot offer different filters. */}
        <aside className={s.rail} aria-label={t('filters.title')}>
          <div className={s.railHead}>
            <span className={s.railTitle}>{t('filters.title')}</span>
            {activeCount > 0 && (
              <button type="button" className={s.railClear} onClick={clear}>
                {t('filters.clearAll')}
              </button>
            )}
          </div>
          <SpecialistFilterPanel filters={filters} patch={patch} taxonomy={taxonomy} />
        </aside>

        <main className={s.results} ref={resultsRef}>
          <div className={s.toolbar}>
            <p className={s.count}>
              {results.loading && !data ? t('results.loading') : t('directory.count', { count: total })}
            </p>

            <div className={s.tools}>
              {/* Mobile only — on desktop the rail is permanently visible, so a
                  button to open it would open something already on screen. */}
              <button type="button" className={s.filterButton} onClick={() => setSheetOpen(true)}>
                <SlidersHorizontal size={14} />
                {activeCount > 0 ? t('filters.openWithCount', { count: activeCount }) : t('filters.open')}
              </button>

              <div className={s.sort} role="group" aria-label={t('sort.label')}>
                <Select
                  value={filters.sort}
                  options={sortOptions}
                  onChange={(sort) => patch({ sort: sort as typeof filters.sort })}
                  size="sm"
                  searchable={false}
                  panelMinWidth={200}
                />
              </div>
            </div>
          </div>

          {/* What is currently narrowing the list. Load-bearing on a phone,
              where the panel itself is hidden behind a button. */}
          <ActiveSpecialistChips filters={filters} patch={patch} taxonomy={taxonomy} />

          {results.loading && !data ? (
            <ul className={s.grid} aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className={s.skeleton} />
              ))}
            </ul>
          ) : results.error ? (
            <Empty icon={SearchX} title={t('results.errorTitle')} description={t('results.errorBody')} />
          ) : !data?.items.length ? (
            <Empty
              icon={UserRoundSearch}
              title={t('directory.emptyTitle')}
              description={activeCount > 0 ? t('directory.emptyFiltered') : t('directory.emptyBody')}
              action={
                activeCount > 0 ? (
                  <Button onClick={clear}>{t('filters.clearAll')}</Button>
                ) : (
                  <Link to="/">
                    <Button variant="accent">{t('landing.emptyAction')}</Button>
                  </Link>
                )
              }
            />
          ) : (
            <>
              <ul className={s.grid}>
                {data.items.map((card) => (
                  <li key={card.id}>
                    <SpecialistCard
                      card={card}
                      specialties={taxonomy.specialtyNames(card.specialtyKeys)}
                      areas={taxonomy.areaNames(card.areaKeys)}
                    />
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <nav className={s.pager} aria-label={t('directory.pagination')}>
                  <Button onClick={() => goToPage(filters.page - 1)} disabled={filters.page <= 1}>
                    {t('directory.prev')}
                  </Button>
                  <span className={s.pageOf}>
                    {t('directory.pageOf', { page: filters.page, total: totalPages })}
                  </span>
                  <Button onClick={() => goToPage(filters.page + 1)} disabled={filters.page >= totalPages}>
                    {t('directory.next')}
                  </Button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>

      {/* The shared Modal becomes a bottom sheet at 768px and under, so the
          mobile filter experience is the platform's own sheet rather than a
          second layout to maintain. */}
      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('filters.title')}
        /* Buttons handed to the Modal's own footer slot rather than wrapped in
           a row of our own — below 768px the footer becomes a column and sizes
           each BUTTON to full width, and a wrapper between them would collapse
           to shrink-to-fit and push the long Armenian label past both edges. */
        footer={
          <>
            {activeCount > 0 && (
              <Button variant="ghost" onClick={clear}>
                {t('filters.clearAll')}
              </Button>
            )}
            <Button variant="accent" onClick={() => setSheetOpen(false)}>
              {total > 0 ? t('filters.apply', { count: total }) : t('filters.applyNone')}
            </Button>
          </>
        }
      >
        <SpecialistFilterPanel filters={filters} patch={patch} taxonomy={taxonomy} />
      </Modal>
    </>
  )
}
