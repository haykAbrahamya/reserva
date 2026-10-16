import type { Locale } from '@/i18n'
import { SAMPLE_INSTAGRAM } from '@/lib/instagram'
import { DEFAULT_THEME_ID } from '@/lib/story/themes'
import { CERT_LAYOUTS, newNumber, type CertificateDraft } from './model'

type SampleText = Pick<CertificateDraft, 'heading' | 'recipient' | 'wording' | 'course' | 'details' | 'city' | 'signers'>

/**
 * What a first-time visitor starts from: a finished certificate in their
 * language, signed by two people, so every part of it is there to change.
 * The wording names no gender — Russian would otherwise need "окончил(а)".
 */
const SAMPLES: Record<Locale, SampleText> = {
  hy: {
    heading: 'Սերտիֆիկատ',
    recipient: 'Մարիամ Հակոբյան',
    wording: 'դասընթացը հաջողությամբ ավարտելու համար',
    course: 'Մատնահարդարում և եղունգների դիզայն',
    details: '24 ակադեմիական ժամ',
    city: 'Երևան',
    signers: [
      { name: 'Աննա Պետրոսյան', title: 'Դասընթացավար' },
      { name: 'Լիլիթ Սարգսյան', title: 'Տնօրեն' },
    ],
  },
  en: {
    heading: 'Certificate',
    recipient: 'Mariam Hakobyan',
    wording: 'for successfully completing the course',
    course: 'Manicure & nail design',
    details: '24 academic hours',
    city: 'Yerevan',
    signers: [
      { name: 'Anna Petrosyan', title: 'Instructor' },
      { name: 'Lilit Sargsyan', title: 'Director' },
    ],
  },
  ru: {
    heading: 'Сертификат',
    recipient: 'Мариам Акопян',
    wording: 'за успешное окончание курса',
    course: 'Маникюр и дизайн ногтей',
    details: '24 академических часа',
    city: 'Ереван',
    signers: [
      { name: 'Анна Петросян', title: 'Преподаватель' },
      { name: 'Лилит Саргсян', title: 'Директор' },
    ],
  },
}

export function sampleDraft(locale: Locale, today: string): CertificateDraft {
  return {
    ...SAMPLES[locale],
    layout: CERT_LAYOUTS[0],
    themeId: DEFAULT_THEME_ID,
    size: 'a4',
    school: 'Anna Beauty Academy',
    link: `@${SAMPLE_INSTAGRAM}`,
    date: today,
    number: newNumber(),
    seal: true,
  }
}
