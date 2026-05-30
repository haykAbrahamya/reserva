import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '../Button/Button'
import s from './Modal.module.scss'

const CLOSE_DURATION = 260 // ms — must match longest CSS animation

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

/** Wraps onClose with a closing animation before unmounting */
function useAnimatedClose(open: boolean, onClose: () => void) {
  const [closing, setClosing] = useState(false)

  // Reset closing state when reopened
  useEffect(() => { if (open) setClosing(false) }, [open])

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, CLOSE_DURATION)
  }, [onClose])

  return { closing, handleClose }
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  const isMobile = useIsMobile()
  const { closing, handleClose } = useAnimatedClose(open, onClose)

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', fn)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fn)
      document.body.style.overflow = ''
    }
  }, [open, handleClose])

  if (!open && !closing) return null

  const inner = (
    <>
      {isMobile && <div className={s.grab} />}
      {title && (
        <div className={s.head}>
          <div>
            <h2 className={s.title}>{title}</h2>
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" icon onClick={handleClose}><X size={14} /></Button>
        </div>
      )}
      <div className={s.body}>{children}</div>
      {footer && <div className={s.footer}>{footer}</div>}
    </>
  )

  return (
    <div
      className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')}
      onClick={handleClose}
    >
      {isMobile ? (
        <div
          className={[s.sheet, closing ? s.closing : ''].filter(Boolean).join(' ')}
          onClick={e => e.stopPropagation()}
        >
          {inner}
        </div>
      ) : (
        <div
          className={[s.modal, size !== 'md' ? s[size] : '', closing ? s.closing : ''].filter(Boolean).join(' ')}
          onClick={e => e.stopPropagation()}
        >
          {inner}
        </div>
      )}
    </div>
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer }: Omit<ModalProps, 'size'>) {
  const isMobile = useIsMobile()
  const { closing, handleClose } = useAnimatedClose(open, onClose)

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', fn)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fn)
      document.body.style.overflow = ''
    }
  }, [open, handleClose])

  if (!open && !closing) return null

  const inner = (
    <>
      {isMobile && <div className={s.grab} />}
      {title && (
        <div className={s.head}>
          <div>
            <h2 className={s.title}>{title}</h2>
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" icon onClick={handleClose}><X size={14} /></Button>
        </div>
      )}
      <div className={s.body}>{children}</div>
      {footer && <div className={s.footer}>{footer}</div>}
    </>
  )

  return (
    <div
      className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')}
      onClick={handleClose}
    >
      {isMobile ? (
        <div
          className={[s.sheet, closing ? s.closing : ''].filter(Boolean).join(' ')}
          onClick={e => e.stopPropagation()}
        >
          {inner}
        </div>
      ) : (
        <div
          className={[s.drawer, closing ? s.closing : ''].filter(Boolean).join(' ')}
          onClick={e => e.stopPropagation()}
        >
          {inner}
        </div>
      )}
    </div>
  )
}
