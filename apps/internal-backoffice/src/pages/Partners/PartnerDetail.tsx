import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, MapPin, Users, User, CalendarDays, Store, ExternalLink, Trash2, AlertTriangle, SlidersHorizontal, LayoutTemplate } from 'lucide-react'
import { Avatar, Badge, Button, Input, Textarea, Toggle, Empty, ConfirmDialog, SegmentedFilter, useToast } from '@/components/ui'
import { AccentPicker } from '@/components/AccentPicker/AccentPicker'
import { useResource } from '@/store/useResource'
import { partnersService, type UpdatePartnerInput } from '@/services/partners.service'
import { errorMessage } from '@/services/errors'
import { PartnerUsers } from './PartnerUsers'
import s from './PartnerDetail.module.scss'

export function PartnerDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: partner, loading, reload } = useResource(() => partnersService.get(id), [id])

  const [form, setForm] = useState<UpdatePartnerInput>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

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
      setError(errorMessage(err))
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
      toast(errorMessage(err))
    }
  }

  const toggleMarketplace = async (next: boolean) => {
    try {
      await partnersService.setMarketplace(id, next)
      toast(next ? 'Featured in marketplace' : 'Removed from marketplace')
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const toggleBookings = async (next: boolean) => {
    try {
      await partnersService.setBookings(id, next)
      toast(next ? 'Online booking enabled' : 'Online booking disabled (contact-only)')
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const changeKind = async (kind: 'salon' | 'single') => {
    if (kind === partner.kind) return
    try {
      await partnersService.setKind(id, kind)
      toast(kind === 'single' ? 'Switched to solo mode' : 'Switched to salon mode')
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const changeTemplate = async (template: 'classic' | 'tabbed') => {
    if (template === partner.template) return
    try {
      await partnersService.update(id, { template })
      toast(template === 'tabbed' ? 'Switched to tabbed template' : 'Switched to classic template')
      await reload()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const doHardDelete = async () => {
    setDeleting(true)
    try {
      await partnersService.hardDelete(id)
      toast('Partner permanently deleted')
      navigate('/partners')
    } catch (err) {
      toast(errorMessage(err))
      setDeleting(false)
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

        {/* Users — view + manage (edit, reset password) */}
        <PartnerUsers partnerId={id} />

        {/* Visibility & booking — grouped toggles */}
        <section className={s.card}>
          <h2 className={s.cardTitle}><SlidersHorizontal size={15} className={s.cardTitleIcon} /> Visibility &amp; booking</h2>

          <div className={s.toggleList}>
            <div className={s.toggleRow}>
              <div className={s.toggleText}>
                <div className={s.toggleLabel}><User size={13} /> Partner type</div>
                <div className={s.toggleDesc}>Solo hides the team/specialists and skips the picker.</div>
              </div>
              <SegmentedFilter<'salon' | 'single'>
                size="sm"
                ariaLabel="Partner type"
                value={partner.kind}
                onChange={changeKind}
                options={[
                  { value: 'salon', label: 'Salon' },
                  { value: 'single', label: 'Solo' },
                ]}
              />
            </div>

            <div className={s.toggleRow}>
              <div className={s.toggleText}>
                <div className={s.toggleLabel}><LayoutTemplate size={13} /> Page template</div>
                <div className={s.toggleDesc}>Public page layout. Classic = single scroll; Tabbed = tab bar.</div>
              </div>
              <SegmentedFilter<'classic' | 'tabbed'>
                size="sm"
                ariaLabel="Page template"
                value={partner.template ?? 'classic'}
                onChange={changeTemplate}
                options={[
                  { value: 'classic', label: 'Classic' },
                  { value: 'tabbed', label: 'Tabbed' },
                ]}
              />
            </div>

            <div className={s.toggleRow}>
              <div className={s.toggleText}>
                <div className={s.toggleLabel}><Store size={13} /> Marketplace listing</div>
                <div className={s.toggleDesc}>Show on the public /salons directory.</div>
              </div>
              <Toggle
                checked={partner.marketplaceListed}
                onChange={toggleMarketplace}
                disabled={!partner.active || !partner.slug}
              />
            </div>

            <div className={s.toggleRow}>
              <div className={s.toggleText}>
                <div className={s.toggleLabel}><CalendarDays size={13} /> Online booking</div>
                <div className={s.toggleDesc}>Off = contact-only page (call/contact CTAs).</div>
              </div>
              <Toggle checked={partner.bookingsEnabled} onChange={toggleBookings} />
            </div>
          </div>

          {(!partner.active || !partner.slug) && (
            <p className={s.hint}>
              {!partner.active ? 'Enable the partner to allow marketplace listing. ' : ''}
              {!partner.slug ? 'No public slug yet — set one before listing.' : ''}
            </p>
          )}
          {partner.slug && (
            <a className={s.marketLink} href={`/p/${partner.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} /> View public page
            </a>
          )}
        </section>

      </div>

      {/* Danger zone — full-width row below the grid */}
      <section className={`${s.card} ${s.danger} ${s.dangerCard}`}>
        <div className={s.dangerRow}>
          <div className={s.toggleText}>
            <div className={s.toggleLabel}><AlertTriangle size={14} className={s.dangerIcon} /> Delete partner</div>
            <div className={s.toggleDesc}>Permanently removes the salon and all its connected data. This cannot be undone.</div>
          </div>
          <Button variant="danger" size="sm" onClick={() => { setDeleteText(''); setConfirmDelete(true) }}>
            <Trash2 size={14} /> Delete partner
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        variant="danger"
        title="Delete this partner permanently?"
        message={`This deletes "${partner.name}" and ALL connected data — bookings, services, specialists, locations, clients, users, reviews and uploaded images. This cannot be undone. Type the salon name to confirm.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete forever'}
        cancelLabel="Cancel"
        loading={deleting || deleteText.trim() !== partner.name.trim()}
        onConfirm={doHardDelete}
        onClose={() => { if (!deleting) setConfirmDelete(false) }}
      >
        <Input
          autoFocus
          placeholder={partner.name}
          value={deleteText}
          onChange={(e) => setDeleteText(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  )
}
