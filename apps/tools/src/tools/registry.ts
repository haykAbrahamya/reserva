import { lazy, type ComponentType, type CSSProperties, type LazyExoticComponent } from 'react'
import { CalendarCheck, CalendarClock, Columns2, Gift, ReceiptText, type LucideIcon } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// The tool registry — the ONE place a tool is declared.
//
// The home grid, the router and the tool page layout all read from here, so
// adding a tool is one entry below plus its own folder next to this file.
// Copy (title, tag, description) lives in i18n under `tools.<id>`.
// ─────────────────────────────────────────────────────────────

export type ToolId = 'priceList' | 'freeSlots' | 'beforeAfter' | 'appointmentCard' | 'giftCertificate'

/** Card artwork hue — see `--tool-*` in styles/theme.css. */
export type ToolHue = 'rose' | 'sage' | 'sky' | 'sand' | 'plum'

export interface Tool {
  id: ToolId
  /** Path on tools.reserva.am. Permanent once live: it gets shared and indexed. */
  path: string
  icon: LucideIcon
  hue: ToolHue
  /** The tool's page, code-split. Absent = shown on the grid as "soon", no route. */
  page?: LazyExoticComponent<ComponentType>
}

export type LiveTool = Tool & { page: NonNullable<Tool['page']> }

export const TOOLS: readonly Tool[] = [
  {
    id: 'priceList',
    path: '/price-list',
    icon: ReceiptText,
    hue: 'sand',
    page: lazy(() => import('./price-list/PriceListPage').then((m) => ({ default: m.PriceListPage }))),
  },
  {
    id: 'freeSlots',
    path: '/free-slots',
    icon: CalendarClock,
    hue: 'sage',
    page: lazy(() => import('./free-slots/FreeSlotsPage').then((m) => ({ default: m.FreeSlotsPage }))),
  },
  {
    id: 'beforeAfter',
    path: '/before-after',
    icon: Columns2,
    hue: 'rose',
    page: lazy(() => import('./before-after/BeforeAfterPage').then((m) => ({ default: m.BeforeAfterPage }))),
  },
  {
    id: 'appointmentCard',
    path: '/appointment-card',
    icon: CalendarCheck,
    hue: 'sky',
    page: lazy(() =>
      import('./appointment-card/AppointmentCardPage').then((m) => ({ default: m.AppointmentCardPage })),
    ),
  },
  {
    id: 'giftCertificate',
    path: '/gift-certificate',
    icon: Gift,
    hue: 'plum',
    page: lazy(() =>
      import('./gift-certificate/GiftCertificatePage').then((m) => ({ default: m.GiftCertificatePage })),
    ),
  },
]

export const isLive = (tool: Tool): tool is LiveTool => Boolean(tool.page)

export function toolById(id: ToolId): Tool {
  const tool = TOOLS.find((t) => t.id === id)
  if (!tool) throw new Error(`Unknown tool: ${id}`)
  return tool
}

/** The two custom properties every tool-coloured surface reads. */
export function toolHueStyle(hue: ToolHue): CSSProperties {
  return {
    '--tool': `var(--tool-${hue})`,
    '--tool-soft': `var(--tool-${hue}-soft)`,
  } as CSSProperties
}
