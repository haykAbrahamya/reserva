import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Check, Loader2 } from 'lucide-react'
import { Modal, Button, Input, SegmentedFilter, useToast } from '@/components/ui'
import { AccentPicker } from '@/components/AccentPicker/AccentPicker'
import { partnersService, type CreatePartnerResult } from '@/services/partners.service'
import { ApiError } from '@/services/http'
import { errorMessage } from '@/services/errors'
import s from './CreatePartnerModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

// Reserva brand bronze (matches @reserva/ui --accent) — a new partner starts on
// the house brand color; staff can change it in the AccentPicker.
const DEFAULT_ACCENT = '#A8784B'

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

const EMPTY = {
  name: '', slug: '', type: '', accent: DEFAULT_ACCENT,
  kind: 'salon' as 'salon' | 'single',
  adminName: '', adminEmail: '', adminPhone: '',
}

export function CreatePartnerModal({ open, onClose, onCreated }: Props) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
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

  // Per-field validation messages. Surfaced only after a submit attempt so we
  // don't nag the operator while they're still filling the form.
  const fieldErrors = useMemo(() => {
    const e: Partial<Record<'name' | 'slug' | 'type' | 'adminName' | 'adminEmail' | 'adminPhone', string>> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (effectiveSlug.length < 2) e.slug = 'Slug must be at least 2 characters'
    else if (slugStatus === 'taken') e.slug = 'This slug is already taken'
    if (!form.type.trim()) e.type = 'Type is required'
    if (!form.adminName.trim()) e.adminName = 'Admin name is required'
    if (!/.+@.+\..+/.test(form.adminEmail)) e.adminEmail = 'Enter a valid email'
    if (form.adminPhone.trim().length < 4) e.adminPhone = 'Enter a valid phone'
    return e
  }, [form, effectiveSlug, slugStatus])

  const valid = Object.keys(fieldErrors).length === 0 && slugStatus !== 'checking'

  const reset = () => {
    setForm(EMPTY); setSlugTouched(false); setError(''); setResult(null); setCopied(false)
    setSlugStatus('idle'); setSubmitted(false)
  }
  const close = () => { reset(); onClose() }

  const save = async () => {
    // Always give feedback on click: if something's missing, reveal the inline
    // errors instead of a silently-dead button.
    if (!valid) {
      setSubmitted(true)
      setError(slugStatus === 'checking'
        ? 'Please wait — checking slug availability…'
        : 'Please fill in all required fields.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await partnersService.create({
        name: form.name.trim(),
        slug: effectiveSlug,
        type: form.type.trim(),
        accent: form.accent,
        kind: form.kind,
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
        setError(errorMessage(err))
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
          <Button variant="accent" disabled={saving} onClick={save}>
            {saving ? 'Creating…' : 'Create partner'}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        {error && <div className={s.error}>{error}</div>}

        <div className={s.groupLabel}>Salon</div>
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Antheris" error={submitted ? fieldErrors.name : undefined} />
        <div className={s.row}>
          <div className={s.slugField}>
            <Input
              label="Slug (domain handle)"
              value={effectiveSlug}
              onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }}
              placeholder="antheris"
              error={submitted && effectiveSlug.length < 2 ? fieldErrors.slug : undefined}
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
          <Input label="Type" value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="Aesthetic clinic" error={submitted ? fieldErrors.type : undefined} />
        </div>

        <AccentPicker value={form.accent} onChange={(c) => set('accent', c)} />

        <div>
          <span className={s.fieldLabel}>Partner type</span>
          <SegmentedFilter<'salon' | 'single'>
            ariaLabel="Partner type"
            value={form.kind}
            onChange={(v) => set('kind', v)}
            options={[
              { value: 'salon', label: 'Salon' },
              { value: 'single', label: 'Solo' },
            ]}
          />
          <span className={s.slugHint}>
            {form.kind === 'single'
              ? 'Solo pro — auto-creates one location + specialist; hides team UI.'
              : 'Salon — full team, specialists and multiple locations.'}
          </span>
        </div>

        <div className={s.groupLabel}>First admin</div>
        <Input label="Full name" value={form.adminName} onChange={(e) => set('adminName', e.target.value)} placeholder="Jane Doe" error={submitted ? fieldErrors.adminName : undefined} />
        <div className={s.row}>
          <Input label="Email" type="email" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} placeholder="admin@antheris.am" error={submitted ? fieldErrors.adminEmail : undefined} />
          <Input label="Phone" value={form.adminPhone} onChange={(e) => set('adminPhone', e.target.value)} placeholder="+374 …" error={submitted ? fieldErrors.adminPhone : undefined} />
        </div>
      </div>
    </Modal>
  )
}
