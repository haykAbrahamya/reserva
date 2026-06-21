import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Check, CheckCircle2, Eye, EyeOff, AlertCircle,
  Building2, User, Mail, Phone, Lock, Sparkles, CalendarClock, ShieldCheck,
} from 'lucide-react'
import { LogoMark } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { AccentPicker } from '@/components/AccentPicker/AccentPicker'
import { signupService } from '@/services/signup.service'
import { friendlyError } from '@/services/errors'
import { isValidPhone, normalizePhoneInput } from '@reserva/shared'
import { useT } from '@/i18n'
import s from './SignUp.module.scss'

type Step = 'company' | 'account' | 'success'

// Must match the backend rule (signup.dto.ts: password min 8).
const MIN_PW = 8

export function SignUp() {
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const plan = params.get('plan') // 'starter' | 'pro' | 'business' | null

  const [step, setStep] = useState<Step>('company')
  const [submitting, setSubmitting] = useState(false)
  const [showPw, setShowPw] = useState(false)

  // Company
  const [company, setCompany] = useState('')
  const [companyType, setCompanyType] = useState('')
  const [slug, setSlug] = useState('')
  const [accent, setAccent] = useState('#A8784B')
  const [submitError, setSubmitError] = useState('')

  // Admin account
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [touched, setTouched] = useState(false)

  const companyValid = company.trim().length > 1 && companyType.trim().length > 0
  const emailValid   = /\S+@\S+\.\S+/.test(email.trim())
  const phoneValid   = isValidPhone(phone)
  const nameValid    = name.trim().length > 1
  const pwValid      = password.length >= MIN_PW
  const matchValid   = confirm.length > 0 && password === confirm
  const accountValid = nameValid && emailValid && phoneValid && pwValid && matchValid

  const goAccount = () => {
    setTouched(true)
    if (!companyValid) return
    setTouched(false)
    setStep('account')
  }

  const handleSubmit = async () => {
    setTouched(true)
    setSubmitError('')
    if (!accountValid) return
    setSubmitting(true)
    try {
      await signupService.start({
        companyName: company.trim(),
        companyType: companyType.trim(),
        accent,
        slug: slug.trim() || undefined,
        adminName: name.trim(),
        adminEmail: email.trim(),
        adminPhone: normalizePhoneInput(phone),
        password,
      })
      setStep('success')
    } catch (err) {
      // Map known backend codes (SLUG_TAKEN, EMAIL_TAKEN, …) to friendly,
      // localized copy; fall back to a generic message for anything else.
      setSubmitError(friendlyError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  const PANEL_FEATURES = [
    { icon: CalendarClock, key: 'bookings' },
    { icon: Sparkles, key: 'page' },
    { icon: ShieldCheck, key: 'trial' },
  ]

  return (
    <div className={s.page}>
      {/* ── Left brand panel ── */}
      <aside className={s.panel}>
        <div className={s.panelGrid} />
        <div className={s.panelOrb} />

        <Link to="/" className={s.panelLogo}>
          <span className={s.panelLogoMark}><LogoMark size={38} /></span>
          <div>
            <div className={s.panelLogoName}>Reserva</div>
            <div className={s.panelLogoTag}>{t('signup.panelTag')}</div>
          </div>
        </Link>

        <div className={s.panelMid}>
          <h2 className={s.panelQuote}>
            {t('signup.panelQuotePre')}<em>{t('signup.panelQuoteEm')}</em>{t('signup.panelQuotePost')}
          </h2>
          <div className={s.features}>
            {PANEL_FEATURES.map(f => (
              <div key={f.key} className={s.feature}>
                <span className={s.featureIcon}><f.icon size={17} /></span>
                <div>
                  <div className={s.featureTitle}>{t(`signup.features.${f.key}.title`)}</div>
                  <div className={s.featureDesc}>{t(`signup.features.${f.key}.desc`)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className={s.panelBy}>{t('signup.panelBy')}</p>
      </aside>

      {/* ── Right form area ── */}
      <main className={s.main}>
        <div className={s.corner}>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <Link to="/" className={s.mobileLogo}>
          <span className={s.mobileLogoMark}><LogoMark size={44} /></span>
          <span className={s.mobileLogoName}>Reserva</span>
        </Link>

        {step === 'success' ? (
          <div className={s.success}>
            <div className={s.successIcon}><Mail size={38} /></div>
            <h1 className={s.successTitle}>{t('signup.success.title')}</h1>
            <p className={s.successText}>
              {t('signup.success.textPre')}<strong>{email}</strong>{t('signup.success.textPost')}
            </p>
            <div className={s.successCard}>
              <div className={s.successRow}>
                <span className={s.successRowLabel}><CheckCircle2 size={14} /> {t('signup.success.step1')}</span>
              </div>
              <div className={s.successRow}>
                <span className={s.successRowLabel}><Mail size={14} /> {t('signup.success.step2')}</span>
              </div>
              <div className={s.successRow}>
                <span className={s.successRowLabel}><ShieldCheck size={14} /> {t('signup.success.step3')}</span>
              </div>
            </div>
            <button className={s.submit} onClick={() => navigate('/')}>
              {t('signup.success.cta')} <ArrowRight size={17} />
            </button>
            <p className={s.footNote}>{t('signup.success.note')}</p>
          </div>
        ) : (
          <div className={s.card}>
            {/* Step indicator */}
            <div className={s.steps}>
              <StepDot index={1} label={t('signup.stepCompany')} active={step === 'company'} done={step === 'account'} />
              <span className={[s.stepBar, step === 'account' ? s.stepBarDone : ''].filter(Boolean).join(' ')} />
              <StepDot index={2} label={t('signup.stepAccount')} active={step === 'account'} done={false} />
            </div>

            {plan && (
              <div className={s.planChip}>
                <Sparkles size={13} />
                {t('signup.planChip', { plan: t(`pricing.tiers.${plan}.name`) })}
              </div>
            )}

            {step === 'company' ? (
              <>
                <div className={s.heading}>
                  <h1 className={s.title}>{t('signup.companyTitle')}</h1>
                  <p className={s.subtitle}>{t('signup.companySubtitle')}</p>
                </div>

                <div className={s.form}>
                  <Field
                    label={t('signup.companyName')}
                    icon={<Building2 size={16} />}
                    value={company}
                    onChange={setCompany}
                    placeholder={t('signup.companyNamePlaceholder')}
                    error={touched && !companyValid ? t('signup.errCompany') : undefined}
                    onEnter={goAccount}
                    autoFocus
                  />
                  <Field
                    label={t('signup.companyType')}
                    icon={<Sparkles size={16} />}
                    value={companyType}
                    onChange={setCompanyType}
                    placeholder={t('signup.companyTypePlaceholder')}
                    onEnter={goAccount}
                  />
                  <Field
                    label={t('signup.slug')}
                    optional={t('signup.optional')}
                    icon={<Sparkles size={16} />}
                    value={slug}
                    onChange={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder={t('signup.slugPlaceholder')}
                    hint={slug ? `${slug}.reserva.am` : t('signup.slugHint')}
                    onEnter={goAccount}
                  />

                  <div className={s.accentField}>
                    <AccentPicker
                      label={t('signup.accent')}
                      value={accent}
                      onChange={setAccent}
                    />
                  </div>

                  <button className={s.submit} onClick={goAccount} disabled={!companyValid}>
                    {t('signup.continue')} <ArrowRight size={17} />
                  </button>
                </div>

                <p className={s.signInRow}>
                  {t('signup.haveAccount')}{' '}
                  <a className={s.signInLink} href="#">{t('signup.signIn')}</a>
                </p>
              </>
            ) : (
              <>
                <div className={s.heading}>
                  <button className={s.backLink} onClick={() => setStep('company')}>
                    <ArrowLeft size={14} /> {t('signup.back')}
                  </button>
                  <h1 className={s.title}>{t('signup.accountTitle')}</h1>
                  <p className={s.subtitle}>{t('signup.accountSubtitle')}</p>
                </div>

                <div className={s.form}>
                  <Field
                    label={t('signup.adminName')}
                    icon={<User size={16} />}
                    value={name}
                    onChange={setName}
                    placeholder={t('signup.adminNamePlaceholder')}
                    error={touched && !nameValid ? t('signup.errName') : undefined}
                    autoFocus
                  />
                  <div className={s.row}>
                    <Field
                      label={t('signup.email')}
                      icon={<Mail size={16} />}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="admin@salon.am"
                      error={touched && !emailValid ? t('signup.errEmail') : undefined}
                    />
                    <Field
                      label={t('signup.phone')}
                      icon={<Phone size={16} />}
                      value={phone}
                      onChange={(v) => setPhone(normalizePhoneInput(v))}
                      placeholder={t('signup.phonePlaceholder')}
                      error={touched && !phoneValid ? t('signup.errPhone') : undefined}
                    />
                  </div>

                  <Field
                    label={t('signup.password')}
                    icon={<Lock size={16} />}
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    error={touched && !pwValid ? t('signup.errPassword', { n: MIN_PW }) : undefined}
                    trailing={
                      <button type="button" className={s.eyeBtn} tabIndex={-1} onClick={() => setShowPw(v => !v)}
                        aria-label={showPw ? t('signup.hide') : t('signup.show')}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                  <Field
                    label={t('signup.confirm')}
                    icon={<Lock size={16} />}
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={setConfirm}
                    placeholder="••••••••"
                    error={touched && confirm.length > 0 && !matchValid ? t('signup.errMismatch') : undefined}
                    valid={matchValid}
                    onEnter={handleSubmit}
                  />

                  {submitError && (
                    <div className={s.submitError}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      {submitError}
                    </div>
                  )}

                  <button
                    className={[s.submit, submitting ? s.loading : ''].filter(Boolean).join(' ')}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting
                      ? <><span className={s.spinner} /> {t('signup.creating')}</>
                      : <>{t('signup.createAccount')} <ArrowRight size={17} /></>}
                  </button>
                  <p className={s.terms}>{t('signup.terms')}</p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function StepDot({ index, label, active, done }: { index: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={[s.stepDot, active ? s.stepActive : '', done ? s.stepDone : ''].filter(Boolean).join(' ')}>
      <span className={s.stepCircle}>{done ? <Check size={13} /> : index}</span>
      <span className={s.stepLabel}>{label}</span>
    </div>
  )
}

interface FieldProps {
  label: string
  optional?: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  valid?: boolean
  hint?: string
  trailing?: React.ReactNode
  onEnter?: () => void
  autoFocus?: boolean
}

function Field({ label, optional, icon, value, onChange, placeholder, type = 'text', error, valid, hint, trailing, onEnter, autoFocus }: FieldProps) {
  return (
    <div className={s.field}>
      <label className={s.label}>
        {label}{optional && <span className={s.optional}> · {optional}</span>}
      </label>
      <div className={s.inputWrap}>
        <span className={s.inputIcon}>{icon}</span>
        <input
          className={[s.input, error ? s.hasError : '', valid ? s.isValid : ''].filter(Boolean).join(' ')}
          type={type}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter() }}
        />
        {trailing}
        {valid && !trailing && <span className={s.validIcon}><Check size={16} /></span>}
      </div>
      {error && <span className={s.fieldError}><AlertCircle size={14} /> {error}</span>}
      {!error && hint && <span className={s.fieldHint}>{hint}</span>}
    </div>
  )
}
