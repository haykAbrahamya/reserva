import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Check, Loader2 } from 'lucide-react'
import { Modal, Button, Input, useToast } from '@/components/ui'
import { AccentPicker } from '@/components/AccentPicker/AccentPicker'
import { partnersService, type CreatePartnerResult } from '@/services/partners.service'
import { ApiError } from '@/services/http'
import s from './CreatePartnerModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const DEFAULT_ACCENT = '#4f46e5'

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

const EMPTY = {
  name: '', slug: '', type: '', accent: DEFAULT_ACCENT,
  adminName: '', adminEmail: '', adminPhone: '',
}

export function CreatePartnerModal({ open, onClose, onCreated }: Props) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<CreatePartnerResult | null>(null)
  const [copied, setCopied] = useState(false)

  // Live slug availability: 'idle' | 'checking' | 'available' | 'taken'.
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Auto-derive slug from name until the operator edits it directly.
  const effectiveSlug = slugTouched ? form.slug : slugify(form.name)

  // Debounced availability check whenever the effective slug changes.
  const checkSeq = useRef(0)
  useEffect(() => {
    if (!open) return
    const slug = effectiveSlug
    if (slug.length < 2) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const seq = ++checkSeq.current
    const id = setTimeout(() => {
      partnersService
        .isSlugAvailable(slug)
        .then((free) => {
          if (seq === checkSeq.current) setSlugStatus(free ? 'available' : 'taken')
        })
        .catch(() => { if (seq === checkSeq.current) setSlugStatus('idle') })
    }, 350)
    return () => clearTimeout(id)
  }, [effectiveSlug, open])

  const valid = useMemo(
    () =>
      !!form.name.trim() &&
      effectiveSlug.length >= 2 &&
      slugStatus !== 'taken' &&
      slugStatus !== 'checking' &&
      !!form.type.trim() &&
      !!form.adminName.trim() &&
      /.+@.+\..+/.test(form.adminEmail) &&
      form.adminPhone.trim().length >= 4,
    [form, effectiveSlug, slugStatus],
  )

  const reset = () => {
    setForm(EMPTY); setSlugTouched(false); setError(''); setResult(null); setCopied(false)
    setSlugStatus('idle')
  }
  const close = () => { reset(); onClose() }

  const save = async () => {
    setError('')
    setSaving(true)
    try {
      const res = await partnersService.create({
        name: form.name.trim(),
        slug: effectiveSlug,
        type: form.type.trim(),
        accent: form.accent,
        admin: {
          name: form.adminName.trim(),
          email: form.adminEmail.trim(),
          phone: form.adminPhone.trim(),
        },
      })
      onCreated()
      if (res.adminOtp) {
        setResult(res) // show the one-time password hand-off screen
      } else {
        toast('Partner created')
        close()
      }
    } catch (err) {
      // Backend is the source of truth — if the slug was taken between our live
      // check and submit, reflect it on the field too.
      if (err instanceof ApiError && err.code === 'SLUG_TAKEN') {
        setSlugStatus('taken')
        setError(`The slug "${effectiveSlug}" is already taken. Choose another.`)
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not create partner')
      }
    } finally {
      setSaving(false)
    }
  }

  const copyOtp = async () => {
    if (!result?.adminOtp) return
    await navigator.clipboard.writeText(result.adminOtp)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // ── Success / hand-off screen ──
  if (result) {
    return (
      <Modal
        open={open}
        onClose={close}
        title="Partner created"
        subtitle={`${result.partner.name} is ready`}
        size="sm"
        footer={<Button variant="accent" onClick={close}>Done</Button>}
      >
        <div className={s.otpWrap}>
          <p className={s.otpLead}>
            Share this one-time password with the partner admin. They'll be asked to set a new
            password on first sign-in.
          </p>
          <div className={s.otpBox}>
            <code className={s.otpCode}>{result.adminOtp}</code>
            <button className={s.copyBtn} onClick={copyOtp}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className={s.otpMeta}>Login: /{result.partner.slug}</div>
        </div>
      </Modal>
    )
  }

  // ── Create form ──
  return (
    <Modal
      open={open}
      onClose={close}
      title="New partner"
      subtitle="Provision a salon + its first admin"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="accent" disabled={!valid || saving} onClick={save}>
            {saving ? 'Creating…' : 'Create partner'}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        {error && <div className={s.error}>{error}</div>}

        <div className={s.groupLabel}>Salon</div>
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Antheris" />
        <div className={s.row}>
          <div className={s.slugField}>
            <Input
              label="Slug (domain handle)"
              value={effectiveSlug}
              onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }}
              placeholder="antheris"
            />
            <div className={s.slugStatus}>
              {effectiveSlug.length >= 2 && slugStatus === 'checking' && (
                <span className={s.slugChecking}><Loader2 size={12} className={s.spin} /> Checking…</span>
              )}
              {slugStatus === 'available' && (
                <span className={s.slugOk}><Check size={12} /> {effectiveSlug}.reserva.am is available</span>
              )}
              {slugStatus === 'taken' && (
                <span className={s.slugTaken}>This slug is already taken</span>
              )}
              {(slugStatus === 'idle' || effectiveSlug.length < 2) && (
                <span className={s.slugHint}>{effectiveSlug ? `${effectiveSlug}.reserva.am` : 'becomes a subdomain'}</span>
              )}
            </div>
          </div>
          <Input label="Type" value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="Aesthetic clinic" />
        </div>

        <AccentPicker value={form.accent} onChange={(c) => set('accent', c)} />

        <div className={s.groupLabel}>First admin</div>
        <Input label="Full name" value={form.adminName} onChange={(e) => set('adminName', e.target.value)} placeholder="Jane Doe" />
        <div className={s.row}>
          <Input label="Email" type="email" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} placeholder="admin@antheris.am" />
          <Input label="Phone" value={form.adminPhone} onChange={(e) => set('adminPhone', e.target.value)} placeholder="+374 …" />
        </div>
      </div>
    </Modal>
  )
}
