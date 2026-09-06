import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, X, ChevronDown, Clock } from 'lucide-react'
import { fmtServicePrice, fmtDuration, hasPublicPrice } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { canBook } from '@/services/booking.service'
import { useT, useLocalized } from '@/i18n'
import s from './PartnerServices.module.scss'

interface Props {
  partner: PublicPartner
  onBook: (serviceId: string) => void
  tone?: 'cream' | 'plain'
}

const ALL = 'All'
/** Collapsed view shows this many; the rest hide behind "See more". */
const INITIAL_LIMIT = 6

export function PartnerServices({ partner, onBook, tone = 'cream' }: Props) {
  const t = useT()
  const loc = useLocalized()
  const bookable = canBook(partner)
  const services = useMemo(
    () => partner.services.filter(sv => sv.active),
    [partner]
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

  const overLimit = filtered.length > INITIAL_LIMIT
  const visible = expanded || !overLimit ? filtered : filtered.slice(0, INITIAL_LIMIT)
  const hiddenCount = filtered.length - INITIAL_LIMIT

  return (
    <section className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')} id="services">
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.eyebrow}>{t('partner.services.eyebrow')}</div>
          <h2 className={s.title}>{t('partner.services.title')}</h2>
        </div>

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
          <div className={s.chips}>
            {categories.map(c => (
              <button
                key={c}
                className={[s.chip, c === cat ? s.active : ''].filter(Boolean).join(' ')}
                onClick={() => setCat(c)}
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
          <div className={s.list}>
            {visible.map((sv, i) => (
              <Reveal
                key={sv.id}
                /* No price and nothing to book means no bottom band, so the
                   card centres what it has rather than leaving a gap under it. */
                className={[s.card, hasPublicPrice(sv) || bookable ? '' : s.cardFlush]
                  .filter(Boolean)
                  .join(' ')}
                delay={(i % 2) * 60}
              >
                <div className={s.cardBody}>
                  <div className={s.svcName}>{loc(sv.name, sv.nameI18n)}</div>
                  <div className={s.svcMeta}>
                    <span className={s.metaItem}>
                      <Clock size={13} /> {fmtDuration(sv.duration, { min: t('partner.services.min'), h: t('partner.services.hour') })}
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
                {(hasPublicPrice(sv) || bookable) && (
                  <div
                    className={[s.right, hasPublicPrice(sv) ? '' : s.rightNoPrice]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {hasPublicPrice(sv) && (
                      <span className={s.price}>{fmtServicePrice(sv)}</span>
                    )}
                    {bookable && (
                      <button className={s.bookBtn} onClick={() => onBook(sv.id)}>
                        <Plus size={14} /> {t('partner.services.book')}
                      </button>
                    )}
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        )}

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
