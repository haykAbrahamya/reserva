import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useT } from '@/i18n'
import { ToolIcon } from '@/components/tools/ToolIcon/ToolIcon'
import { useSeo } from '@/lib/useSeo'
import { CurrentToolContext } from '@/tools/currentTool'
import { toolHueStyle, type Tool } from '@/tools/registry'
import s from './ToolLayout.module.scss'

interface Props {
  tool: Tool
  children: ReactNode
}

/**
 * The frame every tool page shares: the way back to the grid, the tool's
 * heading, and its <head>. A tool page renders only the tool itself inside it,
 * so every tool looks and behaves like part of one set.
 */
export function ToolLayout({ tool, children }: Props) {
  const t = useT()
  const title = t(`tools.${tool.id}.title`)
  const description = t(`tools.${tool.id}.description`)

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: title,
      description,
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'AMD' },
    }),
    [title, description],
  )

  useSeo({ title: `${title} — ${t('app.name')} ${t('app.product')}`, description, jsonLd })

  return (
    <div className={s.page} style={toolHueStyle(tool.hue)}>
      <Link to="/" className={s.back}>
        <ArrowLeft size={15} />
        {t('tool.back')}
      </Link>

      <header className={s.head}>
        <ToolIcon tool={tool} />
        <div className={s.headText}>
          <span className={s.tag}>{t(`tools.${tool.id}.tag`)}</span>
          <h1 className={s.title}>{title}</h1>
          <p className={s.description}>{description}</p>
        </div>
      </header>

      <CurrentToolContext.Provider value={tool.id}>{children}</CurrentToolContext.Provider>
    </div>
  )
}
