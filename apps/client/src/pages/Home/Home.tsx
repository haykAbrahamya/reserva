import { Nav } from '@/components/Nav/Nav'
import { Hero } from '@/sections/Hero/Hero'
import { Partners } from '@/sections/Partners/Partners'
import { Features } from '@/sections/Features/Features'
import { Marketplace } from '@/sections/Marketplace/Marketplace'
import { HowItWorks } from '@/sections/HowItWorks/HowItWorks'
import { Pricing } from '@/sections/Pricing/Pricing'
import { Faq } from '@/sections/Faq/Faq'
import { CtaFooter } from '@/sections/CtaFooter/CtaFooter'
import { useSeo } from '@/hooks/useSeo'
import { useT } from '@/i18n'

export function Home() {
  const t = useT()
  useSeo({ title: t('seo.home.title'), description: t('seo.home.description'), path: '/' })

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Partners />
        <Features />
        <Marketplace />
        <HowItWorks />
        <Pricing />
        <Faq />
        <CtaFooter />
      </main>
    </>
  )
}
