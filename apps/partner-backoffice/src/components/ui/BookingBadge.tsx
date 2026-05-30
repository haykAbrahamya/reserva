import { Badge } from '@reserva/ui'
import type { BookingStatus } from '@reserva/shared'

/**
 * Domain-specific wrapper around the generic <Badge>.
 * Maps a booking status to the matching badge variant.
 */
export function BookingBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={status} />
}
