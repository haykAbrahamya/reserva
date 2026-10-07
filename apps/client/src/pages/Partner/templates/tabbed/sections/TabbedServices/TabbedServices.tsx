import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Clock, Search, X, ChevronDown } from 'lucide-react'
import { fmtServicePrice, fmtDurationSpan, hasPublicPrice } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { canBook, bookableAt, branchesForService, priceSpanFor } from '@/services/booking.service'
import { track, trackTyped } from '@/services/analytics.service'
import { BranchSwitcher } from '@/pages/Partner/components/BranchSwitcher/BranchSwitcher'
import { useBranchChoice } from '@/pages/Partner/lib/useBranchChoice'
import { useT, useLocalized } from '@/i18n'
import s from './TabbedServices.module.scss'

interface Props {
  partner: PublicPartner
  onBook: (serviceId: string, locationId?: string) => void
}

const ALL = 'All'
/** Collapsed view shows this many; the rest hide behind "See more". */
const INITIAL_LIMIT = 6

/** Services tab: category chips + a two-column service card grid. Reuses the
 *  shared price/duration formatters and the canBook rule. */
export function TabbedServices({ partner, onBook }: Props) {
  const t = useT()
  const loc = useLocalized()
  const bookable = canBook(partner)
  // Branch switcher only when services or prices differ by branch (else null).
  const branch = useBranchChoice(partner)
  // With a branch chosen, only what that branch offers (plus menu-only
  // services, which belong to no branch) — same rule as the classic template.
  const services = useMemo(
    () =>
      partner.services.filter(
        (sv) =>
          sv.active &&
          (!branch.branchId ||
            bookableAt(partner, sv, branch.branchId) ||
            branchesForService(partner, sv).length === 0),
      ),
    [partner, branch.branchId],
  )
  // Category chips keep the BASE category as their stable value (used for
  // filtering/grouping), but display the localized label. Build a base→localized
  // label map from the services that carry a category translation.
  const categories = useMemo(() => {
    const set = new Set(services.map((sv) => sv.category).filter(Boolean))
    return [ALL, ...Array.from(set)]
  }, [services])
  const catLabel = (base: string): string => {
    if (base === ALL) return t('partner.services.all')
    const svc = services.find((sv) => sv.category === base && sv.categoryI18n)
    return svc ? loc(svc.category, svc.categoryI18n) : base
  }
  const [cat, setCat] = useState(ALL)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  // Another branch may have nothing in the chosen category: fall back to All.
  useEffect(() => {
    if (cat !== ALL && !categories.includes(cat)) setCat(ALL)
  }, [categories, cat])

  // Filter by category + free-text search. Search matches the localized name +
  // category (what the visitor sees) as well as the base values.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter((sv) => {
      if (cat !== ALL && sv.category !== cat) return false
      if (!q) return true
      const name = loc(sv.name, sv.nameI18n).toLowerCase()
      const category = loc(sv.category ?? '', sv.categoryI18n).toLowerCase()
      return (
        name.includes(q) ||
        category.includes(q) ||
        sv.name.toLowerCase().includes(q) ||
        (sv.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [services, cat, query, loc])

  // Collapse back to the limit whenever the filter set changes, so switching
  // category / typing never leaves a stale "expanded" list.
  useEffect(() => { setExpanded(false) }, [cat, query])

  // Analytics: what visitors look for, sent once they pause typing.
  useEffect(() => { trackTyped('service_search', query) }, [query])

  // Phones: the chips are one swipeable row — keep the chosen one in view
  // inside it (never moves the page).
  const railRef = useRef<HTMLDivElement>(null)
  const pickCategory = (c: string, chip: HTMLButtonElement) => {
    if (c !== cat) track('category_select', { cat: c })
    setCat(c)
    const rail = railRef.current
    if (rail && rail.scrollWidth > rail.clientWidth) {
      rail.scrollTo({ left: chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' })
    }
  }

  const overLimit = filtered.length > INITIAL_LIMIT
  const visible = expanded || !overLimit ? filtered : filtered.slice(0, INITIAL_LIMIT)
  const hiddenCount = filtered.length - INITIAL_LIMIT

  return (
    <section className={s.section}>
      {branch.active && branch.branchId && (
        <BranchSwitcher branches={branch.branches} value={branch.branchId} onChange={branch.setBranchId} />
      )}

      {/* Search bar */}
      <div className={s.search}>
        <Search size={16} className={s.searchIcon} />
        <input
          className={s.searchInput}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('partner.services.searchPlaceholder')}
          aria-label={t('partner.services.searchPlaceholder')}
        />
        {query && (
          <button className={s.searchClear} onClick={() => setQuery('')} aria-label="Clear">
            <X size={15} />
          </button>
        )}
      </div>

      {categories.length > 2 && (
        <div ref={railRef} className={s.chips}>
          {categories.map((c) => (
            <button
              key={c}
              className={[s.chip, c === cat ? s.chipActive : ''].filter(Boolean).join(' ')}
              aria-pressed={c === cat}
              onClick={(e) => pickCategory(c, e.currentTarget)}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className={s.empty}>
          <Search size={22} className={s.emptyIcon} />
          <p>{t('partner.services.noResults', { query: query.trim() })}</p>
        </div>
      ) : (
      <div className={s.grid}>
        {visible.map((sv) => {
          // Exact price when everyone at the branch charges the same, else a span.
          const span = priceSpanFor(partner, sv, branch.branchId)
          const showPrice = hasPublicPrice(span)
          return (
          <div
            key={sv.id}
            className={[s.card, showPrice || bookable ? '' : s.cardFlush].filter(Boolean).join(' ')}
          >
            <div className={s.cardBody}>
              <div className={s.name}>{loc(sv.name, sv.nameI18n)}</div>
              <div className={s.meta}>
                <span className={s.metaItem}>
                  <Clock size={13} /> {fmtDurationSpan(span.durationMin, span.durationMax, { min: t('partner.services.min'), h: t('partner.services.hour') })}
                </span>
                {sv.category && <span className={s.metaCat}>{loc(sv.category, sv.categoryI18n)}</span>}
              </div>
            </div>
            {/* Dropped entirely when the price is withheld — same reasoning as
                the classic template, and the two must behave identically or a
                salon's page changes shape when it switches template. */}
            {(showPrice || bookable) && (
              <div
                className={[s.right, showPrice ? '' : s.rightNoPrice]
                  .filter(Boolean)
                  .join(' ')}
              >
                {showPrice && <span className={s.price}>{fmtServicePrice(span, { from: t('partner.services.priceFrom') })}</span>}
                {bookable && (
                  <button
                    className={s.bookBtn}
                    onClick={() => {
                      track('book_click', { from: 'services', svc: sv.id, loc: branch.branchId })
                      onBook(sv.id, branch.branchId ?? undefined)
                    }}
                  >
                    <Plus size={14} /> {t('partner.services.book')}
                  </button>
                )}
              </div>
            )}
          </div>
          )
        })}
      </div>
      )}

      {/* See more / Show less — only when a filter set exceeds the limit. */}
      {overLimit && (
        <div className={s.moreRow}>
          <button
            className={s.moreBtn}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded
              ? t('partner.services.showLess')
              : t('partner.services.seeMore', { count: hiddenCount })}
            <ChevronDown size={15} className={[s.moreChevron, expanded ? s.moreChevronUp : ''].join(' ')} />
          </button>
        </div>
      )}
    </section>
  )
}
