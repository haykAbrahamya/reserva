import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, ExternalLink, Users } from 'lucide-react'
import { Button, Input, PasswordInput } from '@reserva/ui'
import { ApiError } from '@/api/client'
import {
  AccountChoice,
  rememberedRole,
  type AccountRole,
} from '@/components/auth/AccountChoice/AccountChoice'
import { AuthLayout } from '@/components/auth/AuthLayout/AuthLayout'
import { BACKOFFICE_URL } from '@/auth/backoffice'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useT } from '@/i18n'
import { useSeo } from '@/lib/useSeo'
import s from './Login.module.scss'

/**
 * Sign in, for both sides of the market.
 *
 * The same fork as signup, for the same reason: at the moment someone clicks
 * "log in" nobody knows which of the two audiences they belong to, and the two
 * destinations are not even on the same host. A salon's session lives in the
 * backoffice; a professional's lives here.
 *
 * The alternative — one form that takes any credentials and works out which
 * realm they belong to — is a nicer click and a much worse thing to own: it
 * would mean a public job board holding an endpoint that can mint partner
 * sessions, and a login that reveals which realm an address exists in. Asking
 * costs one tap, and the tap is remembered.
 */
export function Login() {
  const t = useT()
  const [role, setRole] = useState<AccountRole | null>(rememberedRole)

  useSeo({
    title: t('auth.login.seoTitle'),
    description: t('auth.login.seoDescription'),
    canonicalPath: '/login/',
    // A sign-in page has nothing to offer a search result.
    noIndex: true,
  })

  const points = [
    { icon: Building2, title: t('auth.points.salon.title'), desc: t('auth.points.salon.desc') },
    { icon: Users, title: t('auth.points.specialist.title'), desc: t('auth.points.specialist.desc') },
  ]

  return (
    <AuthLayout panelTitle={t('auth.panelTitle')} points={points}>
      {role === 'salon' ? (
        <SalonDoor onBack={() => setRole(null)} />
      ) : role === 'specialist' ? (
        <SpecialistLogin onBack={() => setRole(null)} />
      ) : (
        <AccountChoice mode="login" onChoose={setRole} />
      )}
    </AuthLayout>
  )
}

/**
 * The salon door: a hand-off, not a form.
 *
 * Their session belongs to the backoffice, and a password field here that
 * posted somewhere else would be both a lie and a second place to get partner
 * authentication wrong. So this screen does one thing — say where they are
 * going, and take them there.
 *
 * Naming the destination matters more than it looks: the backoffice is a
 * different host in a different colour, and being told that in advance turns a
 * surprise into an instruction.
 */
function SalonDoor({ onBack }: { onBack: () => void }) {
  const t = useT()
  return (
    <div className={s.door}>
      <span className={s.doorIcon}>
        <Building2 size={22} />
      </span>
      <h1 className={s.doorTitle}>{t('auth.salonDoor.title')}</h1>
      <p className={s.doorBody}>{t('auth.salonDoor.body')}</p>

      <a className={s.doorCta} href={BACKOFFICE_URL} target="_blank" rel="noopener noreferrer">
        {t('auth.salonDoor.cta')}
        <ExternalLink size={15} />
      </a>

      <p className={s.doorAlt}>
        {t('auth.salonDoor.noAccount')}{' '}
        <Link to="/signup?as=salon">{t('auth.salonDoor.signUp')}</Link>
      </p>

      <button type="button" className={s.backLink} onClick={onBack}>
        <ArrowLeft size={15} />
        {t('auth.notYou')}
      </button>
    </div>
  )
}

/** The professional door: a real form, because this session lives here. */
function SpecialistLogin({ onBack }: { onBack: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const { login } = useProfessionalAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !password) {
      setError(t('auth.errors.missing'))
      return
    }
    setSubmitting(true)
    try {
      await login(identifier.trim(), password)
      navigate('/account', { replace: true })
    } catch (err) {
      /*
       * One message for every rejection.
       *
       * "No such account" and "wrong password" are the same sentence here on
       * purpose: telling them apart turns a login form into a way to ask
       * whether a given phone number has an account, which on a job board is a
       * question about a person's employment, not about a login.
       */
      const code = err instanceof ApiError ? err.code : ''
      setError(code === 'INVALID_CREDENTIALS' ? t('auth.errors.invalid') : t('auth.errors.generic'))
      setSubmitting(false)
    }
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <h1 className={s.title}>{t('auth.specialistLogin.title')}</h1>
      <p className={s.subtitle}>{t('auth.specialistLogin.subtitle')}</p>

      {error && <p className={s.error}>{error}</p>}

      {/* One field for either identifier: half this audience registered with a
          phone and no email, and asking them to remember which is a support
          ticket rather than a security measure. */}
      <Input
        label={t('auth.identifier')}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder={t('auth.identifierPlaceholder')}
        autoComplete="username"
      />

      <PasswordInput
        label={t('signup.password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('auth.passwordPlaceholder')}
        autoComplete="current-password"
        showLabel={t('signup.showPassword')}
        hideLabel={t('signup.hidePassword')}
      />

      <Button type="submit" variant="accent" disabled={submitting} className={s.submit}>
        {submitting ? t('auth.signingIn') : t('auth.signIn')}
        <ArrowRight size={15} />
      </Button>

      <p className={s.altAction}>
        {t('auth.noAccount')} <Link to="/signup?as=specialist">{t('auth.createOne')}</Link>
      </p>

      <button type="button" className={s.backLink} onClick={onBack}>
        <ArrowLeft size={15} />
        {t('auth.notYou')}
      </button>
    </form>
  )
}
