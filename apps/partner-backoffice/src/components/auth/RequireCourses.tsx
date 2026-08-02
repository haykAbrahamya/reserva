import { Navigate } from 'react-router-dom'
import { usePartner } from '@/store/app.store'

/**
 * Gate the Courses route on the platform-curated `coursesEnabled` flag. A partner
 * without the feature is bounced to the dashboard (the nav item is already
 * hidden; this stops direct-URL access too). Waits for the partner to load so we
 * don't bounce during the initial fetch.
 */
export function RequireCourses({ children }: { children: React.ReactNode }) {
  const partner = usePartner()
  if (!partner) return null // still loading — don't redirect yet
  if (!partner.coursesEnabled) return <Navigate to="/" replace />
  return <>{children}</>
}
