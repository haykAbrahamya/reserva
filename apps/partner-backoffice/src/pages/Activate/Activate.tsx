import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { ApiError } from '@/services/http'
import s from './Activate.module.scss'

/**
 * Lands here from the signup activation email:
 *   backoffice.reserva.am/activate?token=<raw>
 * Exchanges the token for a session (which also creates the partner+admin on
 * the backend) and drops the user straight into the dashboard.
 */
export function Activate() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuthStore((st) => st.login)
  const [error, setError] = useState('')
  const ran = useRef(false) // guard React 18 StrictMode double-invoke

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const token = params.get('token')
    if (!token) {
      setError('Missing activation token. Please use the link from your email.')
      return
    }

    authService
      .activate(token)
      .then(({ token: access, user }) => {
        login(access, user)
        navigate('/', { replace: true })
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not activate your account. The link may have expired.',
        )
      })
  }, [params, login, navigate])

  return (
    <div className={s.page}>
      <div className={s.card}>
        <span className={s.logo}><ShieldCheck size={20} /></span>
        {error ? (
          <>
            <div className={s.errIcon}><AlertCircle size={28} /></div>
            <h1 className={s.title}>Activation failed</h1>
            <p className={s.text}>{error}</p>
            <Button variant="accent" onClick={() => (window.location.href = 'https://reserva.am/signup')}>
              Sign up again
            </Button>
          </>
        ) : (
          <>
            <div className={s.spinner}><Loader2 size={30} className={s.spin} /></div>
            <h1 className={s.title}>Activating your account…</h1>
            <p className={s.text}>Setting things up — you'll be signed in shortly.</p>
          </>
        )}
      </div>
    </div>
  )
}
