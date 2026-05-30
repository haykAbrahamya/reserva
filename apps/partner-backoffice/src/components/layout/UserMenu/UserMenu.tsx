import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { Avatar } from '@/components/ui'
import s from './UserMenu.module.scss'

export function UserMenu() {
  const user   = useAuthStore(st => st.user)
  const logout = useAuthStore(st => st.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', fn)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('keydown', esc) }
  }, [open])

  if (!user) return null

  const handleLogout = async () => {
    setOpen(false)
    await authService.logout()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={ref} className={s.wrap}>
      <button
        className={[s.trigger, open ? s.open : ''].filter(Boolean).join(' ')}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Avatar name={user.name} size="md" style={{
          background: `var(--accent)`,
          color: 'white',
          border: 'none',
        }} />
        <div className={s.info}>
          <div className={s.name}>{user.name}</div>
          <div className={s.role}>{user.role}</div>
        </div>
        <ChevronDown size={13} className={[s.chevron, open ? s.rotated : ''].filter(Boolean).join(' ')} />
      </button>

      {open && (
        <div className={s.dropdown} role="menu">
          {/* Header */}
          <div className={s.dropHeader}>
            <Avatar name={user.name} size="lg" style={{ background: 'var(--accent)', color: 'white', border: 'none' }} />
            <div>
              <div className={s.dropName}>{user.name}</div>
              <div className={s.dropEmail}>{user.email}</div>
              <div className={s.dropRole}>{user.role}</div>
            </div>
          </div>

          <button className={s.dropItem} role="menuitem" onClick={() => { setOpen(false); navigate('/settings') }}>
            <Settings size={15} />
            Settings
          </button>

          <div className={s.divider} />

          <button className={[s.dropItem, s.danger].join(' ')} role="menuitem" onClick={handleLogout}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
