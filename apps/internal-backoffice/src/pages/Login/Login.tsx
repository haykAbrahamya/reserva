import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { ApiError } from '@/services/http'
import s from './Login.module.scss'

export function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore((st) => st.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await authService.login(email.trim(), password)
      setUser(user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <form className={s.card} onSubmit={submit}>
        <div className={s.brand}>
          <span className={s.logo}><ShieldCheck size={20} /></span>
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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@reserva.am"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <Button type="submit" variant="accent" disabled={loading || !email || !password} className={s.submit}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
