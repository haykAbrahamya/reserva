import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Search, X, ChevronDown, Clock } from 'lucide-react'
import { fmtServicePrice, fmtDurationSpan, hasPublicPrice } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { canBook, bookableAt, branchesForService, priceSpanFor } from '@/services/booking.service'
import { BranchSwitcher } from '@/pages/Partner/components/BranchSwitcher/BranchSwitcher'
import { useBranchChoice } from '@/pages/Partner/lib/useBranchChoice'
import { useT, useLocalized } from '@/i18n'
import s from './PartnerServices.module.scss'

interface Props {
  partner: PublicPartner
  onBook: (serviceId: string, locationId?: string) => void
  tone?: 'cream' | 'plain'
}

const ALL = 'All'
/** Collapsed view shows this many; the rest hide behind "See more". */
const INITIAL_LIMIT = 6

export function PartnerServices({ partner, onBook, tone = 'cream' }: Props) {
  const t = useT()
  const loc = useLocalized()
  const bookable = canBook(partner)
  // Multi-branch salons whose services or prices differ by branch get a branch
  // switcher; everyone else sees the list exactly as before (branchId = null).
  const branch = useBranchChoice(partner)
  // With a branch chosen, only what that branch offers — plus menu-only
  // services, which belong to no branch. A service only another branch offers
  // is simply not listed; choosing that branch shows it.
  const services = useMemo(
    () =>
      partner.services.filter(
        sv =>
          sv.active &&
          (!branch.branchId ||
            bookableAt(partner, sv, branch.branchId) ||
            branchesForService(partner, sv).length === 0),
      ),
    [partner, branch.branchId]
  )

  const categories = useMemo(() => {
    const set = new Set(services.map(sv => sv.category).filter(Boolean))
    return [ALL, ...Array.from(set)]
  }, [services])

  // Chips keep the base category as their value; display the localized label.
  const catLabel = (base: string): string => {
    if (base === ALL) return t('partner.services.all')
    const svc = services.find(sv => sv.category === base && sv.categoryI18n)
    return svc ? loc(svc.category, svc.categoryI18n) : base
  }

  const [cat, setCat] = useState(ALL)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  // Another branch may have nothing in the chosen category: fall back to All.
  useEffect(() => {
    if (cat !== ALL && !categories.includes(cat)) setCat(ALL)
  }, [categories, cat])

  // Category + free-text filter — matches localized + base name/category.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return services.filter(sv => {
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

  // Collapse back to the limit whenever the filter set changes.
  useEffect(() => { setExpanded(false) }, [cat, query])

  // ── Category bar (phones: one swipeable row, pinned under the header) ──
  const sentinelRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const backToTop = useRef(false)

  // Pinned = the spot it sits in has scrolled up under the 60px site header.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 61),
      { rootMargin: '-61px 0px 0px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const pickCategory = (c: string, chip: HTMLButtonElement) => {
    setCat(c)
    // Keep the chosen chip in view inside the row — never moves the page.
    const rail = railRef.current
    if (rail && rail.scrollWidth > rail.clientWidth) {
      rail.scrollTo({ left: chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' })
    }
    // Picked from the pinned bar halfway down a long list: show the new list
    // from its first card rather than somewhere in its middle.
    if (stuck) backToTop.current = true
  }
  useEffect(() => {
    if (!backToTop.current) return
    backToTop.current = false
    const list = listRef.current
    const bar = barRef.current
    if (!list || !bar) return
    const barBottom = bar.getBoundingClientRect().bottom
    const listTop = list.getBoundingClientRect().top
    if (listTop < barBottom) window.scrollTo({ top: window.scrollY + listTop - barBottom - 12, behavior: 'smooth' })
  }, [cat])

  const overLimit = filtered.length > INITIAL_LIMIT
  const visible = expanded || !overLimit ? filtered : filtered.slice(0, INITIAL_LIMIT)
  const hiddenCount = filtered.length - INITIAL_LIMIT
  const durationLabels = { min: t('partner.services.min'), h: t('partner.services.hour') }

  return (
    <section className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')} id="services">
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.eyebrow}>{t('partner.services.eyebrow')}</div>
          <h2 className={s.title}>{t('partner.services.title')}</h2>
        </div>

        {branch.active && branch.branchId && (
          <BranchSwitcher branches={branch.branches} value={branch.branchId} onChange={branch.setBranchId} />
        )}

        {/* Search bar */}
        <div className={s.search}>
          <Search size={17} className={s.searchIcon} />
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
          <>
            <div ref={sentinelRef} className={s.sentinel} aria-hidden />
            <div ref={barRef} className={[s.chipBar, stuck ? s.stuck : ''].filter(Boolean).join(' ')}>
              <div ref={railRef} className={s.chips}>
                {categories.map(c => (
                  <button
                    key={c}
                    className={[s.chip, c === cat ? s.active : ''].filter(Boolean).join(' ')}
                    aria-pressed={c === cat}
                    onClick={e => pickCategory(c, e.currentTarget)}
                  >
                    {catLabel(c)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div ref={listRef} className={s.results}>
          {visible.length === 0 ? (
            <div className={s.empty}>
              <Search size={22} className={s.emptyIcon} />
              <p>{t('partner.services.noResults', { query: query.trim() })}</p>
            </div>
          ) : (
            <div className={s.list}>
              {visible.map((sv, i) => {
                // The price a client would pay here: exact when everyone at the
                // branch charges the same, "from – to" when specialists differ.
                const span = priceSpanFor(partner, sv, branch.branchId)
                const showPrice = hasPublicPrice(span)
                return (
                  <Reveal
                    key={sv.id}
                    /* No price and nothing to book means no bottom band, so the
                       card centres what it has rather than leaving a gap under it. */
                    className={[s.card, showPrice || bookable ? '' : s.cardFlush].filter(Boolean).join(' ')}
                    delay={(i % 2) * 60}
                  >
                    <div className={s.cardBody}>
                      <div className={s.svcName}>{loc(sv.name, sv.nameI18n)}</div>
                      <div className={s.svcMeta}>
                        <span className={s.metaItem}>
                          <Clock size={13} /> {fmtDurationSpan(span.durationMin, span.durationMax, durationLabels)}
                        </span>
                        {sv.category && <span className={s.metaCat}>{loc(sv.category, sv.categoryI18n)}</span>}
                      </div>
                    </div>
                    {/*
                      The price band disappears entirely when the salon withholds
                      the price — no figure, no placeholder. An empty bordered strip
                      with a tinted background reads as a broken card, which is
                      worse than the price simply not being part of this card.

                      When the service is still bookable the band stays for the
                      button alone and right-aligns it: `space-between` with one
                      child would park it on the left, under nothing.
                    */}
                    {(showPrice || bookable) && (
                      <div
                        className={[s.right, showPrice ? '' : s.rightNoPrice]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {showPrice && (
                          <span className={s.price}>{fmtServicePrice(span, { from: t('partner.services.priceFrom') })}</span>
                        )}
                        {bookable && (
                          <button className={s.bookBtn} onClick={() => onBook(sv.id, branch.branchId ?? undefined)}>
                            <Plus size={14} /> {t('partner.services.book')}
                          </button>
                        )}
                      </div>
                    )}
                  </Reveal>
                )
              })}
            </div>
          )}

        </div>

        {/* See more / Show less */}
        {overLimit && (
          <div className={s.moreRow}>
            <button
              className={s.moreBtn}
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
            >
              {expanded
                ? t('partner.services.showLess')
                : t('partner.services.seeMore', { count: hiddenCount })}
              <ChevronDown size={15} className={[s.moreChevron, expanded ? s.moreChevronUp : ''].join(' ')} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
