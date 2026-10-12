import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Button, Input } from '@reserva/ui'
import { useT } from '@/i18n'
import { LIMITS, type PriceItem } from '../../model'
import s from './ServiceList.module.scss'

interface Props {
  item: PriceItem
  /** Registers the name field, so the list can move focus between rows. */
  nameRef: (el: HTMLInputElement | null) => void
  onChange: (patch: Partial<Omit<PriceItem, 'id'>>) => void
  onRemove: () => void
  /** Enter in the price field: on to the next row, or a new one. */
  onNext: () => void
}

/** One service: its name, its price, and a way to remove it. */
export function ServiceRow({ item, nameRef, onChange, onRemove, onNext }: Props) {
  const t = useT()
  const name = item.name.trim()

  const onPriceKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    onNext()
  }

  return (
    <li className={s.row}>
      <div className={s.name}>
        <Input
          ref={nameRef}
          value={item.name}
          maxLength={LIMITS.name}
          placeholder={t('priceList.fields.serviceNamePlaceholder')}
          aria-label={t('priceList.fields.serviceName')}
          enterKeyHint="next"
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div className={s.price}>
        <Input
          value={item.price}
          maxLength={LIMITS.price}
          placeholder={t('priceList.fields.servicePricePlaceholder')}
          aria-label={t('priceList.fields.servicePrice')}
          enterKeyHint="next"
          onKeyDown={onPriceKey}
          onChange={(e) => onChange({ price: e.target.value })}
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon
        className={s.remove}
        onClick={onRemove}
        aria-label={name ? t('priceList.services.remove', { name }) : t('priceList.services.removeUnnamed')}
        title={t('priceList.services.removeUnnamed')}
      >
        <X size={16} />
      </Button>
    </li>
  )
}
