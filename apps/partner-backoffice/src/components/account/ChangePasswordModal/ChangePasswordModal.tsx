import { useState } from 'react'
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import { Modal, Button, useToast } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { usersService } from '@/services/users.service'
import { useT } from '@/i18n'
import s from './ChangePasswordModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
}

const MIN_LEN = 6

export function ChangePasswordModal({ open, onClose }: Props) {
  const user  = useAuthStore(st => st.user)
  const toast = useToast()
  const t     = useT()

  const [current, setCurrent] = useState('')
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm('')
    setShow(false); setError(null); setSaving(false)
  }

  const close = () => { reset(); onClose() }

  const tooShort = next.length > 0 && next.length < MIN_LEN
  const mismatch = confirm.length > 0 && next !== confirm
  const sameAsOld = next.length > 0 && next === current
  const canSave =
    !!current && next.length >= MIN_LEN && next === confirm && !sameAsOld && !saving

  const handleSubmit = async () => {
    if (!canSave || !user) return
    setSaving(true)
    setError(null)
    try {
      await usersService.changePassword(user.id, current, next)
      toast(t('changePassword.toast'))
      close()
    } catch (e) {
      const code = e instanceof Error ? e.message : ''
      setError(code === 'wrong-current' ? t('changePassword.wrongCurrent') : t('changePassword.failed'))
      setSaving(false)
    }
  }

  const inputType = show ? 'text' : 'password'

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('changePassword.title')}
      subtitle={t('changePassword.subtitle')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
          <Button variant="accent" disabled={!canSave} onClick={handleSubmit}>
            {saving ? t('changePassword.saving') : t('changePassword.save')}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        {error && (
          <div className={s.errorBanner}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <div className={s.field}>
          <label className={s.label}>{t('changePassword.currentLabel')}</label>
          <div className={s.inputWrap}>
            <input
              className={s.input}
              type={inputType}
              value={current}
              autoComplete="current-password"
              onChange={e => { setCurrent(e.target.value); setError(null) }}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('changePassword.newLabel')}</label>
          <div className={s.inputWrap}>
            <input
              className={[s.input, tooShort || sameAsOld ? s.inputError : ''].filter(Boolean).join(' ')}
              type={inputType}
              value={next}
              autoComplete="new-password"
              onChange={e => setNext(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className={s.eyeBtn}
              onClick={() => setShow(v => !v)}
              tabIndex={-1}
              aria-label={show ? t('changePassword.hide') : t('changePassword.show')}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {tooShort && <span className={s.hint}>{t('changePassword.minLen', { n: MIN_LEN })}</span>}
          {sameAsOld && <span className={s.hint}>{t('changePassword.sameAsOld')}</span>}
        </div>

        <div className={s.field}>
          <label className={s.label}>{t('changePassword.confirmLabel')}</label>
          <div className={s.inputWrap}>
            <input
              className={[s.input, mismatch ? s.inputError : ''].filter(Boolean).join(' ')}
              type={inputType}
              value={confirm}
              autoComplete="new-password"
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
            {confirm.length > 0 && next === confirm && !mismatch && (
              <span className={s.matchOk}><Check size={15} /></span>
            )}
          </div>
          {mismatch && <span className={s.hint}>{t('changePassword.mismatch')}</span>}
        </div>
      </div>
    </Modal>
  )
}
