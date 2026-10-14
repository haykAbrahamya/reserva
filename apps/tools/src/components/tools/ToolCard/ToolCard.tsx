import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useI18n, useT } from '@/i18n'
import { ToolIcon } from '@/components/tools/ToolIcon/ToolIcon'
import { track } from '@/lib/analytics/pulse'
import { useThemeContext } from '@/theme/ThemeProvider'
import { exampleSrc, isLive, toolHueStyle, type Tool } from '@/tools/registry'
import s from './ToolCard.module.scss'

interface Props {
  tool: Tool
  /** Its place on the grid, from 0. */
  pos: number
}

/**
 * One tool on the home grid. A live tool is a single link — the whole card is
 * the tap target. A tool still being built renders the same card, muted and
 * inert, with a "soon" label instead of the call to action.
 *
 * The artwork is what the tool makes: its finished sample, in the visitor's
 * language, so someone arriving from a reel sees the result before reading a
 * word. A tool without one yet shows its icon.
 */
export function ToolCard({ tool, pos }: Props) {
  const t = useT()
  const { locale } = useI18n()
  const { isDark } = useThemeContext()
  const live = isLive(tool)

  const body = (
    <>
      <div className={s.art} aria-hidden="true">
        <span className={s.rings} />
        {tool.example ? (
          <img
            className={[s.example, s[tool.example.shape]].join(' ')}
            src={exampleSrc(tool, locale, isDark)}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <ToolIcon tool={tool} />
        )}
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
    <Link
      to={tool.path}
      className={s.card}
      style={toolHueStyle(tool.hue)}
      onClick={() => track('tool_select', { tool: tool.id, pos })}
    >
      {body}
    </Link>
  ) : (
    <div className={[s.card, s.muted].join(' ')} style={toolHueStyle(tool.hue)} aria-disabled="true">
      {body}
    </div>
  )
}
