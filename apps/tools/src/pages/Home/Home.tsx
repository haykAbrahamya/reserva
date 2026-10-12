import { useT } from '@/i18n'
import { ToolGrid } from '@/components/tools/ToolGrid/ToolGrid'
import { useSeo } from '@/lib/useSeo'
import { TOOLS } from '@/tools/registry'
import { Hero } from './components/Hero/Hero'
import s from './Home.module.scss'

/** tools.reserva.am — the heading, then every tool as a card. */
export function Home() {
  const t = useT()
  useSeo({ title: t('home.seoTitle'), description: t('home.seoDescription'), canonicalPath: '/' })

  return (
    <>
      <Hero />
      <section className={s.tools} aria-labelledby="tools-heading">
        <h2 id="tools-heading" className={s.heading}>
          {t('home.gridTitle')}
        </h2>
        <ToolGrid tools={TOOLS} />
      </section>
    </>
  )
}
