import { MapPin, Clock, Sparkles, Users } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { useT } from '@/i18n'
import s from './PartnerAbout.module.scss'

interface Props {
  partner: PublicPartner
}

export function PartnerAbout({ partner }: Props) {
  const { presentation: p } = partner
  const loc = partner.locations[0]
  const multiLocation = partner.locations.length > 1
  const activeStaff = partner.specialists.filter(sp => sp.active).length
  const serviceCount = partner.services.filter(sv => sv.active).length
  const t = useT()

  const facts = [
    {
      icon: MapPin,
      label: multiLocation ? t('partner.about.factBranches') : t('partner.about.factLocation'),
      value: multiLocation ? t('partner.about.factBranchesValue', { count: partner.locations.length }) : (loc ? loc.name : '—'),
    },
    { icon: Clock, label: t('partner.about.factHours'), value: p.hours },
    { icon: Sparkles, label: t('partner.about.factServices'), value: t('partner.about.factServicesValue', { count: serviceCount }) },
    { icon: Users, label: t('partner.about.factSpecialists'), value: t('partner.about.factSpecialistsValue', { count: activeStaff }) },
  ]

  return (
    <section className={s.section}>
      <div className={s.inner}>
        <Reveal className={s.about}>
          <div className={s.eyebrow}>{t('partner.about.eyebrow', { name: partner.name })}</div>
          <p className={s.aboutText}>{p.about}</p>
        </Reveal>

        <Reveal className={s.facts} delay={100}>
          {facts.map(f => (
            <div key={f.label} className={s.fact}>
              <span className={s.factIcon}><f.icon size={17} /></span>
              <div>
                <div className={s.factLabel}>{f.label}</div>
                <div className={s.factValue}>{f.value}</div>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
