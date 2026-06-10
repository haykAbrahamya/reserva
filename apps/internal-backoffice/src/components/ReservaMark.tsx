/**
 * Reserva "Petal R" mark — strokes only, in currentColor. Designed to sit inside
 * the accent-filled `.logo` box (white strokes via color: var(--fg-on-accent)).
 */
export function ReservaMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M17 36V12" />
        <path d="M17 12c10 0 16 4 16 11s-7 8-16 8" />
        <path d="M24 31l10 5" />
      </g>
    </svg>
  )
}
