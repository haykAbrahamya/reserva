import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { MapPin } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { useT, useLocalized } from '@/i18n'
import { track } from '@/services/analytics.service'
import { dayKeyOf, nextDayKey, weekState, windowsOfHours } from '../../lib/openHours'
import s from './BranchSwitcher.module.scss'

interface Props {
  branches: PublicPartner['locations']
  value: string
  onChange: (id: string) => void
}

/**
 * "Which branch are you visiting?" — for multi-branch salons whose services or
 * prices differ by branch.
 *
 * The branch names are set as part of the section heading: serif words in a
 * row, the chosen one in full colour with an accent underline that slides
 * between them. No box, no fill — it reads as where the menu below applies,
 * never as one more row of pills beside the search and the category chips.
 * The chosen branch's street and opening status sit on one quiet line below.
 *
 * A radio group: arrow keys move the choice, like native radios.
 */
export function BranchSwitcher({ branches, value, onChange }: Props) {
  const t = useT()
  const loc = useLocalized()
  const rowRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // Evaluated once per visit: the status is a hint, not a live clock.
  const now = useMemo(() => new Date(), [])

  const index = Math.max(0, branches.findIndex((b) => b.id === value))
  const current = branches[index]
  const labels = branches.map((b) => loc(b.name, b.nameI18n))

  // ── The sliding underline ──
  // Measured from the chosen name, so it fits any name in any language.
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null)
  // More names than fit: the row scrolls, and its far edge fades.
  const [overflow, setOverflow] = useState(false)
  // Slide only once placed — no sweep in from the left on page load.
  const [animate, setAnimate] = useState(false)

  const measure = useCallback(() => {
    const row = rowRef.current
    const tab = tabRefs.current[index]
    if (tab) setInk({ x: tab.offsetLeft, w: tab.offsetWidth })
    if (row) setOverflow(row.scrollWidth > row.clientWidth + 1)
  }, [index])

  // Before paint, so the first frame already shows the underline in place.
  const labelsKey = labels.join('|')
  useLayoutEffect(() => { measure() }, [measure, labelsKey])

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null
    ro?.observe(row)
    // Web fonts arriving late can change the width of every name.
    document.fonts?.ready.then(() => measure()).catch(() => {})
    return () => ro?.disconnect()
  }, [measure])

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // A scrolling row keeps the chosen name in view (never moves the page).
  useEffect(() => {
    const row = rowRef.current
    const tab = tabRefs.current[index]
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return
    const left = tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2
    row.scrollTo({ left, behavior: animate ? 'smooth' : 'auto' })
  }, [index, animate])

  // Only clicks and arrow keys get here — the initial branch never does — so
  // every real change is the visitor's own switch.
  const pick = (id: string) => {
    if (id !== value) track('branch_switch', { loc: id })
    onChange(id)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + branches.length) % branches.length
    pick(branches[next].id)
    tabRefs.current[next]?.focus()
  }

  // ── "Open until 20:00" / "Opens 11:00" / "Opens tomorrow 10:00" / "Closed" ──
  const status = useMemo(() => {
    const st = weekState(windowsOfHours(current?.hours), now)
    if (!st) return null
    if (st.open) return { open: true, text: t('partner.branches.openUntil', { time: st.window!.end }) }
    if (!st.window) return { open: false, text: t('salons.open.closed') }
    if (!st.day) return { open: false, text: t('salons.open.opensAt', { time: st.window.start }) }
    if (st.day === nextDayKey(dayKeyOf(now))) {
      return { open: false, text: t('partner.branches.opensTomorrow', { time: st.window.start }) }
    }
    return {
      open: false,
      text: t('salons.open.opensDay', { day: t(`partner.locations.days.${st.day}`), time: st.window.start }),
    }
  }, [current, now, t])

  return (
    <div className={s.wrap}>
      <div
        ref={rowRef}
        className={[s.tabs, animate ? s.animate : '', ink ? '' : s.noInk, overflow ? s.overflow : '']
          .filter(Boolean)
          .join(' ')}
        role="radiogroup"
        aria-label={t('partner.branches.choose')}
        onKeyDown={onKeyDown}
      >
        {branches.map((b, i) => {
          const on = i === index
          return (
            <button
              key={b.id}
              ref={(el) => { tabRefs.current[i] = el }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={[s.tab, on ? s.on : ''].filter(Boolean).join(' ')}
              onClick={() => pick(b.id)}
            >
              {labels[i]}
            </button>
          )
        })}
        {ink && (
          <span
            className={s.ink}
            style={{ width: ink.w, transform: `translateX(${ink.x}px)` }}
            aria-hidden
          />
        )}
      </div>

      {/* Keyed by branch so it fades in fresh on every switch. */}
      {(current?.address || status) && (
        <div key={current?.id} className={s.info}>
          {current?.address && (
            <span className={s.where}>
              <MapPin size={13} />
              <span className={s.address}>{current.address}</span>
            </span>
          )}
          {status && (
            <span className={[s.status, status.open ? s.statusOpen : ''].filter(Boolean).join(' ')}>
              <span className={s.statusDot} aria-hidden />
              {status.text}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
