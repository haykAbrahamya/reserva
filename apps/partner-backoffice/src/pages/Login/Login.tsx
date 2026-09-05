import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, Eye, EyeOff, AlertCircle, LayoutGrid, Users, Smartphone } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { errorMessage } from '@/utils/errors'
import { useT } from '@/i18n'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher/LanguageSwitcher'
import s from './Login.module.scss'

/**
 * What the panel says while someone types their password.
 *
 * Product-AGNOSTIC, deliberately. This page used to pitch bookings — "clients
 * book around the clock", "track every booking and its revenue" — which stopped
 * being true the day a salon could hold vacancies and no booking product at
 * all. Such a salon signs up on a purple job board, lands here, and reads an
 * advert for something it did not buy.
 *
 * The deeper point is that a login page has no business selling anything: the
 * person reading it is already a customer. So these three say what is true of
 * the ACCOUNT rather than of any one product, which also means they never need
 * revisiting when a fourth product ships.
 */
const FEATURES = [
  { icon: LayoutGrid, key: 'oneDashboard' },
  { icon: Users,      key: 'team' },
  { icon: Smartphone, key: 'anywhere' },
]

// Reserva "Petal R" mark — strokes only, painted in a single color so it reads
// on both the colored login panel (light=white) and light surfaces (accent).
function LogoMark({ size = 20, light = false }: { size?: number; light?: boolean }) {
  const c = light ? 'white' : 'var(--accent)'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <g stroke={c} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M17 36V12" />
        <path d="M17 12c10 0 16 4 16 11s-7 8-16 8" />
        <path d="M24 31l10 5" />
      </g>
    </svg>
  )
}

export function Login() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)
  const t        = useT()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [emailErr,    setEmailErr]    = useState<string | null>(null)
  const [passErr,     setPassErr]     = useState<string | null>(null)
  const passRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    let ok = true
    setEmailErr(null); setPassErr(null); setError(null)
    if (!email.trim())  { setEmailErr(t('login.identifierRequired'));    ok = false }
    if (!password)      { setPassErr(t('login.passwordRequired'));  ok = false }
    return ok
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { token, user } = await authService.login(email, password)
      login(token, user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      {/* Left decorative panel — desktop only */}
      <aside className={s.panel}>
        <div className={s.panelGrid} />
        <div className={s.panelOrb} />

        <div className={s.panelLogo}>
          <div className={s.panelLogoMark}>
            <LogoMark size={20} light />
          </div>
          <div>
            <div className={s.panelLogoName}>Reserva</div>
            <div className={s.panelLogoTag}>{t('common.backoffice')}</div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className={s.features}>
          {FEATURES.map(f => (
            <div key={f.key} className={s.feature}>
              <div className={s.featureIcon}>
                <f.icon size={18} />
              </div>
              <div>
                <div className={s.featureTitle}>{t(`login.features.${f.key}.title`)}</div>
                <div className={s.featureDesc}>{t(`login.features.${f.key}.desc`)}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className={s.panelQuote}>{t('login.quote')}</p>
          <p className={s.panelBy}>{t('login.tagline')}</p>
        </div>
      </aside>

      {/* Main / form area */}
      <main className={s.main}>
        {/* Language switcher — top-right */}
        <div className={s.langCorner}>
          <LanguageSwitcher />
        </div>

        {/* Mobile logo */}
        <div className={s.mobileLogo}>
          <div className={s.mobileLogoMark}>
            <LogoMark size={26} light />
          </div>
          <div className={s.mobileLogoName}>Reserva</div>
          <div className={s.mobileLogoTag}>{t('common.backoffice')}</div>
        </div>

        <div className={s.card}>
          <div className={s.heading}>
            <h1 className={s.title}>{t('login.welcomeBack')}</h1>
            <p className={s.subtitle}>{t('login.subtitle')}</p>
          </div>

          <form className={s.form} onSubmit={handleSubmit} noValidate>
            {/* Global error */}
            {error && (
              <div className={s.errorBanner}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            {/* Email or phone — login accepts either (see auth.findByLogin). */}
            <div className={s.field}>
              <label className={s.label} htmlFor="login">{t('login.identifierLabel')}</label>
              <div className={s.inputWrap}>
                <input
                  id="login"
                  type="text"
                  autoComplete="username"
                  placeholder={t('login.identifierPlaceholder')}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(null); setError(null) }}
                  onKeyDown={e => e.key === 'Enter' && passRef.current?.focus()}
                  className={[s.input, emailErr ? s.hasError : ''].filter(Boolean).join(' ')}
                />
                <span className={s.inputIcon}><AtSign size={16} /></span>
              </div>
              {emailErr && (
                <span className={s.fieldError}><AlertCircle size={12} />{emailErr}</span>
              )}
            </div>

            {/* Password */}
            <div className={s.field}>
              <label className={s.label} htmlFor="password">{t('login.passwordLabel')}</label>
              <div className={s.inputWrap}>
                <input
                  id="password"
                  ref={passRef}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPassErr(null); setError(null) }}
                  className={[s.input, passErr ? s.hasError : ''].filter(Boolean).join(' ')}
                />
                <button
                  type="button"
                  className={s.eyeBtn}
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passErr && (
                <span className={s.fieldError}><AlertCircle size={12} />{passErr}</span>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={[s.submit, loading ? s.loading : ''].filter(Boolean).join(' ')}
              disabled={loading}
            >
              {loading ? <span className={s.spinner} /> : null}
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>
        </div>

        <p className={s.footer}>{t('login.copyright', { year: new Date().getFullYear() })}</p>
      </main>
    </div>
  )
}
