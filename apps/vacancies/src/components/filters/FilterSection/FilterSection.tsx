import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import s from './FilterSection.module.scss'

interface Props {
  title: string
  /** How many values are chosen in this section — shown as a badge. */
  activeCount?: number
  /** Open on first render. The sections people filter on first are; the rest
   *  stay shut so the panel is scannable instead of endless. */
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * One collapsible block of the filter panel.
 *
 * The header has to LOOK pressable, which it did not: a bare chevron floating
 * at the far right of a plain label reads as decoration, so the first thing a
 * visitor learns about this panel — that it folds — was invisible. The chevron
 * now sits in its own bordered chip, the whole row responds to hover, and the
 * title carries enough weight to read as a control rather than a caption.
 *
 * The badge is what makes collapsing safe: a closed section that is quietly
 * filtering results is how someone concludes the board is broken, so a section
 * with a selection always says so on its header.
 *
 * Content stays MOUNTED when collapsed (hidden with CSS), because these are
 * search boxes and scroll positions — unmounting throws away what someone typed
 * the moment they fold a section to look at another one.
 */
export function FilterSection({ title, activeCount = 0, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0)
  const id = useId()

  return (
    <section className={[s.section, open ? s.isOpen : ''].filter(Boolean).join(' ')}>
      <h3 className={s.heading}>
        <button
          type="button"
          className={s.trigger}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
        >
          <span className={s.title}>{title}</span>
          {activeCount > 0 && <span className={s.badge}>{activeCount}</span>}

          {/* A bordered chip, not a loose glyph. This is the only thing on the
              row that says the row does something. */}
          <span
            className={[s.chevronBox, open ? s.chevronBoxOpen : ''].filter(Boolean).join(' ')}
            aria-hidden="true"
          >
            <ChevronDown size={14} strokeWidth={2.25} className={s.chevron} />
          </span>
        </button>
      </h3>

      <div id={id} className={s.body} hidden={!open}>
        {children}
      </div>
    </section>
  )
}
