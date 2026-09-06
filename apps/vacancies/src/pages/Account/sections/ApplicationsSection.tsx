import { Link } from 'react-router-dom'
import { Briefcase, ChevronRight, Clock } from 'lucide-react'
import { Button, Empty } from '@reserva/ui'
import { fetchMyApplications } from '@/api/professionals.api'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useI18n, useLocalized, useT } from '@/i18n'
import { relativeTime } from '@/lib/dates'
import { useAsync } from '@/lib/useAsync'
import s from './ApplicationsSection.module.scss'

/**
 * What this account has applied to, and what came of it.
 *
 * Cards rather than the table rows this used to be. The status is the reason
 * anybody opens this screen, and in a row it was a word at the far right end of
 * a line — the least looked-at position on the page for the most looked-for
 * fact. Here it sits beside the salon's name.
 *
 * The statuses are the salon's own triage labels, translated for the applicant.
 * `new` is deliberately shown as "sent" rather than "new": an applicant should
 * be told what THEY did, not be handed the salon's inbox label for them.
 */
export function ApplicationsSection() {
  const t = useT()
  const { locale } = useI18n()
  const loc = useLocalized()
  const { signedIn, authed } = useProfessionalAuth()

  const applications = useAsync((_signal) => fetchMyApplications(authed), [signedIn], { skip: !signedIn })

  return (
    <div className={s.panel}>
      <header className={s.head}>
        <div>
          <h1 className={s.heading}>{t('account.applications')}</h1>
          {applications.data && applications.data.length > 0 && (
            <p className={s.sub}>{t('account.applicationsCount', { count: applications.data.length })}</p>
          )}
        </div>
      </header>

      {applications.loading && !applications.data ? (
        <ul className={s.list} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className={[s.card, s.skeleton].join(' ')} />
          ))}
        </ul>
      ) : applications.error ? (
        <p className={s.error}>{t('account.errors.generic')}</p>
      ) : !applications.data?.length ? (
        <Empty
          icon={Briefcase}
          title={t('account.noApplicationsTitle')}
          description={t('account.noApplicationsBody')}
          action={
            <Link to="/">
              <Button variant="accent">{t('landing.emptyAction')}</Button>
            </Link>
          }
        />
      ) : (
        <ul className={s.list}>
          {applications.data.map((a) => {
            const role =
              loc(a.vacancy.title, a.vacancy.titleI18n).trim() ||
              loc(a.vacancy.specialty.roleName, a.vacancy.specialty.roleNameI18n)

            return (
              <li key={a.id}>
                <Link className={s.card} to={`/v/${a.vacancy.id}`}>
                  <div className={s.cardMain}>
                    <div className={s.cardTop}>
                      <span className={s.role}>{role}</span>
                      <span className={[s.status, s[`status_${a.status}`]].filter(Boolean).join(' ')}>
                        {t(`account.status.${a.status}`)}
                      </span>
                    </div>

                    <span className={s.salon}>{loc(a.vacancy.partner.name, a.vacancy.partner.nameI18n)}</span>

                    {/* Their own covering note, shown back to them: it is the
                        only part of an application they wrote by hand, and the
                        thing they will want to check before writing another. */}
                    {a.note.trim() && <p className={s.note}>{a.note}</p>}

                    <span className={s.when}>
                      <Clock size={12} />
                      {relativeTime(a.createdAt, locale)}
                    </span>
                  </div>

                  <ChevronRight size={16} className={s.chevron} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
