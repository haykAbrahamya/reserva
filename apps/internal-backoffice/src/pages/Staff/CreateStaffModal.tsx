import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Modal, Button, Input, Select, useToast } from '@/components/ui'
import { staffService, type CreateStaffResult } from '@/services/staff.service'
import type { PlatformRole } from '@/store/auth.store'
import { errorMessage } from '@/services/errors'
import s from './CreateStaffModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const EMPTY = { name: '', email: '', role: 'operator' as PlatformRole }

export function CreateStaffModal({ open, onClose, onCreated }: Props) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<CreateStaffResult | null>(null)
  const [copied, setCopied] = useState(false)

  const valid = form.name.trim() && /.+@.+\..+/.test(form.email)

  const reset = () => { setForm(EMPTY); setError(''); setResult(null); setCopied(false) }
  const close = () => { reset(); onClose() }

  const save = async () => {
    setError('')
    setSaving(true)
    try {
      const res = await staffService.create({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      })
      onCreated()
      if (res.otp) setResult(res)
      else { toast('Staff member created'); close() }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const copyOtp = async () => {
    if (!result?.otp) return
    await navigator.clipboard.writeText(result.otp)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (result) {
    return (
      <Modal
        open={open}
        onClose={close}
        title="Staff member created"
        subtitle={result.user.email}
        size="sm"
        footer={<Button variant="accent" onClick={close}>Done</Button>}
      >
        <div className={s.otpWrap}>
          <p className={s.otpLead}>
            Share this one-time password. They'll set a new password on first sign-in.
          </p>
          <div className={s.otpBox}>
            <code className={s.otpCode}>{result.otp}</code>
            <button className={s.copyBtn} onClick={copyOtp}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New staff member"
      subtitle="Invite a platform operator"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="accent" disabled={!valid || saving} onClick={save}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        {error && <div className={s.error}>{error}</div>}
        <Input label="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@reserva.am" />
        <div>
          <label className={s.fieldLabel}>Role</label>
          <Select
            value={form.role}
            onChange={(v) => setForm((f) => ({ ...f, role: v as PlatformRole }))}
            options={[
              { value: 'operator', label: 'Operator — manage partners' },
              { value: 'owner', label: 'Owner — full access + staff' },
            ]}
          />
        </div>
      </div>
    </Modal>
  )
}
