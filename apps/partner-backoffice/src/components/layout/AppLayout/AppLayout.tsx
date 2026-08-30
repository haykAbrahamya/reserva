import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../Sidebar/Sidebar'
import { Topbar } from '../Topbar/Topbar'
import { PublicLinkBar } from '../PublicLinkBar/PublicLinkBar'
import { ProductSwitcherHeader } from '../ProductSwitcher/ProductSwitcher'
import { MobileTabBar } from '../MobileTabBar/MobileTabBar'
import { RouteFallback } from '../RouteFallback/RouteFallback'
import { SupportProvider } from '@/components/support/SupportProvider'
import { SupportWidget } from '@/components/support/SupportWidget'
import s from './AppLayout.module.scss'

export function AppLayout() {
  // The scrollable region is the content area (not the window), so reset its
  // scroll to the top whenever the route changes — every page opens at the top.
  const contentRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <SupportProvider>
      <div className={s.root}>
        {/* Sidebar — hidden on mobile via CSS */}
        <Sidebar />
        <div className={s.main}>
          <Topbar />
          {/* Mobile product context. Hides itself on desktop, where the
              sidebar switcher owns this. */}
          <ProductSwitcherHeader />
          <PublicLinkBar />
          <main className={s.content} ref={contentRef}>
            {/* Route chunks load lazily; the shell around them never unmounts. */}
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        {/* Bottom tab bar — shown only on mobile via CSS */}
        <MobileTabBar />
        {/* Support chat: floating ? bubble (web) / bottom sheet (mobile) */}
        <SupportWidget />
      </div>
    </SupportProvider>
  )
}
