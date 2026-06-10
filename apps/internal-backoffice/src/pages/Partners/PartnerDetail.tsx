import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Mail, Phone, MapPin, Users, CalendarDays } from 'lucide-react'
import { Avatar, Badge, Button, Input, Textarea, Toggle, Empty, useToast } from '@/components/ui'
import { AccentPicker } from '@/components/AccentPicker/AccentPicker'
import { useResource } from '@/store/useResource'
import { partnersService, type UpdatePartnerInput } from '@/services/partners.service'
import { ApiError } from '@/services/http'
import s from './PartnerDetail.module.scss'

export function PartnerDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: partner, loading, reload } = useResource(() => partnersService.get(id), [id])

  const [form, setForm] = useState<UpdatePartnerInput>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Seed the editable form once the partner loads.
  useEffect(() => {
    if (partner) {
      setForm({
        name: partner.name,
        type: partner.type,
        accent: partner.accent,
        presentation: {
          tagline: partner.presentation?.tagline ?? '',
          about: partner.presentation?.about ?? '',
        },
      })
    }
  }, [partner])

  if (!loading && !partner) {
    return (
      <div className={s.page}>
        <Empty icon={Users} title="Partner not found" description="It may have been removed." />
      </div>
    )
  }
  if (!partner) return <div className={s.page} />

  const setP = <K extends keyof NonNullable<UpdatePartnerInput['presentation']>>(k: K, v: string) =>
    setForm((f) => ({ ...f, presentation: { ...f.presentation, [k]: v } }))

  const save = async () => {
    setError('')
    setSaving(true)
    try {
      await partnersService.update(id, form)
      toast('Changes saved')
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    try {
      await partnersService.setActive(id, !partner.active)
      toast(partner.active ? 'Partner disabled' : 'Partner enabled')
      await reload()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update')
    }
  }

  const counts = [
    { label: 'Branches', value: partner.counts.locations, icon: MapPin },
    { label: 'Services', value: partner.counts.services, icon: CalendarDays },
    { label: 'Specialists', value: partner.counts.specialists, icon: Users },
    { label: 'Bookings', value: partner.counts.bookings, icon: CalendarDays },
  ]

  return (
    <div className={s.page}>
      <button className={s.back} onClick={() => navigate('/partners')}>
        <ArrowLeft size={15} /> Partners
      </button>

      <div className={s.head}>
        <div className={s.headLeft}>
          <Avatar name={partner.name} size="lg" style={{ background: partner.accent, color: 'white', border: 'none' }} />
          <div>
            <h1 className={s.h1}>{partner.name}</h1>
            <div className={s.headMeta}>
              <span className={s.slug}>/{partner.slug}</span> · {partner.type}
            </div>
          </div>
        </div>
        <div className={s.headRight}>
          <Badge variant={partner.active ? 'active' : 'inactive'} label={partner.active ? 'Active' : 'Inactive'} />
          <Button variant={partner.active ? 'ghost' : 'accent'} size="sm" onClick={toggleActive}>
            {partner.active ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      <div className={s.countRow}>
        {counts.map((c) => (
          <div key={c.label} className={s.countCard}>
            <c.icon size={15} className={s.countIcon} />
            <span className={s.countValue}>{c.value}</span>
            <span className={s.countLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className={s.grid}>
        {/* Editable profile */}
        <section className={s.card}>
          <h2 className={s.cardTitle}>Profile &amp; branding</h2>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.fields}>
            <Input label="Name" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Type" value={form.type ?? ''} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />

            <AccentPicker
              value={form.accent ?? ''}
              onChange={(c) => setForm((f) => ({ ...f, accent: c }))}
            />

            <Input label="Tagline" value={form.presentation?.tagline ?? ''} onChange={(e) => setP('tagline', e.target.value)} placeholder="Short public tagline" />
            <Textarea label="About" rows={4} value={form.presentation?.about ?? ''} onChange={(e) => setP('about', e.target.value)} placeholder="Public description shown on the booking page" />
          </div>
          <div className={s.cardFoot}>
            <Button variant="accent" disabled={saving} onClick={save}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </section>

        {/* Admins */}
        <section className={s.card}>
          <h2 className={s.cardTitle}>Admins</h2>
          {partner.users.length === 0 ? (
            <p className={s.muted}>No admin users.</p>
          ) : (
            <div className={s.adminList}>
              {partner.users.map((u) => (
                <div key={u.id} className={s.adminRow}>
                  <Avatar name={u.name} size="sm" />
                  <div className={s.adminInfo}>
                    <div className={s.adminName}>{u.name}</div>
                    <div className={s.adminContact}><Mail size={11} /> {u.email}</div>
                    <div className={s.adminContact}><Phone size={11} /> {u.phone}</div>
                  </div>
                  <Toggle checked={u.active} disabled onChange={() => {}} />
                </div>
              ))}
            </div>
          )}
          <p className={s.hint}>
            Admin accounts are managed by the partner from their own backoffice.
          </p>
        </section>
      </div>
    </div>
  )
}
