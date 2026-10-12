import { useLocation } from 'react-router-dom'
import { toolForPath, type ToolId } from '@/tools/registry'

/** A route's path without a trailing slash: '/price-list/' and '/price-list' are one page. */
export const routePath = (pathname: string) => pathname.replace(/\/+$/, '') || '/'

/**
 * The tool whose page is open, for the parts outside its layout (the header
 * and footer) — so a click there is still credited to the tool it came from.
 */
export function useToolAtPath(): ToolId | undefined {
  const { pathname } = useLocation()
  return toolForPath(routePath(pathname))?.id
}
