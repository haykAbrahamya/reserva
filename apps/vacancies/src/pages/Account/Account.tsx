import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Briefcase, Images, MapPin, Settings, Sparkles, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { resolveImageUrl } from '@/api/client'
import { Header } from '@/components/layout/Header/Header'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useT } from '@/i18n'
import { profileCompleteness } from '@/lib/profile'
import { useTaxonomy } from '@/lib/taxonomy'
import { useSeo } from '@/lib/useSeo'
import s from './Account.module.scss'

/**
 * The professional's own area.
 *
 * The shell owns the IDENTITY — the photo, the name, what they do, how finished
 * the profile is — and the sections own everything else. That split is the fix
 * for the thing that made this look amateur: the first version put an avatar and
 * a name in the rail AND another avatar and name at the top of the profile
 * panel, so on a phone you scrolled past your own face twice in one screen. A
 * person appears once per page.
 *
 * On a phone the identity is a centred hero rather than a squashed rail: at
 * 390px a horizontal card of avatar-plus-text leaves the name in a 200px gutter
 * where two specialty chips stack into a column. Centred, it gets the full
 * width and reads like a profile instead of a settings widget.
 *
 * Sections are ROUTES rather than local state. `/account/portfolio` is a place
 * you can link to, come back to, and reach with the back button after opening a
 * listing — none of which a `useState` tab can do.
 */
export function Account() {
  const t = useT()
  const { professional, loading, signedIn } = useProfessionalAuth()
  const { specialtyNames } = useTaxonomy()
  const { pathname } = useLocation()

  useSeo({ title: `${t('account.title')} — ${t('app.product')}`, noIndex: true })

  // Wait for the stored session to resolve before deciding — otherwise a
  // refresh on this page bounces the visitor to the login screen they are
  // already past.
  if (loading) return null
  if (!signedIn || !professional) {
    // Where they were going, so signing in returns them to it.
    return <Navigate to="/login" replace state={{ from: pathname }} />
  }

  const percent = profileCompleteness(professional)
  const photo = resolveImageUrl(professional.avatarUrl)
  const specialties = specialtyNames(professional.specialtyKeys)

  /*
   * Two labels per destination.
   *
   * «Կարգավորումներ» is fourteen characters and a quarter of a 390px bar is
   * ninety-eight pixels, so the bar gets a short form and the desktop rail —
   * which has the room — gets the full one. Both are rendered and CSS shows
   * exactly one, so a screen reader never hears the destination twice.
   */
  const links: {
    to: string
    icon: LucideIcon
    /** i18n key stem: `account.nav.<label>` and `…Short`. */
    label: string
    /** `/account` also matches its children, so only it needs an exact match. */
    end?: boolean
    count?: number
  }[] = [
    { to: '/account', end: true, icon: UserRound, label: 'profile' },
    { to: '/account/portfolio', icon: Images, label: 'portfolio', count: professional.photos.length },
    { to: '/account/applications', icon: Briefcase, label: 'applications' },
    { to: '/account/settings', icon: Settings, label: 'settings' },
  ]

  return (
    <>
      <Header />

      <div className={s.page}>
        <aside className={s.rail}>
          <div className={s.identity}>
            {/*
              The completeness ring IS the meter.
              A separate progress bar under the name was a second thing
              competing for the same glance; drawn around the portrait it is
              read at the same moment as the face, and it makes an unfinished
              profile feel like an unfinished profile rather than like a number.
            */}
            <div className={s.ring} style={{ ['--pct' as string]: percent }}>
              {photo ? (
                <img className={s.avatar} src={photo} alt={professional.name} />
              ) : (
                <span className={[s.avatar, s.avatarEmpty].join(' ')} aria-hidden="true">
                  {professional.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className={s.identityText}>
              <h1 className={s.name}>{professional.name}</h1>

              {specialties.length > 0 && (
                <p className={s.role}>{specialties.slice(0, 3).join(' · ')}</p>
              )}

              <div className={s.facts}>
                {professional.experienceYears != null && (
                  <span className={s.fact}>
                    <Sparkles size={12} />
                    {t('specialist.yearsValue', { count: professional.experienceYears })}
                  </span>
                )}
                {professional.areaKeys.length > 0 && (
                  <span className={s.fact}>
                    <MapPin size={12} />
                    {t('account.areasCount', { count: professional.areaKeys.length })}
                  </span>
                )}
              </div>

              <p
                className={s.meterLabel}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('account.completeness')}
              >
                <span className={s.meterValue}>{percent}%</span>
                {t('account.completeness')}
              </p>
            </div>
          </div>

          <nav className={s.nav} aria-label={t('account.title')}>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  [s.navLink, isActive ? s.navOn : ''].filter(Boolean).join(' ')
                }
              >
                <link.icon size={19} className={s.navIcon} />
                <span className={[s.navLabel, s.navShort].join(' ')}>
                  {t(`account.nav.${link.label}Short`)}
                </span>
                <span className={[s.navLabel, s.navFull].join(' ')}>
                  {t(`account.nav.${link.label}`)}
                </span>
                {/* Only when there is something to count — a grey 0 beside
                    every empty section is noise, not information. */}
                {link.count ? <span className={s.navCount}>{link.count}</span> : null}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className={s.section}>
          <Outlet />
        </main>
      </div>
    </>
  )
}
