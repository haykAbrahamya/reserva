import { useMemo } from 'react'
import { Phone } from 'lucide-react'
import { normalizePhoneInput } from '@reserva/shared'
import { useT } from '@/i18n'
import s from './PhoneField.module.scss'

/**
 * Booking phone input, Armenian-first.
 *
 * Our audience is almost entirely Armenian, so by default we show a FIXED,
 * non-editable "+374" prefix and the user types only the 8 local digits — which
 * we pretty-print as "93 813 296" while keeping the stored value in E.164
 * ("+37493813296"). A quiet "Other country?" toggle swaps to a plain, fully
 * editable international field for the rare foreign number.
 *
 * `value`/`onChange` always speak E.164 (a leading "+" + digits), so callers
 * never deal with formatting. Empty string = nothing entered yet.
 */

const AM_CODE = '+374'
/** AM mobile/landline local part is 8 digits (e.g. 93 813 296 / 10 512 512). */
const AM_LOCAL_DIGITS = 8

interface Props {
  value: string
  onChange: (e164: string) => void
  onBlur?: () => void
  invalid?: boolean
  /** true = international mode (plain field); false = Armenian +374 mode. */
  intl: boolean
  onIntlChange: (intl: boolean) => void
}

/** Group AM local digits as "93 813 296" (2-3-3) for readability while typing. */
function formatAmLocal(digits: string): string {
  const d = digits.slice(0, AM_LOCAL_DIGITS)
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)].filter(Boolean)
  return parts.join(' ')
}

/**
 * Pretty-print a stored E.164 value for read-only display (e.g. the confirm
 * summary): "+37493813296" → "+374 93 813 296". Non-Armenian numbers are shown
 * as-is (still readable). Safe to call with partial/empty values.
 */
export function formatPhoneDisplay(e164: string): string {
  const v = e164.trim()
  if (v.startsWith(AM_CODE)) {
    const local = formatAmLocal(v.slice(AM_CODE.length).replace(/\D/g, ''))
    return local ? `${AM_CODE} ${local}` : AM_CODE
  }
  return v
}

export function PhoneField({ value, onChange, onBlur, invalid, intl, onIntlChange }: Props) {
  const t = useT()

  // Local digits shown in AM mode are whatever follows the +374 in the E.164 value.
  const localDigits = useMemo(() => {
    if (!value.startsWith(AM_CODE)) return ''
    return value.slice(AM_CODE.length).replace(/\D/g, '')
  }, [value])

  const onLocalChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, AM_LOCAL_DIGITS)
    onChange(digits ? `${AM_CODE}${digits}` : '')
  }

  const enterIntl = () => {
    onIntlChange(true)
    // Seed the international field with whatever's typed (keep +374 if present)
    // so switching modes never loses the user's input.
    if (!value) onChange('+')
  }

  const backToArmenia = () => {
    onIntlChange(false)
    // Drop back to AM mode: keep digits only if they were an Armenian number.
    if (value.startsWith(AM_CODE)) onChange(value)
    else onChange('')
  }

  if (intl) {
    return (
      <div className={s.wrap}>
        <div className={[s.intlField, invalid ? s.invalid : ''].filter(Boolean).join(' ')}>
          <Phone size={16} className={s.intlIcon} />
          <input
            className={s.intlInput}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 555 123 4567"
            value={value}
            onChange={(e) => onChange(normalizePhoneInput(e.target.value))}
            onBlur={onBlur}
            autoFocus
          />
        </div>
        <button type="button" className={s.toggle} onClick={backToArmenia}>
          {t('booking.phone.useArmenia')}
        </button>
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={[s.amField, invalid ? s.invalid : ''].filter(Boolean).join(' ')}>
        <span className={s.prefix} aria-hidden="true">
          <span className={s.flag}>🇦🇲</span>
          {AM_CODE}
        </span>
        <input
          className={s.amInput}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="93 813 296"
          value={formatAmLocal(localDigits)}
          onChange={(e) => onLocalChange(e.target.value)}
          onBlur={onBlur}
          aria-label={t('booking.phoneLabel')}
        />
      </div>
      <button type="button" className={s.toggle} onClick={enterIntl}>
        {t('booking.phone.otherCountry')}
      </button>
    </div>
  )
}
