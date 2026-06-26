import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { Reveal } from '@/components/Reveal/Reveal'
import { useI18n, useT } from '@/i18n'
import s from './Faq.module.scss'

/** FAQ item keys — answers/questions resolved from i18n `faq.items.<key>.*`. */
const ITEMS = [
  'what',
  'setup',
  'cost',
  'clientApp',
  'notifications',
  'multiLocation',
  'cancel',
  'data',
] as const

/** Inject a FAQPage JSON-LD record so Google can show this as a rich result. */
function useFaqJsonLd() {
  const { t } = useI18n()
  useEffect(() => {
    if (typeof document === 'undefined') return
    const ID = 'reserva-faq-jsonld'
    document.getElementById(ID)?.remove()

    const data = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: ITEMS.map((key) => ({
        '@type': 'Question',
        name: t(`faq.items.${key}.q`),
        acceptedAnswer: { '@type': 'Answer', text: t(`faq.items.${key}.a`) },
      })),
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = ID
    el.textContent = JSON.stringify(data)
    document.head.appendChild(el)
    return () => { document.getElementById(ID)?.remove() }
  }, [t])
}

export function Faq() {
  const t = useT()
  useFaqJsonLd()

  // Accordion: one panel open at a time. `null` = all collapsed.
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key))

  return (
    <section className={s.section} id="faq">
      <div className={s.grid} />
      <div className={s.inner}>
        <SectionHead
          eyebrow={t('faq.eyebrow')}
          title={<>{t('faq.titlePre')}<em>{t('faq.titleEm')}</em>{t('faq.titlePost')}</>}
          subtitle={t('faq.subtitle')}
        />

        <Reveal className={s.list}>
          {ITEMS.map((key) => {
            const isOpen = open === key
            const panelId = `faq-panel-${key}`
            const btnId = `faq-btn-${key}`
            return (
              <div key={key} className={[s.item, isOpen ? s.itemOpen : ''].filter(Boolean).join(' ')}>
                <h3 className={s.qHead}>
                  <button
                    id={btnId}
                    className={s.qBtn}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(key)}
                  >
                    <span className={s.qText}>{t(`faq.items.${key}.q`)}</span>
                    <span className={s.icon} aria-hidden="true"><Plus size={18} /></span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className={s.panel}
                >
                  <div className={s.panelInner}>
                    <p className={s.answer}>{t(`faq.items.${key}.a`)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </Reveal>

        <Reveal className={s.cta} delay={120}>
          <span className={s.ctaText}>{t('faq.stillQuestions')}</span>
          <a className={s.ctaLink} href="#cta">{t('faq.contactUs')}</a>
        </Reveal>
      </div>
    </section>
  )
}
