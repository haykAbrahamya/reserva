import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { SegmentedFilter } from '@reserva/ui'
import { useT } from '@/i18n'
import { useToolEvents } from '@/lib/analytics/useToolEvents'
import s from './ToolWorkspace.module.scss'

type Pane = 'edit' | 'preview'

/** The fixed site header's real height, notch area included. */
function headerHeight(): number {
  return document.querySelector('[data-site-header]')?.getBoundingClientRect().height ?? 0
}

interface Props {
  /** The form. */
  editor: ReactNode
  /** The live result and its export actions. */
  preview: ReactNode
  /** Full width under both panes, in every view — the next step after making something. */
  footer?: ReactNode
  /** The result's width ÷ height (9/16 for a story). Sizes the preview to fit the screen. */
  previewAspect?: number
}

/**
 * The editor-plus-live-preview frame every "make an image" tool shares.
 *
 * Side by side on a desktop or a landscape tablet, with the preview sticky so
 * it stays in view while a long form scrolls. Below that there is no room for
 * both, so it becomes two views behind an Edit / Preview switch — the pattern
 * phone design apps use — instead of a preview stranded under a long form.
 *
 * The footer sits OUTSIDE the panes on purpose. A sticky element is held
 * inside its parent box, not its grid cell, so with the footer in the same grid
 * the preview kept sticking all the way down and slid over it.
 */
export function ToolWorkspace({ editor, preview, footer, previewAspect = 9 / 16 }: Props) {
  const t = useT()
  const events = useToolEvents()
  const [pane, setPane] = useState<Pane>('edit')
  const panesRef = useRef<HTMLDivElement>(null)
  const editScroll = useRef(0)
  const switched = useRef(false)

  const switchTo = (next: Pane) => {
    if (next === pane) return
    if (next === 'preview') events?.action('preview')
    if (pane === 'edit') editScroll.current = window.scrollY
    switched.current = true
    setPane(next)
  }

  /*
   * Land each view where it is useful, in the same frame it appears.
   *
   * Preview lines the panes up under the header, so the image AND its Share /
   * Download buttons are in full view — tapped from the top of the page, they
   * started below the fold, under the tool's heading. Edit returns to exactly
   * where the visitor was in the form, not to its first field.
   */
  useLayoutEffect(() => {
    if (!switched.current) return
    switched.current = false
    if (pane === 'edit') {
      window.scrollTo({ top: editScroll.current })
      return
    }
    const panes = panesRef.current
    if (!panes) return
    window.scrollTo({ top: panes.getBoundingClientRect().top + window.scrollY - headerHeight() })
  }, [pane])

  return (
    <div className={s.workspace}>
      <div
        ref={panesRef}
        className={s.panes}
        data-pane={pane}
        data-landscape={previewAspect > 1 || undefined}
        style={{ '--preview-aspect': previewAspect } as CSSProperties}
      >
        <div className={s.switch}>
          <SegmentedFilter<Pane>
            value={pane}
            onChange={switchTo}
            ariaLabel={t('workspace.label')}
            options={[
              { value: 'edit', label: t('workspace.edit') },
              { value: 'preview', label: t('workspace.preview') },
            ]}
          />
        </div>

        <div className={s.editor}>{editor}</div>
        <aside className={s.preview} aria-label={t('workspace.preview')}>
          {preview}
        </aside>
      </div>

      {footer}
    </div>
  )
}
