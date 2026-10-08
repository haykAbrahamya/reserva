import {
  useCallback, useEffect, useRef, useState,
  type FormEvent, type InputHTMLAttributes, type ReactNode, type Ref,
} from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, CalendarClock, Check, CheckCircle2, ChevronDown, ChevronRight,
  Eye, EyeOff, Globe, Loader2, Lock, Mail, MailCheck, Pencil, Phone, ShieldCheck, Sparkles, User, Users,
} from 'lucide-react'
import { LogoMark } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { AccentPicker } from '@/components/AccentPicker/AccentPicker'
import { signupService, type SignupInput } from '@/services/signup.service'
import { friendlyError } from '@/services/errors'
import { track } from '@/services/analytics.service'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { useSeo } from '@/hooks/useSeo'
import { useT } from '@/i18n'
import { PagePreview } from './PagePreview'
import { TypeSheet } from './TypeSheet'
import {
  AM_CODE, EMAIL_RE, MIN_PW, SLUG_RE, TYPE_KEYS, clearDraft, emailSuggestion, formatAmPhone, inboxFor,
  isInternational, isPhoneValid, loadDraft, passwordScore, phoneToE164, saveDraft, slugFinal,
  slugFromName, slugInput, slugVariants, type Kind, type Step,
} from './signupForm'
import s from './SignUp.module.scss'

// ─────────────────────────────────────────────────────────────
// Self-serve sign-up in three short steps, one question at a time:
//   1. How do you work? — one tap (solo / salon), then straight on.
//   2. Your page — name, what you do (chips), the page address made from the
//      name and checked live, brand colour; a live preview of the page.
//   3. Your account — name, phone (+374 assumed), email, one password.
// Every field the backend needs is still asked for; the work of filling them
// is what shrank. The step lives in the URL (?step=page), so the phone's back
// gesture goes back a step, and what was typed survives a reload (never the
// password).
// ─────────────────────────────────────────────────────────────

const STEPS: Step[] = ['kind', 'page', 'account']
const DEFAULT_ACCENT = '#A8784B'
const BACKOFFICE_URL = import.meta.env.VITE_BACKOFFICE_URL || 'https://backoffice.reserva.am'
/** Seconds before "Send again" works again. */
const RESEND_SECONDS = 30

type FieldKey = 'company' | 'type' | 'slug' | 'name' | 'phone' | 'email' | 'password'
type SlugCheck = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unknown'

const PAGE_FIELDS = ['company', 'type', 'slug'] as const
const ACCOUNT_FIELDS = ['name', 'phone', 'email', 'password'] as const
/** Where focus goes when a field needs fixing. */
const FIELD_ID: Record<FieldKey, string> = {
  company: 'su-company', type: 'su-type', slug: 'su-slug',
  name: 'su-name', phone: 'su-phone', email: 'su-email', password: 'su-password',
}

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ')
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const focusField = (f: FieldKey) => {
  const el = document.getElementById(FIELD_ID[f])
  if (!el) return
  el.focus({ preventScroll: true })
  // The whole field to the middle, so its error line clears the pinned button on phones.
  el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
}
const NARROW = '(max-width: 640px)'
/** Phones: too short for a wall of chips. Read at once on the client (no flash); desktop in the prerender. */
function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(NARROW).matches === true)
  useEffect(() => {
    const mq = window.matchMedia?.(NARROW)
    if (!mq) return
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return narrow
}

export function SignUp() {
  useScrollToTop()
  const t = useT()
  useSeo({ title: t('seo.signup.title'), description: t('seo.signup.description'), path: '/signup' })
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const plan = params.get('plan') // 'starter' | 'pro' | 'business' | null

  // ── The form, restored from this browser's draft ──
  const [draft] = useState(loadDraft)
  const [kind, setKind] = useState<Kind | null>(() => {
    const fromLink = params.get('kind')
    return fromLink === 'salon' || fromLink === 'single' ? fromLink : draft?.kind ?? null
  })
  const [company, setCompany] = useState(draft?.company ?? '')
  const [typeKey, setTypeKey] = useState(draft?.typeKey ?? '')
  const [typeOther, setTypeOther] = useState(draft?.typeOther ?? '')
  const [slug, setSlug] = useState(draft?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(draft?.slugEdited ?? false)
  const [editingSlug, setEditingSlug] = useState(false)
  const [accent, setAccent] = useState(draft?.accent ?? DEFAULT_ACCENT)
  const [name, setName] = useState(draft?.name ?? '')
  const [email, setEmail] = useState(draft?.email ?? '')
  const [phone, setPhone] = useState(draft?.phone ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  /** Taken according to the server (on submit). */
  const [taken, setTaken] = useState<{ email?: boolean; phone?: boolean; slug?: boolean }>({})
  const [slugCheck, setSlugCheck] = useState<SlugCheck>('idle')
  const [slugAlt, setSlugAlt] = useState<string | null>(null)
  const [slugRecheck, setSlugRecheck] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── After sending ──
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState('')

  // ── Derived ──
  const companyType =
    typeKey === 'other'
      ? typeOther.trim()
      : kind && TYPE_KEYS[kind].includes(typeKey) ? t(`signup.types.${kind}.${typeKey}`) : ''
  const slugValue = slugFinal(slug)
  const slugFormatBad = !!slugValue && !SLUG_RE.test(slugValue)
  const slugTaken = !!taken.slug || slugCheck === 'taken'
  const phoneIntl = isInternational(phone)

  const errors: Record<FieldKey, string> = {
    company: company.trim().length < 2 ? t('signup.errCompany') : '',
    type: companyType ? '' : t('signup.errType'),
    slug: slugTaken ? t('errors.codes.SLUG_TAKEN') : slugFormatBad ? t('signup.addressInvalid') : '',
    name: name.trim().length < 2 ? t('signup.errName') : '',
    phone: taken.phone ? t('errors.codes.PHONE_TAKEN') : isPhoneValid(phone) ? '' : t('signup.errPhone'),
    email: taken.email ? t('errors.codes.EMAIL_TAKEN') : EMAIL_RE.test(email.trim()) ? '' : t('signup.errEmail'),
    password: password.length < MIN_PW ? t('signup.errPassword', { n: MIN_PW }) : '',
  }
  /** Shown once they've left the field or pressed on; what the server said shows at once. */
  const shown = (f: FieldKey): string => {
    const fromServer = f === 'slug' ? slugTaken : f === 'email' || f === 'phone' ? !!taken[f] : false
    return touched[f] || fromServer ? errors[f] : ''
  }
  const pageInvalid = PAGE_FIELDS.find((f) => errors[f])
  const accountInvalid = ACCOUNT_FIELDS.find((f) => errors[f])

  // ── Steps (in the URL; a step is only reachable once the ones before it are done) ──
  const asked = params.get('step')
  const requested: Step = asked === 'page' || asked === 'account' ? asked : 'kind'
  const pageDone = !!kind && !errors.company && !errors.type && !slugFormatBad
  const reachable: Step = !kind ? 'kind' : pageDone ? 'account' : 'page'
  const step: Step = STEPS.indexOf(requested) <= STEPS.indexOf(reachable) ? requested : reachable

  const goTo = useCallback(
    (next: Step, replace = false) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === 'kind') p.delete('step')
          else p.set('step', next)
          return p
        },
        // A forward step remembers where it came from, so "Back" can be the browser's own back.
        { replace, state: replace ? location.state : { suFrom: step } },
      )
    },
    [setParams, location.state, step],
  )
  const goBack = (to: Step) => {
    if ((location.state as { suFrom?: Step } | null)?.suFrom === to) navigate(-1)
    else goTo(to, true)
  }

  // A deep link past what's filled in lands on the first unfinished step.
  useEffect(() => {
    if (step !== requested) goTo(step, true)
  }, [step, requested, goTo])

  // Each new step: count it, start at the top, put focus where the work is.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const lastStep = useRef<Step | null>(null)
  useEffect(() => {
    if (sentTo) return
    const previous = lastStep.current
    lastStep.current = step
    if (previous === null || previous === step) return
    track('signup_step', { step })
    window.scrollTo(0, 0)
    // With a mouse, start typing at once; on a phone the keyboard would cover the page, so the title takes focus.
    const typing = window.matchMedia?.('(pointer: fine)').matches
    const target = typing && firstInputRef.current ? firstInputRef.current : headingRef.current
    target?.focus({ preventScroll: true })
  }, [step, sentTo])

  useEffect(() => {
    if (!sentTo) return
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [sentTo])

  // ── Draft ──
  useEffect(() => {
    if (sentTo) return
    saveDraft({ kind, company, typeKey, typeOther, slug, slugEdited, accent, name, email, phone })
  }, [kind, company, typeKey, typeOther, slug, slugEdited, accent, name, email, phone, sentTo])

  // ── Page address: made from the name until they edit it, checked as it changes ──
  useEffect(() => {
    if (!slugEdited) setSlug(slugFromName(company))
  }, [company, slugEdited])

  const checkedSlug = useRef(slugValue)
  useEffect(() => {
    if (checkedSlug.current !== slugValue) {
      checkedSlug.current = slugValue
      setTaken((x) => (x.slug ? { ...x, slug: false } : x))
    }
    setSlugAlt(null)
    if (!slugValue) return setSlugCheck('idle')
    if (!SLUG_RE.test(slugValue)) return setSlugCheck('invalid')
    setSlugCheck('checking')
    const ctrl = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const free = await signupService.slugAvailable(slugValue, ctrl.signal)
        if (ctrl.signal.aborted) return
        if (free) return setSlugCheck('available')
        setSlugCheck('taken')
        const variants = slugVariants(slugValue)
        const open = await Promise.all(
          variants.map((v) => signupService.slugAvailable(v, ctrl.signal).catch(() => false)),
        )
        if (!ctrl.signal.aborted) setSlugAlt(variants[open.indexOf(true)] ?? null)
      } catch {
        // Offline or rate-limited: the server still checks on submit.
        if (!ctrl.signal.aborted) setSlugCheck('unknown')
      }
    }, 350)
    return () => {
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [slugValue, slugRecheck])

  // ── What you do: chips where there is room; on phones one field that opens a sheet ──
  const narrow = useNarrowScreen()
  const [sheetOpen, setSheetOpen] = useState(false)
  const typeButtonRef = useRef<HTMLButtonElement>(null)

  // ── "Send again" countdown ──
  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  // ── Actions ──
  // Analytics: the first touch of the form, each step, every attempt and how it
  // ended. Errors name the field (the first invalid one) or the API code —
  // never what was typed.
  const started = useRef(false)
  const markStarted = () => {
    if (started.current) return
    started.current = true
    track('signup_start')
  }
  const touch = (f: FieldKey) => setTouched((x) => (x[f] ? x : { ...x, [f]: true }))

  const advanceTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(advanceTimer.current), [])
  const chooseKind = (next: Kind) => {
    markStarted()
    setKind(next)
    // Most salons are beauty salons: start there, one tap to change. Solo trades vary too much to guess.
    const keep = typeKey === 'other' || TYPE_KEYS[next].includes(typeKey)
    if (!keep) setTypeKey(next === 'salon' ? 'beauty' : '')
    // A beat to see the choice land, then on — no button to press.
    window.clearTimeout(advanceTimer.current)
    advanceTimer.current = window.setTimeout(() => goTo('page'), reducedMotion() ? 0 : 240)
  }

  const editSlug = (value: string) => {
    setSlugEdited(true)
    setSlug(slugInput(value))
  }
  const finishSlug = () => {
    setEditingSlug(false)
    touch('slug')
    // Emptied: back to the address made from the name.
    if (!slugFinal(slug)) setSlugEdited(false)
    else setSlug(slugFinal(slug))
  }
  const pickSlugAlt = (alt: string) => {
    setSlugEdited(true)
    setSlug(alt)
  }

  const changePhone = (raw: string) => {
    setTaken((x) => (x.phone ? { ...x, phone: false } : x))
    const v = raw.trim()
    // +374 / 00374 typed or autofilled: Armenian after all — the prefix shows it.
    if (/^(\+|00)374/.test(v)) return setPhone(formatAmPhone(v.replace(/\D/g, '').replace(/^(00)?374/, '')))
    if (isInternational(v)) return setPhone(raw.replace(/[^\d+\s()-]/g, '').slice(0, 24))
    let digits = raw.replace(/\D/g, '')
    // Backspace over a space removes the digit before it, instead of the formatter putting the space back.
    if (digits === phone.replace(/\D/g, '') && raw.length < phone.length) digits = digits.slice(0, -1)
    setPhone(formatAmPhone(digits))
  }

  const toAccount = () => {
    setTouched((x) => ({ ...x, company: true, type: true, slug: true }))
    if (pageInvalid) {
      track('signup_error', { field: pageInvalid === 'type' ? 'companyType' : pageInvalid })
      focusField(pageInvalid)
      return
    }
    // A solo pro's page name is usually their own name.
    if (kind === 'single' && !name.trim()) setName(company.trim())
    goTo('account')
  }

  const payload = (): SignupInput => ({
    companyName: company.trim(),
    companyType: companyType.slice(0, 80),
    kind: kind ?? 'salon',
    accent,
    slug: slugValue || undefined,
    adminName: name.trim(),
    adminEmail: email.trim(),
    adminPhone: phoneToE164(phone),
    password,
  })

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (submitting) return
    setTouched((x) => ({ ...x, name: true, phone: true, email: true, password: true }))
    setSubmitError('')
    if (accountInvalid) {
      track('signup_error', { field: accountInvalid })
      focusField(accountInvalid)
      return
    }
    if (pageInvalid) {
      // e.g. the address turned out to be taken while they were here.
      track('signup_error', { field: pageInvalid === 'type' ? 'companyType' : pageInvalid })
      setTouched((x) => ({ ...x, slug: true }))
      return goBack('page')
    }
    setSubmitting(true)
    track('signup_submit')
    try {
      const res = await signupService.start(payload())
      track('signup_success')
      clearDraft()
      setSentTo(res.email || email.trim())
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      const code = (err as { code?: string } | null)?.code ?? 'UNKNOWN'
      track('signup_error', { code })
      if (code === 'EMAIL_TAKEN' || code === 'PHONE_TAKEN') {
        const field = code === 'EMAIL_TAKEN' ? 'email' : 'phone'
        setTaken((x) => ({ ...x, [field]: true }))
        focusField(field)
      } else if (code === 'SLUG_TAKEN') {
        setTaken((x) => ({ ...x, slug: true }))
        setSlugRecheck((n) => n + 1)
        goBack('page')
      } else {
        setSubmitError(friendlyError(err, t))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    setResendError('')
    try {
      await signupService.start(payload())
      setResent(true)
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setResendError(friendlyError(err, t))
    } finally {
      setResending(false)
    }
  }

  const fixEmail = () => {
    setSentTo(null)
    setResent(false)
    setResendError('')
    window.setTimeout(() => focusField('email'), 0)
  }

  const index = STEPS.indexOf(step)
  const typeLabel = kind === 'single' ? t('signup.typeLabelSingle') : t('signup.typeLabelSalon')
  const suggestion = touched.email ? emailSuggestion(email) : null
  const inbox = sentTo ? inboxFor(sentTo) : null
  const pwScore = passwordScore(password)

  return (
    <div className={s.page}>
      {/* ── Desktop: the page they are building ── */}
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
          <span className={s.previewLabel}>{t('signup.preview.label')}</span>
          <PagePreview kind={kind} name={company} type={companyType} slug={slugValue} accent={accent} />
        </div>

        <ul className={s.features}>
          {([['bookings', CalendarClock], ['page', Sparkles], ['trial', ShieldCheck]] as const).map(([key, Icon]) => (
            <li key={key} className={s.feature}>
              <span className={s.featureIcon}><Icon size={16} /></span>
              <span>
                <span className={s.featureTitle}>{t(`signup.features.${key}.title`)}</span>
                <span className={s.featureDesc}>{t(`signup.features.${key}.desc`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <main className={s.main}>
        <div className={s.corner}>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <Link to="/" className={s.mobileLogo}>
          <span className={s.mobileLogoMark}><LogoMark size={34} /></span>
          <span className={s.mobileLogoName}>Reserva</span>
        </Link>

        {sentTo ? (
          // ── Sent: one tap to the inbox, and a way out of every "it didn't come" ──
          <div className={s.success}>
            <div className={s.successIcon}><MailCheck size={34} /></div>
            <h1 ref={headingRef} tabIndex={-1} className={s.successTitle}>{t('signup.success.title')}</h1>
            <p className={s.successText}>
              {t('signup.success.textPre')}<strong>{sentTo}</strong>{t('signup.success.textPost')}
            </p>
            {inbox && (
              <a className={s.submit} href={inbox.url} target="_blank" rel="noopener noreferrer">
                {t('signup.success.openMail', { provider: inbox.name })} <ArrowUpRight size={17} />
              </a>
            )}
            <ol className={s.successSteps}>
              <li><CheckCircle2 size={15} /> {t('signup.success.step1')}</li>
              <li><Mail size={15} /> {t('signup.success.step2')}</li>
              <li><ShieldCheck size={15} /> {t('signup.success.step3')}</li>
            </ol>
            <div className={s.resend}>
              <span>{t('signup.success.notGot')}</span>
              <button type="button" className={s.linkBtn} onClick={resend} disabled={cooldown > 0 || resending}>
                {resending && <Loader2 size={14} className={s.spin} />}
                {resent && cooldown > 0
                  ? <><Check size={14} /> {t('signup.success.resent')}</>
                  : cooldown > 0 ? t('signup.success.resendIn', { s: cooldown }) : t('signup.success.resend')}
              </button>
            </div>
            {resendError && (
              <div className={s.submitError} role="alert"><AlertCircle size={15} /> {resendError}</div>
            )}
            <button type="button" className={s.linkBtn} onClick={fixEmail}>{t('signup.success.changeEmail')}</button>
            <p className={s.footNote}>{t('signup.success.note')}</p>
            <Link to="/" className={s.homeLink}>{t('signup.success.cta')}</Link>
          </div>
        ) : (
          <div key={step} className={s.card} onInputCapture={markStarted} onClickCapture={markStarted}>
            <div className={s.progress}>
              <div className={s.progressMeta}>
                <span>{t('signup.progress', { n: index + 1, total: STEPS.length })}</span>
                <span className={s.progressLabel}>
                  {t(`signup.step${step === 'kind' ? 'Kind' : step === 'page' ? 'Page' : 'Account'}`)}
                </span>
              </div>
              <div
                className={s.progressTrack}
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={index + 1}
                aria-label={t('signup.progress', { n: index + 1, total: STEPS.length })}
              >
                {STEPS.map((x, i) => <span key={x} className={cx(s.progressSeg, i <= index && s.progressSegOn)} />)}
              </div>
            </div>

            {plan && (
              <div className={s.planChip}>
                <Sparkles size={13} />
                {t('signup.planChip', { plan: t(`pricing.tiers.${plan}.name`) })}
              </div>
            )}

            {step === 'kind' && (
              <>
                <header className={s.heading}>
                  <h1 ref={headingRef} tabIndex={-1} className={s.title}>{t('signup.kindTitle')}</h1>
                  <p className={s.subtitle}>{t('signup.kindSubtitle')}</p>
                </header>
                <div className={s.choices}>
                  <ChoiceCard
                    icon={<User size={20} />}
                    title={t('signup.kindSingle')}
                    hint={t('signup.kindSingleHint')}
                    selected={kind === 'single'}
                    onClick={() => chooseKind('single')}
                  />
                  <ChoiceCard
                    icon={<Users size={20} />}
                    title={t('signup.kindSalon')}
                    hint={t('signup.kindSalonHint')}
                    selected={kind === 'salon'}
                    onClick={() => chooseKind('salon')}
                  />
                </div>
                <ul className={s.perks}>
                  {(['free', 'noCard', 'fast'] as const).map((key) => (
                    <li key={key}><Check size={14} /> {t(`signup.perks.${key}`)}</li>
                  ))}
                </ul>
                <p className={s.signInRow}>
                  {t('signup.haveAccount')}{' '}
                  <a className={s.signInLink} href={`${BACKOFFICE_URL}/login`}>{t('signup.signIn')}</a>
                </p>
              </>
            )}

            {step === 'page' && kind && (
              <>
                <header className={s.heading}>
                  <button type="button" className={s.backLink} onClick={() => goBack('kind')}>
                    <ArrowLeft size={14} /> {t('signup.back')}
                  </button>
                  <h1 ref={headingRef} tabIndex={-1} className={s.title}>
                    {kind === 'single' ? t('signup.pageTitleSingle') : t('signup.pageTitleSalon')}
                  </h1>
                  <p className={s.subtitle}>{t('signup.pageSubtitle')}</p>
                </header>

                <div className={s.form}>
                  <Field
                    id="su-company"
                    label={kind === 'single' ? t('signup.nameSingle') : t('signup.nameSalon')}
                    icon={kind === 'single' ? <User size={16} /> : <Sparkles size={16} />}
                    value={company}
                    onChange={setCompany}
                    onBlur={() => company && touch('company')}
                    error={shown('company')}
                    valid={touched.company && !errors.company}
                    inputRef={firstInputRef}
                    input={{
                      placeholder: kind === 'single' ? t('signup.namePlaceholderSingle') : t('signup.namePlaceholderSalon'),
                      autoComplete: 'organization',
                      maxLength: 120,
                      enterKeyHint: 'next',
                      onKeyDown: (e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        if (companyType) return toAccount()
                        if (!narrow) return focusField('type')
                        e.currentTarget.blur()
                        setSheetOpen(true)
                      },
                    }}
                  />

                  <div className={s.field}>
                    <span className={s.label} id="su-type-label">{typeLabel}</span>
                    {narrow ? (
                      <>
                        <button
                          ref={typeButtonRef}
                          id={FIELD_ID.type}
                          type="button"
                          className={cx(s.picker, shown('type') && s.hasError)}
                          onClick={() => setSheetOpen(true)}
                          aria-haspopup="dialog"
                          aria-expanded={sheetOpen}
                          aria-labelledby={`su-type-label ${FIELD_ID.type}`}
                        >
                          <Sparkles size={16} className={s.pickerIcon} />
                          <span className={cx(s.pickerText, !companyType && s.pickerPlaceholder)}>
                            {companyType || t('signup.typeChoose')}
                          </span>
                          <ChevronDown size={18} className={s.pickerChevron} />
                        </button>
                        <TypeSheet
                          open={sheetOpen}
                          onClosed={() => {
                            setSheetOpen(false)
                            typeButtonRef.current?.focus({ preventScroll: true })
                          }}
                          title={typeLabel}
                          options={TYPE_KEYS[kind].map((key) => ({ key, label: t(`signup.types.${kind}.${key}`) }))}
                          value={typeKey}
                          otherText={typeOther}
                          otherLabel={t('signup.typeOther')}
                          otherPlaceholder={kind === 'single' ? t('signup.typeOtherPlaceholderSingle') : t('signup.typeOtherPlaceholderSalon')}
                          confirmLabel={t('signup.typeConfirm')}
                          onPick={(key) => setTypeKey(key)}
                          onOther={(text) => {
                            setTypeKey('other')
                            setTypeOther(text)
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <div className={s.chips} role="group" aria-labelledby="su-type-label">
                          {TYPE_KEYS[kind].map((key, i) => (
                            <button
                              key={key}
                              id={i === 0 ? FIELD_ID.type : undefined}
                              type="button"
                              aria-pressed={typeKey === key}
                              className={cx(s.chip, typeKey === key && s.chipOn)}
                              onClick={() => setTypeKey(key)}
                            >
                              {typeKey === key && <Check size={13} />}
                              {t(`signup.types.${kind}.${key}`)}
                            </button>
                          ))}
                          <button
                            type="button"
                            aria-pressed={typeKey === 'other'}
                            className={cx(s.chip, typeKey === 'other' && s.chipOn)}
                            onClick={() => setTypeKey('other')}
                          >
                            {typeKey === 'other' ? <Check size={13} /> : <Pencil size={12} />}
                            {t('signup.typeOther')}
                          </button>
                        </div>
                        {typeKey === 'other' && (
                          <input
                            id="su-type-other"
                            className={cx(s.input, s.inputPlain, shown('type') && s.hasError)}
                            value={typeOther}
                            onChange={(e) => setTypeOther(e.target.value)}
                            placeholder={kind === 'single' ? t('signup.typeOtherPlaceholderSingle') : t('signup.typeOtherPlaceholderSalon')}
                            aria-labelledby="su-type-label"
                            maxLength={80}
                            enterKeyHint="next"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return
                              e.preventDefault()
                              toAccount()
                            }}
                          />
                        )}
                      </>
                    )}
                    {shown('type') && <span className={s.fieldError}><AlertCircle size={14} /><span>{errors.type}</span></span>}
                  </div>

                  <AddressField
                    slug={slug}
                    shownSlug={slugValue}
                    check={slugCheck}
                    alt={slugAlt}
                    editing={editingSlug}
                    error={shown('slug')}
                    onEdit={() => setEditingSlug(true)}
                    onChange={editSlug}
                    onDone={finishSlug}
                    onUseAlt={pickSlugAlt}
                  />

                  <div className={s.field}>
                    <AccentPicker label={t('signup.accent')} value={accent} onChange={setAccent} />
                    <span className={s.fieldHint}>{t('signup.accentHint')}</span>
                  </div>
                </div>

                <div className={s.actions}>
                  <button type="button" className={s.submit} onClick={toAccount}>
                    {t('signup.continue')} <ArrowRight size={17} />
                  </button>
                </div>
              </>
            )}

            {step === 'account' && (
              <>
                <header className={s.heading}>
                  <button type="button" className={s.backLink} onClick={() => goBack('page')}>
                    <ArrowLeft size={14} /> {t('signup.back')}
                  </button>
                  <h1 ref={headingRef} tabIndex={-1} className={s.title}>{t('signup.accountTitle')}</h1>
                  <p className={s.subtitle}>{t('signup.accountSubtitle')}</p>
                </header>

                <form className={s.form} onSubmit={submit} noValidate>
                  <Field
                    id="su-name"
                    label={t('signup.adminName')}
                    icon={<User size={16} />}
                    value={name}
                    onChange={setName}
                    onBlur={() => name && touch('name')}
                    error={shown('name')}
                    valid={touched.name && !errors.name}
                    inputRef={firstInputRef}
                    input={{
                      name: 'name',
                      placeholder: t('signup.adminNamePlaceholder'),
                      autoComplete: 'name',
                      maxLength: 120,
                      enterKeyHint: 'next',
                    }}
                  />
                  <Field
                    id="su-phone"
                    label={t('signup.phone')}
                    icon={<Phone size={16} />}
                    prefix={phoneIntl ? undefined : AM_CODE}
                    value={phone}
                    onChange={changePhone}
                    onBlur={() => phone && touch('phone')}
                    error={shown('phone')}
                    valid={touched.phone && !errors.phone}
                    hint={t('signup.phoneHint')}
                    input={{
                      name: 'tel',
                      type: 'tel',
                      inputMode: 'tel',
                      autoComplete: 'tel',
                      placeholder: phoneIntl ? '+7 999 123 45 67' : '93 813 296',
                      enterKeyHint: 'next',
                    }}
                  />
                  <Field
                    id="su-email"
                    label={t('signup.email')}
                    icon={<Mail size={16} />}
                    value={email}
                    onChange={(v) => {
                      setEmail(v.replace(/\s/g, ''))
                      setTaken((x) => (x.email ? { ...x, email: false } : x))
                    }}
                    onBlur={() => email && touch('email')}
                    error={shown('email')}
                    errorAction={taken.email && (
                      <a className={s.inlineLink} href={`${BACKOFFICE_URL}/login`}>{t('signup.emailTakenSignIn')}</a>
                    )}
                    valid={touched.email && !errors.email && !suggestion}
                    hint={suggestion ? (
                      <span className={s.suggest}>
                        {t('signup.emailSuggestPre')}
                        <button type="button" className={s.inlineLink} onClick={() => setEmail(suggestion)}>{suggestion}</button>
                        {t('signup.emailSuggestPost')}
                      </span>
                    ) : t('signup.emailHint')}
                    input={{
                      name: 'email',
                      type: 'email',
                      inputMode: 'email',
                      autoComplete: 'email',
                      autoCapitalize: 'none',
                      spellCheck: false,
                      placeholder: 'name@gmail.com',
                      enterKeyHint: 'next',
                    }}
                  />
                  <Field
                    id="su-password"
                    label={t('signup.password')}
                    icon={<Lock size={16} />}
                    value={password}
                    onChange={setPassword}
                    onBlur={() => password && touch('password')}
                    error={shown('password')}
                    hint={<PasswordMeter score={pwScore} long={password.length >= MIN_PW} />}
                    trailing={
                      <button
                        type="button"
                        className={s.eyeBtn}
                        onClick={() => setShowPw((v) => !v)}
                        aria-label={showPw ? t('signup.hide') : t('signup.show')}
                        aria-pressed={showPw}
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    input={{
                      name: 'new-password',
                      type: showPw ? 'text' : 'password',
                      autoComplete: 'new-password',
                      placeholder: t('signup.pwRule', { n: MIN_PW }),
                      enterKeyHint: 'go',
                    }}
                  />

                  {submitError && (
                    <div className={s.submitError} role="alert">
                      <AlertCircle size={15} /> {submitError}
                    </div>
                  )}

                  <div className={s.actions}>
                    <button type="submit" className={cx(s.submit, submitting && s.loading)} disabled={submitting}>
                      {submitting
                        ? <><span className={s.spinner} /> {t('signup.creating')}</>
                        : <>{t('signup.createPage')} <ArrowRight size={17} /></>}
                    </button>
                  </div>
                  <p className={s.terms}>{t('signup.terms')}</p>
                </form>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function ChoiceCard({ icon, title, hint, selected, onClick }: {
  icon: ReactNode
  title: string
  hint: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={cx(s.choice, selected && s.choiceOn)} aria-pressed={selected} onClick={onClick}>
      <span className={s.choiceIcon}>{icon}</span>
      <span className={s.choiceText}>
        <span className={s.choiceTitle}>{title}</span>
        <span className={s.choiceHint}>{hint}</span>
      </span>
      <span className={s.choiceGo} aria-hidden="true">
        {selected ? <Check size={16} /> : <ChevronRight size={18} />}
      </span>
    </button>
  )
}

/** The address, read-only until "Edit": made from the name, checked as it changes. */
function AddressField({ slug, shownSlug, check, alt, editing, error, onEdit, onChange, onDone, onUseAlt }: {
  slug: string
  shownSlug: string
  check: SlugCheck
  alt: string | null
  editing: boolean
  error: string
  onEdit: () => void
  onChange: (value: string) => void
  onDone: () => void
  onUseAlt: (alt: string) => void
}) {
  const t = useT()
  const status =
    check === 'checking' ? <><Loader2 size={13} className={s.spin} /> {t('signup.addressChecking')}</>
    : check === 'available' ? <><Check size={13} /> {t('signup.addressAvailable')}</>
    : check === 'taken' ? <><AlertCircle size={13} /> {t('signup.addressTaken')}</>
    : null
  return (
    <div className={s.field}>
      <div className={s.labelRow}>
        <label className={s.label} htmlFor={FIELD_ID.slug}>{t('signup.address')}</label>
        <span className={cx(s.slugStatus, check === 'available' && s.slugOk, check === 'taken' && s.slugBad)} aria-live="polite">
          {status}
        </span>
      </div>
      {editing ? (
        <div className={s.inputWrap}>
          <span className={s.inputIcon}><Globe size={16} /></span>
          <input
            id={FIELD_ID.slug}
            className={cx(s.input, s.withSuffix, error && s.hasError)}
            value={slug}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onDone}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              onDone()
            }}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={60}
            enterKeyHint="done"
            aria-invalid={!!error || undefined}
            autoFocus
          />
          <span className={s.inputSuffix}>.reserva.am</span>
        </div>
      ) : (
        <button
          type="button"
          id={FIELD_ID.slug}
          className={cx(s.address, error && s.addressBad)}
          onClick={onEdit}
          aria-label={`${shownSlug || 'your-page'}.reserva.am — ${t('signup.addressEdit')}`}
        >
          <Globe size={16} className={s.addressIcon} />
          <span className={s.addressText}>
            <b className={shownSlug ? '' : s.muted}>{shownSlug || 'your-page'}</b>.reserva.am
          </span>
          <span className={s.addressEdit}><Pencil size={13} /> {t('signup.addressEdit')}</span>
        </button>
      )}
      {error ? (
        <span className={s.fieldError}>
          <AlertCircle size={14} />
          <span>
            {error}{' '}
            {check === 'taken' && alt && (
              <button type="button" className={s.inlineLink} onClick={() => onUseAlt(alt)}>
                {t('signup.addressUse', { slug: alt })}
              </button>
            )}
          </span>
        </span>
      ) : (
        <span className={s.fieldHint}>{t('signup.addressHint')}</span>
      )}
    </div>
  )
}

function PasswordMeter({ score, long }: { score: 0 | 1 | 2 | 3; long: boolean }) {
  const t = useT()
  const label = ['', t('signup.pwFair'), t('signup.pwGood'), t('signup.pwStrong')][score]
  return (
    <span className={s.pwMeter}>
      <span className={s.pwBars} aria-hidden="true">
        {[1, 2, 3].map((n) => <i key={n} className={cx(score >= n && s[`pw${score}`])} />)}
      </span>
      <span className={cx(s.pwRule, long && s.pwRuleMet)}>
        {long ? <><Check size={13} /> {label}</> : t('signup.pwRule', { n: MIN_PW })}
      </span>
    </span>
  )
}

interface FieldProps {
  id: string
  label: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  /** A way out shown with the error, e.g. "Sign in instead". */
  errorAction?: ReactNode
  valid?: boolean
  hint?: ReactNode
  /** Fixed text before the value, e.g. "+374". */
  prefix?: string
  trailing?: ReactNode
  inputRef?: Ref<HTMLInputElement>
  input?: InputHTMLAttributes<HTMLInputElement>
}

function Field({ id, label, icon, value, onChange, onBlur, error, errorAction, valid, hint, prefix, trailing, inputRef, input }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>{label}</label>
      <div className={s.inputWrap}>
        <span className={s.inputIcon}>{icon}</span>
        {prefix && <span className={s.inputPrefix} aria-hidden="true">{prefix}</span>}
        <input
          {...input}
          id={id}
          ref={inputRef}
          className={cx(s.input, prefix && s.withPrefix, trailing ? s.withTrailing : null, error && s.hasError, valid && s.isValid)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
        />
        {trailing ?? (valid && <span className={s.validIcon}><Check size={16} /></span>)}
      </div>
      {error ? (
        <span id={`${id}-error`} className={s.fieldError}>
          <AlertCircle size={14} />
          <span>{error} {errorAction}</span>
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className={s.fieldHint}>{hint}</span>
      ) : null}
    </div>
  )
}
