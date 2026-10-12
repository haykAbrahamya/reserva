import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { VISIT_PATH } from '@/tools/appointment-card/visitLink'
import { toolForPath } from '@/tools/registry'
import { trackPageView, type PageType } from './pulse'
import { routePath } from './useToolAtPath'

/** One page view per route, with the tool it is and the language it was shown in. */
export function usePageViews() {
  const { pathname } = useLocation()
  const { locale } = useI18n()
  // Read at the view, not a reason for one: switching language is not a new page.
  const localeRef = useRef(locale)
  localeRef.current = locale

  useEffect(() => {
    const path = routePath(pathname)
    const tool = toolForPath(path)
    const pt: PageType = path === '/' ? 'tools' : tool ? 'tool' : path === VISIT_PATH ? 'visit' : 'other'
    trackPageView(path, pt, tool?.id, localeRef.current)
  }, [pathname])
}
