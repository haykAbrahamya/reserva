import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Search, CalendarX2, Compass } from 'lucide-react'
import { LogoMark } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { useT } from '@/i18n'
import s from './NotFound.module.scss'

export function NotFound() {
  const t = useT()
  const sceneRef = useRef<HTMLDivElement>(null)
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Parallax: digits drift toward the cursor (and device tilt on mobile).
  useEffect(() => {
    if (reduced) return
    const el = sceneRef.current
    if (!el) return

    let raf = 0
    const apply = (nx: number, ny: number) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', nx.toFixed(3))
        el.style.setProperty('--my', ny.toFixed(3))
      })
    }
    const onMove = (e: MouseEvent) => {
      apply((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      const gx = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 35))
      const gy = Math.max(-1, Math.min(1, (e.beta ?? 0) / 35))
      apply(gx, gy)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('deviceorientation', onTilt)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('deviceorientation', onTilt)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div className={s.page}>
      <div className={s.grid} />
      <span className={[s.orb, s.orb1].join(' ')} />
      <span className={[s.orb, s.orb2].join(' ')} />

      {/* Top bar */}
      <header className={s.top}>
        <Link to="/" className={s.brand}>
          <span className={s.brandMark}><LogoMark size={26} /></span>
          <span className={s.brandName}>Reserva</span>
        </Link>
        <div className={s.topActions}>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Scene */}
      <main className={s.main}>
        <div className={s.scene} ref={sceneRef} aria-hidden="true">
          <span className={[s.digit, s.d1].join(' ')}>4</span>

          {/* The "0" is a little booking card / clock */}
          <span className={[s.zero, s.dz].join(' ')}>
            <span className={s.clock}>
              <span className={s.tick} style={{ transform: 'rotate(0deg)' }} />
              <span className={s.tick} style={{ transform: 'rotate(90deg)' }} />
              <span className={s.tick} style={{ transform: 'rotate(180deg)' }} />
              <span className={s.tick} style={{ transform: 'rotate(270deg)' }} />
              <span className={s.handHour} />
              <span className={s.handMin} />
              <span className={s.center} />
              <span className={s.miss}><CalendarX2 size={20} /></span>
            </span>
          </span>

          <span className={[s.digit, s.d2].join(' ')}>4</span>
        </div>

        <div className={s.copy}>
          <span className={s.eyebrow}><Compass size={14} /> {t('notFound.eyebrow')}</span>
          <h1 className={s.title}>{t('notFound.title')}</h1>
          <p className={s.text}>{t('notFound.text')}</p>

          <div className={s.actions}>
            <Link to="/" className={s.primary}>
              <Home size={17} /> {t('notFound.home')}
            </Link>
            <a href="#" className={s.ghost} onClick={e => { e.preventDefault(); history.back() }}>
              <Search size={16} /> {t('notFound.back')}
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
