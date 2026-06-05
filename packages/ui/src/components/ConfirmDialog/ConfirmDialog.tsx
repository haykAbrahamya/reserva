import { AlertTriangle } from 'lucide-react'
import { Modal } from '../Modal/Modal'
import { Button } from '../Button/Button'
import s from './ConfirmDialog.module.scss'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  /** Confirm button label. */
  confirmLabel: string
  /** Cancel button label. */
  cancelLabel: string
  /** 'danger' tints the icon + confirm button red (destructive actions). */
  variant?: 'danger' | 'default'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** A themed replacement for window.confirm() — used for destructive/important
 * confirmations so they match the app instead of the OS dialog. */
export function ConfirmDialog({
  open, title, message, confirmLabel, cancelLabel,
  variant = 'default', loading, onConfirm, onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'accent'} disabled={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className={s.body}>
        <span className={[s.icon, variant === 'danger' ? s.danger : ''].filter(Boolean).join(' ')}>
          <AlertTriangle size={20} />
        </span>
        <div className={s.text}>
          <div className={s.title}>{title}</div>
          <p className={s.message}>{message}</p>
        </div>
      </div>
    </Modal>
  )
}
