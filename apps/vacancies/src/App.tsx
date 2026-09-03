import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer/Footer'
import { NotFound } from '@/pages/NotFound/NotFound'
import { Board } from '@/pages/Board/Board'
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>

      <Footer />
    </div>
  )
}
