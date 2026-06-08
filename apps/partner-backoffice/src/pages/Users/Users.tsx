import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Users as UsersIcon, MapPin, Phone, Mail, Trash2, Copy, Check, ShieldCheck, KeyRound } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Modal, Input, Select, Empty, Avatar, useToast } from '@/components/ui'
import { usersService } from '@/services/users.service'
import { partnersService } from '@/services/partners.service'
import type { AuthUser } from '@/store/auth.store'
import { useI18n } from '@/i18n'
import s from './Users.module.scss'

const EMPTY_FORM = { name: '', phone: '', email: '', locationId: '', otpChannel: 'phone' as 'phone' | 'email' }

export function Users() {
  const partner = usePartner()
  const { data: locations } = useResource(() => partnersService.listLocations(), [], [])
  const toast   = useToast()
  const { t }   = useI18n()

  const [managers, setManagers] = useState<AuthUser[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<AuthUser | null>(null)
  // After creating: show the generated OTP + delivery channel.
  const [created, setCreated] = useState<{ user: AuthUser; otp: string; channel: 'phone' | 'email' } | null>(null)
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(() => {
    if (!partner) return
    setLoading(true)
    usersService.listManagers(partner.id).then(m => { setManagers(m); setLoading(false) })
  }, [partner])

  useEffect(() => { refresh() }, [refresh])

  if (!partner) return null

  const locName = (id: string | null) => locations.find(l => l.id === id)?.name ?? '—'

  const openNew = () => {
    setForm({ ...EMPTY_FORM, locationId: locations[0]?.id ?? '' })
    setModalOpen(true)
  }

  const canSave =
    form.name.trim().length > 1 &&
    form.phone.trim().length >= 6 &&
    /\S+@\S+\.\S+/.test(form.email.trim()) &&
    !!form.locationId

  const handleCreate = async () => {
    if (!canSave) return
    setSaving(true)
    const res = await usersService.createManager({
      partnerId: partner.id,
      name: form.name,
      phone: form.phone,
      email: form.email,
      locationId: form.locationId,
      otpChannel: form.otpChannel,
    })
    setSaving(false)
    setModalOpen(false)
    setCreated({ user: res.user, otp: res.otp, channel: form.otpChannel })
    refresh()
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    await usersService.removeManager(confirmDel.id)
    toast(t('users.toast.removed'))
    setConfirmDel(null)
    refresh()
  }

  const copyOtp = () => {
    if (!created) return
    navigator.clipboard?.writeText(created.otp)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('users.title')}</h1>
          <p className={s.sub}>{t('users.subtitle', { name: partner.name, count: managers.length })}</p>
        </div>
        <Button variant="accent" onClick={openNew}><UserPlus size={14} /> {t('users.addManager')}</Button>
      </div>

      {loading ? (
        <div className={s.loading}><span className={s.spinner} /></div>
      ) : managers.length === 0 ? (
        <Empty
          icon={UsersIcon}
          title={t('users.emptyTitle')}
          description={t('users.emptyDesc')}
          action={<Button variant="accent" onClick={openNew}><UserPlus size={14} /> {t('users.addManager')}</Button>}
        />
      ) : (
        <div className={s.grid}>
          {managers.map(m => (
            <div key={m.id} className={s.card}>
              <div className={s.actions}>
                <Button variant="ghost" size="sm" icon onClick={() => setConfirmDel(m)}>
                  <Trash2 size={13} />
                </Button>
              </div>

              <div className={s.cardTop}>
                <Avatar name={m.name} color={partner.accent} size="lg" />
                <div className={s.cardBody}>
                  <div className={s.nameRow}>
                    <span className={s.name}>{m.name}</span>
                    <span className={s.roleBadge}><ShieldCheck size={11} /> {t('roles.manager')}</span>
                  </div>
                  <div className={s.metaRow}><MapPin size={12} /> {locName(m.locationId)}</div>
                  <div className={s.metaRow}><Mail size={12} /> {m.email}</div>
                  <div className={s.metaRow}><Phone size={12} /> {m.phone}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create manager modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('users.modal.title')}
        subtitle={t('users.modal.subtitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="accent" disabled={!canSave || saving} onClick={handleCreate}>
              {saving ? t('users.modal.creating') : t('users.modal.create')}
            </Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <Input
            label={t('users.modal.nameLabel')}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={t('users.modal.namePlaceholder')}
          />
          <div className={s.formRow}>
            <Input
              label={t('users.modal.phoneLabel')}
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+374 91 …"
            />
            <Input
              label={t('users.modal.emailLabel')}
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="manager@salon.am"
            />
          </div>
          <div>
            <label className={s.fieldLabel}>{t('users.modal.locationLabel')}</label>
            <Select
              value={form.locationId}
              onChange={v => setForm(f => ({ ...f, locationId: v }))}
              options={locations.map(l => ({ value: l.id, label: l.name, sub: l.address }))}
              placeholder={t('users.modal.locationPlaceholder')}
            />
          </div>

          {/* OTP delivery choice */}
          <div>
            <label className={s.fieldLabel}>{t('users.modal.otpLabel')}</label>
            <div className={s.segmented}>
              <button
                type="button"
                className={[s.segBtn, form.otpChannel === 'phone' ? s.segActive : ''].filter(Boolean).join(' ')}
                onClick={() => setForm(f => ({ ...f, otpChannel: 'phone' }))}
              >
                <Phone size={14} /> {t('users.modal.viaPhone')}
              </button>
              <button
                type="button"
                className={[s.segBtn, form.otpChannel === 'email' ? s.segActive : ''].filter(Boolean).join(' ')}
                onClick={() => setForm(f => ({ ...f, otpChannel: 'email' }))}
              >
                <Mail size={14} /> {t('users.modal.viaEmail')}
              </button>
            </div>
            <p className={s.hint}>{t('users.modal.otpHint')}</p>
          </div>
        </div>
      </Modal>

      {/* ── OTP success modal ── */}
      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        size="sm"
        footer={<Button variant="accent" onClick={() => setCreated(null)}>{t('users.created.done')}</Button>}
      >
        {created && (
          <div className={s.createdBox}>
            <div className={s.createdIcon}><Check size={26} /></div>
            <h2 className={s.createdTitle}>{t('users.created.title')}</h2>
            <p className={s.createdText}>
              {t(created.channel === 'phone' ? 'users.created.sentPhone' : 'users.created.sentEmail', {
                name: created.user.name,
                to: created.channel === 'phone' ? created.user.phone : created.user.email,
              })}
            </p>

            <div className={s.otpCard}>
              <div className={s.otpLabel}><KeyRound size={12} /> {t('users.created.otpLabel')}</div>
              <div className={s.otpRow}>
                <code className={s.otpCode}>{created.otp}</code>
                <button className={s.copyBtn} onClick={copyOtp} title={t('users.created.copy')}>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <p className={s.loginHint}>
              {t('users.created.loginHint', { login: `${created.user.email} / ${created.user.phone}` })}
            </p>
          </div>
        )}
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title={t('users.delete.title')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleDelete}>{t('common.remove')}</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--fg-1)', margin: 0, lineHeight: 1.5 }}>
          {(() => {
            const [before, after] = t('users.delete.body').split('{name}')
            return <>{before}<strong>{confirmDel?.name}</strong>{after}</>
          })()}
        </p>
      </Modal>
    </div>
  )
}
