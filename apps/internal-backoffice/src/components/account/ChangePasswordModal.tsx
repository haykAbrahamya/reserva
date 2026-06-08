import { useState } from 'react'
import { Modal, Button, Input, useToast } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { ApiError } from '@/services/http'

interface Props {
  open: boolean
  onClose: () => void
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm(''); setError('')
  }
  const close = () => { reset(); onClose() }

  const canSave = current && next.length >= 8 && next === confirm && !saving

  const save = async () => {
    setError('')
    if (next !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    try {
      await authService.changePassword(current, next)
      toast('Password updated')
      close()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change password"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="accent" disabled={!canSave} onClick={save}>
            {saving ? 'Saving…' : 'Update'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <div style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
        <Input label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} help="At least 8 characters" />
        <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
    </Modal>
  )
}
