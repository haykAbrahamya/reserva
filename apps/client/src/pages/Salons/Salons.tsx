import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Scissors, MapPin, X, SearchX, Sparkles, Loader2, SlidersHorizontal } from 'lucide-react'
import { Logo } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { listSalons, type SalonCard as Salon } from '@/services/salons.service'
import { useT } from '@/i18n'
import { SalonCard } from './SalonCard'
import s from './Salons.module.scss'

interface Filters { q: string; service: string; location: string }
const EMPTY: Filters = { q: '', service: '', location: '' }

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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Seed filters from the URL so returning to /salons?q=… restores the search.
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams))
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
      .then((data) => { setSalons(data); setInitialLoading(false); setSearching(false) })
      .catch((e) => {
        if (e?.name === 'AbortError') return
        setError(true); setInitialLoading(false); setSearching(false)
      })
  }, [])

  // Initial load — fetch with whatever the URL seeded (restores prior search).
  useEffect(() => {
    runFetch(filtersFromParams(searchParams), true)
    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runFetch])

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

  // Lock background scroll while the mobile search sheet is open.
  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [sheetOpen])

  const openSalon = useCallback((slug: string) => navigate(`/p/${slug}`), [navigate])
  const count = salons?.length ?? 0

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
          <h1 className={s.title}>{t('salons.hero.title')}</h1>
          <p className={s.subtitle}>{t('salons.hero.subtitle')}</p>

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

      {/* ── Mobile search sheet ── */}
      {sheetOpen && (
        <div className={s.sheet} role="dialog" aria-modal="true">
          <div className={s.sheetScrim} onClick={() => setSheetOpen(false)} />
          <div className={s.sheetPanel}>
            <div className={s.sheetHandle} />
            <div className={s.sheetHead}>
              <h2 className={s.sheetTitle}>{t('salons.search.sheetTitle')}</h2>
              <button className={s.sheetClose} onClick={() => setSheetOpen(false)} aria-label={t('common.close')}>
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
              <button className={s.sheetSubmit} onClick={() => setSheetOpen(false)}>
                <Search size={16} />
                {searching
                  ? t('salons.results.searching')
                  : t('salons.search.showResults', { count })}
              </button>
            </div>
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
              {salons!.map((salon) => (
                <SalonCard
                  key={salon.id}
                  salon={salon}
                  isResult={hasSearch}
                  query={filters.q || filters.service || filters.location}
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
