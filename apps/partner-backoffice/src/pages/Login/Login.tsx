import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Eye, EyeOff, AlertCircle, CalendarClock, Users, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import s from './Login.module.scss'

const FEATURES = [
  { icon: CalendarClock, title: 'Bookings around the clock', desc: 'Clients book online, day or night' },
  { icon: Users,         title: 'Your whole team, organized', desc: 'Specialists, services & schedules' },
  { icon: TrendingUp,    title: 'Revenue at a glance',        desc: 'Track every booking and earning' },
]

// Logo mark SVG — reusable
function LogoMark({ size = 20, light = false }: { size?: number; light?: boolean }) {
  const c = light ? 'white' : 'var(--accent)'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3C10.3431 3 9 4.34315 9 6C9 7.65685 10.3431 9 12 9C13.6569 9 15 7.65685 15 6C15 4.34315 13.6569 3 12 3Z" fill={c} />
      <path d="M6 21C6 17.6863 8.68629 15 12 15C15.3137 15 18 17.6863 18 21" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="6" r="3" stroke={light ? 'white' : 'var(--accent)'} strokeWidth="0" fill={c} opacity="0" />
    </svg>
  )
}

export function Login() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)

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
    if (!email.trim())  { setEmailErr('Email is required.');    ok = false }
    if (!password)      { setPassErr('Password is required.');  ok = false }
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
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
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
            <div className={s.panelLogoTag}>Backoffice</div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className={s.features}>
          {FEATURES.map(f => (
            <div key={f.title} className={s.feature}>
              <div className={s.featureIcon}>
                <f.icon size={18} />
              </div>
              <div>
                <div className={s.featureTitle}>{f.title}</div>
                <div className={s.featureDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className={s.panelQuote}>
            Your salon, <em>beautifully</em> managed.
          </p>
          <p className={s.panelBy}>Reserva · Booking platform for Armenian salons</p>
        </div>
      </aside>

      {/* Main / form area */}
      <main className={s.main}>
        {/* Mobile logo */}
        <div className={s.mobileLogo}>
          <div className={s.mobileLogoMark}>
            <LogoMark size={26} light />
          </div>
          <div className={s.mobileLogoName}>Reserva</div>
          <div className={s.mobileLogoTag}>Backoffice</div>
        </div>

        <div className={s.card}>
          <div className={s.heading}>
            <h1 className={s.title}>Welcome back</h1>
            <p className={s.subtitle}>Sign in to your backoffice dashboard</p>
          </div>

          <form className={s.form} onSubmit={handleSubmit} noValidate>
            {/* Global error */}
            {error && (
              <div className={s.errorBanner}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            {/* Email */}
            <div className={s.field}>
              <label className={s.label} htmlFor="email">Email address</label>
              <div className={s.inputWrap}>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="armen@antheris.am"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(null); setError(null) }}
                  onKeyDown={e => e.key === 'Enter' && passRef.current?.focus()}
                  className={[s.input, emailErr ? s.hasError : ''].filter(Boolean).join(' ')}
                />
                <span className={s.inputIcon}><Mail size={16} /></span>
              </div>
              {emailErr && (
                <span className={s.fieldError}><AlertCircle size={12} />{emailErr}</span>
              )}
            </div>

            {/* Password */}
            <div className={s.field}>
              <label className={s.label} htmlFor="password">Password</label>
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
                  aria-label={showPass ? 'Hide password' : 'Show password'}
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className={s.footer}>© {new Date().getFullYear()} Reserva. All rights reserved.</p>
      </main>
    </div>
  )
}
