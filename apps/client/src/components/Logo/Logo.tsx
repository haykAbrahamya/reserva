import s from './Logo.module.scss'

/** Reserva logo mark — person silhouette inside an accent square. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span className={s.mark} style={{ width: size, height: size }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3C10.3431 3 9 4.34315 9 6C9 7.65685 10.3431 9 12 9C13.6569 9 15 7.65685 15 6C15 4.34315 13.6569 3 12 3Z"
          fill="#fff"
        />
        <path
          d="M6 21C6 17.6863 8.68629 15 12 15C15.3137 15 18 17.6863 18 21"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className={s.logo}>
      <LogoMark size={size} />
      <span className={s.name}>Reserva</span>
    </span>
  )
}
