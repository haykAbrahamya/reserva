import { useEffect, useRef, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import s from './TypeSheet.module.scss'

interface Props {
  open: boolean
  /** After the close animation. */
  onClosed: () => void
  title: string
  options: { key: string; label: string }[]
  /** The chosen key, or 'other'. */
  value: string
  otherText: string
  otherLabel: string
  otherPlaceholder: string
  confirmLabel: string
  onPick: (key: string) => void
  onOther: (text: string) => void
}

/**
 * Phones: every business type in one list that slides up from the bottom —
 * no swiping along a row to find the last one. One tap picks and closes;
 * "Other" turns into a text box in place.
 */
export function TypeSheet({
  open, onClosed, title, options, value, otherText, otherLabel, otherPlaceholder, confirmLabel, onPick, onOther,
}: Props) {
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // Each opening starts from what's chosen now.
  useEffect(() => {
    if (!open) return
    setTyping(value === 'other')
    setDraft(otherText)
    // Focus the current choice (or the first row) so keyboards and screen readers start there.
    const id = window.setTimeout(() => {
      listRef.current?.querySelector<HTMLElement>('[aria-pressed="true"], button')?.focus({ preventScroll: true })
    }, 30)
    return () => window.clearTimeout(id)
    // Only on opening: what's chosen meanwhile must not reset the box being typed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <ModalShell open={open} onClose={onClosed} closeDuration={220}>
      {({ closing, requestClose }) => {
        // Closing with text typed into "Other" keeps it, as if confirmed.
        const close = () => {
          if (typing && draft.trim()) onOther(draft.trim())
          requestClose()
        }
        return (
          <div className={[s.backdrop, closing ? s.closing : ''].filter(Boolean).join(' ')} onClick={close}>
            <div
              className={s.sheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="su-type-sheet-title"
              onClick={(e) => e.stopPropagation()}
            >
              <span className={s.handle} aria-hidden="true" />
              <h2 id="su-type-sheet-title" className={s.title}>{title}</h2>
              <div className={s.list} ref={listRef}>
                {options.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={value === o.key}
                    className={[s.row, value === o.key ? s.rowOn : ''].filter(Boolean).join(' ')}
                    onClick={() => {
                      onPick(o.key)
                      requestClose()
                    }}
                  >
                    <span>{o.label}</span>
                    {value === o.key && <Check size={18} />}
                  </button>
                ))}
                {typing ? (
                  <form
                    className={s.other}
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!draft.trim()) return
                      onOther(draft.trim())
                      requestClose()
                    }}
                  >
                    <input
                      className={s.otherInput}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={otherPlaceholder}
                      aria-label={otherLabel}
                      maxLength={80}
                      enterKeyHint="done"
                      autoFocus
                    />
                    <button type="submit" className={s.otherConfirm} disabled={!draft.trim()}>{confirmLabel}</button>
                  </form>
                ) : (
                  <button
                    type="button"
                    aria-pressed={value === 'other'}
                    className={[s.row, value === 'other' ? s.rowOn : ''].filter(Boolean).join(' ')}
                    onClick={() => setTyping(true)}
                  >
                    <span><Pencil size={15} /> {value === 'other' && otherText ? otherText : otherLabel}</span>
                    {value === 'other' && <Check size={18} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }}
    </ModalShell>
  )
}
