import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Textarea } from '@reserva/ui'
import { isValidPhone, normalizePhoneInput } from '@reserva/shared'
import { fetchMeta } from '@/api/board.api'
import { SpecialtyPicker } from '@/components/common/SpecialtyPicker/SpecialtyPicker'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useI18n, useT } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { errorMessage, StepDot } from './SalonSignUp'
import s from './SignUp.module.scss'

const MIN_PW = 8

/** How many specialties one person may claim — mirrors the API's own cap. */
const MAX_SPECIALTIES = 12

type Step = 'you' | 'work'

/**
 * Specialist signup — the job-seeking side.
 *
 * A completely different form from the salon one, because a completely
 * different thing is being created: not an organization with staff, branches
 * and a backoffice, but one person with a phone number and a trade. It writes
 * to `professionals`, a table of its own, and returns a session in its own
 * realm — a token typed `professional-access`, which no partner route accepts.
 *
 * Two decisions worth keeping:
 *
 *  - PHONE is the identifier, email is optional. Plenty of this audience has a
 *    number and no address, and the number is what a salon actually calls. It
 *    is normalized to E.164 by the same helper the anonymous application path
 *    uses, so the two agree about who is who.
 *  - No activation email. The salon signup sends one because creating a Partner
 *    is heavy; this account holds only what was just typed, and standing
 *    between someone and the listing they came to apply for is how a board
 *    loses the applicant it exists to deliver. They are signed in immediately.
 */
export function SpecialistSignUp({ onBack }: { onBack: () => void }) {
  const t = useT()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const { register } = useProfessionalAuth()

  const [step, setStep] = useState<Step>('you')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [touched, setTouched] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [specialtyKeys, setSpecialtyKeys] = useState<string[]>([])
  /**
   * Years, as a string, because an empty field is a real answer.
   *
   * "" means "prefer not to say" and reaches the API as null; 0 means "this is
   * my first year". A number state would collapse the two into 0 and put a
   * figure on the profile that the person never gave.
   */
  const [years, setYears] = useState('')
  const [about, setAbout] = useState('')

  /*
   * The specialty list comes from the board's OWN catalog.
   *
   * This is the point of the whole design: a professional keyed `hair-styling`
   * and a listing keyed `hair-styling` are comparable because they came from
   * one vocabulary. A hand-written list here would be a second vocabulary, and
   * the two sides of the market would stop being able to find each other.
   */
  const meta = useAsync((signal) => fetchMeta(signal), [])

  const nameValid = name.trim().length > 1
  const phoneValid = isValidPhone(phone)
  const emailValid = !email.trim() || /\S+@\S+\.\S+/.test(email.trim())
  const pwValid = password.length >= MIN_PW
  const youValid = nameValid && phoneValid && emailValid && pwValid

  const goWork = () => {
    setTouched(true)
    if (!youValid) return
    setTouched(false)
    setStep('work')
  }

  const submit = async () => {
    setSubmitError('')
    setSubmitting(true)
    try {
      await register({
        name: name.trim(),
        phone: normalizePhoneInput(phone),
        email: email.trim() || undefined,
        password,
        specialtyKeys,
        experienceYears: years === '' ? null : Number(years),
        about: about.trim() || undefined,
        locale,
      })
      // Signed in already — straight to the account, not to a "check your
      // email" screen they would have nothing to do on.
      navigate('/account', { replace: true })
    } catch (err) {
      setSubmitError(errorMessage(err, t))
      setSubmitting(false)
    }
  }

  return (
    <div className={s.form}>
      <div className={s.steps}>
        <StepDot index={1} label={t('specialist.stepYou')} active={step === 'you'} done={step === 'work'} />
        <span className={[s.stepBar, step === 'work' ? s.stepBarDone : ''].filter(Boolean).join(' ')} />
        <StepDot index={2} label={t('specialist.stepWork')} active={step === 'work'} done={false} />
      </div>

      {step === 'you' ? (
        <>
          <h1 className={s.title}>{t('specialist.youTitle')}</h1>
          <p className={s.subtitle}>{t('specialist.youSubtitle')}</p>

          <Input
            label={t('specialist.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('specialist.namePlaceholder')}
            autoComplete="name"
            error={touched && !nameValid ? t('specialist.errors.name') : undefined}
          />

          <Input
            label={t('specialist.phone')}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+374 XX XXXXXX"
            autoComplete="tel"
            help={t('specialist.phoneHint')}
            error={touched && !phoneValid ? t('specialist.errors.phone') : undefined}
          />

          <Input
            label={t('specialist.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('specialist.emailPlaceholder')}
            autoComplete="email"
            error={touched && !emailValid ? t('specialist.errors.email') : undefined}
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

          <div className={s.actions}>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft size={15} />
              {t('signup.back')}
            </Button>
            <Button variant="accent" onClick={goWork} className={s.submit}>
              {t('signup.continue')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className={s.title}>{t('specialist.workTitle')}</h1>
          {/* Everything on this step is optional and says so. A profile is more
              useful complete, but a half-filled account that can apply beats a
              perfect one nobody finished. */}
          <p className={s.subtitle}>{t('specialist.workSubtitle')}</p>

          <div className={s.field}>
            <span className={s.label}>{t('specialist.specialties')}</span>
            <p className={s.hint}>{t('specialist.specialtiesHint')}</p>
            <SpecialtyPicker
              groups={meta.data?.specialtyGroups ?? []}
              selected={specialtyKeys}
              onChange={setSpecialtyKeys}
              max={MAX_SPECIALTIES}
              loading={meta.loading && !meta.data}
            />
          </div>

          {/* Years, not the listing's experience scale. 'any' / 'junior' /
              'experienced' is what a SALON writes about a role; asked of a
              person it has no answer. */}
          <Input
            label={t('specialist.years')}
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder={t('specialist.yearsPlaceholder')}
            help={t('specialist.yearsHint')}
            className={s.yearsInput}
          />

          <Textarea
            label={t('specialist.about')}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder={t('specialist.aboutPlaceholder')}
            rows={4}
            maxLength={1200}
          />

          {submitError && <p className={s.submitError}>{submitError}</p>}

          <div className={s.actions}>
            <Button variant="ghost" onClick={() => setStep('you')} disabled={submitting}>
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
