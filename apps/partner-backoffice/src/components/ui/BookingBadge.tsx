import { Badge } from '@reserva/ui'
import type { BookingStatus } from '@reserva/shared'
import { useT } from '@/i18n'

/**
 * Domain-specific wrapper around the generic <Badge>.
 * Maps a booking status to the matching badge variant and a localized label.
 */
export function BookingBadge({ status }: { status: BookingStatus }) {
  const t = useT()
  return <Badge variant={status} label={t(`status.${status}`)} />
}
