import { ToolCard } from '@/components/tools/ToolCard/ToolCard'
import type { Tool } from '@/tools/registry'
import s from './ToolGrid.module.scss'

/** The tools as a list (it is one, for a screen reader) laid out as a grid. */
export function ToolGrid({ tools }: { tools: readonly Tool[] }) {
  return (
    <ul className={s.grid}>
      {tools.map((tool, i) => (
        <li key={tool.id} className={s.item}>
          <ToolCard tool={tool} pos={i} />
        </li>
      ))}
    </ul>
  )
}
