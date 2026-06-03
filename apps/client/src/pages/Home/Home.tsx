import { Nav } from '@/components/Nav/Nav'
import { Hero } from '@/sections/Hero/Hero'
import { Trust } from '@/sections/Trust/Trust'
import { Features } from '@/sections/Features/Features'
import { HowItWorks } from '@/sections/HowItWorks/HowItWorks'
import { Pricing } from '@/sections/Pricing/Pricing'
import { CtaFooter } from '@/sections/CtaFooter/CtaFooter'

export function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Trust />
        <Features />
        <HowItWorks />
        <Pricing />
        <CtaFooter />
      </main>
    </>
  )
}
