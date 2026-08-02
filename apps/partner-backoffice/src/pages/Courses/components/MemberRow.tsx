import { Check, X, Phone, Trash2, MoreVertical } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/i18n'
import type { CourseEnrollment, EnrollmentStatus } from '@/types'
import { StatusPill } from './StatusPill'
import { memberStatusKey, memberStatusTone } from '../lib/courseFormat'
import { initials } from '@reserva/shared'
import s from './MemberRow.module.scss'

interface Props {
  member: CourseEnrollment
  busy: boolean
  onSetStatus: (status: EnrollmentStatus) => void
  onRemove: () => void
  /** Read-only (History view): hide all actions — the data is frozen. */
  readOnly?: boolean
}

/**
 * One member as a clean list item: avatar-initial, name + contact, status pill,
 * and actions. Pending members get prominent Confirm/Reject; confirmed/other
 * members tuck the secondary actions (complete/remove) into a "…" menu so the
 * row stays calm — and works comfortably on mobile.
 */
export function MemberRow({ member, busy, onSetStatus, onRemove, readOnly }: Props) {
  const { t } = useI18n()
  const isPending = member.status === 'pending'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <div className={[s.row, isPending ? s.pendingRow : ''].filter(Boolean).join(' ')}>
      <span className={s.avatar}>{initials(member.memberName)}</span>

      <div className={s.info}>
        <div className={s.nameRow}>
          <span className={s.name}>{member.memberName}</span>
          <StatusPill label={t(memberStatusKey(member.status))} tone={memberStatusTone(member.status)} />
        </div>
        <a className={s.phone} href={`tel:${member.memberPhone}`}>
          <Phone size={12} /> {member.memberPhone}
          {member.source === 'public' && <span className={s.selfTag}>· {t('courses.members.selfShort')}</span>}
        </a>
      </div>

      {!readOnly && (
        <div className={s.actions}>
          {isPending ? (
            <>
              <button className={[s.btn, s.confirm].join(' ')} disabled={busy} onClick={() => onSetStatus('confirmed')}>
                <Check size={15} /> <span className={s.btnLabel}>{t('courses.members.confirm')}</span>
              </button>
              <button className={[s.btn, s.iconBtn].join(' ')} disabled={busy} onClick={() => onSetStatus('cancelled')} aria-label={t('courses.members.reject')}>
                <X size={15} />
              </button>
            </>
          ) : (
            <div className={s.menuWrap} ref={menuRef}>
              <button className={[s.btn, s.iconBtn].join(' ')} disabled={busy} onClick={() => setMenuOpen((v) => !v)} aria-label={t('common.more')}>
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div className={s.menu}>
                  {member.status === 'confirmed' && (
                    <button className={s.menuItem} onClick={() => { setMenuOpen(false); onSetStatus('completed') }}>
                      <Check size={14} /> {t('courses.members.markCompleted')}
                    </button>
                  )}
                  <button className={[s.menuItem, s.menuDanger].join(' ')} onClick={() => { setMenuOpen(false); onRemove() }}>
                    <Trash2 size={14} /> {t('courses.members.remove')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
