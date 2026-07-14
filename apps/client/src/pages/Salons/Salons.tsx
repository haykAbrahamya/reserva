import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { Search, Scissors, MapPin, X, SearchX, Sparkles, Loader2, SlidersHorizontal, ArrowUpDown, Navigation } from 'lucide-react'
import { Select } from '@reserva/ui'
import { Logo } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { listSalons, type SalonCard as Salon } from '@/services/salons.service'
import { useGeolocation } from '@/hooks/useGeolocation'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { distanceKm, type LatLng } from '@/lib/geo'
import { useSeo } from '@/hooks/useSeo'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { useT } from '@/i18n'
import { categoryBySlug } from '@/lib/categories'
import { SalonCard } from './SalonCard'
import s from './Salons.module.scss'

interface Filters { q: string; service: string; location: string }
const EMPTY: Filters = { q: '', service: '', location: '' }

type SortKey = 'rating' | 'name' | 'services' | 'nearest'

/** Distance (km) from the user to a salon's NEAREST located branch, or null if
 *  the user position is unknown or the salon has no coordinates. */
function salonDistanceKm(salon: Salon, me: LatLng | null): number | null {
  if (!me) return null
  const dists = salon.locations
    .filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number')
    .map((l) => distanceKm(me, { lat: l.lat as number, lng: l.lng as number }))
  return dists.length ? Math.min(...dists) : null
}

/** Read filters from the URL query string. */
function filtersFromParams(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    service: params.get('service') ?? '',
    location: params.get('location') ?? '',
  }
}

/** Serialize non-empty filters to a URLSearchParams (stable key order). */
function paramsFromFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  if (f.service.trim()) p.set('service', f.service.trim())
  if (f.location.trim()) p.set('location', f.location.trim())
  return p
}

export function Salons() {
  const t = useT()
  useScrollToTop()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { category: categorySlug } = useParams()

  // On a /salons/c/<slug> landing page this resolves the curated category (H1,
  // keyword title/description, and the DB term to pre-filter by). undefined on
  // the plain /salons directory.
  const seoCategory = categorySlug ? categoryBySlug(categorySlug) : undefined

  // Seed filters from the URL so returning to /salons?q=… restores the search.
  // A category landing page pre-seeds the service filter from its curated term.
  const [filters, setFilters] = useState<Filters>(() =>
    seoCategory
      ? { ...EMPTY, service: seoCategory.match }
      : filtersFromParams(searchParams),
  )
  const [salons, setSalons] = useState<Salon[] | null>(null)
  // First-load skeletons vs. re-search: on re-search we KEEP the current results
  // on screen (no grid teardown) and show a subtle inline spinner instead, so
  // typing never tears down the layout — that was the "drag".
  const [initialLoading, setInitialLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(false)
  // Mobile: the search lives in a focused full-screen sheet rather than three
  // cramped rows in the hero.
  const [sheetOpen, setSheetOpen] = useState(false)
  // Sort of the displayed list (client-side, instant). Defaults to name —
  // "Top rated" is only meaningful once real ratings exist.
  const [sort, setSort] = useState<SortKey>('name')
  // "Near me" — geolocation-driven distance + nearest sort.
  const geo = useGeolocation()
  // Distinct categories captured from the FIRST unfiltered load, so the quick
  // chips stay stable even after the result set narrows.
  const [allCategories, setAllCategories] = useState<string[]>([])

  const hasSearch = !!(filters.q || filters.service || filters.location)
  // Compact summary of active filters for the mobile trigger pill.
  const activeTerms = [filters.q, filters.service, filters.location].filter((v) => v.trim())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runFetch = useCallback((f: Filters, isInitial = false) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    if (isInitial) setInitialLoading(true)
    else setSearching(true)
    setError(false)
    listSalons(f, ctrl.signal)
      .then((data) => {
        setSalons(data)
        setInitialLoading(false)
        setSearching(false)
        // Seed the quick-filter chips from the first unfiltered load only.
        if (isInitial) {
          const cats = Array.from(new Set(data.flatMap((sl) => sl.categories)))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
          setAllCategories(cats)
        }
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return
        setError(true); setInitialLoading(false); setSearching(false)
      })
  }, [])

  // Initial load — fetch with whatever seeded the filters (a category landing
  // page pre-filters by its term; the plain directory restores the URL search).
  useEffect(() => {
    runFetch(filters, true)
    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runFetch, seoCategory])

  // Reflect filters into the URL (replace, so Back returns to the previous page,
  // not through every keystroke). Coming back to this URL restores the search.
  const syncUrl = (f: Filters) => {
    setSearchParams(paramsFromFilters(f), { replace: true })
  }

  // Debounced search whenever filters change. The input updates instantly; the
  // network call + URL write are debounced together.
  const update = (patch: Partial<Filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => { runFetch(next); syncUrl(next) }, 350)
      return next
    })
  }

  const clearAll = () => {
    setFilters(EMPTY)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    runFetch(EMPTY)
    syncUrl(EMPTY)
  }


  const openSalon = useCallback((slug: string) => navigate(`/p/${slug}`), [navigate])

  // "Near me" reactions: switch to nearest sort once we have a position; revert
  // away from nearest if location is cleared/denied.
  const located = geo.status === 'granted' && !!geo.coords
  useEffect(() => { if (located) setSort('nearest') }, [located])
  useEffect(() => { if (!located && sort === 'nearest') setSort('name') }, [located, sort])

  // Only offer "Top rated" once at least one salon has a real rating.
  const hasRatings = useMemo(() => !!salons?.some((s) => s.rating > 0), [salons])
  // If ratings vanish (data without ratings) but we're sorted by them, fall back.
  useEffect(() => { if (!hasRatings && sort === 'rating') setSort('name') }, [hasRatings, sort])

  // Precompute each salon's distance (km) to the user's nearest branch.
  const distances = useMemo(() => {
    const map = new Map<string, number | null>()
    if (salons) for (const sl of salons) map.set(sl.id, salonDistanceKm(sl, geo.coords))
    return map
  }, [salons, geo.coords])

  // Sorted view of the loaded salons (sort is purely client-side).
  const sortedSalons = useMemo(() => {
    if (!salons) return null
    const copy = [...salons]
    if (sort === 'rating') copy.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    else if (sort === 'name') copy.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'services') copy.sort((a, b) => b.serviceCount - a.serviceCount)
    else if (sort === 'nearest') {
      // Salons with a known distance first (ascending); unlocated ones sink.
      copy.sort((a, b) => {
        const da = distances.get(a.id), db = distances.get(b.id)
        if (da == null && db == null) return 0
        if (da == null) return 1
        if (db == null) return -1
        return da - db
      })
    }
    return copy
  }, [salons, sort, distances])

  const count = salons?.length ?? 0

  // ── SEO ── directory vs. keyword-category landing page.
  const SITE = 'https://reserva.am'
  const seoPath = seoCategory ? `/salons/c/${seoCategory.slug}` : '/salons'
  const seoTitle = seoCategory ? `${seoCategory.title} | Reserva` : t('seo.salons.title')
  const seoDescription = seoCategory ? seoCategory.description : t('seo.salons.description')

  // CollectionPage + BreadcrumbList + an ItemList of the (loaded) salons, so a
  // category page ships rich structured data Google can turn into a list result.
  const seoJsonLd = useMemo(() => {
    const url = `${SITE}${seoPath}`
    const breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Reserva', item: SITE },
        { '@type': 'ListItem', position: 2, name: t('salons.hero.title'), item: `${SITE}/salons` },
        ...(seoCategory
          ? [{ '@type': 'ListItem', position: 3, name: seoCategory.h1, item: url }]
          : []),
      ],
    }
    const itemList = sortedSalons && sortedSalons.length
      ? {
          '@type': 'ItemList',
          itemListElement: sortedSalons.slice(0, 20).map((sl, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: sl.slug ? `${SITE}/p/${sl.slug}` : undefined,
            name: sl.name,
          })),
        }
      : undefined
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: seoCategory ? seoCategory.h1 : t('salons.hero.title'),
      description: seoDescription,
      url,
      breadcrumb,
      ...(itemList ? { mainEntity: itemList } : {}),
    }
  }, [seoPath, seoCategory, seoDescription, sortedSalons, t])

  useSeo({ title: seoTitle, description: seoDescription, path: seoPath, jsonLd: seoJsonLd })

  // A category chip is "active" when it's the current service filter.
  const activeCategory = filters.service.trim().toLowerCase()
  const toggleCategory = (cat: string) => {
    const next = activeCategory === cat.toLowerCase() ? '' : cat
    update({ service: next })
  }

  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <header className={s.nav}>
        <div className={s.navInner}>
          <a href="/" className={s.brand}><Logo size={30} /></a>
          <div className={s.navActions}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Hero + search ── */}
      <section className={s.hero}>
        <div className={s.heroWash} />
        <div className={s.heroInner}>
          <span className={s.eyebrow}><Sparkles size={13} /> {t('salons.hero.eyebrow')}</span>
          <h1 className={s.title}>{seoCategory ? seoCategory.h1 : t('salons.hero.title')}</h1>
          <p className={s.subtitle}>{seoCategory ? seoCategory.intro : t('salons.hero.subtitle')}</p>

          {/* ── Desktop: inline 3-field search bar ── */}
          <div className={s.searchBar}>
            <div className={s.field}>
              <Search size={17} className={s.fieldIcon} />
              <input
                className={s.input}
                placeholder={t('salons.search.name')}
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
              />
            </div>
            <span className={s.fieldDivider} />
            <div className={s.field}>
              <Scissors size={16} className={s.fieldIcon} />
              <input
                className={s.input}
                placeholder={t('salons.search.service')}
                value={filters.service}
                onChange={(e) => update({ service: e.target.value })}
              />
            </div>
            <span className={s.fieldDivider} />
            <div className={s.field}>
              <MapPin size={16} className={s.fieldIcon} />
              <input
                className={s.input}
                placeholder={t('salons.search.location')}
                value={filters.location}
                onChange={(e) => update({ location: e.target.value })}
              />
            </div>
            {hasSearch && (
              <button className={s.clearBtn} onClick={clearAll} aria-label={t('salons.search.clear')}>
                <X size={16} /> <span className={s.clearLabel}>{t('salons.search.clear')}</span>
              </button>
            )}
          </div>

          {/* ── Mobile: single trigger pill → opens the full-screen sheet ── */}
          <button className={s.searchTrigger} onClick={() => setSheetOpen(true)}>
            <span className={s.triggerIcon}><Search size={18} /></span>
            <span className={s.triggerText}>
              {activeTerms.length > 0 ? (
                <span className={s.triggerActive}>{activeTerms.join(' · ')}</span>
              ) : (
                <>
                  <span className={s.triggerMain}>{t('salons.search.triggerMain')}</span>
                  <span className={s.triggerSub}>{t('salons.search.triggerSub')}</span>
                </>
              )}
            </span>
            <span className={s.triggerBtn}><SlidersHorizontal size={16} /></span>
          </button>
        </div>
      </section>

      {/* ── Mobile search sheet (portaled via ModalShell) ── */}
      <ModalShell open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {({ closing, requestClose }) => (
        <div className={[s.sheet, closing ? s.closing : ''].filter(Boolean).join(' ')} role="dialog" aria-modal="true">
          <div className={s.sheetScrim} onClick={requestClose} />
          <div className={s.sheetPanel}>
            <div className={s.sheetHandle} />
            <div className={s.sheetHead}>
              <h2 className={s.sheetTitle}>{t('salons.search.sheetTitle')}</h2>
              <button className={s.sheetClose} onClick={requestClose} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            <div className={s.sheetFields}>
              <label className={s.sheetField}>
                <span className={s.sheetIcon}><Search size={18} /></span>
                <span className={s.sheetFieldBody}>
                  <span className={s.sheetLabel}>{t('salons.search.nameLabel')}</span>
                  <input
                    className={s.sheetInput}
                    autoFocus
                    placeholder={t('salons.search.name')}
                    value={filters.q}
                    onChange={(e) => update({ q: e.target.value })}
                  />
                </span>
              </label>
              <label className={s.sheetField}>
                <span className={s.sheetIcon}><Scissors size={17} /></span>
                <span className={s.sheetFieldBody}>
                  <span className={s.sheetLabel}>{t('salons.search.serviceLabel')}</span>
                  <input
                    className={s.sheetInput}
                    placeholder={t('salons.search.service')}
                    value={filters.service}
                    onChange={(e) => update({ service: e.target.value })}
                  />
                </span>
              </label>
              <label className={s.sheetField}>
                <span className={s.sheetIcon}><MapPin size={17} /></span>
                <span className={s.sheetFieldBody}>
                  <span className={s.sheetLabel}>{t('salons.search.locationLabel')}</span>
                  <input
                    className={s.sheetInput}
                    placeholder={t('salons.search.location')}
                    value={filters.location}
                    onChange={(e) => update({ location: e.target.value })}
                  />
                </span>
              </label>
            </div>

            <div className={s.sheetFoot}>
              {hasSearch && (
                <button className={s.sheetClear} onClick={clearAll}>
                  {t('salons.search.clear')}
                </button>
              )}
              <button className={s.sheetSubmit} onClick={requestClose}>
                <Search size={16} />
                {searching
                  ? t('salons.results.searching')
                  : t('salons.search.showResults', { count })}
              </button>
            </div>
          </div>
        </div>
        )}
      </ModalShell>

      {/* ── Category quick filters ── */}
      {!initialLoading && !error && allCategories.length > 0 && (
        <div className={s.categories}>
          <div className={s.categoriesInner}>
            <button
              className={[s.catChip, !activeCategory ? s.catChipActive : ''].filter(Boolean).join(' ')}
              onClick={() => update({ service: '' })}
            >
              {t('salons.categories.all')}
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                className={[s.catChip, activeCategory === cat.toLowerCase() ? s.catChipActive : ''].filter(Boolean).join(' ')}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <section className={s.results}>
        <div className={s.resultsInner}>
          {/* Result header */}
          <div className={s.resultHead}>
            <h2 className={s.resultTitle}>
              {hasSearch ? t('salons.results.searchTitle') : t('salons.results.allTitle')}
            </h2>
            {!initialLoading && !error && (
              <span className={s.resultCount}>
                {hasSearch
                  ? t('salons.results.found', { count })
                  : t('salons.results.total', { count })}
              </span>
            )}
            {/* Subtle inline indicator — appears during re-search without tearing
                down the results below. */}
            {searching && !initialLoading && (
              <span className={s.searchingTag}><Loader2 size={13} className={s.searchingSpin} /> {t('salons.results.searching')}</span>
            )}

            {/* Controls: Near me + Sort */}
            {!initialLoading && !error && count > 0 && (
              <div className={s.controls}>
                {geo.supported && (
                  <button
                    className={[s.nearBtn, located ? s.nearBtnOn : ''].filter(Boolean).join(' ')}
                    onClick={() => (located ? geo.clear() : geo.request())}
                    disabled={geo.status === 'loading'}
                    title={geo.status === 'denied' ? t('salons.near.denied') : undefined}
                  >
                    {geo.status === 'loading'
                      ? <Loader2 size={14} className={s.searchingSpin} />
                      : <Navigation size={14} />}
                    {located ? t('salons.near.on') : t('salons.near.button')}
                  </button>
                )}

                {count > 1 && (
                  <div className={s.sort}>
                    <ArrowUpDown size={14} className={s.sortIcon} />
                    <span className={s.sortLabel}>{t('salons.sort.label')}</span>
                    <Select
                      size="sm"
                      value={sort}
                      onChange={(v) => setSort(v as SortKey)}
                      panelMinWidth={180}
                      options={[
                        ...(located ? [{ value: 'nearest', label: t('salons.sort.nearest') }] : []),
                        ...(hasRatings ? [{ value: 'rating', label: t('salons.sort.rating') }] : []),
                        { value: 'name', label: t('salons.sort.name') },
                        { value: 'services', label: t('salons.sort.services') },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* First-load skeletons (only on initial mount) */}
          {initialLoading && (
            <div className={s.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={s.skeleton} style={{ animationDelay: `${i * 0.06}s` }} />
              ))}
            </div>
          )}

          {/* Error */}
          {!initialLoading && error && (
            <div className={s.empty}>
              <SearchX size={40} className={s.emptyIcon} />
              <h3 className={s.emptyTitle}>{t('salons.error.title')}</h3>
              <p className={s.emptyText}>{t('salons.error.text')}</p>
              <button className={s.retryBtn} onClick={() => runFetch(filters)}>{t('salons.error.retry')}</button>
            </div>
          )}

          {/* Empty */}
          {!initialLoading && !error && count === 0 && (
            <div className={s.empty}>
              <SearchX size={40} className={s.emptyIcon} />
              <h3 className={s.emptyTitle}>
                {hasSearch ? t('salons.empty.searchTitle') : t('salons.empty.allTitle')}
              </h3>
              <p className={s.emptyText}>
                {hasSearch ? t('salons.empty.searchText') : t('salons.empty.allText')}
              </p>
              {hasSearch && (
                <button className={s.retryBtn} onClick={clearAll}>{t('salons.empty.clear')}</button>
              )}
            </div>
          )}

          {/* Grid — stays mounted during re-search; dims slightly while searching */}
          {!initialLoading && !error && count > 0 && (
            <div className={[s.grid, searching ? s.gridSearching : ''].filter(Boolean).join(' ')}>
              {sortedSalons!.map((salon) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  isResult={hasSearch}
                  query={filters.q || filters.service || filters.location}
                  distanceKm={distances.get(salon.id) ?? null}
                  onOpen={openSalon}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <Logo size={28} />
            <p className={s.footerTagline}>{t('salons.footer.tagline')}</p>
          </div>
          <nav className={s.footerLinks}>
            <a href="/" className={s.footerLink}>{t('salons.footer.home')}</a>
            <a href="/signup" className={s.footerLink}>{t('salons.footer.forSalons')}</a>
          </nav>
        </div>
        <div className={s.footerBottom}>
          <span>{t('salons.footer.copyright', { year: new Date().getFullYear() })}</span>
        </div>
      </footer>
    </div>
  )
}
