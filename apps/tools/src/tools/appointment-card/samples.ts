import type { Locale } from '@/i18n'
import type { Appointment } from './model'

const SAMPLES: Record<Locale, Pick<Appointment, 'service' | 'address' | 'note'>> = {
  hy: {
    service: 'Գել-լաք',
    address: 'Թումանյան 20, Երևան',
    note: 'Խնդրում ենք գալ 5 րոպե շուտ',
  },
  en: {
    service: 'Gel manicure',
    address: '20 Tumanyan St, Yerevan',
    note: 'Please come 5 minutes early',
  },
  ru: {
    service: 'Маникюр с гель-лаком',
    address: 'ул. Туманяна 20, Ереван',
    note: 'Пожалуйста, приходите за 5 минут',
  },
}

/** A first visit starts from a filled-in card for tomorrow afternoon — no phone, since a sample one would be someone's real number. */
export function sampleAppointment(locale: Locale, tomorrow: string): Appointment {
  return {
    ...SAMPLES[locale],
    salon: 'Anna Beauty',
    date: tomorrow,
    time: '15:00',
    duration: 60,
    phone: '',
  }
}
