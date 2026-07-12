import { initials } from '@reserva/shared'
import type { Specialist } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { StarRatingDisplay } from '@/components/StarRating/StarRating'
import { useI18n } from '@/i18n'
import s from './PartnerTeam.module.scss'

interface Props {
  partner: PublicPartner
  onSelect: (specialist: Specialist) => void
  tone?: 'cream' | 'plain'
}

export function PartnerTeam({ partner, onSelect, tone = 'plain' }: Props) {
  const { t, tp } = useI18n()
  const team = partner.specialists.filter(sp => sp.active)
  const [t1, t2] = partner.presentation.heroTints

  if (team.length === 0) return null

  return (
    <section className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')} id="team">
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.eyebrow}>{t('partner.team.eyebrow')}</div>
          <h2 className={s.title}>{t('partner.team.title')}</h2>
        </div>

        <div className={s.grid}>
          {team.map((sp, i) => (
            <Reveal key={sp.id} className={s.card} delay={(i % 4) * 50}>
              <button
                type="button"
                className={s.cardBtn}
                onClick={() => onSelect(sp)}
                aria-label={t('partner.team.viewProfileAria', { name: sp.name })}
              >
                <div
                  className={s.avatar}
                  style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}
                >
                  {sp.avatarUrl
                    ? <img src={sp.avatarUrl} alt={sp.name} className={s.avatarImg} />
                    : initials(sp.name)}
                </div>
                <div className={s.spName}>{sp.name}</div>
                <div className={s.spTitle}>{sp.title}</div>
                {/* Real rating only — never fabricated. */}
                {(sp.rating ?? 0) > 0 && (sp.reviewCount ?? 0) > 0 && (
                  <StarRatingDisplay
                    className={s.spRating}
                    value={sp.rating!}
                    count={sp.reviewCount!}
                    compact
                  />
                )}
                <div className={s.spServices}>
                  {tp('partner.team.serviceCount', sp.services.length)}
                </div>
                <span className={s.viewHint}>{t('partner.team.viewProfile')}</span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
