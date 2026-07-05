import { useEffect, useState } from 'react'

/** True when the viewport is at/below the mobile breakpoint (768px). Shared so
 *  the nav, notifications and support widget all agree on "mobile". */
export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => window.innerWidth <= breakpoint)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [breakpoint])
  return mobile
}
