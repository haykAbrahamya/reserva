import {
  ArrowUpRight, BadgeCheck, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, ChevronsRight, Circle, Columns2,
  Copy, Crop, Download, Eraser, ExternalLink, FileDown, FileText, Gift, Globe, GraduationCap, Hand, Hash, Home, ImageMinus,
  ImagePlus, Images, LayoutGrid, ListChecks, LogOut, MapPin, Maximize2, MessageCircle, MessageSquareHeart,
  MessageSquarePlus, MessageSquareWarning, Minus, MousePointerClick, Navigation, Palette, PenLine, Phone, Plus,
  ReceiptText, RectangleVertical, Search, Send, Share2, SlidersHorizontal, Smartphone, Sparkles, Star, Store, SunMoon,
  Tag, TriangleAlert, UserPlus, UserRound, Wrench, type LucideIcon,
} from 'lucide-react'
import type { SessionEvent, SessionRow } from '@/services/analytics.service'
import {
  CTA_FROM_LABELS, IN_APP_LABELS, SIGNUP_STEP_LABELS, TOOL_ERROR_LABELS, TOOL_LABELS, UI_LANGUAGE_LABELS, eventDef, humanize,
  labelFrom, toolValueLabel, type EventTone,
} from './catalog'
import { ContactIcon } from './icons'
import { isUuid } from './format'

// ─────────────────────────────────────────────────────────────
// A visit told as a story: one icon and one plain sentence per event, built
// from the event catalog and the server's id → name `labels`, so staff read
// "Clicked Book on Gel polish manicure", never a uuid.
// ─────────────────────────────────────────────────────────────

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Each tool's own glyph — the one its card wears on tools.reserva.am. */
const TOOL_ICON: Record<string, LucideIcon> = {
  priceList: ReceiptText,
  freeSlots: CalendarClock,
  beforeAfter: Columns2,
  appointmentCard: CalendarCheck,
  giftCertificate: Gift,
}

const TOOL_ACT_ICON: Record<string, LucideIcon> = {
  theme: Palette,
  add: Plus,
  remove: Minus,
  clear: Eraser,
  day: CalendarDays,
  photo: ImagePlus,
  photo_remove: ImageMinus,
  adjust: Crop,
  format: RectangleVertical,
  layout: Columns2,
  code: Hash,
  open: ExternalLink,
  preview: Smartphone,
  zoom: Maximize2,
}

const EXPORT_ICON: Record<string, LucideIcon> = {
  share: Share2,
  download: Download,
  pdf: FileDown,
  viber: MessageCircle,
  copy: Copy,
  hold: Hand,
}

const VISIT_ICON: Record<string, LucideIcon> = {
  calendar: CalendarPlus,
  directions: Navigation,
  call: Phone,
  made: Sparkles,
}

/** One glyph per event (and per page type / contact channel when props are
 *  known), shared by the journey preview chips and the timeline. */
export function EventIcon({ name, props, size = 14 }: { name: string; props?: Record<string, unknown>; size?: number }) {
  switch (name) {
    case 'page_view':
      switch (str(props?.pt)) {
        case 'partner': return <Store size={size} />
        case 'marketplace': return <LayoutGrid size={size} />
        case 'signup': return <UserPlus size={size} />
        case 'home': return <Home size={size} />
        case 'tools': return <Wrench size={size} />
        case 'visit': return <CalendarCheck size={size} />
        case 'tool': {
          const Icon = TOOL_ICON[str(props?.tool) ?? ''] ?? Wrench
          return <Icon size={size} />
        }
        default: return <FileText size={size} />
      }
    case 'book_click': return <CalendarPlus size={size} />
    case 'contact_click': return <ContactIcon channel={str(props?.ch) ?? ''} size={size} />
    case 'branch_switch': return <MapPin size={size} />
    case 'category_select': return <Tag size={size} />
    case 'service_search':
    case 'salons_search': return <Search size={size} />
    case 'specialist_open': return <UserRound size={size} />
    case 'gallery_open': return <Images size={size} />
    case 'course_open':
    case 'course_register_click': return <GraduationCap size={size} />
    case 'reviews_open': return <Star size={size} />
    case 'review_form_open': return <MessageSquarePlus size={size} />
    case 'review_success': return <MessageSquareHeart size={size} />
    case 'review_error': return <MessageSquareWarning size={size} />
    case 'booking_open': return <CalendarDays size={size} />
    case 'booking_step':
    case 'signup_step': return <ChevronsRight size={size} />
    case 'booking_submit':
    case 'signup_submit': return <Send size={size} />
    case 'booking_success': return <CalendarCheck size={size} />
    case 'signup_success': return <BadgeCheck size={size} />
    case 'booking_error':
    case 'signup_error': return <TriangleAlert size={size} />
    case 'booking_close': return <LogOut size={size} />
    case 'signup_start': return <PenLine size={size} />
    case 'salons_filter': return <SlidersHorizontal size={size} />
    case 'salon_click': return <Store size={size} />
    case 'tool_select': return <MousePointerClick size={size} />
    case 'tool_edit': return <PenLine size={size} />
    case 'tool_action': {
      const Icon = TOOL_ACT_ICON[str(props?.act) ?? ''] ?? MousePointerClick
      return <Icon size={size} />
    }
    case 'tool_export': {
      if (str(props?.via) === 'whatsapp') return <ContactIcon channel="whatsapp" size={size} />
      const Icon = EXPORT_ICON[str(props?.via) ?? ''] ?? Download
      return <Icon size={size} />
    }
    case 'tool_error': return <TriangleAlert size={size} />
    case 'cta_click': return <ArrowUpRight size={size} />
    case 'visit_action': {
      const Icon = VISIT_ICON[str(props?.act) ?? ''] ?? CalendarCheck
      return <Icon size={size} />
    }
    case 'pref_change': return str(props?.what) === 'lang' ? <Globe size={size} /> : <SunMoon size={size} />
    case 'browser_open': return str(props?.how) === 'copy' ? <Copy size={size} /> : <ExternalLink size={size} />
    default: return name.endsWith('_step') ? <ListChecks size={size} /> : <Circle size={size - 4} />
  }
}

/** Where on the page a Book / contact tap came from (`from`), in words. */
const FROM: Record<string, string> = {
  hero: 'top of the page',
  nav: 'menu',
  services: 'services list',
  team: 'team section',
  specialist: 'specialist card',
  locations: 'branches',
  footer: 'footer',
  courses: 'courses',
  fab: 'floating button',
}

const BOOKING_STEP_DOING: Record<string, string> = {
  branch: 'choosing a branch',
  service: 'choosing a service',
  specialist: 'choosing a specialist',
  datetime: 'picking a time',
  details: 'entering their details',
  confirm: 'reviewing the booking',
}

const BOOKING_STEP_NOUN: Record<string, string> = {
  branch: 'branch',
  service: 'service',
  specialist: 'specialist',
  datetime: 'time',
  details: 'details',
  confirm: 'confirmation',
}

const CONTACT_VERB: Record<string, string> = {
  call: 'Tapped Call',
  whatsapp: 'Tapped WhatsApp',
  instagram: 'Opened Instagram',
  facebook: 'Opened Facebook',
  telegram: 'Opened Telegram',
  directions: 'Opened directions',
  website: 'Opened the website',
  email: 'Tapped Email',
}

export interface StoryLine {
  text: string
  tone: EventTone
  /** The visit ended here (left mid-booking). */
  end?: boolean
}

/**
 * The sentence for one event. `labels` names the ids in props; a missing name
 * (the service was deleted since) falls back to a generic noun, never a uuid.
 */
export function describeEvent(
  ev: SessionEvent,
  ctx: { labels: Record<string, string>; partners: { name: string; slug: string | null }[]; isLast: boolean },
): StoryLine {
  const p = ev.props ?? {}
  const tone = eventDef(ev.name).tone
  const named = (v: unknown, fallback: string): string | null => {
    const id = str(v)
    if (!id) return null
    return ctx.labels[id] ?? (isUuid(id) ? fallback : id)
  }
  const svc = named(p.svc, 'a service')
  const sp = named(p.sp, 'a specialist')
  const loc = named(p.loc, 'a branch')
  const from = str(p.from)
  const fromText = from ? ` (${FROM[from] ?? from})` : ''
  const withAt = `${sp ? ` with ${sp}` : ''}${loc ? ` at ${loc}` : ''}`
  // tools.reserva.am: the tool by name — as a sentence's subject, and inside one.
  const toolName = labelFrom(TOOL_LABELS, str(p.tool))
  const tool = toolName.toLowerCase()
  const line = (text: string, extra: Partial<StoryLine> = {}): StoryLine => ({ text, tone, ...extra })

  switch (ev.name) {
    case 'page_view':
      switch (str(p.pt)) {
        case 'partner': return line(`Opened ${ev.partner?.name ?? 'a partner'} — partner page`)
        case 'home': return line('Opened the home page')
        case 'marketplace': return line('Opened the salons list')
        case 'signup': return line('Opened the sign-up page')
        case 'tools': return line('Opened the tools home')
        case 'tool': return line(`Opened the ${tool} tool`)
        case 'visit': return line('A client opened an appointment card')
        default: return line(`Opened ${ev.path || 'a page'}`)
      }
    case 'book_click':
      return line(`Clicked Book${svc ? ` on ${svc}` : ''}${withAt}${fromText}`)
    case 'contact_click': {
      const ch = str(p.ch)
      return line(`${(ch && CONTACT_VERB[ch]) ?? `Tapped ${ch ?? 'a contact link'}`}${loc ? ` for ${loc}` : ''}${fromText}`)
    }
    case 'branch_switch':
      return line(`Switched branch to ${loc ?? 'another branch'}`)
    case 'category_select':
      return line(str(p.cat) ? `Picked category ${str(p.cat)}` : 'Picked a category')
    case 'service_search':
      return line(`Searched services for “${str(p.q) ?? ''}”`)
    case 'specialist_open':
      return line(sp ? `Opened specialist ${sp}` : 'Opened a specialist')
    case 'gallery_open':
      return line(str(p.kind) === 'works' ? 'Opened the works gallery' : 'Opened the gallery')
    case 'course_open':
      return line(`Opened course ${named(p.course, 'a course') ?? ''}`.trim())
    case 'course_register_click':
      return line(`Clicked Sign up for ${named(p.course, 'a course') ?? 'a course'}`)
    case 'reviews_open':
      switch (str(p.from)) {
        case 'hero': return line('Clicked the rating to see the reviews')
        case 'tab': return line('Opened the Reviews tab')
        default: return line('Opened the reviews')
      }
    case 'review_form_open':
      return line(`Opened the review form${sp ? ` for ${sp}` : ''}`)
    case 'review_success': {
      const stars = typeof p.stars === 'number' ? `${p.stars}★ ` : ''
      return line(`Left a ${stars}review${sp ? ` for ${sp}` : ''} ✓`)
    }
    case 'review_error':
      return str(p.code) === 'no_stars'
        ? line('Tried to send the review without choosing stars')
        : line(`Review not sent${str(p.code) ? ` (${str(p.code)})` : ''}`)
    case 'booking_open':
      return line(`Opened booking${svc ? ` for ${svc}` : ''}${withAt}${fromText}`)
    case 'booking_step': {
      const step = str(p.step)
      return line(`Booking: ${(step && BOOKING_STEP_DOING[step]) ?? `${humanize(step ?? 'next')} step`}`)
    }
    case 'booking_submit':
      return line(`Sent the booking${p.any === true ? ' (any specialist)' : ''}`)
    case 'booking_success': {
      const what = [svc, sp && `with ${sp}`, loc && `at ${loc}`].filter(Boolean).join(' ')
      return line(`Booked ✓${what ? ` — ${what}` : ''}`)
    }
    case 'booking_error':
      return line(`Booking failed${str(p.code) ? ` (${str(p.code)})` : ''}`)
    case 'booking_close': {
      const step = str(p.step)
      const noun = (step && BOOKING_STEP_NOUN[step]) ?? step ?? 'booking'
      // Closing the booking as the visit's last act is where they gave up.
      return ctx.isLast
        ? line(`Left at the ${noun} step`, { end: true })
        : line(`Closed the booking at the ${noun} step`)
    }
    case 'signup_start':
      return line('Started the sign-up form')
    case 'signup_step': {
      const step = str(p.step)
      return line(`Sign-up: ${step ? (SIGNUP_STEP_LABELS[step] ?? humanize(step)).toLowerCase() : 'next step'}`)
    }
    case 'signup_submit':
      return line('Sent the sign-up form')
    case 'signup_error':
      return line(`Sign-up error${str(p.field) ? ` in “${str(p.field)}”` : ''}${str(p.code) ? ` (${str(p.code)})` : ''}`)
    case 'signup_success':
      return line('Signed up ✓')
    case 'salons_search':
      return line(`Searched salons for “${str(p.q) ?? ''}”`)
    case 'salons_filter': {
      const by = [str(p.cat), str(p.area)].filter(Boolean).join(', ')
      return line(by ? `Filtered salons: ${by}` : 'Filtered salons')
    }
    case 'salon_click': {
      const slug = str(p.slug)
      // The marketplace knows the salon by slug; the visit's own partner list
      // usually has its name.
      const name = ctx.partners.find((x) => x.slug === slug)?.name ?? slug ?? 'a salon'
      const pos = typeof p.pos === 'number' ? ` (#${p.pos + 1} in the list)` : ''
      return line(`Opened ${name} from the salons list${pos}`)
    }
    case 'tool_select': {
      const pos = typeof p.pos === 'number' ? ` (card ${p.pos + 1})` : ''
      return line(`Picked the ${tool} tool on the home grid${pos}`)
    }
    case 'tool_edit':
      return line(`Started filling in the ${tool}`)
    case 'tool_action': {
      const v = str(p.v)
      const act = str(p.act)
      const choice = v ? toolValueLabel(v) : null
      // 'the before photo', or just 'the photo'.
      const side = choice ? `${choice.toLowerCase()} ` : ''
      switch (act) {
        case 'theme': return line(`${toolName}: picked ${choice ? `the ${choice}` : 'a'} style`)
        case 'add': return line(`${toolName}: added a row`)
        case 'remove': return line(`${toolName}: removed a row`)
        case 'clear': return line(`${toolName}: cleared the list`)
        case 'day': return line(`${toolName}: picked ${choice?.toLowerCase() ?? 'a day'}`)
        case 'photo': return line(`${toolName}: added the ${side}photo`)
        case 'photo_remove': return line(`${toolName}: removed the ${side}photo`)
        case 'adjust': return line(`${toolName}: framed the ${side}photo`)
        case 'format': return line(`${toolName}: switched to ${choice ?? 'another format'}`)
        case 'layout': return line(`${toolName}: switched to ${choice?.toLowerCase() ?? 'another layout'}`)
        case 'code': return line(`${toolName}: took a new card number`)
        case 'open': return line(`${toolName}: opened the page the client will see`)
        case 'preview': return line(`${toolName}: looked at the preview on a phone`)
        case 'zoom': return line(`${toolName}: opened the result full size`)
        default: return line(`${toolName}: ${humanize(act ?? 'an action').toLowerCase()}${choice ? ` (${choice})` : ''}`)
      }
    }
    case 'tool_export': {
      const how: Record<string, string> = {
        share: `Shared the ${tool} from the share sheet`,
        download: `Downloaded the ${tool}`,
        pdf: `Downloaded the ${tool} as a PDF`,
        whatsapp: `Sent the ${tool} on WhatsApp`,
        viber: `Sent the ${tool} on Viber`,
        copy: `Copied the ${tool} link`,
        hold: `Was shown the ${tool} to press and hold (in an app’s browser)`,
      }
      const style = str(p.theme) ? ` · ${toolValueLabel(str(p.theme))} style` : ''
      const items = typeof p.n === 'number' ? ` · ${p.n} ${p.n === 1 ? 'item' : 'items'}` : ''
      return line(`${how[str(p.via) ?? ''] ?? `Took the ${tool} away`} ✓${style}${items}`)
    }
    case 'tool_error':
      return line(`${str(p.tool) ? `${toolName}: ` : ''}${labelFrom(TOOL_ERROR_LABELS, str(p.code)).toLowerCase()}`)
    case 'cta_click':
      return line(`Clicked through to reserva.am — ${labelFrom(CTA_FROM_LABELS, str(p.from)).toLowerCase()}`)
    case 'visit_action':
      switch (str(p.act)) {
        case 'calendar': return line('The client added it to their calendar')
        case 'directions': return line('The client opened the directions')
        case 'call': return line('The client called the salon')
        case 'made': return line('The client opened Reserva Tools from the card')
        default: return line('The client used the card')
      }
    case 'pref_change':
      return str(p.what) === 'lang'
        ? line(`Switched the language to ${labelFrom(UI_LANGUAGE_LABELS, str(p.v))}`)
        : line(`Switched to the ${str(p.v) ?? 'other'} theme`)
    case 'browser_open': {
      const named = str(p.app) && str(p.app) !== 'other' ? labelFrom(IN_APP_LABELS, str(p.app)) : null
      const browser = named ? `${named}’s browser` : 'the app’s browser'
      const where = str(p.from) === 'sheet' ? 'from the save sheet' : 'from the top notice'
      return str(p.how) === 'copy'
        ? line(`Copied the link to leave ${browser} — ${where}`)
        : line(`Left ${browser} for Chrome — ${where}`)
    }
    default:
      return line(humanize(ev.name))
  }
}

/** The one-word result of a visit, strongest outcome first. */
export function sessionOutcome(row: SessionRow): { label: string; tone: EventTone; title: string } {
  if (row.outcome.booked) return { label: 'Booked', tone: 'success', title: 'Completed a booking' }
  if (row.outcome.signedUp) return { label: 'Signed up', tone: 'success', title: 'Finished the partner sign-up' }
  if (row.outcome.reviewed) return { label: 'Reviewed', tone: 'success', title: 'Left a review for a specialist' }
  if (row.outcome.contacted) {
    return { label: 'Contacted', tone: 'accent', title: 'Tapped call, WhatsApp, Instagram, directions or another contact link' }
  }
  if (row.outcome.bookClicked) return { label: 'Clicked Book', tone: 'info', title: 'Started to book, did not finish' }
  // tools.reserva.am: going on to reserva.am is the step that matters most, then a result taken away.
  if (row.outcome.ctaClicked) return { label: 'To Reserva', tone: 'accent', title: 'Clicked through to reserva.am' }
  if (row.outcome.exported) {
    return { label: 'Exported', tone: 'success', title: 'Took a result away: shared, downloaded, printed or sent' }
  }
  const what = row.site === 'tools'
    ? 'Left without taking a result away'
    : 'Left without booking, contacting, reviewing or signing up'
  return { label: 'Left', tone: 'neutral', title: row.eventCount <= 1 ? 'Left after one page' : what }
}
