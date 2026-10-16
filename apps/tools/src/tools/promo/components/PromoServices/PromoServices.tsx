import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, ConfirmDialog } from '@reserva/ui'
import { useT } from '@/i18n'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { LIMITS, isFilled, type PromoItem } from '../../model'
import { PromoServiceRow } from './PromoServiceRow'
import s from './PromoServices.module.scss'

interface Props {
  items: PromoItem[]
  discount: number
  onUpdate: (id: string, patch: Partial<Omit<PromoItem, 'id'>>) => void
  /** Returns the new row's id, or null when the list is full. */
  onAdd: () => string | null
  onRemove: (id: string) => void
  onClear: () => void
}

/**
 * The services on offer: each at its usual price, and its price on offer —
 * worked out from the discount as the usual one is typed, or the salon's own.
 * Keyboard as in the price list: Enter in a price moves to the next row, and
 * on the last row adds one.
 */
export function PromoServices({ items, discount, onUpdate, onAdd, onRemove, onClear }: Props) {
  const t = useT()
  const [confirming, setConfirming] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const nameInputs = useRef(new Map<string, HTMLInputElement>())

  const full = items.length >= LIMITS.items
  const filled = items.filter(isFilled).length

  // Focus a row once it has rendered — a just-added row does not exist yet in
  // the same tick that asked for it.
  useEffect(() => {
    if (!focusId) return
    nameInputs.current.get(focusId)?.focus()
    setFocusId(null)
  }, [focusId, items])

  const add = () => {
    const id = onAdd()
    if (id) setFocusId(id)
  }

  const next = (index: number) => {
    const following = items[index + 1]
    if (following) nameInputs.current.get(following.id)?.focus()
    else add()
  }

  const registerName = (id: string) => (el: HTMLInputElement | null) => {
    if (el) nameInputs.current.set(id, el)
    else nameInputs.current.delete(id)
  }

  return (
    <ToolSection
      title={t('promo.sections.services')}
      sub={t('promo.services.count', { count: filled, max: LIMITS.items })}
      action={
        <Button variant="ghost" size="sm" disabled={filled === 0} onClick={() => setConfirming(true)}>
          {t('promo.services.clear')}
        </Button>
      }
    >
      <div className={s.container}>
        <div className={s.columns} aria-hidden="true">
          <span>{t('promo.fields.serviceName')}</span>
          <span className={s.wideLabel}>{t('promo.fields.servicePrice')}</span>
          <span>{t('promo.fields.newPrice')}</span>
        </div>

        <ol className={s.list}>
          {items.map((item, index) => (
            <PromoServiceRow
              key={item.id}
              item={item}
              discount={discount}
              nameRef={registerName(item.id)}
              onChange={(patch) => onUpdate(item.id, patch)}
              onRemove={() => onRemove(item.id)}
              onNext={() => next(index)}
            />
          ))}
        </ol>
      </div>

      <div className={s.footer}>
        <Button onClick={add} disabled={full} className={s.add}>
          <Plus size={16} />
          {t('promo.services.add')}
        </Button>
        <p className={s.hint}>
          {full ? t('promo.services.limit', { max: LIMITS.items }) : t('promo.services.hint')}
        </p>
      </div>

      <ConfirmDialog
        open={confirming}
        variant="danger"
        title={t('promo.services.clearTitle')}
        message={t('promo.services.clearBody')}
        confirmLabel={t('promo.services.clearConfirm')}
        cancelLabel={t('promo.services.cancel')}
        onConfirm={() => {
          onClear()
          setConfirming(false)
        }}
        onClose={() => setConfirming(false)}
      />
    </ToolSection>
  )
}
