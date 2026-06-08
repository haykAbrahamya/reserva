import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, PauseCircle, Users, MapPin, CalendarDays, TrendingUp } from 'lucide-react'
import { Avatar, Badge, Empty } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { statsService } from '@/services/stats.service'
import { useAuthStore } from '@/store/auth.store'
import s from './Dashboard.module.scss'

export function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((st) => st.user)
  const { data, loading } = useResource(() => statsService.overview(), [])

  const stats = [
    { label: 'Partners', value: data?.partners.total ?? 0, icon: Building2, tone: 'accent' as const },
    { label: 'Active', value: data?.partners.active ?? 0, icon: CheckCircle2, tone: 'success' as const },
    { label: 'Inactive', value: data?.partners.inactive ?? 0, icon: PauseCircle, tone: 'warn' as const },
    { label: 'New (30d)', value: data?.partners.recent ?? 0, icon: TrendingUp, tone: 'accent' as const },
    { label: 'Locations', value: data?.catalog.locations ?? 0, icon: MapPin, tone: 'muted' as const },
    { label: 'Specialists', value: data?.catalog.specialists ?? 0, icon: Users, tone: 'muted' as const },
    { label: 'Bookings', value: data?.catalog.bookings ?? 0, icon: CalendarDays, tone: 'muted' as const },
    { label: 'Staff', value: data?.staff ?? 0, icon: Users, tone: 'muted' as const },
  ]

  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1 className={s.h1}>Overview</h1>
        <p className={s.sub}>Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}. Here's the platform at a glance.</p>
      </div>

      <div className={s.statGrid}>
        {stats.map((st) => (
          <div key={st.label} className={s.statCard}>
            <span className={[s.statIcon, s[st.tone]].join(' ')}><st.icon size={18} /></span>
            <div className={s.statBody}>
              <div className={s.statValue}>{loading ? '—' : st.value.toLocaleString()}</div>
              <div className={s.statLabel}>{st.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Recent partners</h2>
        </div>

        {!loading && data && data.recentPartners.length === 0 ? (
          <Empty icon={Building2} title="No partners yet" description="Provision your first partner to get started." />
        ) : (
          <div className={s.recentList}>
            {(data?.recentPartners ?? []).map((p) => (
              <button key={p.id} className={s.recentRow} onClick={() => navigate(`/partners/${p.id}`)}>
                <Avatar name={p.name} size="md" style={{ background: p.accent, color: 'white', border: 'none' }} />
                <div className={s.recentInfo}>
                  <div className={s.recentName}>{p.name}</div>
                  <div className={s.recentMeta}>/{p.slug} · {p.type}</div>
                </div>
                <Badge
                  variant={p.active ? 'active' : 'inactive'}
                  label={p.active ? 'Active' : 'Inactive'}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
