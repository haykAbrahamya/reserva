import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { Modal, Input, Select, Button, DatePicker, useToast } from '@/components/ui'
import { useAppStore, usePartner } from '@/store/app.store'
import { bookingsService } from '@/services/bookings.service'
import { fmtDateInput } from '@/utils/format'
import s from './NewBookingModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  initialDate?: string
  initialTime?: string
}

export function NewBookingModal({ open, onClose, initialDate, initialTime }: Props) {
  const partner       = usePartner()
  const bookings      = useAppStore(st => st.bookings)
  const upsertBooking = useAppStore(st => st.upsertBooking)
  const toast         = useToast()
  const today         = fmtDateInput(new Date())

  // All hooks must be declared before any conditional return
  const [locationId,   setLocationId]   = useState('')
  const [serviceId,    setServiceId]    = useState('')
  const [specialistId, setSpecialistId] = useState('')
  const [date,         setDate]         = useState(initialDate ?? today)
  const [time,         setTime]         = useState(initialTime ?? '')
  const [clientName,   setClientName]   = useState('')
  const [clientPhone,  setClientPhone]  = useState('')

  const allSlots = useMemo(() => {
    const out: string[] = []
    for (let h = 8; h < 21; h++)
      for (let m = 0; m < 60; m += 30)
        out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    return out
  }, [])

  const busySlots = useMemo(() => {
    const set = new Set<string>()
    if (!specialistId || !date || !partner) return set
    bookings.forEach(b => {
      if (b.specialistId !== specialistId) return
      if (b.status === 'cancelled' || b.status === 'noshow') return
      const d = new Date(b.startISO)
      if (fmtDateInput(d) !== date) return
      set.add(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    })
    return set
  }, [bookings, specialistId, date, partner])

  // Early return AFTER all hooks
  if (!partner) return null

  const locations   = partner.locations
  const specialists = partner.specialists.filter(sp =>
    sp.active && (!locationId || sp.locationId === locationId)
  )
  const services = partner.services.filter(sv =>
    sv.active && (!specialistId || partner.specialists.find(sp => sp.id === specialistId)?.services.includes(sv.id))
  )
  const selectedService = partner.services.find(sv => sv.id === serviceId)
  const canSubmit = locationId && serviceId && specialistId && date && time && clientName && clientPhone

  const handleSubmit = async () => {
    if (!canSubmit || !selectedService) return
    const [h, m] = time.split(':').map(Number)
    const start = new Date(`${date}T00:00:00`)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + selectedService.duration * 60_000)

    const booking = await bookingsService.create({
      partnerId: partner.id, locationId, specialistId, serviceId,
      clientName, clientPhone,
      startISO: start.toISOString(), endISO: end.toISOString(),
      status: 'confirmed',
    })
    upsertBooking(booking)
    toast(`Booking confirmed for ${clientName}`)
    onClose()
    setLocationId(''); setServiceId(''); setSpecialistId('')
    setDate(today);   setTime('');   setClientName(''); setClientPhone('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New booking"
      subtitle="Fill in the details to create a booking"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" disabled={!canSubmit} onClick={handleSubmit}>
            Confirm booking
          </Button>
        </>
      }
    >
      <div className={s.grid}>
        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>Location</label>
          <Select
            value={locationId}
            onChange={v => { setLocationId(v); setSpecialistId('') }}
            options={locations.map(l => ({ value: l.id, label: l.name, sub: l.address }))}
            placeholder="Select location…"
          />
        </div>

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>Service</label>
          <Select
            value={serviceId}
            onChange={setServiceId}
            options={services.map(sv => ({ value: sv.id, label: sv.name, sub: `${sv.duration} min · ${sv.price.toLocaleString()} AMD` }))}
            placeholder="Select service…"
          />
        </div>

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>Specialist</label>
          <Select
            value={specialistId}
            onChange={setSpecialistId}
            options={specialists.map(sp => ({ value: sp.id, label: sp.name, sub: sp.title }))}
            placeholder="Select specialist…"
            disabled={!locationId}
          />
        </div>

        <div>
          <DatePicker label="Date" value={date} min={today} onChange={setDate} />
        </div>

        <div className={s.full}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-1)', display: 'block', marginBottom: 6 }}>Time</label>
          {specialistId && date ? (
            <div className={s.slotGrid}>
              {allSlots.map(sl => (
                <button
                  key={sl}
                  type="button"
                  disabled={busySlots.has(sl)}
                  onClick={() => !busySlots.has(sl) && setTime(sl)}
                  className={[s.slot, time === sl ? s.selected : '', busySlots.has(sl) ? s.busy : ''].filter(Boolean).join(' ')}
                >
                  {sl}
                </button>
              ))}
            </div>
          ) : (
            <div className={s.infoBox}>
              <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>Select a specialist and date to see available slots.</span>
            </div>
          )}
        </div>

        <Input label="Client name"  value={clientName}  onChange={e => setClientName(e.target.value)}  placeholder="Anna Karapetyan" />
        <Input label="Client phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+374 91 …" />

        {time && selectedService && (
          <div className={[s.full, s.infoBox].join(' ')}>
            <Calendar size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>
              <strong>{new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
              {' '}at <strong>{time}</strong> · {selectedService.name} ({selectedService.duration} min)
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
