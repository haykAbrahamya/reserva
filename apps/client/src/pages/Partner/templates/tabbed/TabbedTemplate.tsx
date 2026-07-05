import { useState, useMemo, type ReactElement } from 'react'
import { Sparkles, Star, Images, MapPin } from 'lucide-react'
import { useT } from '@/i18n'
import type { TemplateProps } from '../types'
import { TabbedHero } from './sections/TabbedHero/TabbedHero'
import { TabbedServices } from './sections/TabbedServices/TabbedServices'
import { TabbedReviews } from './sections/TabbedReviews/TabbedReviews'
import { TabbedGallery } from './sections/TabbedGallery/TabbedGallery'
import { TabbedBranches } from './sections/TabbedBranches/TabbedBranches'
import { TabbedFooter } from './sections/TabbedFooter/TabbedFooter'
import s from './TabbedTemplate.module.scss'

type TabKey = 'services' | 'reviews' | 'gallery' | 'branches'

/**
 * Tabbed template — a compact hero over a sticky tab bar that groups the
 * partner's content (Services / Reviews / Gallery / Branches). Its own set of
 * restyled section components; the classic sections are never touched.
 *
 * All tab panels are mounted at once and toggled with CSS (`hidden`) so the full
 * content + JSON-LD stay in the DOM for SEO and tab switches are instant. Booking
 * stays in the shared BookingFlow owned by PartnerPage — this is pure layout.
 */
export function TabbedTemplate({ partner, onBook }: TemplateProps) {
  const t = useT()

  // Only offer tabs that have content, so the bar never shows an empty section.
  const tabs = useMemo(() => {
    const hasServices = partner.services.some((sv) => sv.active)
    const hasReviews = partner.specialists.some((sp) => (sp.reviewCount ?? 0) > 0)
    const hasGallery =
      (partner.presentation.gallery?.length ?? 0) > 0 || (partner.presentation.works?.length ?? 0) > 0
    const hasBranches = partner.locations.length > 0

    const list: { key: TabKey; label: string; icon: ReactElement }[] = []
    if (hasServices) list.push({ key: 'services', label: t('partner.services.title'), icon: <Sparkles size={16} /> })
    if (hasReviews) list.push({ key: 'reviews', label: t('partner.reviews.eyebrow'), icon: <Star size={16} /> })
    if (hasGallery) list.push({ key: 'gallery', label: t('partner.gallery.eyebrow'), icon: <Images size={16} /> })
    if (hasBranches) list.push({ key: 'branches', label: t('partner.locations.eyebrow'), icon: <MapPin size={16} /> })
    return list
  }, [partner, t])

  const [active, setActive] = useState<TabKey>(() => tabs[0]?.key ?? 'services')

  return (
    <main className={s.main}>
      <TabbedHero partner={partner} />

      {tabs.length > 0 && (
        <>
          {/* Sticky tab bar */}
          <nav className={s.tabBar} role="tablist" aria-label={t('partner.services.title')}>
            <div className={s.tabInner}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active === tab.key}
                  className={[s.tab, active === tab.key ? s.tabActive : ''].filter(Boolean).join(' ')}
                  onClick={() => setActive(tab.key)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* All panels mounted; inactive ones hidden (keeps content in the DOM
              for SEO and makes switching instant). */}
          <div className={s.panels}>
            <div role="tabpanel" hidden={active !== 'services'}>
              <TabbedServices partner={partner} onBook={onBook} />
            </div>
            <div role="tabpanel" hidden={active !== 'reviews'}>
              <TabbedReviews partner={partner} />
            </div>
            <div role="tabpanel" hidden={active !== 'gallery'}>
              <TabbedGallery partner={partner} />
            </div>
            <div role="tabpanel" hidden={active !== 'branches'}>
              <TabbedBranches partner={partner} onBook={() => onBook()} />
            </div>
          </div>
        </>
      )}

      <TabbedFooter partner={partner} onBook={() => onBook()} />
    </main>
  )
}
