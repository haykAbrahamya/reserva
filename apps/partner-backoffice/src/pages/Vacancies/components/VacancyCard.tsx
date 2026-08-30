import { useEffect, useRef, useState } from 'react'
import {
  MoreHorizontal, Pencil, Play, Pause, RefreshCw, Archive, Trash2, MapPin, Users, Phone,
} from 'lucide-react'
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
  busy?: boolean
}

/** Perks shown inline before collapsing into "+N". */
const VISIBLE_PERKS = 3

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
export function VacancyCard({ vacancy: v, onEdit, onAction, onDelete, busy }: Props) {
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

  return (
    <article className={[s.card, busy ? s.busy : ''].filter(Boolean).join(' ')}>
      <header className={s.head}>
        <div className={s.titleWrap}>
          <h3 className={s.role}>{role}</h3>
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

      {/* The money — the first thing anyone looks for. */}
      <div className={s.pay}>{payLabel(v, t, locale)}</div>

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
        <span className={s.age}>
          {status === 'published' && left != null
            ? tp('vacancies.expiresIn', left, { count: left })
            : status === 'expired'
              ? t('vacancies.expiredNote')
              : t(`vacancies.statusNote.${status}`)}
        </span>

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
