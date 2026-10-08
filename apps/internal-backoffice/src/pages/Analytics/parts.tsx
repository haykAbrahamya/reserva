import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button, type SelectOption } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { ApiError } from '@/services/http'
import { errorMessage } from '@/services/errors'
import { partnersService } from '@/services/partners.service'
import type { Kpi } from '@/services/analytics.service'
import { eventDef } from './catalog'
import { fmtInt, fmtShare, kpiDelta } from './format'
import s from './Analytics.module.scss'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** A titled card. `flush` drops the body padding for edge-to-edge tables. */
export function Panel({ title, sub, action, flush, className, children }: {
  title: ReactNode
  sub?: ReactNode
  action?: ReactNode
  flush?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cx(s.panel, className)}>
      <header className={s.panelHead}>
        <div className={s.panelHeading}>
          <h2 className={s.panelTitle}>{title}</h2>
          {sub && <p className={s.panelSub}>{sub}</p>}
        </div>
        {action && <div className={s.panelAction}>{action}</div>}
      </header>
      <div className={flush ? s.panelFlush : s.panelBody}>{children}</div>
    </section>
  )
}

/** ▲ 12.4% / ▼ 3.1% / ▲ new / — : direction is carried by the glyph as well as
 *  the colour, so it survives colour-blindness and greyscale. */
export function DeltaChip({ kpi, baseline }: { kpi: Kpi; baseline: string }) {
  const d = kpiDelta(kpi)
  const glyph = d.dir === 'up' || d.dir === 'new' ? '▲' : d.dir === 'down' ? '▼' : null
  const spoken =
    d.dir === 'new' ? 'new, nothing before'
      : d.dir === 'flat' ? 'no change'
        : `${d.dir} ${d.text}`
  return (
    <span
      className={cx(s.delta, s[d.dir])}
      title={`${fmtInt(kpi.prev)} in ${baseline}`}
      aria-label={`${spoken} versus ${baseline}`}
    >
      {glyph && <span className={s.deltaGlyph} aria-hidden="true">{glyph}</span>}
      {d.text}
    </span>
  )
}

export function KpiTile({ label, note, kpi, baseline }: {
  label: string
  /** Where a number comes from when it is not the tracker, e.g. "from bookings". */
  note?: string
  kpi: Kpi
  /** What the delta compares with; null hides it (All has no earlier period). */
  baseline: string | null
}) {
  return (
    <div className={s.kpi}>
      <div className={s.kpiLabel}>
        {label}
        {note && <span className={s.kpiNote}>{note}</span>}
      </div>
      <div className={s.kpiValue}>{fmtInt(kpi.value)}</div>
      {baseline && (
        <div className={s.kpiFoot}>
          <DeltaChip kpi={kpi} baseline={baseline} />
          <span className={s.kpiPrev}>vs {fmtInt(kpi.prev)}</span>
        </div>
      )}
    </div>
  )
}

export interface BarItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  value: number
  /** Secondary figure after the label, e.g. "980 visitors". */
  meta?: string
  /** Native tooltip for the whole row. */
  hint?: string
}

/**
 * Ranked horizontal bars: label, count and share on one line, the bar under it.
 * Bars scale to the largest row (not to 100%), so the smaller rows stay
 * comparable instead of shrinking to slivers next to a dominant first one.
 */
export function BarList({ items, total }: { items: BarItem[]; total?: number }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  const sum = total ?? items.reduce((acc, i) => acc + i.value, 0)
  return (
    <ul className={s.bars}>
      {items.map((it) => (
        <li key={it.key} className={s.barRow} title={it.hint}>
          <div className={s.barHead}>
            {it.icon && <span className={s.barIcon}>{it.icon}</span>}
            <span className={s.barLabel}>{it.label}</span>
            {it.meta && <span className={s.barMeta}>{it.meta}</span>}
            <span className={s.barValue}>{fmtInt(it.value)}</span>
            <span className={s.barShare}>{fmtShare(it.value, sum)}</span>
          </div>
          <div className={s.barTrack}>
            <span className={s.barFill} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function EventBadge({ name }: { name: string }) {
  const def = eventDef(name)
  return (
    <span className={cx(s.evBadge, s[`tone_${def.tone}`])} title={name}>
      <span className={s.evDot} />
      {def.label}
    </span>
  )
}

/** Marks a session flagged as staff traffic (contract §6). */
export function StaffTag() {
  return <span className={s.staffTag} title="Staff traffic — a browser signed in to a Reserva backoffice">Staff</span>
}

export function Skeleton({ height, className }: { height: number; className?: string }) {
  return <div className={cx(s.skel, className)} style={{ height }} aria-hidden="true" />
}

/** A small empty state that lives inside a panel and says what will appear. */
export function PanelEmpty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className={s.panelEmpty}>
      <Icon size={22} strokeWidth={1.5} className={s.panelEmptyIcon} />
      <p className={s.panelEmptyTitle}>{title}</p>
      {children && <p className={s.panelEmptyText}>{children}</p>}
    </div>
  )
}

/**
 * The console's messages are written for forms and records; for a read-only
 * report a 404 means the analytics API itself is missing on this server (the
 * frontend shipped first), which "That item could no longer be found" misstates.
 */
export function analyticsErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) {
    return 'The analytics API isn’t available on this server yet.'
  }
  return errorMessage(err)
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className={s.errorState} role="alert">
      <TriangleAlert size={26} strokeWidth={1.5} className={s.errorIcon} />
      <p className={s.errorTitle}>Couldn’t load analytics</p>
      <p className={s.errorText}>{analyticsErrorMessage(error)}</p>
      <Button size="sm" onClick={onRetry}>
        <RefreshCw size={13} /> Try again
      </Button>
    </div>
  )
}

export const ALL = '__all__'

/**
 * Partner choices for the filters: every partner (100 is the API's page cap and
 * covers the roster). A drilled-into partner missing
 * from that list still gets a readable option instead of a blank trigger.
 */
export function usePartnerOptions(selectedId: string, fallbackName?: string | null): SelectOption[] {
  const { data } = useResource(() => partnersService.list({ pageSize: 100 }), [])
  const options: SelectOption[] = [
    { value: ALL, label: 'All partners' },
    ...(data?.items ?? []).map((p) => ({ value: p.id, label: p.name, sub: p.slug })),
  ]
  if (selectedId && !options.some((o) => o.value === selectedId)) {
    options.push({ value: selectedId, label: fallbackName || 'Selected partner' })
  }
  return options
}
