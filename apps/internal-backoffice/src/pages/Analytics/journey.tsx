import {
  BadgeCheck, CalendarCheck, CalendarDays, CalendarPlus, ChevronsRight, Circle, FileText, GraduationCap, Home,
  Images, LayoutGrid, ListChecks, LogOut, MapPin, PenLine, Search, Send, SlidersHorizontal, Store, Tag,
  TriangleAlert, UserPlus, UserRound,
} from 'lucide-react'
import type { SessionEvent, SessionRow } from '@/services/analytics.service'
import { eventDef, humanize, type EventTone } from './catalog'
import { ContactIcon } from './icons'
import { isUuid } from './format'

// ─────────────────────────────────────────────────────────────
// A visit told as a story: one icon and one plain sentence per event, built
// from the event catalog and the server's id → name `labels`, so staff read
// "Clicked Book on Gel polish manicure", never a uuid.
// ─────────────────────────────────────────────────────────────

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

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
  const line = (text: string, extra: Partial<StoryLine> = {}): StoryLine => ({ text, tone, ...extra })

  switch (ev.name) {
    case 'page_view':
      switch (str(p.pt)) {
        case 'partner': return line(`Opened ${ev.partner?.name ?? 'a partner'} — partner page`)
        case 'home': return line('Opened the home page')
        case 'marketplace': return line('Opened the salons list')
        case 'signup': return line('Opened the sign-up page')
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
    case 'signup_step':
      return line(`Sign-up: ${str(p.step) ?? 'next'} step`)
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
    default:
      return line(humanize(ev.name))
  }
}

/** The one-word result of a visit, strongest outcome first. */
export function sessionOutcome(row: SessionRow): { label: string; tone: EventTone; title: string } {
  if (row.outcome.booked) return { label: 'Booked', tone: 'success', title: 'Completed a booking' }
  if (row.outcome.signedUp) return { label: 'Signed up', tone: 'success', title: 'Finished the partner sign-up' }
  if (row.outcome.contacted) {
    return { label: 'Contacted', tone: 'accent', title: 'Tapped call, WhatsApp, Instagram, directions or another contact link' }
  }
  if (row.outcome.bookClicked) return { label: 'Clicked Book', tone: 'info', title: 'Started to book, did not finish' }
  return {
    label: 'Left',
    tone: 'neutral',
    title: row.eventCount <= 1 ? 'Left after one page' : 'Left without booking, contacting or signing up',
  }
}
