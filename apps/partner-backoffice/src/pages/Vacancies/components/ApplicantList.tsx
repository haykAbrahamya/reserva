import { useCallback, useEffect, useMemo, useState } from 'react'
import { AtSign, Check, ExternalLink, Inbox, Phone, Star, UserRound, X } from 'lucide-react'
import { Avatar, Empty } from '@/components/ui'
import {
  applicantAccount,
  vacanciesService,
  type VacancyApplication,
  type VacancyApplicationStatus,
} from '@/services/vacancies.service'
import { uploadUrl } from '@/services/http'
import { specialistProfileUrl } from '@/lib/vacanciesSite'
import { useI18n } from '@/i18n'
import s from './ApplicantList.module.scss'

interface Props {
  vacancyId: string
  /** Fires after any triage, so a badge or a count elsewhere can refresh. */
  onTriaged?: () => void
}

/** Triage order matches the funnel, so the row reads left to right as progress. */
const TRIAGE: { status: VacancyApplicationStatus; icon: typeof Check }[] = [
  { status: 'contacted', icon: Phone },
  { status: 'shortlisted', icon: Star },
  { status: 'rejected', icon: X },
]

/**
 * Who applied, and what to do about them.
 *
 * The listing side of this product was complete long before this half existed:
 * a salon could publish a chair, collect applications, and had no screen on
 * which to read them. The endpoints were already there — branch-scoped,
 * de-duplicated by phone, with triage and an unseen count.
 *
 * Two things make it more than a list of phone numbers:
 *
 *  · the applicant's own NOTE is given real space. It is the only part they
 *    wrote by hand and the only part that distinguishes two people with the
 *    same specialty.
 *  · a link to their PROFILE on the public board, when they published one — the
 *    portfolio, the years, the districts they will travel to. The server decides
 *    whether that link exists; this file only renders what it is given.
 */
export function ApplicantList({ vacancyId, onTriaged }: Props) {
  const { t, tp, locale } = useI18n()

  const [items, setItems] = useState<VacancyApplication[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    vacanciesService
      .applications(vacancyId)
      .then((rows) => {
        if (alive) setItems(rows)
      })
      .catch(() => {
        if (alive) setError(t('vacancies.applicants.loadFailed'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [vacancyId, t])

  const triage = useCallback(
    async (application: VacancyApplication, status: VacancyApplicationStatus) => {
      setBusyId(application.id)
      setError('')
      try {
        /* Tapping the active one clears it back to "new" — what makes a
           mis-tap recoverable without a separate undo. */
        const next = status === application.status ? 'new' : status
        // The server returns the updated row, so one item is replaced rather
        // than the whole list refetched under someone who is reading it.
        const updated = await vacanciesService.triage(vacancyId, application.id, next)
        setItems((rows) => rows?.map((r) => (r.id === updated.id ? updated : r)) ?? rows)
        onTriaged?.()
      } catch {
        setError(t('vacancies.applicants.triageFailed'))
      } finally {
        setBusyId(null)
      }
    },
    [vacancyId, onTriaged, t],
  )

  const unseen = useMemo(() => items?.filter((a) => a.status === 'new').length ?? 0, [items])

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  )

  if (loading && !items) {
    return (
      <ul className={s.list} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className={[s.card, s.skeleton].join(' ')} />
        ))}
      </ul>
    )
  }

  if (!items?.length) {
    return (
      <>
        {error && <p className={s.error}>{error}</p>}
        <Empty
          icon={Inbox}
          title={t('vacancies.applicants.emptyTitle')}
          description={t('vacancies.applicants.emptyBody')}
        />
      </>
    )
  }

  return (
    <>
      {error && <p className={s.error}>{error}</p>}

      <p className={s.summary}>
        {tp('vacancies.applicants.summary', items.length, { count: items.length })}
        {unseen > 0 && (
          <span className={s.unseenPill}>{t('vacancies.applicants.unseen', { count: unseen })}</span>
        )}
      </p>

      <ul className={s.list}>
        {items.map((a) => {
          /* Never `a.account` directly: this app deploys separately from the
             API, so the field can legitimately be absent. */
          const account = applicantAccount(a)
          return (
            <li
              key={a.id}
              className={[s.card, a.status === 'new' ? s.cardNew : ''].filter(Boolean).join(' ')}
            >
              <div className={s.head}>
                {/* Resolved against the API origin: the stored value is a
                    same-origin "/uploads/.." path relative to the API, not to
                    this app, so handing it straight to <img> asked the
                    BACKOFFICE for it and drew a broken-image icon. */}
                <Avatar name={a.name} src={uploadUrl(account.avatarUrl) || undefined} size="lg" />

                <div className={s.who}>
                  <p className={s.name}>{a.name}</p>
                  <p className={s.when}>{dateFmt.format(new Date(a.createdAt))}</p>
                </div>

                <span className={[s.status, s[`status_${a.status}`]].filter(Boolean).join(' ')}>
                  {t(`vacancies.applicants.status.${a.status}`)}
                </span>
              </div>

              {a.note.trim() && <p className={s.note}>{a.note}</p>}

              <div className={s.contacts}>
                {/* Real tel:/mailto: links — this screen exists to start a
                    conversation, and making someone copy a number by hand is
                    the one thing it must not do. */}
                <a className={s.contact} href={`tel:${a.phone}`}>
                  <Phone size={13} />
                  {a.phone}
                </a>
                {a.email && (
                  <a className={s.contact} href={`mailto:${a.email}`}>
                    <AtSign size={13} />
                    {a.email}
                  </a>
                )}
              </div>

              {/*
                Three states, not two. A published profile gets a link; a
                registered account that has not published one says so, rather
                than showing a dead link or looking identical to an anonymous
                application; an application with no account shows nothing.
              */}
              {account.profileId ? (
                <a
                  className={s.profileLink}
                  href={specialistProfileUrl(account.profileId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <UserRound size={14} />
                  {t('vacancies.applicants.viewProfile')}
                  <ExternalLink size={12} className={s.profileIcon} />
                </a>
              ) : (
                account.hasAccount && (
                  <p className={s.noProfile}>{t('vacancies.applicants.noProfile')}</p>
                )
              )}

              <div className={s.triage}>
                {TRIAGE.map(({ status, icon: Icon }) => {
                  const on = a.status === status
                  return (
                    <button
                      key={status}
                      type="button"
                      className={[s.triageBtn, on ? s.triageOn : ''].filter(Boolean).join(' ')}
                      onClick={() => void triage(a, status)}
                      disabled={busyId === a.id}
                      aria-pressed={on}
                    >
                      <Icon size={13} />
                      {t(`vacancies.applicants.mark.${status}`)}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
