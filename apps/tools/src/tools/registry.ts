import { lazy, type ComponentType, type CSSProperties, type LazyExoticComponent } from 'react'
import {
  BadgePercent,
  CalendarCheck,
  CalendarClock,
  Columns2,
  Gift,
  GraduationCap,
  IdCard,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// The tool registry — the ONE place a tool is declared.
//
// The home grid, the router and the tool page layout all read from here, so
// adding a tool is one entry below plus its own folder next to this file.
// Copy (title, tag, description) lives in i18n under `tools.<id>`.
// ─────────────────────────────────────────────────────────────

export type ToolId =
  | 'priceList'
  | 'promo'
  | 'freeSlots'
  | 'beforeAfter'
  | 'appointmentCard'
  | 'giftCertificate'
  | 'businessCard'
  | 'courseCertificate'

/** Card artwork hue — see `--tool-*` in styles/theme.css. */
export type ToolHue = 'rose' | 'sage' | 'sky' | 'sand' | 'plum' | 'coral' | 'ink' | 'gold'

/** How a finished sample sits on the home card: a tall story, a 4:5 post, a wide card or post, a phone screen. */
export type ExampleShape = 'story' | 'post' | 'landscape' | 'screen'

export interface Tool {
  id: ToolId
  /** Path on tools.reserva.am. Permanent once live: it gets shared and indexed. */
  path: string
  icon: LucideIcon
  hue: ToolHue
  /** The tool's page, code-split. Absent = shown on the grid as "soon", no route. */
  page?: LazyExoticComponent<ComponentType>
  /**
   * The finished sample its home card shows (see exampleSrc). `themed`: a page
   * that follows the site's theme rather than an image, so kept in light and dark.
   */
  example?: { shape: ExampleShape; themed?: boolean }
}

export type LiveTool = Tool & { page: NonNullable<Tool['page']> }

export const TOOLS: readonly Tool[] = [
  {
    id: 'priceList',
    path: '/price-list',
    icon: ReceiptText,
    hue: 'sand',
    page: lazy(() => import('./price-list/PriceListPage').then((m) => ({ default: m.PriceListPage }))),
    example: { shape: 'story' },
  },
  {
    id: 'promo',
    path: '/promo',
    icon: BadgePercent,
    hue: 'coral',
    page: lazy(() => import('./promo/PromoPage').then((m) => ({ default: m.PromoPage }))),
    example: { shape: 'story' },
  },
  {
    id: 'courseCertificate',
    path: '/course-certificate',
    icon: GraduationCap,
    hue: 'gold',
    page: lazy(() => import('./course-certificate/CertificatePage').then((m) => ({ default: m.CertificatePage }))),
    example: { shape: 'landscape' },
  },
  {
    id: 'freeSlots',
    path: '/free-slots',
    icon: CalendarClock,
    hue: 'sage',
    page: lazy(() => import('./free-slots/FreeSlotsPage').then((m) => ({ default: m.FreeSlotsPage }))),
    example: { shape: 'story' },
  },
  {
    id: 'giftCertificate',
    path: '/gift-certificate',
    icon: Gift,
    hue: 'plum',
    page: lazy(() =>
      import('./gift-certificate/GiftCertificatePage').then((m) => ({ default: m.GiftCertificatePage })),
    ),
    example: { shape: 'landscape' },
  },
  {
    id: 'beforeAfter',
    path: '/before-after',
    icon: Columns2,
    hue: 'rose',
    page: lazy(() => import('./before-after/BeforeAfterPage').then((m) => ({ default: m.BeforeAfterPage }))),
    example: { shape: 'landscape' },
  },
  {
    id: 'appointmentCard',
    path: '/appointment-card',
    icon: CalendarCheck,
    hue: 'sky',
    page: lazy(() =>
      import('./appointment-card/AppointmentCardPage').then((m) => ({ default: m.AppointmentCardPage })),
    ),
    example: { shape: 'screen', themed: true },
  },
  {
    id: 'businessCard',
    path: '/business-card',
    icon: IdCard,
    hue: 'ink',
    page: lazy(() => import('./business-card/BusinessCardPage').then((m) => ({ default: m.BusinessCardPage }))),
    example: { shape: 'post' },
  },
]

export const isLive = (tool: Tool): tool is LiveTool => Boolean(tool.page)

export function toolById(id: ToolId): Tool {
  const tool = TOOLS.find((t) => t.id === id)
  if (!tool) throw new Error(`Unknown tool: ${id}`)
  return tool
}

/**
 * A tool's sample picture in a language (and theme, when it has both). Made
 * by scripts/render-examples.mjs from the tool itself: re-run it after
 * changing how a tool looks.
 */
export function exampleSrc(tool: Tool, locale: string, dark: boolean): string {
  return `/examples/${tool.id}-${locale}${dark && tool.example?.themed ? '-dark' : ''}.webp`
}

/** The live tool at this path, if it is one ('/price-list' → the price list). */
export function toolForPath(path: string): LiveTool | undefined {
  return TOOLS.filter(isLive).find((t) => t.path === path)
}

/** The two custom properties every tool-coloured surface reads. */
export function toolHueStyle(hue: ToolHue): CSSProperties {
  return {
    '--tool': `var(--tool-${hue})`,
    '--tool-soft': `var(--tool-${hue}-soft)`,
  } as CSSProperties
}
