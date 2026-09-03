import { Link } from 'react-router-dom'
import { LogoMark } from '@reserva/ui'
import { useT } from '@/i18n'
import s from './Logo.module.scss'

/**
 * The board's wordmark.
 *
 * The MARK is the shared one from @reserva/ui — the same Petal R every Reserva
 * app uses, painted from `--accent`, which on this app is the product violet.
 * Nothing about it is redefined here; a brand change lands everywhere at once.
 *
 * What this adds is the product name beside it, in a mono pill. This is a
 * sub-brand: someone who arrived from a search for "barber chair rent" has to
 * learn both that they are on Reserva and that this part of it is about work.
 * A single "Reserva Vacancies" string communicates neither.
 */
export function BoardLogo() {
  const t = useT()
  return (
    <Link to="/" className={s.logo} aria-label={`${t('app.name')} ${t('app.product')}`}>
      <LogoMark size={30} />
      <span className={s.name}>{t('app.name')}</span>
      <span className={s.product}>{t('app.product')}</span>
    </Link>
  )
}
