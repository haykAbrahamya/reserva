import { ArrowUpRight } from 'lucide-react'
import { LogoMark } from '@reserva/ui'
import { useT } from '@/i18n'
import { track } from '@/lib/analytics/pulse'
import { useToolAtPath } from '@/lib/analytics/useToolAtPath'
import { platformUrl } from '@/lib/links'
import s from './Footer.module.scss'

/**
 * The footer is the tools' one pitch: everyone here is a beauty professional,
 * which is exactly who Reserva's booking is for.
 */
export function Footer() {
  const t = useT()
  const tool = useToolAtPath()

  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div className={s.brand}>
          <LogoMark size={28} />
          <div>
            <div className={s.name}>{t('app.name')}</div>
            <p className={s.pitch}>{t('footer.pitch')}</p>
          </div>
        </div>

        <a
          className={s.cta}
          href={platformUrl('/signup', 'footer')}
          onClick={() => track('cta_click', { from: 'footer', tool })}
        >
          {t('footer.cta')}
          <ArrowUpRight size={15} />
        </a>
      </div>

      <div className={s.legal}>{t('footer.rights', { year: new Date().getFullYear() })}</div>
    </footer>
  )
}
