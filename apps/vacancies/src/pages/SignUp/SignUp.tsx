import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Megaphone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react'
import { Button, Input, LogoMark } from '@reserva/ui'
import { isValidPhone, normalizePhoneInput } from '@reserva/shared'
import { ApiError } from '@/api/client'
import { startSalonSignup } from '@/api/signup.api'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher/LanguageSwitcher'
import { ThemeToggle } from '@/components/common/ThemeToggle/ThemeToggle'
import { useT } from '@/i18n'
import { useSeo } from '@/lib/useSeo'
import { useThemeContext } from '@/theme/ThemeProvider'
import s from './SignUp.module.scss'

/**
 * Where an existing salon goes instead.
 *
 * The backoffice, which is also where the activation email lands — the backend
 * builds that link from BACKOFFICE_URL. Two different hosts for "sign in" and
 * "the link we just emailed you" is how someone ends up with two tabs and no
 * session.
 */
const BACKOFFICE_URL = import.meta.env.VITE_BACKOFFICE_URL || 'https://backoffice.reserva.am'

const MIN_PW = 8

/**
 * The brand colour every salon starts with.
 *
 * The Partner model requires one and the board paints it on a salon's own
 * cards, but a signup form is the wrong place to ask: someone posting a job
 * advert has not come to make branding decisions, and a swatch row is one more
 * thing between them and the listing. So it is seeded with the board's own
 * accent — which is what the cards would look like anyway — and the salon
 * changes it in the backoffice if they ever care.
 *
 * Matches --accent in styles/theme.css.
 */
const DEFAULT_ACCENT = '#7c5cff'

/**
 * Steps, in the order a salon meets them.
 *
 * `type` is the FORK, not a field: this is a two-sided market, and the first
 * question has to be which side you are on. `specialist` is where the other
 * branch currently ends — see the note on that screen.
 */
type Step = 'type' | 'salon' | 'account' | 'success' | 'specialist'

/**
 * Salon signup, on the board rather than on the marketing site.
 *
 * A salon that finds Reserva because it is trying to hire has no interest in an
 * online booking page, and reserva.am/signup is written entirely around one —
 * its headline, its three selling points, its handle field. Sending a salon
 * there to post a job advert asks them to read a pitch for a different product
 * and to answer questions that do not apply.
 *
 * So this is a separate PAGE, not a separate system. It posts to the same
 * `/public/signup` endpoint, creates the same Partner with the same admin User
 * and the same backoffice login; the one difference is `product: 'vacancies'`,
 * which grants that product and nothing else. There is no second signup
 * pipeline to keep in step, and a salon that later wants bookings adds the
 * product rather than a second account.
 *
 * Two things this form deliberately does NOT ask:
 *
 *  - a public handle. `slug.reserva.am` renders a BOOKING page; a salon holding
 *    only vacancies would be choosing the address of a page it does not have.
 *    The backend treats the field as optional and leaves the partner without
 *    one, which is exactly right — they pick a handle if and when they take the
 *    booking product.
 *  - an address. Locations are organization-level and a listing needs one, but
 *    a job advert is written per branch, so the address belongs to the listing
 *    form where the salon can see which branch it is filling.
 */
export function SignUp() {
  const t = useT()
  const { isDark, toggle } = useThemeContext()

  const [step, setStep] = useState<Step>('type')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Errors appear only after an attempt to move on, so a form nobody has filled
  // in yet is not already shouting at them.
  const [touched, setTouched] = useState(false)

  const [company, setCompany] = useState('')
  const [companyType, setCompanyType] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const companyValid = company.trim().length > 1 && companyType.trim().length > 0
  const nameValid = name.trim().length > 1
  const emailValid = /\S+@\S+\.\S+/.test(email.trim())
  const phoneValid = isValidPhone(phone)
  const pwValid = password.length >= MIN_PW
  const matchValid = confirm.length > 0 && password === confirm
  const accountValid = nameValid && emailValid && phoneValid && pwValid && matchValid

  useSeo({
    title: t('signup.seoTitle'),
    description: t('signup.seoDescription'),
    canonicalPath: '/signup/',
  })

  const goAccount = () => {
    setTouched(true)
    if (!companyValid) return
    setTouched(false)
    setStep('account')
  }

  const goBack = () => {
    setTouched(false)
    setSubmitError('')
    setStep('salon')
  }

  const submit = async () => {
    setTouched(true)
    setSubmitError('')
    if (!accountValid) return

    setSubmitting(true)
    try {
      await startSalonSignup({
        companyName: company.trim(),
        companyType: companyType.trim(),
        /*
         * Always `salon`.
         *
         * The Partner model distinguishes a team from a solo professional, and
         * this form deliberately does not ask: on a job board, "salon or
         * individual" is read as "am I hiring or am I looking", which is the
         * question the FIRST screen just asked with different words. Two
         * controls one click apart, using the same nouns for different
         * distinctions, is how a signup form makes someone pick wrong.
         *
         * Everyone arriving down this branch is an employer, which is what
         * `salon` means to every consumer of the field. Nothing in the board
         * renders the distinction today, so asking would buy nothing.
         */
        kind: 'salon',
        accent: DEFAULT_ACCENT,
        adminName: name.trim(),
        adminEmail: email.trim(),
        adminPhone: normalizePhoneInput(phone),
        password,
      })
      setStep('success')
    } catch (err) {
      setSubmitError(errorMessage(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  const PANEL_POINTS = [
    { icon: Megaphone, key: 'reach' },
    { icon: Users, key: 'applicants' },
    { icon: ShieldCheck, key: 'free' },
  ]

  return (
    <div className={s.page}>
      {/* ── Brand panel ── */}
      <aside className={s.panel}>
        <div className={s.panelGrid} aria-hidden="true" />
        <div className={s.panelOrb} aria-hidden="true" />

        <Link to="/" className={s.panelLogo}>
          <span className={s.panelLogoMark}>
            <LogoMark size={34} />
          </span>
          <span>
            <span className={s.panelLogoName}>Reserva</span>
            <span className={s.panelLogoTag}>{t('app.product')}</span>
          </span>
        </Link>

        <div className={s.panelMid}>
          <h2 className={s.panelQuote}>{t('signup.panelTitle')}</h2>
          <div className={s.points}>
            {PANEL_POINTS.map((p) => (
              <div key={p.key} className={s.point}>
                <span className={s.pointIcon}>
                  <p.icon size={16} />
                </span>
                <span>
                  <span className={s.pointTitle}>{t(`signup.points.${p.key}.title`)}</span>
                  <span className={s.pointDesc}>{t(`signup.points.${p.key}.desc`)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className={s.panelBy}>{t('signup.panelBy')}</p>
      </aside>

      {/* ── Form ── */}
      <main className={s.main}>
        <div className={s.corner}>
          <LanguageSwitcher />
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </div>

        <Link to="/" className={s.mobileLogo}>
          <LogoMark size={30} />
          <span>Reserva</span>
        </Link>

        {step === 'type' ? (
          /*
           * Which side of the market are you on?
           *
           * A job board has two audiences with nothing in common, and the form
           * below only fits one of them. Asking once, up front, in the two words
           * people would use for themselves, is cheaper than a salon getting
           * three fields into a specialist form before noticing.
           */
          <div className={s.form}>
            <h1 className={s.title}>{t('signup.type.title')}</h1>
            <p className={s.subtitle}>{t('signup.type.subtitle')}</p>

            <div className={s.choices} role="group" aria-label={t('signup.type.title')}>
              <button type="button" className={s.choice} onClick={() => setStep('salon')}>
                <span className={s.choiceIcon}>
                  <Building2 size={20} />
                </span>
                <span className={s.choiceTitle}>{t('signup.type.salon.title')}</span>
                <span className={s.choiceDesc}>{t('signup.type.salon.desc')}</span>
                <ArrowRight className={s.choiceArrow} size={16} />
              </button>

              <button type="button" className={s.choice} onClick={() => setStep('specialist')}>
                <span className={s.choiceIcon}>
                  <User size={20} />
                </span>
                <span className={s.choiceTitle}>
                  {t('signup.type.specialist.title')}
                  <span className={s.choiceBadge}>{t('signup.type.specialist.badge')}</span>
                </span>
                <span className={s.choiceDesc}>{t('signup.type.specialist.desc')}</span>
                <ArrowRight className={s.choiceArrow} size={16} />
              </button>
            </div>

            <p className={s.altAction}>
              {t('signup.haveAccount')}{' '}
              <a href={BACKOFFICE_URL} target="_blank" rel="noopener noreferrer">
                {t('signup.signIn')}
              </a>
            </p>
          </div>
        ) : step === 'specialist' ? (
          /*
           * The other branch, told honestly.
           *
           * Accounts for specialists are not built yet. The useful thing to say
           * is not "coming soon" but the fact that follows from it: applying
           * needs no account TODAY — name and phone, straight to the salon — so
           * nobody who came here to find work leaves empty-handed because a
           * feature they did not need is missing.
           */
          <div className={s.success}>
            <span className={s.successIcon}>
              <User size={24} />
            </span>
            <h1 className={s.successTitle}>{t('signup.specialist.title')}</h1>
            <p className={s.successBody}>{t('signup.specialist.body')}</p>

            <Link to="/" className={s.specialistCta}>
              {t('signup.specialist.browse')}
              <ArrowRight size={15} />
            </Link>

            <button type="button" className={s.successBack} onClick={() => setStep('type')}>
              <ArrowLeft size={15} />
              {t('signup.back')}
            </button>
          </div>
        ) : step === 'success' ? (
          <div className={s.success}>
            <span className={s.successIcon}>
              <CheckCircle2 size={26} />
            </span>
            <h1 className={s.successTitle}>{t('signup.success.title')}</h1>
            <p className={s.successBody}>{t('signup.success.body', { email: email.trim() })}</p>

            <ol className={s.successSteps}>
              <li>
                <Mail size={14} /> {t('signup.success.step1')}
              </li>
              <li>
                <ShieldCheck size={14} /> {t('signup.success.step2')}
              </li>
              <li>
                <Megaphone size={14} /> {t('signup.success.step3')}
              </li>
            </ol>

            <Link to="/" className={s.successBack}>
              <ArrowLeft size={15} />
              {t('signup.success.backToBoard')}
            </Link>
          </div>
        ) : (
          <div className={s.form}>
            <div className={s.steps}>
              <StepDot index={1} label={t('signup.stepSalon')} active={step === 'salon'} done={step === 'account'} />
              <span className={[s.stepBar, step === 'account' ? s.stepBarDone : ''].filter(Boolean).join(' ')} />
              <StepDot index={2} label={t('signup.stepAccount')} active={step === 'account'} done={false} />
            </div>

            {step === 'salon' ? (
              <>
                <h1 className={s.title}>{t('signup.salonTitle')}</h1>
                <p className={s.subtitle}>{t('signup.salonSubtitle')}</p>

                <Input
                  label={t('signup.companyName')}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t('signup.companyNamePlaceholder')}
                  autoComplete="organization"
                  error={
                    touched && company.trim().length <= 1 ? t('signup.errors.companyName') : undefined
                  }
                />

                <Input
                  label={t('signup.companyType')}
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                  placeholder={t('signup.companyTypePlaceholder')}
                  error={touched && !companyType.trim() ? t('signup.errors.companyType') : undefined}
                />

                <div className={s.actions}>
                  <Button variant="ghost" onClick={() => setStep('type')}>
                    <ArrowLeft size={15} />
                    {t('signup.back')}
                  </Button>
                  <Button variant="accent" onClick={goAccount} className={s.submit}>
                    {t('signup.continue')}
                    <ArrowRight size={15} />
                  </Button>
                </div>

                <p className={s.altAction}>
                  {t('signup.haveAccount')}{' '}
                  <a href={BACKOFFICE_URL} target="_blank" rel="noopener noreferrer">
                    {t('signup.signIn')}
                  </a>
                </p>
              </>
            ) : (
              <>
                <h1 className={s.title}>{t('signup.accountTitle')}</h1>
                <p className={s.subtitle}>{t('signup.accountSubtitle')}</p>

                <Input
                  label={t('signup.adminName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('signup.adminNamePlaceholder')}
                  autoComplete="name"
                  error={touched && !nameValid ? t('signup.errors.adminName') : undefined}
                />

                <Input
                  label={t('signup.adminEmail')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="salon@example.com"
                  autoComplete="email"
                  error={touched && !emailValid ? t('signup.errors.adminEmail') : undefined}
                />

                <Input
                  label={t('signup.adminPhone')}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+374 XX XXXXXX"
                  autoComplete="tel"
                  error={touched && !phoneValid ? t('signup.errors.adminPhone') : undefined}
                />

                <div className={s.pwWrap}>
                  <Input
                    label={t('signup.password')}
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('signup.passwordPlaceholder', { min: MIN_PW })}
                    autoComplete="new-password"
                    error={touched && !pwValid ? t('signup.errors.password', { min: MIN_PW }) : undefined}
                  />
                  {/* Sits over the field rather than beside it: a second column
                      would shrink the input on a narrow phone, which is where
                      a long password is hardest to type in the first place. */}
                  <button
                    type="button"
                    className={s.pwToggle}
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? t('signup.hidePassword') : t('signup.showPassword')}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <Input
                  label={t('signup.confirm')}
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  error={touched && !matchValid ? t('signup.errors.confirm') : undefined}
                />

                {submitError && <p className={s.submitError}>{submitError}</p>}

                <div className={s.actions}>
                  <Button variant="ghost" onClick={goBack} disabled={submitting}>
                    <ArrowLeft size={15} />
                    {t('signup.back')}
                  </Button>
                  <Button variant="accent" onClick={submit} disabled={submitting} className={s.submit}>
                    {submitting ? t('signup.submitting') : t('signup.createAccount')}
                  </Button>
                </div>

                <p className={s.altAction}>{t('signup.terms')}</p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function StepDot({
  index,
  label,
  active,
  done,
}: {
  index: number
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <div className={[s.stepDot, active ? s.stepActive : '', done ? s.stepDone : ''].filter(Boolean).join(' ')}>
      <span className={s.stepCircle}>{done ? <Check size={13} /> : index}</span>
      <span className={s.stepLabel}>{label}</span>
    </div>
  )
}

/**
 * Backend error codes to copy a salon can act on.
 *
 * The three that matter are all "you already exist": a salon whose email is
 * taken has usually signed up before and needs the sign-in link, not a retry.
 * Anything else falls back to a generic line — inventing specific advice for an
 * error we did not anticipate is how a form tells someone confidently wrong
 * things about their own account.
 */
function errorMessage(err: unknown, t: (key: string) => string): string {
  const code = err instanceof ApiError ? err.code : ''
  switch (code) {
    case 'EMAIL_TAKEN':
      return t('signup.errors.emailTaken')
    case 'PHONE_TAKEN':
      return t('signup.errors.phoneTaken')
    case 'UNKNOWN_PRODUCT':
      return t('signup.errors.closed')
    default:
      return t('signup.errors.generic')
  }
}
