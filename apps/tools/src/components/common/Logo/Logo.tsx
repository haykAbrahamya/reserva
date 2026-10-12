import { Link } from 'react-router-dom'
import { LogoMark } from '@reserva/ui'
import { useT } from '@/i18n'
import s from './Logo.module.scss'

/**
 * The shared Reserva mark and wordmark, plus the product name in a pill — the
 * same sub-brand pattern as the other public Reserva sites, in the platform's
 * own accent colour.
 */
export function ToolsLogo() {
  const t = useT()
  return (
    <Link to="/" className={s.logo} aria-label={`${t('app.name')} ${t('app.product')}`}>
      <LogoMark size={30} />
      <span className={s.name}>{t('app.name')}</span>
      <span className={s.product}>{t('app.product')}</span>
    </Link>
  )
}
