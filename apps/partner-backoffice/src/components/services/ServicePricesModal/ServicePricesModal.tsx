import { useEffect, useMemo, useState } from 'react'
import { MapPin, Info, EyeOff, RotateCcw } from 'lucide-react'
import { Modal, Button, Toggle, Avatar, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { usePartner } from '@/store/app.store'
import { useScopedLocationId } from '@/store/auth.hooks'
import {
  partnersService,
  type BranchPriceInput,
  type SpecialistPriceInput,
} from '@/services/partners.service'
import { errorMessage } from '@/utils/errors'
import { fmtDuration, fmtServicePrice, worksAt } from '@/utils/format'
import { useI18n } from '@/i18n'
import type { Service, ServicePriceType } from '@/types'
import s from './ServicePricesModal.module.scss'

/** Text inputs; '' = "use the level above". */
interface PriceDraft {
  price: string
  priceMax: string
  duration: string
  /** Kept so a row made through the API with another price type survives a save. */
  priceType: ServicePriceType | null
}
interface BranchDraft extends PriceDraft {
  offered: boolean
  capacity: string
}

const emptyPrice = (): PriceDraft => ({ price: '', priceMax: '', duration: '', priceType: null })
const str = (n: number | null | undefined) => (n == null ? '' : String(n))
const personKey = (specialistId: string, locationId: string) => `${specialistId}|${locationId}`

interface Props {
  open: boolean
  service: Service | null
  onClose: () => void
  /** Called after a successful save (to refresh "varies" marks in the list). */
  onSaved?: () => void
}

/**
 * One service's prices across branches and specialists, on one screen.
 *
 * Written for salon owners rather than for us: every field is optional, an
 * empty field shows (greyed) the price it falls back to, and the order of
 * precedence is spelled out once at the top — own price → branch price →
 * default. Saves the whole grid in one request.
 */
export function ServicePricesModal({ open, service, onClose, onSaved }: Props) {
  const { t } = useI18n()
  const toast = useToast()
  const partner = usePartner()
  const scopedLocationId = useScopedLocationId()

  const { data: locations } = useResource(
    () => (open ? partnersService.listLocations() : Promise.resolve([])), [open], [],
  )
  const { data: specialists } = useResource(
    () => (open ? partnersService.listSpecialists({ includeInactive: true }) : Promise.resolve([])), [open], [],
  )
  const { data: pricing, loading } = useResource(
    () => (open ? partnersService.getPricing() : Promise.resolve(null)), [open], null,
  )

  const [branches, setBranches] = useState<Record<string, BranchDraft>>({})
  const [people, setPeople] = useState<Record<string, PriceDraft>>({})
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const facility = service?.requiresSpecialist === false
  const priceLabels = useMemo(() => ({ from: t('services.priceFrom') }), [t])

  // A salon with ONE branch has nothing to vary by branch: the screen is just
  // the default price plus each specialist's own. The branch row only appears
  // if one was saved earlier (e.g. while a second branch still existed), so it
  // can still be seen and cleared.
  const single = locations.length === 1
  const branchRowShown = (locationId: string): boolean => {
    if (!single) return true
    const row = pricing?.branches.find(r => r.serviceId === service?.id && r.locationId === locationId)
    return !!row && (!row.offered || row.price != null || row.duration != null || row.capacity != null)
  }

  // A manager prices their own branch only; an admin sees every branch.
  const shownLocations = useMemo(
    () => locations.filter(l => !scopedLocationId || l.id === scopedLocationId),
    [locations, scopedLocationId],
  )

  /** Who can be priced at a branch: works there and does this service. */
  const staffAt = (locationId: string) =>
    service
      ? specialists
          .filter(sp => worksAt(sp, locationId) && sp.services.includes(service.id))
          .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
      : []

  // Seed the drafts from the saved rows whenever the data arrives.
  useEffect(() => {
    if (!service || !pricing) return
    const b: Record<string, BranchDraft> = {}
    for (const loc of locations) {
      const row = pricing.branches.find(r => r.serviceId === service.id && r.locationId === loc.id)
      b[loc.id] = {
        offered: row?.offered ?? true,
        price: str(row?.price),
        priceMax: str(row?.priceMax),
        duration: str(row?.duration),
        capacity: str(row?.capacity),
        priceType: row?.priceType ?? null,
      }
    }
    const p: Record<string, PriceDraft> = {}
    for (const row of pricing.specialists.filter(r => r.serviceId === service.id)) {
      p[personKey(row.specialistId, row.locationId)] = {
        price: str(row.price),
        priceMax: str(row.priceMax),
        duration: str(row.duration),
        priceType: row.priceType,
      }
    }
    setBranches(b)
    setPeople(p)
    setInvalid(new Set())
  }, [service, pricing, locations])

  if (!service || !partner) return null

  // ── Inherited values (what an empty field falls back to) ──
  const defaultPrice = fmtServicePrice({ ...service, hidePrice: false }, priceLabels)
  const branchPriceText = (locationId: string): string => {
    const d = branches[locationId]
    if (!d || d.price === '') return defaultPrice
    return fmtServicePrice(
      { price: Number(d.price), priceType: d.priceType ?? service.priceType ?? 'fixed', priceMax: d.priceMax === '' ? null : Number(d.priceMax) },
      priceLabels,
    )
  }
  const branchDuration = (locationId: string): number => {
    const d = branches[locationId]
    return d && d.duration !== '' ? Number(d.duration) : service.duration
  }

  // ── Editing ──
  const setBranch = (locationId: string, patch: Partial<BranchDraft>) => {
    setBranches(prev => ({ ...prev, [locationId]: { ...(prev[locationId] ?? { ...emptyPrice(), offered: true, capacity: '' }), ...patch } }))
    setInvalid(prev => { const n = new Set(prev); Object.keys(patch).forEach(k => n.delete(`b|${locationId}|${k}`)); return n })
  }
  const setPerson = (key: string, patch: Partial<PriceDraft>) => {
    setPeople(prev => ({ ...prev, [key]: { ...(prev[key] ?? emptyPrice()), ...patch } }))
    setInvalid(prev => { const n = new Set(prev); Object.keys(patch).forEach(k => n.delete(`p|${key}|${k}`)); return n })
  }
  const resetPerson = (key: string) => setPeople(prev => ({ ...prev, [key]: emptyPrice() }))

  /** "Same price everywhere": drop every price and duration override in view. */
  const sameEverywhere = () => {
    setBranches(prev => {
      const next = { ...prev }
      for (const loc of shownLocations) {
        const d = next[loc.id]
        if (d) next[loc.id] = { ...d, price: '', priceMax: '', duration: '', priceType: null }
      }
      return next
    })
    setPeople(prev => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (shownLocations.some(l => key.endsWith(`|${l.id}`))) next[key] = emptyPrice()
      }
      return next
    })
    setInvalid(new Set())
  }

  // ── Validation + save ──
  const validate = (): Set<string> => {
    const bad = new Set<string>()
    const checkPrice = (prefix: string, d: PriceDraft) => {
      const price = Number(d.price)
      if (d.price !== '' && (!Number.isInteger(price) || price < 0)) bad.add(`${prefix}|price`)
      if (d.priceMax !== '') {
        const max = Number(d.priceMax)
        if (d.price === '' || !Number.isInteger(max) || max <= price) bad.add(`${prefix}|priceMax`)
      }
      if (d.duration !== '') {
        const m = Number(d.duration)
        if (!Number.isInteger(m) || m < 5 || m > 600) bad.add(`${prefix}|duration`)
      }
    }
    for (const loc of shownLocations) {
      const d = branches[loc.id]
      if (!d) continue
      checkPrice(`b|${loc.id}`, d)
      if (facility && d.capacity !== '') {
        const c = Number(d.capacity)
        if (!Number.isInteger(c) || c < 1 || c > 200) bad.add(`b|${loc.id}|capacity`)
      }
    }
    for (const [key, d] of Object.entries(people)) checkPrice(`p|${key}`, d)
    return bad
  }

  const handleSave = async () => {
    if (saving) return
    const bad = validate()
    setInvalid(bad)
    if (bad.size) { toast(t('branchPricing.prices.fixFields')); return }

    const typeFor = (d: PriceDraft): ServicePriceType => d.priceType ?? service.priceType ?? 'fixed'
    const branchRows: BranchPriceInput[] = shownLocations.map(loc => {
      const d = branches[loc.id] ?? { ...emptyPrice(), offered: true, capacity: '' }
      const priced = d.price !== ''
      const type = typeFor(d)
      return {
        locationId: loc.id,
        offered: d.offered,
        priceType: priced ? type : null,
        price: priced ? Number(d.price) : null,
        priceMax: priced && type === 'range' && d.priceMax !== '' ? Number(d.priceMax) : null,
        duration: d.duration !== '' ? Number(d.duration) : null,
        capacity: facility && d.capacity !== '' ? Number(d.capacity) : null,
      }
    })
    const personRows: SpecialistPriceInput[] = []
    if (!facility) {
      for (const loc of shownLocations) {
        for (const sp of staffAt(loc.id)) {
          const d = people[personKey(sp.id, loc.id)]
          if (!d || (d.price === '' && d.duration === '')) continue
          const priced = d.price !== ''
          const type = typeFor(d)
          personRows.push({
            specialistId: sp.id,
            locationId: loc.id,
            priceType: priced ? type : null,
            price: priced ? Number(d.price) : null,
            priceMax: priced && type === 'range' && d.priceMax !== '' ? Number(d.priceMax) : null,
            duration: d.duration !== '' ? Number(d.duration) : null,
          })
        }
      }
    }

    // One-branch salon: leave the (hidden) branch row alone — an omitted list is
    // untouched by the server.
    const sendBranches = shownLocations.every(loc => branchRowShown(loc.id))

    setSaving(true)
    try {
      await partnersService.saveServicePricing(
        service.id,
        sendBranches ? { branches: branchRows, specialists: personRows } : { specialists: personRows },
      )
      toast(t('branchPricing.prices.saved'))
      onSaved?.()
      onClose()
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  // ── Rendering helpers ──
  const priceInputs = (prefix: string, d: PriceDraft, placeholder: string, onChange: (p: Partial<PriceDraft>) => void, disabled = false) => {
    const rangeRow = (d.priceType ?? service.priceType) === 'range'
    return (
      <div className={s.priceInputs}>
        <input
          className={[s.num, invalid.has(`${prefix}|price`) ? s.bad : ''].join(' ')}
          type="number"
          inputMode="numeric"
          min={0}
          value={d.price}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={rangeRow ? t('branchPricing.prices.from') : t('branchPricing.prices.col.price')}
          onChange={e => onChange({ price: e.target.value })}
        />
        {rangeRow && (
          <>
            <span className={s.dash}>–</span>
            <input
              className={[s.num, invalid.has(`${prefix}|priceMax`) ? s.bad : ''].join(' ')}
              type="number"
              inputMode="numeric"
              min={0}
              value={d.priceMax}
              placeholder={t('branchPricing.prices.to')}
              disabled={disabled || d.price === ''}
              aria-label={t('branchPricing.prices.to')}
              onChange={e => onChange({ priceMax: e.target.value })}
            />
          </>
        )}
      </div>
    )
  }
  const durationInput = (prefix: string, d: PriceDraft, placeholder: number, onChange: (p: Partial<PriceDraft>) => void, disabled = false) => (
    <div className={s.durationInput}>
      <input
        className={[s.num, s.short, invalid.has(`${prefix}|duration`) ? s.bad : ''].join(' ')}
        type="number"
        inputMode="numeric"
        min={5}
        max={600}
        value={d.duration}
        placeholder={String(placeholder)}
        disabled={disabled}
        aria-label={t('branchPricing.prices.col.duration')}
        onChange={e => onChange({ duration: e.target.value })}
      />
      <span className={s.unit}>{t('branchPricing.prices.min')}</span>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('branchPricing.prices.title', { name: service.name })}
      subtitle={t(single ? 'branchPricing.prices.subtitleSingle' : 'branchPricing.prices.subtitle')}
      footer={
        <div className={s.footer}>
          <Button variant="ghost" onClick={sameEverywhere} disabled={saving || loading}>
            <RotateCcw size={14} /> {t(single ? 'branchPricing.prices.sameForEveryone' : 'branchPricing.prices.sameEverywhere')}
          </Button>
          <div className={s.footerMain}>
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="accent" onClick={handleSave} disabled={saving || loading}>
              {saving ? t('common.saving') : t('branchPricing.prices.save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className={s.wrap}>
        {/* What everything falls back to, and the order of precedence. */}
        <div className={s.defaults}>
          <div className={s.defaultsMain}>
            <span className={s.defaultsLabel}>{t('branchPricing.prices.defaultLabel')}</span>
            <span className={s.defaultsValue}>
              {defaultPrice} · {fmtDuration(service.duration)}
              {facility && <> · {t('branchPricing.prices.spotsValue', { n: service.capacity ?? 1 })}</>}
            </span>
          </div>
          <div className={s.order} aria-label={t('branchPricing.prices.orderAria')}>
            <span className={[s.tag, s.tagOwn].join(' ')}>{t('branchPricing.prices.own')}</span>
            <span className={s.arrow}>→</span>
            {!single && (
              <>
                <span className={[s.tag, s.tagBranch].join(' ')}>{t('branchPricing.prices.branch')}</span>
                <span className={s.arrow}>→</span>
              </>
            )}
            <span className={s.tag}>{t('branchPricing.prices.default')}</span>
          </div>
        </div>

        {service.hidePrice && (
          <div className={s.notice}>
            <EyeOff size={14} />
            <span>{t('branchPricing.prices.hiddenNote')}</span>
          </div>
        )}
        {scopedLocationId && (
          <div className={s.notice}>
            <Info size={14} />
            <span>{t('branchPricing.prices.managerNote')}</span>
          </div>
        )}

        {loading && !pricing ? (
          <div className={s.loading}>{t('common.loading')}</div>
        ) : (
          shownLocations.map(loc => {
            const d = branches[loc.id] ?? { ...emptyPrice(), offered: true, capacity: '' }
            const staff = facility ? [] : staffAt(loc.id)
            const branchPrefix = `b|${loc.id}`
            const withBranch = branchRowShown(loc.id)
            return (
              <section key={loc.id} className={[s.branch, d.offered ? '' : s.off].join(' ')}>
                {withBranch && (
                  <header className={s.branchHead}>
                    <div className={s.branchName}>
                      <MapPin size={15} />
                      <span>{loc.name}</span>
                    </div>
                    <label className={s.offered}>
                      <span>{t('branchPricing.prices.offered')}</span>
                      <Toggle checked={d.offered} onChange={v => setBranch(loc.id, { offered: v })} />
                    </label>
                  </header>
                )}

                {!d.offered ? (
                  <p className={s.offNote}>{t('branchPricing.prices.notOffered', { branch: loc.name })}</p>
                ) : (
                  <div className={s.rows}>
                    {withBranch && (
                    <div className={[s.row, s.branchRow].join(' ')}>
                      <div className={s.who}>
                        <span className={s.whoName}>{t('branchPricing.prices.branchRow')}</span>
                        <span className={s.whoHint}>
                          {d.price === '' && d.duration === '' ? t('branchPricing.prices.usesDefault') : t('branchPricing.prices.branchSet')}
                        </span>
                      </div>
                      {priceInputs(branchPrefix, d, defaultPrice, p => setBranch(loc.id, p))}
                      {durationInput(branchPrefix, d, service.duration, p => setBranch(loc.id, p))}
                      {facility && (
                        <div className={s.durationInput}>
                          <input
                            className={[s.num, s.short, invalid.has(`${branchPrefix}|capacity`) ? s.bad : ''].join(' ')}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={200}
                            value={d.capacity}
                            placeholder={String(service.capacity ?? 1)}
                            aria-label={t('branchPricing.prices.col.spots')}
                            onChange={e => setBranch(loc.id, { capacity: e.target.value })}
                          />
                          <span className={s.unit}>{t('branchPricing.prices.spots')}</span>
                        </div>
                      )}
                    </div>
                    )}

                    {!facility && staff.length === 0 && (
                      <p className={s.emptyStaff}>{t('branchPricing.prices.noSpecialists')}</p>
                    )}

                    {staff.map(sp => {
                      const key = personKey(sp.id, loc.id)
                      const pd = people[key] ?? emptyPrice()
                      const own = pd.price !== '' || pd.duration !== ''
                      return (
                        <div key={key} className={s.row}>
                          <div className={s.who}>
                            <div className={s.person}>
                              <Avatar name={sp.name} src={sp.avatarUrl} color={partner.accent} size="sm" />
                              <span className={s.whoName}>{sp.name}</span>
                              {!sp.active && <span className={s.inactive}>{t('common.inactive')}</span>}
                            </div>
                            <span className={[s.whoHint, own ? s.ownHint : ''].join(' ')}>
                              {own
                                ? t('branchPricing.prices.ownSet')
                                : branches[loc.id]?.price
                                  ? t('branchPricing.prices.usesBranch')
                                  : t('branchPricing.prices.usesDefault')}
                            </span>
                          </div>
                          {priceInputs(`p|${key}`, pd, branchPriceText(loc.id), p => setPerson(key, p))}
                          <div className={s.durationCell}>
                            {durationInput(`p|${key}`, pd, branchDuration(loc.id), p => setPerson(key, p))}
                            {own && (
                              <button type="button" className={s.reset} onClick={() => resetPerson(key)} title={t('branchPricing.prices.reset')} aria-label={t('branchPricing.prices.reset')}>
                                <RotateCcw size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })
        )}

        {/* The reassurance owners ask first: nothing already booked changes. */}
        <p className={s.footnote}>{t('branchPricing.prices.footnote')}</p>
      </div>
    </Modal>
  )
}
