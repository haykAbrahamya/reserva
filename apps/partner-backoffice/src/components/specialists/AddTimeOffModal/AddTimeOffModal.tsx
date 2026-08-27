import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react'
import { Modal, Select, Button, DatePicker, TimePicker, Input, BookingBadge, useToast } from '@/components/ui'
import { usePartner } from '@/store/app.store'
import { partnersService } from '@/services/partners.service'
import { fmtDateInput, fmtTime } from '@/utils/format'
import { findConflictingBookings } from '@/utils/timeOff'
import { useI18n, useDateLocale, useDatePickerLabels } from '@/i18n'
import type { Specialist, SpecialistTimeOff, Booking } from '@/types'
import s from './AddTimeOffModal.module.scss'

type OffType = 'partial' | 'fullDay' | 'range'

/** A filled-but-unsaved form, kept so a manager doesn't re-enter it after
 * being sent off to resolve conflicting bookings. */
export interface TimeOffDraft {
  specialistId: string
  type: OffType
  date: string
  endDate: string
  startTime: string
  endTime: string
  reason: string
}

interface Props {
  open: boolean
  specialist: Specialist
  /** Current bookings (passed from the page) used to detect conflicts. */
  bookings: Booking[]
  /** When provided, the modal edits this entry instead of creating a new one. */
  editing?: SpecialistTimeOff | null
  /** Seed a fresh "add" form from a previously preserved draft. */
  initialDraft?: TimeOffDraft | null
  onClose: () => void
  onSaved: () => void
  /** Called with the current form state right before navigating away to
   * resolve conflicts, so the parent can re-seed the form on return. */
  onPreserveDraft?: (draft: TimeOffDraft) => void
}

/** Compose a 'YYYY-MM-DD' + 'HH:MM' into a local Date. */
function combine(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(`${dateStr}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d
}

function classifyType(t: SpecialistTimeOff): OffType {
  if (!t.allDay) return 'partial'
  return fmtDateInput(new Date(t.startISO)) === fmtDateInput(new Date(t.endISO)) ? 'fullDay' : 'range'
}

export function AddTimeOffModal({ open, specialist, bookings, editing, initialDraft, onClose, onSaved, onPreserveDraft }: Props) {
  const partner  = usePartner()
  const toast    = useToast()
  const navigate = useNavigate()
  const { t, tp } = useI18n()
  const dateLocale = useDateLocale()
  const dateLabels = useDatePickerLabels()
  const today    = fmtDateInput(new Date())

  const [type,      setType]      = useState<OffType>('partial')
  const [date,      setDate]      = useState(today)
  const [endDate,   setEndDate]   = useState(today)
  const [startTime, setStartTime] = useState('15:00')
  const [endTime,   setEndTime]   = useState('17:00')
  const [reason,    setReason]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Conflict phase: when set, the modal shows the conflict confirmation instead
  // of the form. Holds the bookings that overlap the about-to-save window.
  const [conflicts, setConflicts] = useState<Booking[] | null>(null)

  // Seed the form from the editing entry (or reset to defaults) on open.
  useEffect(() => {
    if (!open) return
    setError(null)
    setConflicts(null)
    if (editing) {
      const ty = classifyType(editing)
      setType(ty)
      const sd = new Date(editing.startISO)
      const ed = new Date(editing.endISO)
      setDate(fmtDateInput(sd))
      setEndDate(fmtDateInput(ed))
      setStartTime(fmtTime(editing.startISO))
      setEndTime(fmtTime(editing.endISO))
      setReason(editing.reason ?? '')
    } else if (initialDraft && initialDraft.specialistId === specialist.id) {
      // Returning from resolving conflicts — restore what they typed.
      setType(initialDraft.type)
      setDate(initialDraft.date)
      setEndDate(initialDraft.endDate)
      setStartTime(initialDraft.startTime)
      setEndTime(initialDraft.endTime)
      setReason(initialDraft.reason)
    } else {
      setType('partial')
      setDate(today); setEndDate(today)
      setStartTime('15:00'); setEndTime('17:00')
      setReason('')
    }
  }, [open, editing])  // eslint-disable-line react-hooks/exhaustive-deps

  // Derive the concrete [start, end] interval from the form state.
  const interval = useMemo(() => {
    if (type === 'partial') {
      return { start: combine(date, startTime), end: combine(date, endTime), allDay: false }
    }
    if (type === 'fullDay') {
      return { start: combine(date, '00:00'), end: combine(date, '23:59'), allDay: true }
    }
    // range
    return { start: combine(date, '00:00'), end: combine(endDate, '23:59'), allDay: true }
  }, [type, date, endDate, startTime, endTime])

  const valid = interval.end.getTime() > interval.start.getTime()

  const persist = async () => {
    setSaving(true)
    const payload = {
      specialistId: specialist.id,
      startISO: interval.start.toISOString(),
      endISO: interval.end.toISOString(),
      allDay: interval.allDay,
      reason: reason.trim() || undefined,
    }
    if (editing) {
      await partnersService.updateTimeOff(specialist.id, editing.id, payload)
      toast(t('timeOff.updatedToast'))
    } else {
      await partnersService.createTimeOff(payload)
      toast(t('timeOff.addedToast'))
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const handleSave = async () => {
    if (!valid) { setError(t('timeOff.endBeforeStart')); return }
    setError(null)

    // Check for bookings already inside this window (ignore the entry being
    // edited — its own slot shouldn't be flagged against itself, but bookings
    // are independent so this is just a straight overlap check).
    const hits = findConflictingBookings(
      bookings, specialist.id,
      interval.start.toISOString(), interval.end.toISOString(),
    )
    if (hits.length > 0) {
      setConflicts(hits)   // → show confirmation phase
      return
    }
    await persist()
  }

  // Keep end after start: when start moves to/past end, push end out by 30m.
  const handleStartTimeChange = (v: string) => {
    setStartTime(v)
    if (v >= endTime) {
      const [h, m] = v.split(':').map(Number)
      const e = new Date(); e.setHours(h, m + 30, 0, 0)
      setEndTime(`${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`)
    }
  }

  // Deep-link Bookings pre-filtered to this specialist + date range so the
  // manager can resolve the conflicting bookings before the time off can save.
  const gotoFilteredBookings = () => {
    // Preserve the filled form so reopening "Add time off" doesn't start blank.
    onPreserveDraft?.({ specialistId: specialist.id, type, date, endDate, startTime, endTime, reason })
    const params = new URLSearchParams({
      specialist: specialist.id,
      from: fmtDateInput(interval.start),
      to:   fmtDateInput(interval.end),
    })
    onClose()
    navigate(`/bookings?${params.toString()}`)
  }

  if (!partner) return null

  const typeOptions = [
    { value: 'partial',  label: t('timeOff.typePartial') },
    { value: 'fullDay',  label: t('timeOff.typeFullDay') },
    { value: 'range',    label: t('timeOff.typeRange') },
  ]

  // ── Conflict confirmation phase ───────────────────────────────
  if (conflicts) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={t('timeOff.conflictTitle')}
        size="sm"
        footer={
          <div className={s.conflictFooter}>
            <Button variant="ghost" onClick={() => setConflicts(null)}>{t('common.cancel')}</Button>
            <Button variant="accent" onClick={gotoFilteredBookings}>
              {t('timeOff.resolveBookings')} <ArrowRight size={15} />
            </Button>
          </div>
        }
      >
        <div className={s.conflictWrap}>
          {/* Warning banner — time off can't be saved until these are resolved */}
          <div className={s.conflictBanner}>
            <span className={s.conflictIcon}><AlertTriangle size={18} /></span>
            <p className={s.conflictText}>
              {tp('timeOff.conflictBody', conflicts.length, { name: specialist.name, count: conflicts.length })}
            </p>
          </div>

          <div className={s.conflictList}>
            {conflicts.map(b => {
              const svc = b.service
              return (
                <div key={b.id} className={s.conflictItem}>
                  <span className={s.conflictTime}>
                    {fmtTime(b.startISO)}
                    <span className={s.conflictDate}>
                      {new Date(b.startISO).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                    </span>
                  </span>
                  <span className={s.conflictMeta}>
                    <span className={s.conflictClient}>{b.clientName}</span>
                    <span className={s.conflictSvc}>{svc?.name ?? '—'}{b.clientPhone ? ` · ${b.clientPhone}` : ''}</span>
                  </span>
                  <BookingBadge status={b.status} />
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    )
  }

  // ── Form phase ────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('timeOff.modalEditTitle') : t('timeOff.modalTitle')}
      subtitle={t('timeOff.modalSubtitle', { name: specialist.name })}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="accent" disabled={!valid || saving} onClick={handleSave}>{t('timeOff.save')}</Button>
        </>
      }
    >
      <div className={s.form}>
        <Field label={t('timeOff.typeLabel')}>
          <Select value={type} onChange={v => setType(v as OffType)} options={typeOptions} searchable={false} />
        </Field>

        {type === 'range' ? (
          <div className={s.row2}>
            <Field label={t('timeOff.startDateLabel')}>
              <DatePicker value={date} min={today} onChange={v => { setDate(v); if (v > endDate) setEndDate(v) }} labels={dateLabels} />
            </Field>
            <Field label={t('timeOff.endDateLabel')}>
              <DatePicker value={endDate} min={date} onChange={setEndDate} labels={dateLabels} />
            </Field>
          </div>
        ) : (
          <Field label={t('timeOff.dateLabel')}>
            <DatePicker value={date} min={today} onChange={setDate} labels={dateLabels} />
          </Field>
        )}

        {type === 'partial' && (
          <Field label={t('timeOff.timeLabel')}>
            <div className={s.timeRow}>
              <TimePicker value={startTime} step={15} onChange={handleStartTimeChange} />
              <span className={s.timeSep}>–</span>
              <TimePicker value={endTime} step={15} onChange={setEndTime} />
            </div>
          </Field>
        )}

        <Field label={t('timeOff.reasonOptional')}>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={t('timeOff.reasonPlaceholder')} />
        </Field>

        {error && (
          <div className={s.errorBox}>
            <Clock size={14} /> {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}
