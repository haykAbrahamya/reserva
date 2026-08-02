import { useMemo, useState } from 'react'
import { Users, UserPlus, X } from 'lucide-react'
import { useResource } from '@/store/useResource'
import { useToast } from '@/components/ui'
import { errorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n'
import { coursesService, type AddMemberInput } from '@/services/courses.service'
import type { CourseEnrollment, EnrollmentStatus } from '@/types'
import { AddMemberForm } from './AddMemberForm'
import { MemberRow } from './MemberRow'
import s from './MembersPanel.module.scss'

interface Props {
  cohortId: string
  /** Read-only for archived/completed runs (no add / status changes). */
  readOnly?: boolean
  /** Notify the parent when membership changes so it can refresh counts. */
  onChanged?: () => void
}

/** Members of one run. Clean, calm list: an "Add member" affordance that expands
 *  on demand, the pending confirmation queue first, then confirmed, then past. */
export function MembersPanel({ cohortId, readOnly, onChanged }: Props) {
  const { t, tp } = useI18n()
  const toast = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const { data: members, reload } = useResource(
    () => coursesService.listMembers(cohortId),
    [cohortId],
    [],
  )

  const refresh = async () => { await reload(); onChanged?.() }

  const { pending, active, past } = useMemo(() => {
    const pending: CourseEnrollment[] = []
    const active: CourseEnrollment[] = []
    const past: CourseEnrollment[] = []
    for (const m of members) {
      if (m.status === 'pending') pending.push(m)
      else if (m.status === 'confirmed') active.push(m)
      else past.push(m)
    }
    return { pending, active, past }
  }, [members])

  const add = async (data: AddMemberInput) => {
    setAdding(true)
    try {
      await coursesService.addMember(cohortId, data)
      await refresh()
      setShowAdd(false)
      toast(t('courses.members.addedToast'))
    } catch (err) { toast(errorMessage(err, t)) } finally { setAdding(false) }
  }

  const setStatus = async (id: string, status: EnrollmentStatus) => {
    setBusyId(id)
    try {
      await coursesService.setMemberStatus(id, status)
      await refresh()
    } catch (err) { toast(errorMessage(err, t)) } finally { setBusyId(null) }
  }

  const remove = async (id: string) => {
    setBusyId(id)
    try {
      await coursesService.removeMember(id)
      await refresh()
    } catch (err) { toast(errorMessage(err, t)) } finally { setBusyId(null) }
  }

  const row = (m: CourseEnrollment) => (
    <MemberRow
      key={m.id}
      member={m}
      busy={busyId === m.id}
      readOnly={readOnly}
      onSetStatus={(status) => setStatus(m.id, status)}
      onRemove={() => remove(m.id)}
    />
  )

  return (
    <div className={s.panel}>
      {/* Header: total + add affordance */}
      {!readOnly && (
        <div className={s.bar}>
          <span className={s.total}>
            <Users size={15} />
            {tp('courses.members.totalCount', active.length, { count: active.length })}
          </span>
          <button
            type="button"
            className={[s.addBtn, showAdd ? s.addBtnOpen : ''].filter(Boolean).join(' ')}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? <X size={15} /> : <UserPlus size={15} />}
            {showAdd ? t('common.cancel') : t('courses.members.add')}
          </button>
        </div>
      )}

      {!readOnly && showAdd && <AddMemberForm saving={adding} onAdd={add} />}

      {/* Pending queue — the thing a salon most needs to act on. */}
      {pending.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionHead}>
            {t('courses.members.pendingHeading')}
            <span className={s.badge}>{pending.length}</span>
          </div>
          <div className={s.list}>{pending.map(row)}</div>
        </section>
      )}

      {active.length > 0 && (
        <section className={s.section}>
          {pending.length > 0 && <div className={s.sectionHead}>{t('courses.members.confirmedShort')}</div>}
          <div className={s.list}>{active.map(row)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionHead}>{t('courses.members.pastHeading')}</div>
          <div className={s.list}>{past.map(row)}</div>
        </section>
      )}

      {members.length === 0 && (
        <div className={s.empty}>
          <Users size={22} />
          <span>{t('courses.members.empty')}</span>
        </div>
      )}
    </div>
  )
}
