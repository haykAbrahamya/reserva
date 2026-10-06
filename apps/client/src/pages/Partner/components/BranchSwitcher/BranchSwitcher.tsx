import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react'
import { Check } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { useT, useLocalized } from '@/i18n'
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
 * Cards rather than pills: picking a branch changes every price below it, so it
 * reads as choosing a PLACE (name, street, open now) — not as one more filter
 * next to the category chips, which look and behave differently. A radio group
 * (arrow keys move the choice, like native radios): a grid on wide screens, a
 * swipeable row on phones where the next card peeks in to show there is more.
 */
export function BranchSwitcher({ branches, value, onChange }: Props) {
  const t = useT()
  const loc = useLocalized()
  const railRef = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  // Evaluated once per visit: the status is a hint, not a live clock.
  const now = useMemo(() => new Date(), [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = branches.findIndex((b) => b.id === value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = branches[(i + step + branches.length) % branches.length]
    onChange(next.id)
    refs.current[branches.indexOf(next)]?.focus()
  }

  // On a phone the chosen card may start off-screen (remembered from a past
  // visit, or picked in another section): bring it into the row's view without
  // moving the page.
  useEffect(() => {
    const rail = railRef.current
    const card = refs.current[branches.findIndex((b) => b.id === value)]
    if (!rail || !card || rail.scrollWidth <= rail.clientWidth) return
    const left = card.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft || '0')
    if (left < rail.scrollLeft || card.offsetLeft + card.offsetWidth > rail.scrollLeft + rail.clientWidth) {
      rail.scrollTo({ left, behavior: 'smooth' })
    }
  }, [value, branches])

  /** "Open until 20:00" / "Opens 11:00" / "Opens tomorrow 10:00" / "Closed". */
  const statusOf = (hours: PublicPartner['locations'][number]['hours']) => {
    const st = weekState(windowsOfHours(hours), now)
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
  }

  return (
    <div className={s.wrap}>
      {/* No heading: the cards say what they are. The group is still named for
          screen readers. */}
      <div
        ref={railRef}
        className={s.cards}
        role="radiogroup"
        aria-label={t('partner.branches.choose')}
        onKeyDown={onKeyDown}
      >
        {branches.map((b, i) => {
          const on = b.id === value
          const status = statusOf(b.hours)
          return (
            <button
              key={b.id}
              ref={(el) => { refs.current[i] = el }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={[s.card, on ? s.on : ''].filter(Boolean).join(' ')}
              onClick={() => onChange(b.id)}
            >
              <span className={s.radio} aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
              <span className={s.body}>
                <span className={s.name}>{loc(b.name, b.nameI18n)}</span>
                {b.address && <span className={s.address}>{b.address}</span>}
                {status && (
                  <span className={[s.status, status.open ? s.statusOpen : ''].filter(Boolean).join(' ')}>
                    <span className={s.statusDot} aria-hidden />
                    {status.text}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
