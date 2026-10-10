import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { initials, specialistBranchIds, worksAt } from '@reserva/shared'
import type { Specialist } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { StarRatingDisplay } from '@/components/StarRating/StarRating'
import { useI18n, useLocalized } from '@/i18n'
import { useSpecialistName } from '../../../../lib/useSpecialistName'
import { track } from '@/services/analytics.service'
import s from './PartnerTeam.module.scss'

interface Props {
  partner: PublicPartner
  onSelect: (specialist: Specialist) => void
  tone?: 'cream' | 'plain'
}

const ALL = '__all__'

export function PartnerTeam({ partner, onSelect, tone = 'plain' }: Props) {
  const { t, tp } = useI18n()
  const loc = useLocalized()
  const spName = useSpecialistName(partner)
  const [t1, t2] = partner.presentation.heroTints

  const team = useMemo(() => partner.specialists.filter(sp => sp.active), [partner.specialists])

  // Location filter chips — only worth showing when the team actually spans more
  // than one branch (otherwise the filter is noise). Each chip carries a live
  // count so a visitor sees where the team is before clicking.
  const locationTabs = useMemo(() => {
    const counts = new Map<string, number>()
    // A specialist who works at several branches counts at each of them.
    for (const sp of team) {
      for (const id of specialistBranchIds(sp)) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return partner.locations
      .filter(l => counts.has(l.id))
      .map(l => ({ id: l.id, name: loc(l.name, l.nameI18n), count: counts.get(l.id)! }))
  }, [team, partner.locations, loc])

  const showFilter = locationTabs.length > 1
  const hasRating = (sp: Specialist) => (sp.rating ?? 0) > 0 && (sp.reviewCount ?? 0) > 0
  /** On a multi-branch team every card says where that person works. */
  const branchesOf = (sp: Specialist): string =>
    showFilter
      ? specialistBranchIds(sp)
          .map(id => partner.locations.find(l => l.id === id))
          .filter(Boolean)
          .map(l => loc(l!.name, l!.nameI18n))
          .join(' · ')
      : ''

  // Default to the FIRST branch (not "All") so the section opens compact when a
  // team spans many locations — the whole point of the filter. "All" is still
  // one tap away. When there's no filter (single branch), fall back to ALL so
  // every specialist shows.
  const [activeLoc, setActiveLoc] = useState<string>(
    () => (locationTabs.length > 1 ? locationTabs[0].id : ALL),
  )
  // Guard: if the active branch has no members (shouldn't happen), fall back to All.
  const visibleTeam = useMemo(
    () => (activeLoc === ALL ? team : team.filter(sp => worksAt(sp, activeLoc))),
    [team, activeLoc],
  )

  if (team.length === 0) return null

  return (
    <section className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')} id="team">
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.eyebrow}>{t('partner.team.eyebrow')}</div>
          <h2 className={s.title}>{t('partner.team.title')}</h2>
        </div>

        {/* Location filter — only when the team spans multiple branches. */}
        {showFilter && (
          <div className={s.filters} role="tablist" aria-label={t('partner.team.filterAria')}>
            <button
              type="button"
              role="tab"
              aria-selected={activeLoc === ALL}
              className={[s.chip, activeLoc === ALL ? s.chipActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveLoc(ALL)}
            >
              {t('partner.team.allBranches')}
              <span className={s.chipCount}>{team.length}</span>
            </button>
            {locationTabs.map(lt => (
              <button
                key={lt.id}
                type="button"
                role="tab"
                aria-selected={activeLoc === lt.id}
                className={[s.chip, activeLoc === lt.id ? s.chipActive : ''].filter(Boolean).join(' ')}
                onClick={() => {
                  if (activeLoc !== lt.id) track('branch_switch', { loc: lt.id })
                  setActiveLoc(lt.id)
                }}
              >
                <MapPin size={13} className={s.chipIcon} />
                {lt.name}
                <span className={s.chipCount}>{lt.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className={s.grid}>
          {visibleTeam.map((sp, i) => (
            <Reveal key={sp.id} className={s.card} delay={(i % 4) * 50}>
              <button
                type="button"
                className={s.cardBtn}
                onClick={() => { track('specialist_open', { sp: sp.id }); onSelect(sp) }}
                aria-label={t('partner.team.viewProfileAria', { name: spName(sp) })}
              >
                <div
                  className={s.avatar}
                  style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}
                >
                  {/* Initials from the SHOWN name, so the letters match it in every language. */}
                  {sp.avatarUrl
                    ? <img src={sp.avatarUrl} alt={spName(sp)} className={s.avatarImg} />
                    : initials(spName(sp))}
                </div>
                <div className={s.spName}>{spName(sp)}</div>
                <div className={s.spTitle}>{loc(sp.title, sp.titleI18n)}</div>
                {/* Rating, then where they work — each on its own line. */}
                {(hasRating(sp) || branchesOf(sp)) && (
                  <div className={s.spMeta}>
                    {/* Real rating only — never fabricated. */}
                    {hasRating(sp) && (
                      <StarRatingDisplay
                        className={s.spRating}
                        value={sp.rating!}
                        count={sp.reviewCount!}
                        compact
                      />
                    )}
                    {branchesOf(sp) && (
                      <div className={s.spBranches}>
                        <MapPin size={12} />
                        <span>{branchesOf(sp)}</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Takes the spare height, so the footer lines up across a row. */}
                <span className={s.spacer} aria-hidden />
                <div className={s.spServices}>
                  {tp('partner.team.serviceCount', sp.services.filter(id => partner.services.some(sv => sv.id === id && sv.active)).length)}
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
