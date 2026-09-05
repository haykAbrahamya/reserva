import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer/Footer'
import { NotFound } from '@/pages/NotFound/NotFound'
import { Board } from '@/pages/Board/Board'
import { useT } from '@/i18n'
import { siteJsonLd } from '@/lib/jsonLd'
import { LANDING_PREFIX } from '@/lib/landings'
import { useScrollRestoration } from '@/lib/useScrollRestoration'
import s from './App.module.scss'

/**
 * The listing page is code-split; the board is not.
 *
 * The board is what every visitor loads first, so it belongs in the entry
 * chunk. A listing page is always a second navigation — by which point someone
 * is engaged and a chunk fetch is invisible — and it pulls in the apply form,
 * the phone validation and the JSON-LD builder, none of which the board needs.
 */
const Detail = lazy(() => import('@/pages/Detail/Detail').then((m) => ({ default: m.Detail })))

/**
 * Landing pages are code-split for the same reason the listing page is: nobody
 * who loads the board needs them, and a visitor who arrives on one straight
 * from a search result pays for exactly the chunk they are reading.
 */
const Landing = lazy(() => import('@/pages/Landing/Landing').then((m) => ({ default: m.Landing })))

/**
 * Salon signup. Code-split hardest of all — it is the one page on this site
 * that a job seeker never opens, and it carries a whole form, its validation
 * and the phone helpers with it.
 */
const SignUp = lazy(() => import('@/pages/SignUp/SignUp').then((m) => ({ default: m.SignUp })))

/** Sign-in, and the professional's own page. Both are edges of the board: a
 *  visitor who never signs in pays for neither. */
const Login = lazy(() => import('@/pages/Login/Login').then((m) => ({ default: m.Login })))
const Account = lazy(() => import('@/pages/Account/Account').then((m) => ({ default: m.Account })))

const SITE_JSONLD_ID = 'site-jsonld'

/**
 * WebSite + Organization, attached once for the whole app.
 *
 * Deliberately NOT in useSeo: that hook owns the tags a ROUTE replaces, and
 * this graph is the same on every route. Putting it there would mean each
 * navigation tearing down and rebuilding an identical script, and any page that
 * forgot to pass it would silently drop the site's identity from the markup.
 */
function useSiteJsonLd() {
  const t = useT()
  useEffect(() => {
    if (document.getElementById(SITE_JSONLD_ID)) return
    const el = document.createElement('script')
    el.id = SITE_JSONLD_ID
    el.type = 'application/ld+json'
    el.textContent = JSON.stringify(
      siteJsonLd(`${t('app.name')} ${t('app.product')}`, t('hero.subtitle')),
    )
    document.head.appendChild(el)
    return () => el.remove()
  }, [t])
}

/**
 * Routes and the page frame.
 *
 * The header is deliberately NOT here: the board needs its search field in the
 * bar and a listing page does not, so each route renders its own. The footer IS
 * here, because it is identical everywhere and is the one place a salon owner
 * can find their way to posting a listing.
 */
export default function App() {
  /*
   * Forward navigation starts at the top; BACK restores where you were.
   *
   * Opening a listing and coming back must land on the listing you opened, not
   * on the headline — a board where every return trip loses your place is a
   * board you stop scrolling. Filter changes (which are REPLACE) move nothing
   * at all. See the hook for the full matrix.
   */
  useScrollRestoration()
  useSiteJsonLd()

  /*
   * Signup is a STANDALONE screen, not a page inside the board.
   *
   * It owns the whole viewport — brand panel on one side, form on the other —
   * so the shell's footer underneath it is wrong twice over: it appends a
   * second page's worth of chrome below a full-height layout, and its call to
   * action links to /signup, which is the page you are already on. It also made
   * the form look broken the moment a validation error grew the page past the
   * fold, because the panel stopped at 100dvh and the footer started.
   */
  const { pathname } = useLocation()
  const standalone = ['/signup', '/login'].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  return (
    <div className={s.shell}>
      <div className={s.content}>
        {/* No fallback UI: the detail chunk resolves in a few milliseconds on
            any real connection, and a flashed spinner is more disruptive than
            the wait it describes. Each page renders its own skeleton once
            mounted, which is where the actual waiting happens. */}
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Board />} />
            <Route path="/v/:id" element={<Detail />} />
            {/* Keyword landing pages — see lib/landings.ts. The prefix comes
                from there so the route and the links it generates cannot
                disagree about what these URLs are. */}
            <Route path={`${LANDING_PREFIX}/:slug`} element={<Landing />} />
            {/* The other side of this market: a salon that came here to hire.
                Its own page rather than a link to reserva.am/signup, which is
                written entirely around the booking product. */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>

      {!standalone && <Footer />}
    </div>
  )
}
