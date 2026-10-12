import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/layouts/SiteLayout/SiteLayout'
import { Home } from '@/pages/Home/Home'
import { NotFound } from '@/pages/NotFound/NotFound'
import { VISIT_PATH } from '@/tools/appointment-card/visitLink'
import { TOOLS, isLive } from '@/tools/registry'

/** The page an appointment card's link opens — a client's page, not a tool, so it is not on the grid. */
const VisitPage = lazy(() => import('@/tools/appointment-card/VisitPage').then((m) => ({ default: m.VisitPage })))

/**
 * Routes come from the tool registry, so a tool can never be on the grid as
 * "live" without a page, or have a page nobody can reach.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        {TOOLS.filter(isLive).map((tool) => (
          <Route key={tool.id} path={tool.path} element={<tool.page />} />
        ))}
        <Route path={VISIT_PATH} element={<VisitPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
