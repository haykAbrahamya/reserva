import type { Tool } from '@/tools/registry'
import s from './ToolIcon.module.scss'

/**
 * A tool's icon on its own tinted tile — the card artwork's centrepiece and the
 * badge on the tool page header, so a tool looks like the same thing in both.
 *
 * Styled by its parent through custom properties rather than props:
 *   --tool-icon-size       the tile's size (the card shrinks it on phones in
 *                          CSS, which a prop could only do with a resize hook)
 *   --tool-icon-transform  a movement, e.g. the card's hover lift
 * Colour comes from `--tool`, set by `toolHueStyle` on an ancestor.
 */
export function ToolIcon({ tool }: { tool: Tool }) {
  const Icon = tool.icon
  return (
    <span className={s.tile} aria-hidden="true">
      <Icon className={s.glyph} strokeWidth={1.6} />
    </span>
  )
}
