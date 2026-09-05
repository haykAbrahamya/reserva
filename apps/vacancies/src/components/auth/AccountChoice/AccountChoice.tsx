import { ArrowRight, Building2, User } from 'lucide-react'
import { useT } from '@/i18n'
import s from './AccountChoice.module.scss'

export type AccountRole = 'salon' | 'specialist'

const STORAGE_KEY = 'reserva-vacancies-role'

/**
 * Which door this visitor took last time.
 *
 * The fork costs one click, and one click is fine the first time and irritating
 * the fifth. Remembering it is the whole difference between "this site asks who
 * I am" and "this site keeps asking who I am".
 *
 * Deliberately NOT treated as identity — it only decides which panel opens
 * first, and every screen that uses it offers a way back. A stale value can
 * therefore never lock anyone out of the door they actually need.
 */
export function rememberedRole(): AccountRole | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === 'salon' || raw === 'specialist' ? raw : null
  } catch {
    return null
  }
}

export function rememberRole(role: AccountRole) {
  try {
    window.localStorage.setItem(STORAGE_KEY, role)
  } catch {
    /* blocked storage — the fork simply asks again next time */
  }
}

interface Props {
  /** Changes only the wording; the two doors are the same either way. */
  mode: 'signup' | 'login'
  onChoose: (role: AccountRole) => void
}

/**
 * The fork: which side of this market are you on?
 *
 * A job board has two audiences with nothing in common — one is hiring, one is
 * looking — and no form fits both. Asking once, up front, in the words people
 * would use about themselves, is cheaper than a salon getting three fields into
 * a specialist form before noticing.
 *
 * Shared by /signup and /login on purpose. The same question with two different
 * layouts would be two chances to describe the two audiences differently, and
 * the whole value of asking is that the answer means the same thing every time.
 */
export function AccountChoice({ mode, onChoose }: Props) {
  const t = useT()

  const choose = (role: AccountRole) => {
    rememberRole(role)
    onChoose(role)
  }

  return (
    <div className={s.wrap}>
      <h1 className={s.title}>{t(`auth.${mode}.title`)}</h1>
      <p className={s.subtitle}>{t(`auth.${mode}.subtitle`)}</p>

      <div className={s.choices} role="group" aria-label={t(`auth.${mode}.title`)}>
        <button type="button" className={s.choice} onClick={() => choose('salon')}>
          <span className={s.choiceIcon}>
            <Building2 size={20} />
          </span>
          <span className={s.choiceTitle}>{t('auth.role.salon.title')}</span>
          <span className={s.choiceDesc}>{t(`auth.role.salon.${mode}Desc`)}</span>
          <ArrowRight className={s.choiceArrow} size={16} />
        </button>

        <button type="button" className={s.choice} onClick={() => choose('specialist')}>
          <span className={s.choiceIcon}>
            <User size={20} />
          </span>
          <span className={s.choiceTitle}>{t('auth.role.specialist.title')}</span>
          <span className={s.choiceDesc}>{t(`auth.role.specialist.${mode}Desc`)}</span>
          <ArrowRight className={s.choiceArrow} size={16} />
        </button>
      </div>
    </div>
  )
}
