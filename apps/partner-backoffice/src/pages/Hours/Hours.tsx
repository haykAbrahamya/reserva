import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Plus, Pencil, Trash2, CalendarOff, Sun, AlertTriangle, ArrowRight, MapPin } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Avatar, Button, TimePicker, ConfirmDialog, SegmentedFilter, useToast } from '@/components/ui'
import { partnersService } from '@/services/partners.service'
import { bookingsService } from '@/services/bookings.service'
import { useScopedLocationId } from '@/store/auth.hooks'
import { AddTimeOffModal, type TimeOffDraft } from '@/components/specialists/AddTimeOffModal/AddTimeOffModal'
import { findConflictingBookings } from '@/utils/timeOff'
import { errorMessage } from '@/utils/errors'
import { fmtTime, fmtDateInput } from '@/utils/format'
import { worksAt } from '@reserva/shared'
import { useI18n, useDateLocale } from '@/i18n'
import { useSpecialistName } from '@/i18n/useSpecialistName'
import { useSpotlight } from '@/components/onboarding/useSpotlight'
import { notifyProfileUpdated } from '@/components/onboarding/useProfileCompletion'
import type { WeekSchedule, WorkingDay, SpecialistTimeOff, Specialist, SpecialistBranch } from '@/types'
import s from './Hours.module.scss'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const DEFAULT_DAY: WorkingDay = { enabled: true, start: '10:00', end: '19:00' }
const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: { ...DEFAULT_DAY },
  tue: { ...DEFAULT_DAY },
  wed: { ...DEFAULT_DAY },
  thu: { ...DEFAULT_DAY },
  fri: { ...DEFAULT_DAY },
  sat: { enabled: true, start: '10:00', end: '17:00' },
  sun: { enabled: false, start: '10:00', end: '17:00' },
}

/** Editable hours are keyed per specialist AND branch. */
const keyOf = (specialistId: string, locationId: string) => `${specialistId}|${locationId}`

/** The branches a specialist works at with their hours, home first (old payloads: home only). */
function branchesOf(sp: Specialist): SpecialistBranch[] {
  return sp.locations?.length ? sp.locations : [{ locationId: sp.locationId, schedule: sp.schedule }]
}

/** A day's open window in minutes; an end before the start runs past midnight. */
function windowOf(d?: WorkingDay): [number, number] | null {
  if (!d?.enabled) return null
  const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
  const start = toMin(d.start)
  let end = toMin(d.end)
  if (end <= start) end += 1440
  return [start, end]
}

/** Weekdays on which two branches' hours overlap. */
function overlappingDays(a: WeekSchedule, b: WeekSchedule): string[] {
  return DAY_KEYS.filter(k => {
    const x = windowOf(a[k])
    const y = windowOf(b[k])
    return !!x && !!y && x[0] < y[1] && y[0] < x[1]
  })
}

export function Hours() {
  const partner = usePartner()
  const scopedLocationId = useScopedLocationId()
  const { data: specialists, reload: reloadSpecialists } = useResource(
    () => partnersService.listSpecialists({ includeInactive: true }), [], [],
  )
  const { data: locations } = useResource(() => partnersService.listLocations(), [], [])
  // Bookings in a window — used only to count time-off conflicts.
  const { data: bookings } = useResource(() => {
    const from = new Date(); from.setMonth(from.getMonth() - 1)
    const to = new Date(); to.setMonth(to.getMonth() + 3)
    return bookingsService.calendar(from.toISOString(), to.toISOString())
  }, [], [])
  const toast = useToast()
  const navigate = useNavigate()
  const { t } = useI18n()
  const spName = useSpecialistName()
  const dateLocale = useDateLocale()
  useSpotlight()

  // Hours being edited, per `specialistId|locationId`.
  const [schedules, setSchedules] = useState<Record<string, WeekSchedule>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Which branch's hours are on screen (only matters for multi-branch specialists).
  const [branchId, setBranchId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Time off — loaded per selected specialist.
  const [timeOff, setTimeOff] = useState<SpecialistTimeOff[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SpecialistTimeOff | null>(null)
  // Preserved draft so the form survives a trip to resolve conflicting bookings.
  const [draft, setDraft] = useState<TimeOffDraft | null>(null)
  // Pending time-off deletion (themed confirm dialog).
  const [deleteTarget, setDeleteTarget] = useState<SpecialistTimeOff | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [timeOffLoading, setTimeOffLoading] = useState(false)
  const loadTimeOff = useCallback((spId: string) => {
    setTimeOffLoading(true)
    partnersService
      .listTimeOff(spId)
      .then(setTimeOff)
      .catch(() => setTimeOff([])) // never leave the UI hanging on an error
      .finally(() => setTimeOffLoading(false))
  }, [])

  // Managers only manage their branch's team — everyone who works there,
  // including specialists who also work at another branch.
  const teamSpecialists = specialists.filter(
    sp => !scopedLocationId || worksAt(sp, scopedLocationId)
  )

  // Specialists carry their weekly hours inline (per branch); seed the editable
  // map from them (no extra per-specialist round-trips) and auto-select the first.
  useEffect(() => {
    if (teamSpecialists.length === 0) return
    const first = teamSpecialists.find(sp => sp.active) ?? teamSpecialists[0]
    if (first && !selectedId) setSelectedId(first.id)

    const map: Record<string, WeekSchedule> = {}
    teamSpecialists.forEach(sp => {
      branchesOf(sp).forEach(b => {
        // Treat a missing OR empty schedule as the default template, so the editor
        // is always usable (covers specialists created before defaults existed).
        const hasSchedule = b.schedule && Object.keys(b.schedule).length > 0
        map[keyOf(sp.id, b.locationId)] = hasSchedule ? b.schedule! : DEFAULT_SCHEDULE
      })
    })
    setSchedules(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialists, scopedLocationId])

  // Reload time-off whenever the selected specialist changes.
  useEffect(() => {
    if (selectedId) loadTimeOff(selectedId)
    else setTimeOff([])
  }, [selectedId, loadTimeOff])

  if (!partner) return null

  const selectedSp = specialists.find(sp => sp.id === selectedId)
  const spBranches = selectedSp ? branchesOf(selectedSp) : []
  const multiBranch = spBranches.length > 1
  // The branch on screen: the chosen tab, else the manager's own branch, else home.
  const activeBranchId =
    (branchId && spBranches.some(b => b.locationId === branchId) && branchId) ||
    (scopedLocationId && spBranches.some(b => b.locationId === scopedLocationId) && scopedLocationId) ||
    spBranches[0]?.locationId ||
    null
  // A manager edits hours at their own branch only; other branches are shown read-only.
  const readOnly = !!scopedLocationId && activeBranchId !== scopedLocationId
  const scheduleKey = selectedId && activeBranchId ? keyOf(selectedId, activeBranchId) : null
  const schedule = scheduleKey ? (schedules[scheduleKey] ?? DEFAULT_SCHEDULE) : null
  const branchName = (id: string) => locations.find(l => l.id === id)?.name ?? '—'

  // Days where two of this specialist's branches have overlapping hours.
  const overlaps: { a: string; b: string; days: string[] }[] = []
  if (selectedId && multiBranch) {
    for (let i = 0; i < spBranches.length; i++) {
      for (let j = i + 1; j < spBranches.length; j++) {
        const a = schedules[keyOf(selectedId, spBranches[i].locationId)]
        const b = schedules[keyOf(selectedId, spBranches[j].locationId)]
        const days = a && b ? overlappingDays(a, b) : []
        if (days.length) overlaps.push({ a: spBranches[i].locationId, b: spBranches[j].locationId, days })
      }
    }
  }

  const confirmDeleteTimeOff = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await partnersService.deleteTimeOff(deleteTarget.specialistId, deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    toast(t('timeOff.removedToast'))
    if (selectedId) loadTimeOff(selectedId)
  }

  const openAddTimeOff  = () => { setEditing(null);  setModalOpen(true) }
  const openEditTimeOff = (e: SpecialistTimeOff) => { setEditing(e); setDraft(null); setModalOpen(true) }

  // Deep-link Bookings filtered to this entry's specialist + date range.
  const reviewTimeOffConflicts = (e: SpecialistTimeOff) => {
    const params = new URLSearchParams({
      specialist: e.specialistId,
      from: fmtDateInput(new Date(e.startISO)),
      to:   fmtDateInput(new Date(e.endISO)),
    })
    navigate(`/bookings?${params.toString()}`)
  }

  const updateDay = (day: string, patch: Partial<WorkingDay>) => {
    if (!scheduleKey || readOnly) return
    setSchedules(prev => ({
      ...prev,
      [scheduleKey]: {
        ...(prev[scheduleKey] ?? DEFAULT_SCHEDULE),
        [day]: { ...(prev[scheduleKey]?.[day] ?? DEFAULT_DAY), ...patch },
      },
    }))
  }

  // Inline toggle — use a custom toggle in the row
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative', width: 32, height: 18, borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--line-2)',
        border: 'none', cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 16 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: 'var(--bg-1)', boxShadow: 'var(--shadow-1)', transition: 'left .2s',
      }} />
    </button>
  )

  // An end BEFORE the start is a valid overnight shift (18:00 → 02:30 closes at
  // 02:30 next morning). The only impossible combination is start === end, which
  // can't be told apart from a zero-length day — catch it here so the partner
  // gets a readable message instead of a raw API "Validation failed".
  // Checked across every branch of the specialist, since they're saved together.
  const sameTimeDays = DAY_KEYS.filter(k =>
    (selectedId ? spBranches : []).some(b => {
      const d = schedules[keyOf(selectedId!, b.locationId)]?.[k]
      return d?.enabled && d.start === d.end
    }),
  )

  const handleSave = async () => {
    if (!selectedSp || !selectedId || !schedule || sameTimeDays.length > 0) return
    setSaving(true)
    try {
      if (multiBranch) {
        // Every branch's hours in one save (the list of branches is unchanged).
        await partnersService.updateBranchHours(
          selectedId,
          selectedSp.locationId,
          spBranches.map(b => ({
            locationId: b.locationId,
            schedule: schedules[keyOf(selectedId, b.locationId)] ?? DEFAULT_SCHEDULE,
          })),
        )
        reloadSpecialists()
      } else {
        // One branch: the original single-schedule save, unchanged.
        await partnersService.updateHours(selectedId, schedule)
      }
      notifyProfileUpdated()
      toast(t('hours.savedToast'))
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('hours.title')}</h1>
          <p className={s.sub}>{t('hours.subtitle', { name: partner.name })}</p>
        </div>
        {selectedSp && (
          <Button variant="accent" onClick={handleSave} disabled={saving || sameTimeDays.length > 0}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        )}
      </div>

      <div className={s.layout} data-spotlight="setHours">
        {/* Left: Specialist list */}
        <div className={s.spList}>
          <div className={s.spListTitle}>{t('hours.specialists')}</div>
          <div className={s.spListBody}>
            {teamSpecialists.map(sp => (
              <div
                key={sp.id}
                className={[s.spItem, sp.id === selectedId ? s.active : ''].filter(Boolean).join(' ')}
                onClick={() => setSelectedId(sp.id)}
              >
                <Avatar name={spName(sp)} color={partner.accent} size="md" />
                <div className={s.spMeta}>
                  <div className={s.spName}>{spName(sp)}</div>
                  <div className={s.spTitle}>{sp.title}</div>
                </div>
                <span className={[s.spStatus, sp.active ? s.active : s.inactive].filter(Boolean).join(' ')} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Schedule panel */}
        <div className={s.schedulePanel}>
          {!selectedSp || !schedule
            ? (
              <div className={s.emptyPanel}>
                <Clock size={36} strokeWidth={1} className={s.emptyIcon} />
                <div className={s.emptyTitle}>{t('hours.selectSpecialist')}</div>
                <div style={{ fontSize: 13 }}>{t('hours.selectSpecialistHint')}</div>
              </div>
            )
            : (
              <>
                <div className={s.scheduleHead}>
                  <div>
                    <div className={s.scheduleTitle}>{spName(selectedSp)}</div>
                    <div className={s.scheduleSub}>{selectedSp.title}</div>
                  </div>
                </div>

                {/* Works at several branches: one set of hours per branch. */}
                {multiBranch && activeBranchId && (
                  <div className={s.branchBar}>
                    <div className={s.branchIntro}>
                      <MapPin size={14} />
                      <span>{t('branchPricing.hours.intro', { count: spBranches.length })}</span>
                    </div>
                    <SegmentedFilter
                      value={activeBranchId}
                      onChange={v => setBranchId(v)}
                      options={spBranches.map(b => ({ value: b.locationId, label: branchName(b.locationId) }))}
                    />
                    {readOnly && <div className={s.branchNote}>{t('branchPricing.hours.readOnly')}</div>}
                  </div>
                )}

                {DAY_KEYS.map((key) => {
                  const day: WorkingDay = schedule[key] ?? { enabled: false, start: '10:00', end: '19:00' }
                  const sameTime = day.enabled && day.start === day.end
                  return (
                    <div key={key} className={[s.dayRow, !day.enabled ? s.disabled : ''].filter(Boolean).join(' ')}>
                      <span className={s.dayLabel}>{t(`hours.days.${key}`)}</span>
                      <div className={s.timeInputs}>
                        <TimePicker
                          value={day.start}
                          disabled={!day.enabled || readOnly}
                          step={15}
                          onChange={v => updateDay(key, { start: v })}
                        />
                        <span className={s.timeSep}>–</span>
                        <TimePicker
                          value={day.end}
                          disabled={!day.enabled || readOnly}
                          step={15}
                          onChange={v => updateDay(key, { end: v })}
                        />
                        {sameTime && (
                          <span className={s.sameTimeError}>
                            <AlertTriangle size={13} /> {t('hours.sameTimeError')}
                          </span>
                        )}
                      </div>
                      <Toggle checked={day.enabled} onChange={v => updateDay(key, { enabled: v })} />
                    </div>
                  )
                })}

                {/* Same person, two places at once: allowed, but say what it means. */}
                {overlaps.map(o => (
                  <div key={`${o.a}|${o.b}`} className={s.overlapNote} role="status">
                    <AlertTriangle size={15} />
                    <span>
                      {t('branchPricing.hours.overlap', {
                        days: o.days.map(d => t(`hours.days.${d}`)).join(', '),
                        a: branchName(o.a),
                        b: branchName(o.b),
                      })}
                    </span>
                  </div>
                ))}

                {/* ── Time off & exceptions ── */}
                <div className={s.timeOffSection}>
                  <div className={s.timeOffHead}>
                    <div>
                      <div className={s.timeOffTitle}>{t('timeOff.sectionTitle')}</div>
                      <div className={s.timeOffHint}>{t('timeOff.sectionHint')}</div>
                    </div>
                    <Button variant="default" size="sm" onClick={openAddTimeOff}>
                      <Plus size={14} /> {t('timeOff.add')}
                    </Button>
                  </div>

                  {timeOffLoading ? (
                    <div className={s.timeOffEmpty}>
                      <span>{t('common.saving')}</span>
                    </div>
                  ) : timeOff.length === 0 ? (
                    <div className={s.timeOffEmpty}>
                      <CalendarOff size={18} strokeWidth={1.5} />
                      <span>{t('timeOff.empty')}</span>
                    </div>
                  ) : (
                    <div className={s.timeOffList}>
                      {timeOff.map(entry => (
                        <TimeOffRow
                          key={entry.id}
                          entry={entry}
                          conflicts={findConflictingBookings(bookings, entry.specialistId, entry.startISO, entry.endISO).length}
                          onEdit={() => openEditTimeOff(entry)}
                          onDelete={() => setDeleteTarget(entry)}
                          onReview={() => reviewTimeOffConflicts(entry)}
                          t={t}
                          dateLocale={dateLocale}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          }
        </div>
      </div>

      {selectedSp && (
        <AddTimeOffModal
          open={modalOpen}
          specialist={selectedSp}
          bookings={bookings}
          editing={editing}
          initialDraft={draft}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setDraft(null); if (selectedId) loadTimeOff(selectedId) }}
          onPreserveDraft={setDraft}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title={t('timeOff.deleteTitle')}
        message={t('timeOff.deleteBody', { name: selectedSp ? spName(selectedSp) : '' })}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        onConfirm={confirmDeleteTimeOff}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

/** One row in the time-off list — formats partial/full/range entries. */
function TimeOffRow({ entry, conflicts, onEdit, onDelete, onReview, t, dateLocale }: {
  entry: SpecialistTimeOff
  conflicts: number
  onEdit: () => void
  onDelete: () => void
  onReview: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
  dateLocale: string
}) {
  const start = new Date(entry.startISO)
  const end   = new Date(entry.endISO)
  const sameDay = start.toDateString() === end.toDateString()
  const dateOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

  const dateLabel = sameDay
    ? start.toLocaleDateString(dateLocale, { weekday: 'short', ...dateOpts })
    : `${start.toLocaleDateString(dateLocale, dateOpts)} – ${end.toLocaleDateString(dateLocale, dateOpts)}`

  const timeLabel = entry.allDay
    ? t('timeOff.allDay')
    : `${fmtTime(entry.startISO)} – ${fmtTime(entry.endISO)}`

  return (
    <div className={s.toRow}>
      <span className={[s.toIcon, entry.allDay ? s.toIconFull : s.toIconPartial].join(' ')}>
        {entry.allDay ? <Sun size={15} /> : <Clock size={15} />}
      </span>
      <div className={s.toMeta}>
        <div className={s.toPrimary}>
          <span className={s.toDate}>{dateLabel}</span>
          <span className={s.toDot}>·</span>
          <span className={s.toTime}>{timeLabel}</span>
        </div>
        <div className={s.toSub}>
          {entry.reason
            ? <span className={s.toReason}>{entry.reason}</span>
            : <span className={s.toNoReason}>{t('timeOff.noReason')}</span>}
          {conflicts > 0 && (
            <button type="button" className={s.toConflict} onClick={onReview}>
              <AlertTriangle size={12} />
              {t(conflicts === 1 ? 'timeOff.conflictBadge' : 'timeOff.conflictBadge_plural', { count: conflicts })}
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
      <div className={s.toActions}>
        <button type="button" className={s.toBtn} onClick={onEdit} aria-label="Edit"><Pencil size={14} /></button>
        <button type="button" className={[s.toBtn, s.toBtnDanger].join(' ')} onClick={onDelete} aria-label="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
