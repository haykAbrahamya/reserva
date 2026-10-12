import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useT } from '@/i18n'
import { ToolIcon } from '@/components/tools/ToolIcon/ToolIcon'
import { isLive, toolHueStyle, type Tool } from '@/tools/registry'
import s from './ToolCard.module.scss'

/**
 * One tool on the home grid. A live tool is a single link — the whole card is
 * the tap target. A tool still being built renders the same card, muted and
 * inert, with a "soon" label instead of the call to action.
 */
export function ToolCard({ tool }: { tool: Tool }) {
  const t = useT()
  const live = isLive(tool)

  const body = (
    <>
      <div className={s.art} aria-hidden="true">
        <span className={s.rings} />
        <ToolIcon tool={tool} />
      </div>

      <div className={s.body}>
        <span className={s.tag}>{t(`tools.${tool.id}.tag`)}</span>
        <h3 className={s.title}>{t(`tools.${tool.id}.title`)}</h3>
        <p className={s.description}>{t(`tools.${tool.id}.description`)}</p>

        <span className={s.foot}>
          {live ? (
            <span className={s.open}>
              {t('tool.open')}
              <ArrowUpRight size={15} className={s.arrow} />
            </span>
          ) : (
            <span className={s.soon}>{t('tool.soon')}</span>
          )}
        </span>
      </div>
    </>
  )

  return live ? (
    <Link to={tool.path} className={s.card} style={toolHueStyle(tool.hue)}>
      {body}
    </Link>
  ) : (
    <div className={[s.card, s.muted].join(' ')} style={toolHueStyle(tool.hue)} aria-disabled="true">
      {body}
    </div>
  )
}
