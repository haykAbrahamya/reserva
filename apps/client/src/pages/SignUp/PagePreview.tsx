import type { CSSProperties } from 'react'
import { CalendarCheck, Lock, Sparkles } from 'lucide-react'
import { useT } from '@/i18n'
import type { Kind } from './signupForm'
import s from './PagePreview.module.scss'

interface Props {
  kind: Kind | null
  name: string
  type: string
  /** The address as it will be saved (no trailing dash); empty → a placeholder. */
  slug: string
  accent: string
  className?: string
}

/**
 * Their booking page taking shape while they fill in the form: name, type,
 * address and brand colour, drawn the way the real page wears them. Service
 * rows stay as placeholders — nothing here pretends to be real content.
 * Desktop only: on a phone the form itself is the preview.
 */
export function PagePreview({ kind, name, type, slug, accent, className }: Props) {
  const t = useT()
  const shownName = name.trim() || t('signup.preview.namePlaceholder')
  const shownType = type.trim() || (kind === 'salon' ? t('signup.preview.typeSalon') : t('signup.preview.typeSingle'))
  const initial = name.trim().charAt(0).toUpperCase()
  const style = { '--pv-accent': accent } as CSSProperties
  return (
    <figure className={[s.phone, className].filter(Boolean).join(' ')} style={style} aria-label={t('signup.preview.label')}>
      <div className={s.bar}>
        <Lock size={11} aria-hidden="true" />
        <span className={s.urlText}>
          <b className={slug ? '' : s.placeholder}>{slug || 'your-page'}</b>.reserva.am
        </span>
      </div>
      <div className={s.hero}>
        {/* A solo pro is a person (round); a salon is a brand (rounded square). */}
        <span className={[s.avatar, kind === 'salon' ? s.square : ''].filter(Boolean).join(' ')} aria-hidden="true">
          {initial || <Sparkles size={20} />}
        </span>
        <div className={[s.name, name.trim() ? '' : s.placeholder].filter(Boolean).join(' ')}>{shownName}</div>
        <div className={s.type}>{shownType}</div>
        <span className={s.book}>
          <CalendarCheck size={14} aria-hidden="true" /> {t('signup.preview.book')}
        </span>
      </div>
      <div className={s.list} aria-hidden="true">
        {[0.72, 0.56, 0.64].map((w, i) => (
          <div key={i} className={s.row}>
            <span className={s.lines}>
              <i style={{ width: `${w * 100}%` }} />
              <i />
            </span>
            <span className={s.price} />
          </div>
        ))}
      </div>
      <figcaption className={s.note}>{t('signup.preview.services')}</figcaption>
    </figure>
  )
}
