import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, SearchX, SlidersHorizontal } from 'lucide-react'
import { Button, Empty } from '@reserva/ui'
import { VacancyList, VacancyListSkeleton } from '@/components/board/VacancyList/VacancyList'
import { BrowseLinks } from '@/components/layout/BrowseLinks/BrowseLinks'
import { Header } from '@/components/layout/Header/Header'
import { useI18n, useLocalized, useT } from '@/i18n'
import { parseFilters } from '@/lib/filters'
import { collectionJsonLd } from '@/lib/jsonLd'
import {
  boardHrefFor,
  landingBySlug,
  landingCopy,
  landingPath,
  type Landing as LandingEntry,
} from '@/lib/landings'
import { useBoardResults } from '@/lib/useBoardResults'
import { useSeo } from '@/lib/useSeo'
import { roleTitle } from '@/lib/vacancy'
import { NotFound } from '@/pages/NotFound/NotFound'
import s from './Landing.module.scss'

const PAGE_SIZE = 12

/**
 * The route guard.
 *
 * Resolving the slug HERE, before the page's hooks exist, is what keeps two
 * components from writing the document head at once. Rendering <NotFound />
 * from inside the page instead left both mounted: the 404 set its title and
 * the landing page immediately overwrote it with a generic one, so a mistyped
 * URL got the wrong title while claiming to be a 404.
 */
export function Landing() {
  const { slug = '' } = useParams()
  const landing = landingBySlug(slug)
  // A typo must not become an indexable URL of its own.
  if (!landing) return <NotFound />
  return <LandingPage landing={landing} />
}

/**
 * A keyword landing page — /jobs/<slug>.
 *
 * The board is one URL over a query string, and a filtered board is
 * deliberately noindexed: every filter combination is a near-duplicate. That
 * is right for arbitrary filtering and wrong for the searches people actually
 * perform. "Վարսավիրի աշխատանք" is not a filter state, it is a question, and
 * the page that answers it needs a title, an H1 and prose of its own.
 *
 * So each of these is a curated entry in lib/landings.data.json with its own
 * copy, rendered over the same result list the board uses. It is indexable, it
 * self-canonicalizes, and it is prerendered at build time so a crawler reads
 * the heading and the paragraph without waiting on JavaScript.
 *
 * The listings under it are the fresh half and cannot be baked in — which is
 * exactly why `body` exists. A page that is a heading over an empty list is
 * thin whatever its title claims, and a young board will have empty pages.
 */
function LandingPage({ landing }: { landing: LandingEntry }) {
  const t = useT()
  const { locale } = useI18n()
  const loc = useLocalized()

  const filters = useMemo(() => parseFilters(new URLSearchParams(landing.query)), [landing])
  const results = useBoardResults(filters, PAGE_SIZE)
  const copy = landingCopy(landing, locale)
  const path = landingPath(landing.slug)

  const crumbs = useMemo(
    () => [
      { name: t('app.product'), path: '/' },
      { name: copy.h1, path },
    ],
    [copy.h1, path, t],
  )

  /*
   * A landing page with nothing on it is still indexable.
   *
   * The instinct is to noindex an empty category, and for a filtered board that
   * is right — it is a duplicate with no content of its own. This is the
   * opposite case: the page carries an H1, an intro and a paragraph about how
   * this kind of work is paid, none of which appears anywhere else on the site.
   * It answers the search whether or not a salon happens to be hiring today,
   * and dropping it out of the index every time the board empties would mean
   * re-earning the ranking each time one is posted.
   */
  useSeo({
    title: `${copy.title} | ${t('app.name')}`,
    description: copy.description,
    canonicalPath: path,
    jsonLd: collectionJsonLd({
      name: copy.h1,
      description: copy.description,
      path,
      crumbs,
      items: results.items.map((v) => ({ id: v.id, title: roleTitle(v, loc) })),
    }),
  })

  const { items, total, hasMore, coldLoading, loadMore, loading, error, retry } = results

  const listBody = () => {
    if (error && items.length === 0) {
      return (
        <Empty
          icon={AlertTriangle}
          title={t('results.errorTitle')}
          description={t('results.errorBody')}
          action={
            <Button variant="accent" onClick={retry}>
              {t('results.retry')}
            </Button>
          }
        />
      )
    }

    if (coldLoading) return <VacancyListSkeleton rows={3} />

    if (items.length === 0) {
      return (
        <Empty
          icon={SearchX}
          title={t('landing.emptyTitle')}
          description={t('landing.emptyBody')}
          action={
            <Link to="/">
              <Button variant="accent">{t('landing.emptyAction')}</Button>
            </Link>
          }
        />
      )
    }

    return (
      <>
        <VacancyList items={items} refreshing={loading} />
        {hasMore && (
          <div className={s.more}>
            <Button onClick={loadMore} disabled={loading}>
              {loading ? t('results.loadingMore') : t('results.loadMore')}
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <Header />

      <div className={s.page}>
        {/* A visible trail as well as the JSON-LD one. Someone arriving from a
            search result has no history to go back through, so this is their
            only way up to the whole board. */}
        <nav className={s.crumbs} aria-label={t('a11y.breadcrumb')}>
          <Link to="/">{t('app.product')}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{copy.h1}</span>
        </nav>

        <header className={s.head}>
          <h1 className={s.title}>{copy.h1}</h1>
          <p className={s.intro}>{copy.intro}</p>

          <div className={s.headMeta}>
            <span className={s.count}>
              {coldLoading ? t('results.loading') : t('results.count', { count: total })}
            </span>
            {/* Handing the same query to the board, where it can be narrowed
                further. The landing page is a fixed selection with copy; the
                board is where a selection is edited. */}
            <Link className={s.refine} to={boardHrefFor(landing)}>
              <SlidersHorizontal size={14} />
              {t('landing.refine')}
            </Link>
          </div>
        </header>

        <main className={s.results} aria-label={t('a11y.results')}>
          {listBody()}
        </main>

        {/* The page's own content, below the listings rather than above them.
            Someone who came here for work wants the listings first; the prose
            is for the reader who scrolled past them, and for the crawler that
            reads the whole document either way. */}
        <section className={s.about}>
          <h2 className={s.aboutTitle}>{t('landing.aboutTitle')}</h2>
          <p className={s.aboutBody}>{copy.body}</p>
        </section>

        <section className={s.related}>
          <h2 className={s.relatedTitle}>{t('browse.title')}</h2>
          <BrowseLinks exclude={landing.slug} compact />
        </section>
      </div>
    </>
  )
}
