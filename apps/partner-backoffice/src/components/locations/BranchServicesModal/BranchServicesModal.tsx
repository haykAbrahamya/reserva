import { useEffect, useMemo, useState } from 'react'
import { Search, Waves } from 'lucide-react'
import { Modal, Button, Toggle, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { partnersService, type BranchPriceInput } from '@/services/partners.service'
import { errorMessage } from '@/utils/errors'
import { fmtServicePrice } from '@/utils/format'
import { useI18n } from '@/i18n'
import { useLocalized } from '@/i18n/useLocalized'
import type { Location, Service, ServicePriceType } from '@/types'
import s from './BranchServicesModal.module.scss'

interface Draft {
  offered: boolean
  price: string
  priceMax: string
  duration: string
  capacity: string
  priceType: ServicePriceType | null
}

const str = (n: number | null | undefined) => (n == null ? '' : String(n))
const same = (a: Draft, b: Draft) =>
  a.offered === b.offered && a.price === b.price && a.priceMax === b.priceMax &&
  a.duration === b.duration && a.capacity === b.capacity

interface Props {
  open: boolean
  location: Location | null
  onClose: () => void
}

/**
 * Everything one branch offers, on one screen: switch off what this branch
 * doesn't do (no laser machine here) and set the branch's own price or length
 * where it differs. Empty fields show the default they fall back to.
 *
 * Specialists' own prices live on the service's price screen; this one only
 * touches the branch rows, so it can never undo a specialist price.
 */
export function BranchServicesModal({ open, location, onClose }: Props) {
  const { t } = useI18n()
  const toast = useToast()
  const loc = useLocalized()
  const priceLabels = useMemo(() => ({ from: t('services.priceFrom') }), [t])

  const { data: services } = useResource(
    () => (open ? partnersService.listServices() : Promise.resolve([] as Service[])), [open], [],
  )
  const { data: pricing, loading } = useResource(
    () => (open ? partnersService.getPricing() : Promise.resolve(null)), [open], null,
  )

  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [initial, setInitial] = useState<Record<string, Draft>>({})
  const [query, setQuery] = useState('')
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!location || !pricing) return
    const next: Record<string, Draft> = {}
    for (const svc of services) {
      const row = pricing.branches.find(r => r.serviceId === svc.id && r.locationId === location.id)
      next[svc.id] = {
        offered: row?.offered ?? true,
        price: str(row?.price),
        priceMax: str(row?.priceMax),
        duration: str(row?.duration),
        capacity: str(row?.capacity),
        priceType: row?.priceType ?? null,
      }
    }
    setDrafts(next)
    setInitial(next)
    setInvalid(new Set())
    setQuery('')
  }, [location, pricing, services])

  if (!location) return null

  const q = query.trim().toLowerCase()
  const shown = services.filter(svc => !q || loc(svc.name, svc.nameI18n).toLowerCase().includes(q) || svc.name.toLowerCase().includes(q))
  const offeredCount = services.filter(svc => drafts[svc.id]?.offered ?? true).length

  const patch = (id: string, p: Partial<Draft>) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...p } }))
    setInvalid(prev => { const n = new Set(prev); Object.keys(p).forEach(k => n.delete(`${id}|${k}`)); return n })
  }

  const validate = () => {
    const bad = new Set<string>()
    for (const svc of services) {
      const d = drafts[svc.id]
      if (!d) continue
      const price = Number(d.price)
      if (d.price !== '' && (!Number.isInteger(price) || price < 0)) bad.add(`${svc.id}|price`)
      if (d.priceMax !== '' && (d.price === '' || !Number.isInteger(Number(d.priceMax)) || Number(d.priceMax) <= price)) bad.add(`${svc.id}|priceMax`)
      if (d.duration !== '' && (!Number.isInteger(Number(d.duration)) || Number(d.duration) < 5 || Number(d.duration) > 600)) bad.add(`${svc.id}|duration`)
      if (d.capacity !== '' && (!Number.isInteger(Number(d.capacity)) || Number(d.capacity) < 1 || Number(d.capacity) > 200)) bad.add(`${svc.id}|capacity`)
    }
    return bad
  }

  const handleSave = async () => {
    if (saving) return
    const bad = validate()
    setInvalid(bad)
    if (bad.size) { toast(t('branchPricing.prices.fixFields')); return }
    const changed = services.filter(svc => drafts[svc.id] && initial[svc.id] && !same(drafts[svc.id], initial[svc.id]))
    if (changed.length === 0) { onClose(); return }

    setSaving(true)
    try {
      // One request per changed service, each touching ONLY this branch's row.
      for (const svc of changed) {
        const d = drafts[svc.id]
        const priced = d.price !== ''
        const type: ServicePriceType = d.priceType ?? svc.priceType ?? 'fixed'
        const row: BranchPriceInput = {
          locationId: location.id,
          offered: d.offered,
          priceType: priced ? type : null,
          price: priced ? Number(d.price) : null,
          priceMax: priced && type === 'range' && d.priceMax !== '' ? Number(d.priceMax) : null,
          duration: d.duration !== '' ? Number(d.duration) : null,
          capacity: svc.requiresSpecialist === false && d.capacity !== '' ? Number(d.capacity) : null,
        }
        await partnersService.saveServicePricing(svc.id, { branches: [row] }, location.id)
      }
      toast(t('branchPricing.prices.saved'))
      onClose()
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('branchPricing.branch.title', { branch: loc(location.name, location.nameI18n) })}
      subtitle={t('branchPricing.branch.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="accent" onClick={handleSave} disabled={saving || loading}>
            {saving ? t('common.saving') : t('branchPricing.prices.save')}
          </Button>
        </>
      }
    >
      <div className={s.wrap}>
        <div className={s.toolbar}>
          <div className={s.search}>
            <Search size={14} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('branchPricing.branch.search')}
              aria-label={t('branchPricing.branch.search')}
            />
          </div>
          <span className={s.count}>{t('branchPricing.branch.offeredCount', { n: offeredCount, total: services.length })}</span>
        </div>

        {loading && !pricing ? (
          <div className={s.loading}>{t('common.loading')}</div>
        ) : (
          <div className={s.list}>
            <div className={[s.row, s.head].join(' ')} aria-hidden>
              <span>{t('branchPricing.prices.col.service')}</span>
              <span>{t('branchPricing.prices.offered')}</span>
              <span>{t('branchPricing.prices.col.price')}</span>
              <span>{t('branchPricing.prices.col.duration')}</span>
            </div>
            {shown.map(svc => {
              const d = drafts[svc.id]
              if (!d) return null
              const facility = svc.requiresSpecialist === false
              const range = (d.priceType ?? svc.priceType) === 'range'
              const bad = (k: string) => (invalid.has(`${svc.id}|${k}`) ? s.bad : '')
              return (
                <div key={svc.id} className={[s.row, d.offered ? '' : s.off].join(' ')}>
                  <div className={s.name}>
                    <span className={s.nameText}>{loc(svc.name, svc.nameI18n)}</span>
                    {facility && <span className={s.facility}><Waves size={10} /> {t('services.capacityShort', { n: svc.capacity ?? 1 })}</span>}
                  </div>
                  <div className={s.toggle}>
                    <Toggle checked={d.offered} onChange={v => patch(svc.id, { offered: v })} />
                  </div>
                  <div className={s.prices}>
                    <input
                      className={[s.num, bad('price')].join(' ')}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={d.price}
                      disabled={!d.offered}
                      placeholder={fmtServicePrice({ ...svc, hidePrice: false }, priceLabels)}
                      aria-label={t('branchPricing.prices.col.price')}
                      onChange={e => patch(svc.id, { price: e.target.value })}
                    />
                    {range && (
                      <>
                        <span className={s.dash}>–</span>
                        <input
                          className={[s.num, bad('priceMax')].join(' ')}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={d.priceMax}
                          disabled={!d.offered || d.price === ''}
                          placeholder={t('branchPricing.prices.to')}
                          aria-label={t('branchPricing.prices.to')}
                          onChange={e => patch(svc.id, { priceMax: e.target.value })}
                        />
                      </>
                    )}
                  </div>
                  <div className={s.minutes}>
                    <input
                      className={[s.num, s.short, bad('duration')].join(' ')}
                      type="number"
                      inputMode="numeric"
                      min={5}
                      max={600}
                      value={d.duration}
                      disabled={!d.offered}
                      placeholder={String(svc.duration)}
                      aria-label={t('branchPricing.prices.col.duration')}
                      onChange={e => patch(svc.id, { duration: e.target.value })}
                    />
                    <span className={s.unit}>{t('branchPricing.prices.min')}</span>
                    {facility && (
                      <>
                        <input
                          className={[s.num, s.short, bad('capacity')].join(' ')}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={200}
                          value={d.capacity}
                          disabled={!d.offered}
                          placeholder={String(svc.capacity ?? 1)}
                          aria-label={t('branchPricing.prices.col.spots')}
                          onChange={e => patch(svc.id, { capacity: e.target.value })}
                        />
                        <span className={s.unit}>{t('branchPricing.prices.spots')}</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
            {shown.length === 0 && <div className={s.loading}>{t('branchPricing.branch.noMatch')}</div>}
          </div>
        )}
        <p className={s.footnote}>{t('branchPricing.branch.footnote')}</p>
      </div>
    </Modal>
  )
}
