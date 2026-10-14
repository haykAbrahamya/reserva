import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { InAppNotice } from '@/components/common/InAppNotice/InAppNotice'
import { Footer } from '@/components/layout/Footer/Footer'
import { Header } from '@/components/layout/Header/Header'
import { usePageViews } from '@/lib/analytics/usePageViews'
import { useScrollToTop } from '@/lib/useScrollToTop'
import s from './SiteLayout.module.scss'

/** The frame around every page: header, the route, footer. */
export function SiteLayout() {
  useScrollToTop()
  usePageViews()

  return (
    <div className={s.shell}>
      <Header />
      {/* Inside an app's built-in browser only (Instagram, Facebook…). */}
      <InAppNotice />
      <main className={s.main}>
        {/* No fallback: a tool chunk resolves in milliseconds, and a flashed
            spinner is more disruptive than the wait it describes. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
