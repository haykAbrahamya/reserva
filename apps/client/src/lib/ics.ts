// ─────────────────────────────────────────────────────────────
// Minimal, dependency-free iCalendar (.ics) builder for booking
// confirmations. The generated event carries its own VALARM, so the
// customer's phone reminds them at a chosen offset (e.g. 1 hour before) —
// a free, no-opt-in reminder that works on every calendar app.
// ─────────────────────────────────────────────────────────────

export interface IcsEvent {
  /** Stable unique id (the booking id is perfect). */
  uid: string
  start: Date
  end: Date
  title: string
  description?: string
  location?: string
  /** Minutes before start to fire the alarm (default 60). */
  reminderMinutes?: number
  /** Organizer/brand name shown by some clients. */
  organizer?: string
}

/** Format a Date as a UTC iCal timestamp: 20260628T143000Z */
function toIcsUtc(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/** Escape per RFC 5545: backslash, comma, semicolon, and newlines. */
function esc(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Fold long lines to <=75 octets per RFC 5545 (continuation lines start with a
 * space). Most apps tolerate long lines, but folding keeps it spec-correct.
 */
function fold(line: string): string {
  if (line.length <= 73) return line
  const out: string[] = []
  let s = line
  while (s.length > 73) {
    out.push(out.length === 0 ? s.slice(0, 73) : ' ' + s.slice(0, 72))
    s = s.slice(out.length === 1 ? 73 : 72)
  }
  out.push(' ' + s)
  return out.join('\r\n')
}

/** Build the full .ics document text for a single event. */
export function buildIcs(ev: IcsEvent): string {
  const reminder = ev.reminderMinutes ?? 60
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Reserva//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${esc(ev.uid)}@reserva.am`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(ev.start)}`,
    `DTEND:${toIcsUtc(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : '',
    ev.location ? `LOCATION:${esc(ev.location)}` : '',
    ev.organizer ? `ORGANIZER;CN=${esc(ev.organizer)}:mailto:no-reply@reserva.am` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    `TRIGGER:-PT${reminder}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(ev.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[]

  return lines.map(fold).join('\r\n')
}

/**
 * Trigger a download / open of the .ics. On mobile this hands the file to the
 * native calendar app (two taps: open → add). Returns nothing; best-effort.
 */
export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after a tick so the click/navigation has consumed the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Format a Date for a Google Calendar template URL: 20260628T143000Z */
function toGCalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Google Calendar "create event" URL with the event pre-filled. Opening this
 * launches the Google Calendar APP on Android (it handles calendar.google.com
 * links) and the web composer on desktop — one tap to save, no file download.
 */
export function googleCalendarUrl(ev: IcsEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${toGCalDate(ev.start)}/${toGCalDate(ev.end)}`,
  })
  if (ev.description) params.set('details', ev.description)
  if (ev.location) params.set('location', ev.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Apple devices (iOS/iPadOS/macOS) open .ics natively in Apple Calendar. */
function isApple(): boolean {
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; detect via touch.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const mac = /Macintosh/.test(ua)
  return iOS || mac
}

/**
 * Add the event to the user's calendar the way that actually works on their
 * platform:
 *  - Apple (iPhone/iPad/Mac): hand over the .ics → opens Apple Calendar.
 *  - Everyone else (Android, Windows, Linux, ChromeOS): open the Google
 *    Calendar template → launches the GCal app on Android / web composer on
 *    desktop, event pre-filled. No silent file download.
 */
export function addToCalendar(ev: IcsEvent, filename: string): void {
  if (isApple()) {
    downloadIcs(filename, buildIcs(ev))
    return
  }
  window.open(googleCalendarUrl(ev), '_blank', 'noopener,noreferrer')
}
