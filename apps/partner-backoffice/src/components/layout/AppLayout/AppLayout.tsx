import { Outlet } from 'react-router-dom'
import { Sidebar } from '../Sidebar/Sidebar'
import { Topbar } from '../Topbar/Topbar'
import { MobileTabBar } from '../MobileTabBar/MobileTabBar'
import s from './AppLayout.module.scss'

export function AppLayout() {
  return (
    <div className={s.root}>
      {/* Sidebar — hidden on mobile via CSS */}
      <Sidebar />
      <div className={s.main}>
        <Topbar />
        <main className={s.content}>
          <Outlet />
        </main>
      </div>
      {/* Bottom tab bar — shown only on mobile via CSS */}
      <MobileTabBar />
    </div>
  )
}
