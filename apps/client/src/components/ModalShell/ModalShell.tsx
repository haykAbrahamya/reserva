import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ─────────────────────────────────────────────────────────────
// Shared behaviour for every client modal/overlay — one place, no copy-paste:
//   • renders into a portal at <body> (escapes transformed ancestors)
//   • locks background scroll via the `modal-open` class on <html> (pure CSS,
//     no layout shift — see global.css)
//   • Esc closes
//   • backdrop click closes (clicks inside the content don't)
//   • exit animation: stays mounted for `closeDuration`ms while `closing` is
//     true, so each modal can run its own CSS close keyframe
//
// Each modal keeps its OWN markup + SCSS (banner, form, gallery…). The shell
// gives it `closing` (to toggle its `.closing` class) and `requestClose`
// (the animated-close trigger) via a render function.
// ─────────────────────────────────────────────────────────────

interface ModalShellProps {
  /** Controls mount. When it flips false the shell plays the close animation. */
  open: boolean
  /** Called after the close animation finishes — caller flips `open`/state off. */
  onClose: () => void
  /** Close animation length in ms (match the modal's CSS). Default 240. */
  closeDuration?: number
  /** Render the modal content. Receives the live `closing` flag + the animated
   *  close trigger to wire onto the overlay/close buttons. */
  children: (api: { closing: boolean; requestClose: () => void }) => ReactNode
}

export function ModalShell({ open, onClose, closeDuration = 240, children }: ModalShellProps) {
  const [closing, setClosing] = useState(false)

  // Animated close: play the exit, then tell the parent to unmount.
  const requestClose = useCallback(() => {
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      onClose()
    }, closeDuration)
  }, [onClose, closeDuration])

  // Lock scroll + Esc, only while actually shown.
  useEffect(() => {
    if (!open) return
    document.documentElement.classList.add('modal-open')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.classList.remove('modal-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, requestClose])

  if (!open && !closing) return null

  return createPortal(children({ closing, requestClose }), document.body)
}
