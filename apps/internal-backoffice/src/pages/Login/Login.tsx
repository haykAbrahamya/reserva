import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReservaMark } from '@/components/ReservaMark'
import { Button, Input } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { errorMessage } from '@/services/errors'
import s from './Login.module.scss'

export function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore((st) => st.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    // Local validation — show inline messages instead of silently doing nothing.
    const fe: { email?: string; password?: string } = {}
    if (!email.trim()) fe.email = 'Email is required.'
    if (!password) fe.password = 'Password is required.'
    setFieldErr(fe)
    if (Object.keys(fe).length) return

    setLoading(true)
    try {
      const user = await authService.login(email.trim(), password)
      setUser(user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <form className={s.card} onSubmit={submit}>
        <div className={s.brand}>
          <span className={s.logo}><ReservaMark size={24} /></span>
          <div>
            <div className={s.title}>Reserva</div>
            <div className={s.subtitle}>Internal Console</div>
          </div>
        </div>

        <p className={s.lead}>Sign in to manage partners and platform staff.</p>

        {error && <div className={s.error}>{error}</div>}

        <Input
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldErr(f => ({ ...f, email: undefined })) }}
          placeholder="you@reserva.am"
          error={fieldErr.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFieldErr(f => ({ ...f, password: undefined })) }}
          placeholder="••••••••"
          error={fieldErr.password}
        />

        <Button type="submit" variant="accent" disabled={loading} className={s.submit}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
