import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Mail, Megaphone, ShieldCheck } from 'lucide-react'
import { Button, Input } from '@reserva/ui'
import { isValidPhone, normalizePhoneInput } from '@reserva/shared'
import { ApiError } from '@/api/client'
import { startSalonSignup } from '@/api/signup.api'
import { useT } from '@/i18n'
import { BACKOFFICE_URL } from '@/auth/backoffice'
import s from './SignUp.module.scss'

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

type Step = 'salon' | 'account' | 'success'

/**
 * Salon signup — the hiring side.
 *
 * Posts to the same `/public/signup` endpoint the marketing site uses, creating
 * the same Partner with the same admin User and the same backoffice login. The
 * one difference is `product: 'vacancies'`, which grants that product and
 * nothing else. There is no second signup pipeline to keep in step, and a salon
 * that later wants bookings adds the product rather than a second account.
 *
 * Two things this form deliberately does NOT ask:
 *
 *  - a public handle. `slug.reserva.am` renders a BOOKING page; a salon holding
 *    only vacancies would be choosing the address of a page it does not have.
 *  - an address. A job advert is written per branch, so the address belongs to
 *    the listing form where the salon can see which branch it is filling.
 */
export function SalonSignUp({ onBack }: { onBack: () => void }) {
  const t = useT()

  const [step, setStep] = useState<Step>('salon')
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

  const goAccount = () => {
    setTouched(true)
    if (!companyValid) return
    setTouched(false)
    setStep('account')
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
         * question the fork just asked with different words. Everyone down this
         * branch is an employer, which is what `salon` means to every consumer
         * of the field.
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

  if (step === 'success') {
    return (
      <div className={s.success}>
        <span className={s.successIcon}>
          <CheckCircle2 size={26} />
        </span>
        <h1 className={s.successTitle}>{t('signup.success.title')}</h1>
        <p className={s.successBody}>{t('signup.success.body', { email: email.trim() })}</p>

        {/* Naming the destination is the cheapest fix for the "wait, is this
            the right site?" moment: the activation link opens a DIFFERENT host
            in a different colour, and being told that in advance turns a
            surprise into an instruction. */}
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
    )
  }

  return (
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
            error={touched && company.trim().length <= 1 ? t('signup.errors.companyName') : undefined}
          />

          <Input
            label={t('signup.companyType')}
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
            placeholder={t('signup.companyTypePlaceholder')}
            error={touched && !companyType.trim() ? t('signup.errors.companyType') : undefined}
          />

          <div className={s.actions}>
            <Button variant="ghost" onClick={onBack}>
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
            <Button variant="ghost" onClick={() => setStep('salon')} disabled={submitting}>
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
  )
}

export function StepDot({
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
export function errorMessage(err: unknown, t: (key: string) => string): string {
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
