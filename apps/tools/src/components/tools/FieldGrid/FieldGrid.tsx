import type { ReactNode } from 'react'
import s from './FieldGrid.module.scss'

/**
 * Form fields in one column, then two once the FORM is wide enough. Measured
 * with a container query rather than the window: on a desktop the editor
 * shares its row with the preview, so the window's width says little about
 * how much room the fields actually have.
 */
export function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className={s.container}>
      <div className={s.grid}>{children}</div>
    </div>
  )
}

/** A field that always takes the whole row. */
export function FieldWide({ children }: { children: ReactNode }) {
  return <div className={s.wide}>{children}</div>
}
