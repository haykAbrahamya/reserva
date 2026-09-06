import { useEffect, useRef, useState } from 'react'
import { Archive, Inbox, MapPin, MoreHorizontal, Pause, Pencil, Phone, Play, RefreshCw, Trash2, Users } from 'lucide-react'
import { Badge } from '@/components/ui'
import { useI18n } from '@/i18n'
import { useLocalized } from '@/i18n/useLocalized'
import type { Vacancy, VacancyAction } from '@/services/vacancies.service'
import { payLabel, statusVariant, daysUntil } from '../lib/vacancyDisplay'
import s from './VacancyCard.module.scss'

interface Props {
  vacancy: Vacancy
  onEdit: (v: Vacancy) => void
  onAction: (v: Vacancy, action: VacancyAction) => void
  onDelete: (v: Vacancy) => void
  /** Open this listing's own page. */
  onOpen: (v: Vacancy) => void
  /** Applicant totals for THIS listing. Absent while the counts load. */
  applicants?: { total: number; unseen: number }
  busy?: boolean
}

/**
 * Perks shown inline before collapsing into "+N".
 *
 * Two, not three. These are full phrases in every locale
 * («Հաճախորդների բազա տրամադրվում է»), so each one takes a line of its own on a
 * card — and with the grid now stretching cards to a common row height, a card
 * carrying three of them set the height for every card beside it. Dropping one
 * takes the tallest card down by a line without losing anything: the count is
 * still there, and the full list is one click away in the editor.
 */
const VISIBLE_PERKS = 2

/** Renew nags only once the end is actually near. */
const EXPIRY_WARN_DAYS = 7

/**
 * One listing.
 *
 * Ordered by what a partner scans for: who they are hiring, then the money,
 * then the conditions, then how much life the listing has left. The lifecycle
 * actions live behind a menu so the card stays quiet until it is needed — but
 * the single most likely next action (publish a draft, renew an expired
 * listing) is also surfaced as a button, because burying it behind a menu is
 * how listings sit unpublished for a week.
 */
export function VacancyCard({
  vacancy: v,
  onEdit,
  onAction,
  onDelete,
  onOpen,
  applicants,
  busy,
}: Props) {
  const { t, tp, locale } = useI18n()
  const loc = useLocalized()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const status = v.effectiveStatus
  const role = v.title.trim() || loc(v.specialty.roleName, v.specialty.roleNameI18n)
  const craft = loc(v.specialty.name, v.specialty.nameI18n)
  const left = daysUntil(v.expiresAt)

  // The one action most likely wanted next, promoted out of the menu.
  const primary: VacancyAction | null =
    status === 'draft' || status === 'paused' ? 'publish'
      : status === 'expired' ? 'renew'
        : status === 'published' && left != null && left <= EXPIRY_WARN_DAYS ? 'renew'
          : null

  const menuActions: { action: VacancyAction; icon: typeof Play; labelKey: string }[] = [
    ...(status !== 'published' && primary !== 'publish'
      ? [{ action: 'publish' as const, icon: Play, labelKey: 'vacancies.actions.publish' }] : []),
    ...(status === 'published'
      ? [{ action: 'pause' as const, icon: Pause, labelKey: 'vacancies.actions.pause' }] : []),
    ...(status === 'published' && primary !== 'renew'
      ? [{ action: 'renew' as const, icon: RefreshCw, labelKey: 'vacancies.actions.renew' }] : []),
    ...(status !== 'closed'
      ? [{ action: 'close' as const, icon: Archive, labelKey: 'vacancies.actions.close' }] : []),
  ]

  const act = (action: VacancyAction) => {
    setMenuOpen(false)
    onAction(v, action)
  }

  /* Near the end of its life, and still live — the one state the footer says
     out loud rather than in grey. */
  const expiringSoon = status === 'published' && left != null && left <= EXPIRY_WARN_DAYS

  return (
    <article
      className={[s.card, s[`status_${status}`], busy ? s.busy : ''].filter(Boolean).join(' ')}
    >
      <header className={s.head}>
        <div className={s.titleWrap}>
          {/* The way into the listing's own page. A button rather than the
              whole card: the card also carries a menu, a primary action and an
              applicants count, and nesting those inside one big control makes
              every one of them a place you can miss. */}
          <h3 className={s.role}>
            <button type="button" className={s.roleBtn} onClick={() => onOpen(v)}>
              {role}
            </button>
          </h3>
          <div className={s.craft}>
            {craft}
            <span className={s.dot} />
            <span className={s.branch}><MapPin size={11} /> {v.location.name}</span>
          </div>
        </div>

        <div className={s.headRight}>
          <Badge variant={statusVariant(status)} label={t(`vacancies.status.${status}`)} />

          <div className={s.menuWrap} ref={menuRef}>
            <button
              type="button"
              className={s.iconBtn}
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t('common.actions')}
              disabled={busy}
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <div className={s.menu} role="menu">
                <button type="button" className={s.menuItem} onClick={() => { setMenuOpen(false); onEdit(v) }}>
                  <Pencil size={14} /> {t('common.edit')}
                </button>
                {menuActions.map(({ action, icon: Icon, labelKey }) => (
                  <button key={action} type="button" className={s.menuItem} onClick={() => act(action)}>
                    <Icon size={14} /> {t(labelKey)}
                  </button>
                ))}
                <div className={s.menuSep} />
                <button
                  type="button"
                  className={[s.menuItem, s.danger].join(' ')}
                  onClick={() => { setMenuOpen(false); onDelete(v) }}
                >
                  <Trash2 size={14} /> {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/*
        The money.

        Given its own block and its own size rather than sitting at the same
        weight as everything else: it is the first thing a partner checks when
        scanning their own listings and the first thing a candidate reads, and
        at 15px in a stack of 15px it was neither.
      */}
      <div className={s.payBlock}>
        <span className={s.pay}>{payLabel(v, t, locale)}</span>
      </div>

      <div className={s.meta}>
        {v.scheduleType && <span className={s.metaChip}>{t(`vacancies.schedule.${v.scheduleType}`)}</span>}
        {v.experience !== 'any' && (
          <span className={s.metaChip}>{t(`vacancies.experience.${v.experience}`)}</span>
        )}
        {v.seats > 1 && (
          <span className={s.metaChip}><Users size={11} /> {tp('vacancies.seats', v.seats, { count: v.seats })}</span>
        )}
        {v.applyMode !== 'in_app' && v.contactPhone && (
          <span className={s.metaChip}><Phone size={11} /> {v.contactPhone}</span>
        )}
      </div>

      {v.perks.length > 0 && (
        <div className={s.perks}>
          {v.perks.slice(0, VISIBLE_PERKS).map((p) => (
            <span key={p} className={s.perk}>{t(`vacancies.perks.${p}`)}</span>
          ))}
          {v.perks.length > VISIBLE_PERKS && (
            <span className={s.perkMore}>+{v.perks.length - VISIBLE_PERKS}</span>
          )}
        </div>
      )}

      <footer className={s.foot}>
        <span className={[s.age, expiringSoon ? s.ageWarn : ''].filter(Boolean).join(' ')}>
          {status === 'published' && left != null
            ? tp('vacancies.expiresIn', left, { count: left })
            : status === 'expired'
              ? t('vacancies.expiredNote')
              : t(`vacancies.statusNote.${status}`)}
        </span>

        {/*
          Applicants, and the way to read them.

          Shown on anything PUBLISHED, including at zero. "0 applicants" on a
          card is close to noise — but a control that only appears once someone
          has applied is a feature nobody discovers before they need it, and
          this one had no entry point at all until recently. A live listing
          saying "0" teaches the partner where to look; a draft says nothing,
          because a draft cannot have any.

          The unseen count is the loud half, because that is the number a
          partner actually acts on.
        */}
        {(applicants?.total ?? 0) > 0 || status === 'published' ? (
          <button
            type="button"
            className={[s.applicants, (applicants?.unseen ?? 0) > 0 ? s.applicantsNew : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onOpen(v)}
          >
            <Inbox size={13} />
            {tp('vacancies.applicants.count', applicants?.total ?? 0, {
              count: applicants?.total ?? 0,
            })}
            {(applicants?.unseen ?? 0) > 0 && (
              <span className={s.applicantsDot}>{applicants?.unseen}</span>
            )}
          </button>
        ) : null}

        {primary && (
          <button type="button" className={s.primaryAction} onClick={() => act(primary)} disabled={busy}>
            {primary === 'publish' ? <Play size={13} /> : <RefreshCw size={13} />}
            {t(`vacancies.actions.${primary}`)}
          </button>
        )}
      </footer>
    </article>
  )
}
