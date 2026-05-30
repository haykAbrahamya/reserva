import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { Avatar, Button, TimePicker } from '@/components/ui'
import { partnersService } from '@/services/partners.service'
import type { WeekSchedule, WorkingDay } from '@/types'
import s from './Hours.module.scss'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

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

export function Hours() {
  const partner = usePartner()
  const [schedules, setSchedules] = useState<Record<string, WeekSchedule>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!partner) return
    const first = partner.specialists.find(sp => sp.active) ?? partner.specialists[0]
    if (first && !selectedId) setSelectedId(first.id)

    Promise.all(
      partner.specialists.map(sp =>
        partnersService.getHours(sp.id).then(h => ({ id: sp.id, schedule: h?.schedule ?? DEFAULT_SCHEDULE }))
      )
    ).then(results => {
      const map: Record<string, WeekSchedule> = {}
      results.forEach(r => { map[r.id] = r.schedule })
      setSchedules(map)
    })
  }, [partner])

  if (!partner) return null

  const selectedSp = partner.specialists.find(sp => sp.id === selectedId)
  const schedule = selectedId ? (schedules[selectedId] ?? DEFAULT_SCHEDULE) : null

  const updateDay = (day: string, patch: Partial<WorkingDay>) => {
    if (!selectedId) return
    setSchedules(prev => ({
      ...prev,
      [selectedId]: {
        ...prev[selectedId],
        [day]: { ...(prev[selectedId]?.[day] ?? DEFAULT_DAY), ...patch },
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

  const handleSave = async () => {
    if (!selectedId || !schedule) return
    setSaving(true)
    await partnersService.updateHours(selectedId, schedule)
    setSaving(false)
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>Working hours</h1>
          <p className={s.sub}>{partner.name} · weekly schedule per specialist</p>
        </div>
        {selectedSp && (
          <Button variant="accent" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </div>

      <div className={s.layout}>
        {/* Left: Specialist list */}
        <div className={s.spList}>
          <div className={s.spListTitle}>Specialists</div>
          {partner.specialists.map(sp => (
            <div
              key={sp.id}
              className={[s.spItem, sp.id === selectedId ? s.active : ''].filter(Boolean).join(' ')}
              onClick={() => setSelectedId(sp.id)}
            >
              <Avatar name={sp.name} color={partner.accent} size="md" />
              <div className={s.spMeta}>
                <div className={s.spName}>{sp.name}</div>
                <div className={s.spTitle}>{sp.title}</div>
              </div>
              <span className={[s.spStatus, sp.active ? s.active : s.inactive].filter(Boolean).join(' ')} />
            </div>
          ))}
        </div>

        {/* Right: Schedule panel */}
        <div className={s.schedulePanel}>
          {!selectedSp || !schedule
            ? (
              <div className={s.emptyPanel}>
                <Clock size={36} strokeWidth={1} className={s.emptyIcon} />
                <div className={s.emptyTitle}>Select a specialist</div>
                <div style={{ fontSize: 13 }}>Pick someone from the list to edit their hours.</div>
              </div>
            )
            : (
              <>
                <div className={s.scheduleHead}>
                  <div>
                    <div className={s.scheduleTitle}>{selectedSp.name}</div>
                    <div className={s.scheduleSub}>{selectedSp.title}</div>
                  </div>
                </div>

                {DAYS.map(({ key, label }) => {
                  const day: WorkingDay = schedule[key] ?? { enabled: false, start: '10:00', end: '19:00' }
                  return (
                    <div key={key} className={[s.dayRow, !day.enabled ? s.disabled : ''].filter(Boolean).join(' ')}>
                      <span className={s.dayLabel}>{label}</span>
                      <div className={s.timeInputs}>
                        <TimePicker
                          value={day.start}
                          disabled={!day.enabled}
                          step={15}
                          onChange={v => updateDay(key, { start: v })}
                        />
                        <span className={s.timeSep}>–</span>
                        <TimePicker
                          value={day.end}
                          disabled={!day.enabled}
                          step={15}
                          onChange={v => updateDay(key, { end: v })}
                        />
                      </div>
                      <Toggle checked={day.enabled} onChange={v => updateDay(key, { enabled: v })} />
                    </div>
                  )
                })}
              </>
            )
          }
        </div>
      </div>
    </div>
  )
}
