import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, ConfirmDialog } from '@reserva/ui'
import { useT } from '@/i18n'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { LIMITS, isFilled, type PriceItem } from '../../model'
import { ServiceRow } from './ServiceRow'
import s from './ServiceList.module.scss'

interface Props {
  items: PriceItem[]
  onUpdate: (id: string, patch: Partial<Omit<PriceItem, 'id'>>) => void
  /** Returns the new row's id, or null when the list is full. */
  onAdd: () => string | null
  onRemove: (id: string) => void
  onClear: () => void
}

/**
 * The services, edited as a list of rows. Typed fast, so the keyboard does the
 * work: Enter in a price moves to the next row, and on the last row it adds a
 * new one — a whole list can be entered without touching the mouse.
 */
export function ServiceList({ items, onUpdate, onAdd, onRemove, onClear }: Props) {
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
      title={t('priceList.sections.services')}
      sub={t('priceList.services.count', { count: filled, max: LIMITS.items })}
      action={
        <Button variant="ghost" size="sm" disabled={filled === 0} onClick={() => setConfirming(true)}>
          {t('priceList.services.clear')}
        </Button>
      }
    >
      <div className={s.container}>
        <div className={s.columns} aria-hidden="true">
          <span>{t('priceList.fields.serviceName')}</span>
          <span>{t('priceList.fields.servicePrice')}</span>
        </div>

        <ol className={s.list}>
          {items.map((item, index) => (
            <ServiceRow
              key={item.id}
              item={item}
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
          {t('priceList.services.add')}
        </Button>
        <p className={s.hint}>
          {full ? t('priceList.services.limit', { max: LIMITS.items }) : t('priceList.services.priceHint')}
        </p>
      </div>

      <ConfirmDialog
        open={confirming}
        variant="danger"
        title={t('priceList.services.clearTitle')}
        message={t('priceList.services.clearBody')}
        confirmLabel={t('priceList.services.clearConfirm')}
        cancelLabel={t('priceList.services.cancel')}
        onConfirm={() => {
          onClear()
          setConfirming(false)
        }}
        onClose={() => setConfirming(false)}
      />
    </ToolSection>
  )
}
