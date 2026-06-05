import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../Sidebar/Sidebar'
import { Topbar } from '../Topbar/Topbar'
import { MobileTabBar } from '../MobileTabBar/MobileTabBar'
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
    <div className={s.root}>
      {/* Sidebar — hidden on mobile via CSS */}
      <Sidebar />
      <div className={s.main}>
        <Topbar />
        <main className={s.content} ref={contentRef}>
          <Outlet />
        </main>
      </div>
      {/* Bottom tab bar — shown only on mobile via CSS */}
      <MobileTabBar />
    </div>
  )
}
