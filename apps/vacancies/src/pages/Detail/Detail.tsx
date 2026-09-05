import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  SearchX,
  Send,
  Users,
} from 'lucide-react'
import { Avatar, Button, Empty, WhatsappIcon } from '@reserva/ui'
import { fetchVacancy } from '@/api/board.api'
import { resolveImageUrl } from '@/api/client'
import { ApplyModal } from '@/components/apply/ApplyModal/ApplyModal'
import { PayTag } from '@/components/board/PayTag/PayTag'
import { PerkChips } from '@/components/board/PerkChips/PerkChips'
import { VacancyCard } from '@/components/board/VacancyCard/VacancyCard'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { Header } from '@/components/layout/Header/Header'
import { useI18n, useLocalized, useT } from '@/i18n'
import { daysUntil, relativeTime } from '@/lib/dates'
import { breadcrumbJsonLd, graph, jobPostingJsonLd } from '@/lib/jsonLd'
import { landingCopy, landingPath, landingsForVacancy } from '@/lib/landings'
import { paySummary, placeLabel, roleTitle, splitPerks } from '@/lib/vacancy'
import { useAsync } from '@/lib/useAsync'
import { useSeo } from '@/lib/useSeo'
import s from './Detail.module.scss'

/** Warn about the clock only once it is close enough to matter. */
const CLOSING_SOON_DAYS = 7

/**
 * One listing.
 *
 * This is the page that gets indexed and shared, so it carries the structured
 * data and the real canonical — the board itself is deliberately kept out of
 * the index (every filter combination is a near-duplicate URL).
 *
 * The apply action appears three times on purpose: in the sticky aside on
 * desktop, inline after the description, and in a fixed bar on mobile. A
 * listing people read to the bottom must not require scrolling back up to act
 * on, and a single CTA can only be in one of those places.
 */
export function Detail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const { locale } = useI18n()
  const loc = useLocalized()
  const [applyOpen, setApplyOpen] = useState(false)

  const { data, error, loading } = useAsync((signal) => fetchVacancy(id, signal), [id], {
    skip: !id,
  })

  const vacancy = data?.vacancy ?? null

  const view = useMemo(() => {
    if (!vacancy) return null
    return {
      title: roleTitle(vacancy, loc),
      salon: loc(vacancy.salon.name, vacancy.salon.nameI18n),
      salonType: loc(vacancy.salon.type, vacancy.salon.typeI18n),
      branch: loc(vacancy.branch.name, vacancy.branch.nameI18n),
      place: placeLabel(vacancy, loc),
      description: loc(vacancy.description, vacancy.descriptionI18n),
      pay: paySummary(vacancy, t),
      perks: splitPerks(vacancy.perks),
    }
  }, [vacancy, loc, t])

  /*
   * The category pages this listing belongs to.
   *
   * Both a reader's next click and, more importantly, a link UP: a listing
   * that ranks passes some of that to the landing page, which is the page that
   * has to rank for "վարսավիրի աշխատանք". Without these the landing pages are
   * linked from the board and from nowhere deeper.
   */
  const related = useMemo(() => {
    if (!vacancy) return []
    const area = vacancy.branch.area
    return landingsForVacancy({
      specialtyKey: vacancy.specialty.key,
      areaKeys: [area?.key, area?.parent?.key].filter((k): k is string => Boolean(k)),
      payType: vacancy.payType,
    })
  }, [vacancy])

  // The first match is this listing's primary category, and so its breadcrumb.
  const category = related[0] ?? null

  useSeo({
    title: view ? `${view.title} — ${view.salon} | ${t('app.name')}` : t('app.product'),
    description: view
      ? t('detail.seoDescription', {
          role: view.title,
          salon: view.salon,
          place: view.place,
          pay: view.pay.value ? `${view.pay.value} ${view.pay.caption}` : t('pay.type.negotiable'),
        })
      : undefined,
    canonicalPath: `/v/${id}`,
    /*
     * The posting AND the trail that leads to it, in one @graph.
     *
     * Two separate <script> blocks would work, but a single graph is what lets
     * Google tie the breadcrumb to this page rather than treat it as a loose
     * assertion — and the trail is what replaces the bare URL in the result
     * with "Vacancies > Hairdresser jobs > this listing".
     */
    jsonLd:
      vacancy && view
        ? graph(
            jobPostingJsonLd(vacancy, view.title, view.salon),
            category
              ? breadcrumbJsonLd([
                  { name: t('app.product'), path: '/' },
                  { name: landingCopy(category, locale).h1, path: landingPath(category.slug) },
                  { name: view.title, path: `/v/${id}` },
                ])
              : null,
          )
        : null,
    // A listing that could not be loaded must not be indexed as a real page.
    noIndex: Boolean(error),
  })

  /*
   * Tell the DOCUMENT that a fixed bar is occupying the bottom of the viewport.
   *
   * The bar is rendered here but it is not this page's to clear: padding the
   * page moved the page's own content up and left the footer — a sibling of the
   * page in the app shell — still underneath it. The body reserves the height
   * instead (see global.scss), which lifts everything, footer included.
   *
   * Above this hook so it sits with the others: the early returns below would
   * otherwise make it conditional.
   */
  const showsActionBar = Boolean(vacancy?.acceptsApplications)
  useEffect(() => {
    if (!showsActionBar) return
    document.body.classList.add('has-action-bar')
    return () => document.body.classList.remove('has-action-bar')
  }, [showsActionBar])

  if (loading && !vacancy) {
    return (
      <>
        <Header />
        <DetailSkeleton />
      </>
    )
  }

  if (error || !vacancy || !view) {
    return (
      <>
        <Header />
        <div className={s.page}>
          <Empty
            icon={SearchX}
            title={t('detail.notFoundTitle')}
            description={t('detail.notFoundBody')}
            action={
              <Link to="/">
                <Button variant="accent">{t('detail.notFoundAction')}</Button>
              </Link>
            }
          />
        </div>
      </>
    )
  }

  const closingIn = daysUntil(vacancy.expiresAt)
  const closingSoon = closingIn != null && closingIn > 0 && closingIn <= CLOSING_SOON_DAYS
  const posted = relativeTime(vacancy.publishedAt, locale)
  const salonUrl = vacancy.salon.slug ? `https://${vacancy.salon.slug}.reserva.am` : null

  const mapsUrl =
    vacancy.branch.lat != null && vacancy.branch.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${vacancy.branch.lat},${vacancy.branch.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${vacancy.branch.address} ${view.place}`,
        )}`

  const applyButtons = (
    <div className={s.applyActions}>
      {vacancy.acceptsApplications && (
        <Button variant="accent" onClick={() => setApplyOpen(true)}>
          <Send size={14} />
          {t('card.apply')}
        </Button>
      )}
      {vacancy.contactPhone && (
        <a href={`tel:${vacancy.contactPhone}`} className={s.callLink}>
          <Phone size={14} />
          {vacancy.contactPhone}
        </a>
      )}
      {vacancy.whatsapp && (
        <a
          href={`https://wa.me/${vacancy.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className={s.waLink}
        >
          <WhatsappIcon size={15} />
          {t('detail.whatsapp')}
        </a>
      )}
    </div>
  )

  return (
    <>
      <Header />
      <div className={s.page}>
      {/*
        A history step, not a fresh navigation to "/".
        Linking to the board pushes a NEW entry, which starts at the top and
        throws away the position the reader had built. Going back pops the entry
        they came from, and the scroll restoration puts them on the listing they
        opened. Falls back to a plain link when there is no history to pop —
        someone who landed here straight from a search result.
      */}
      {window.history.length > 1 ? (
        <button type="button" className={s.back} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
          {t('detail.back')}
        </button>
      ) : (
        <Link to="/" className={s.back}>
          <ArrowLeft size={15} />
          {t('detail.back')}
        </Link>
      )}

      <div className={s.layout}>
        <article className={s.main}>
          <header className={s.head}>
            <div className={s.headTop}>
              <Avatar
                name={view.salon}
                src={resolveImageUrl(vacancy.salon.logoUrl) ?? undefined}
                color={vacancy.salon.accent}
                size="lg"
              />
              <div className={s.headText}>
                <h1 className={s.title}>{view.title}</h1>
                <p className={s.salonLine}>
                  <span className={s.salonName}>{view.salon}</span>
                  {view.salonType && (
                    <>
                      <span className={s.dot} aria-hidden="true">·</span>
                      <span>{view.salonType}</span>
                    </>
                  )}
                </p>
                <p className={s.placeLine}>
                  <MapPin size={13} aria-hidden="true" />
                  {view.place}
                  <span className={s.dot} aria-hidden="true">·</span>
                  {view.branch}
                </p>
              </div>
            </div>

            <div className={s.headMeta}>
              {posted && (
                <span className={s.metaItem}>
                  <Clock size={13} />
                  {t('card.posted', { when: posted })}
                </span>
              )}
              {closingSoon && (
                <span className={[s.metaItem, s.warn].join(' ')}>
                  <CalendarClock size={13} />
                  {t('detail.expiresSoon', { count: closingIn })}
                </span>
              )}
            </div>
          </header>

          <section className={s.block}>
            <h2 className={s.blockTitle}>{t('detail.terms')}</h2>

            {/*
              Payment LEADS, on its own row above the rest.

              As one cell in a four-column grid it stacked into five cramped
              lines — the type, the figure, the unit, the caption and the
              salon's share, none of them able to breathe. It is also the term
              people decide on, so it gets the width and the type size, and the
              other three stay a compact row underneath.
            */}
            <div className={s.payLead}>
              {view.pay.value ? (
                <>
                  <p className={s.payFigure}>
                    <span className={s.payDigits}>{view.pay.value}</span>
                    {view.pay.unit && (
                      <span
                        className={[s.paySign, view.pay.unit === '%' ? s.paySignTight : '']
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {view.pay.unit}
                      </span>
                    )}
                    <span className={s.payCaption}>{view.pay.caption}</span>
                  </p>
                  <p className={s.payMeta}>
                    <span className={s.payType}>{t(`pay.type.${vacancy.payType}`)}</span>
                    {vacancy.payType === 'percentage' && vacancy.salonPercent != null && (
                      <>
                        <span className={s.dot} aria-hidden="true">·</span>
                        <span>
                          {t('pay.salonKeeps', {
                            percent:
                              vacancy.salonPercentMax != null &&
                              vacancy.salonPercentMax !== vacancy.salonPercent
                                ? `${vacancy.salonPercent}–${vacancy.salonPercentMax}%`
                                : `${vacancy.salonPercent}%`,
                          })}
                        </span>
                      </>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className={s.payFigure}>
                    <span className={s.payOpen}>{t('pay.type.negotiable')}</span>
                  </p>
                  <p className={s.payMeta}>{t('pay.negotiableNote')}</p>
                </>
              )}
            </div>

            <dl className={s.terms}>
              <div className={s.term}>
                <dt>{t('detail.termsSchedule')}</dt>
                <dd>
                  <span className={s.termStrong}>
                    {vacancy.scheduleType ? t(`schedule.${vacancy.scheduleType}`) : '—'}
                  </span>
                  {vacancy.scheduleNote && (
                    <span className={s.termHint}>{vacancy.scheduleNote}</span>
                  )}
                </dd>
              </div>

              <div className={s.term}>
                <dt>{t('detail.termsExperience')}</dt>
                <dd>
                  <span className={s.termStrong}>{t(`experience.${vacancy.experience}`)}</span>
                </dd>
              </div>

              <div className={s.term}>
                <dt>{t('detail.termsSeats')}</dt>
                <dd>
                  <span className={s.termStrong}>
                    <Users size={13} aria-hidden="true" /> {vacancy.seats}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <section className={s.block}>
            <h2 className={s.blockTitle}>{t('detail.about')}</h2>
            {view.description.trim() ? (
              // Salon-authored plain text. Rendered with preserved line breaks
              // and NEVER as HTML — this is untrusted input on a public page.
              <p className={s.description}>{view.description}</p>
            ) : (
              <p className={s.noDescription}>{t('detail.noDescription')}</p>
            )}
          </section>

          {(view.perks.offered.length > 0 || view.perks.expected.length > 0) && (
            <section className={s.block}>
              {view.perks.offered.length > 0 && (
                <>
                  <h2 className={s.blockTitle}>{t('perks.offeredTitle')}</h2>
                  <PerkChips perks={view.perks.offered} size="md" />
                </>
              )}
              {view.perks.expected.length > 0 && (
                <>
                  <h3 className={[s.blockTitle, s.blockSub].join(' ')}>
                    {t('perks.expectedTitle')}
                  </h3>
                  <PerkChips perks={view.perks.expected} size="md" />
                </>
              )}
            </section>
          )}

          <section className={s.block}>
            <h2 className={s.blockTitle}>{t('detail.where')}</h2>
            <div className={s.where}>
              <p className={s.address}>{vacancy.branch.address}</p>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={s.mapsLink}>
                {t('detail.directions')}
                <ExternalLink size={13} />
              </a>
            </div>
          </section>

          {/* Inline CTA: someone who read to the bottom should not have to
              scroll back up to act. */}
          <div className={s.inlineApply}>{applyButtons}</div>
        </article>

        <aside className={s.aside}>
          <div className={s.applyCard}>
            <PayTag vacancy={vacancy} size="lg" align="start" showSalonShare />
            <div className={s.applyText}>
              <h2 className={s.applyTitle}>{t('detail.applyTitle')}</h2>
              <p className={s.applyBody}>
                {vacancy.acceptsApplications ? t('detail.applyBody') : t('detail.phoneOnlyNote')}
              </p>
            </div>
            {applyButtons}
          </div>

          {salonUrl && (
            <a href={salonUrl} target="_blank" rel="noopener noreferrer" className={s.salonCard}>
              {/* Larger than a listing row's mark: this block is ABOUT the
                  salon, where a listing row merely belongs to one. */}
              <Avatar
                name={view.salon}
                src={resolveImageUrl(vacancy.salon.logoUrl) ?? undefined}
                color={vacancy.salon.accent}
                size="lg"
              />
              <div className={s.salonCardText}>
                <span className={s.salonCardLabel}>{t('detail.salon')}</span>
                <span className={s.salonCardName}>{view.salon}</span>
                <span className={s.salonCardCta}>
                  {t('detail.salonPage')}
                  <ArrowUpRight size={13} />
                </span>
              </div>
            </a>
          )}
        </aside>
      </div>

      {data && data.moreFromSalon.length > 0 && (
        <section className={s.more}>
          <h2 className={s.moreTitle}>
            {t('detail.moreFromSalon')}
            {/* The count turns a heading into a label for the list under it —
                and tells someone whether it is worth scrolling before they do. */}
            <span className={s.moreCount}>{data.moreFromSalon.length}</span>
          </h2>
          <div className={s.moreList}>
            {data.moreFromSalon.map((v) => (
              <VacancyCard key={v.id} vacancy={v} dense />
            ))}
          </div>
        </section>
      )}

      {/* Category links. Real anchors with the keyword as their text — the
          phrase someone searched is the phrase that should lead back up. */}
      {related.length > 0 && (
        <section className={s.related}>
          <h2 className={s.relatedTitle}>{t('browse.title')}</h2>
          <div className={s.relatedLinks}>
            {related.map((l) => (
              <Link key={l.slug} className={s.relatedLink} to={landingPath(l.slug)}>
                {landingCopy(l, locale).h1}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Fixed bar on phones, where the sticky aside does not exist. */}
      {vacancy.acceptsApplications && (
        <div className={s.mobileBar}>
          <div className={s.mobileBarPay}>
            <PayTag vacancy={vacancy} />
          </div>
          <Button variant="accent" onClick={() => setApplyOpen(true)}>
            <Send size={14} />
            {t('card.apply')}
          </Button>
        </div>
      )}

      <ApplyModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        vacancyId={vacancy.id}
        role={view.title}
        salon={view.salon}
      />
      </div>
    </>
  )
}

/** Shaped like the real page, so nothing jumps when the data lands. */
function DetailSkeleton() {
  return (
    <div className={s.page} aria-busy="true">
      <Skeleton w="120px" h={16} />
      <div className={s.layout}>
        <div className={s.main}>
          <div className={s.head}>
            <div className={s.headTop}>
              <Skeleton w="56px" h={56} radius={14} />
              <div className={s.headText}>
                <Skeleton w="62%" h={30} />
                <Skeleton w="40%" h={14} />
                <Skeleton w="52%" h={13} />
              </div>
            </div>
          </div>
          <Skeleton w="100%" h={132} radius={14} />
          <Skeleton w="100%" h={104} radius={14} />
        </div>
        <div className={s.aside}>
          <Skeleton w="100%" h={214} radius={14} />
        </div>
      </div>
    </div>
  )
}
