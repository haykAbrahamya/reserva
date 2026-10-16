import { useState, type KeyboardEvent } from 'react'
import { ArrowRight, RotateCcw, Sparkles, X } from 'lucide-react'
import { Button, Input } from '@reserva/ui'
import { useT } from '@/i18n'
import { formatAmount } from '@/lib/formatPrice'
import { LIMITS, autoSale, digitsOf, type PromoItem } from '../../model'
import s from './PromoServices.module.scss'

interface Props {
  item: PromoItem
  discount: number
  /** Registers the name field, so the list can move focus between rows. */
  nameRef: (el: HTMLInputElement | null) => void
  onChange: (patch: Partial<Omit<PromoItem, 'id'>>) => void
  onRemove: () => void
  /** Enter in a price field: on to the next row, or a new one. */
  onNext: () => void
}

/** Both price fields take digits only, and bring up the phone's number pad. */
const NUMERIC = { inputMode: 'numeric', pattern: '[0-9]*', maxLength: LIMITS.price, enterKeyHint: 'next' } as const

/**
 * One service: its name, its usual price, and its price on offer — worked out
 * from the discount until the salon types its own. A typed figure stays put
 * when the discount changes; the reset button, or clearing the field, hands
 * it back to the discount.
 */
export function PromoServiceRow({ item, discount, nameRef, onChange, onRemove, onNext }: Props) {
  const t = useT()
  const name = item.name.trim()
  const auto = autoSale(item, discount)
  const own = item.sale !== ''

  // While the field has focus it shows exactly what is typed, even nothing on
  // the way to a new figure; away from it, the salon's figure or the worked-out one.
  const [typing, setTyping] = useState<string | null>(null)

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    onNext()
  }

  const typeSale = (value: string) => {
    const digits = digitsOf(value)
    setTyping(digits)
    // The worked-out figure typed back in is no figure of the salon's own.
    onChange({ sale: digits === auto ? '' : digits })
  }

  return (
    <li className={s.row}>
      <div className={s.name}>
        <Input
          ref={nameRef}
          value={item.name}
          maxLength={LIMITS.name}
          placeholder={t('promo.fields.serviceNamePlaceholder')}
          aria-label={t('promo.fields.serviceName')}
          enterKeyHint="next"
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div className={s.price}>
        <Input
          {...NUMERIC}
          value={item.price}
          placeholder={t('promo.fields.servicePricePlaceholder')}
          aria-label={t('promo.fields.servicePrice')}
          onKeyDown={onEnter}
          onChange={(e) => onChange({ price: digitsOf(e.target.value) })}
        />
      </div>
      <span className={s.arrow} aria-hidden="true">
        <ArrowRight size={14} />
      </span>
      <div className={[s.sale, own ? s.own : ''].filter(Boolean).join(' ')}>
        <Input
          {...NUMERIC}
          value={typing ?? (item.sale || auto)}
          placeholder={auto || '—'}
          aria-label={t('promo.fields.newPrice')}
          onFocus={() => setTyping(item.sale || auto)}
          onBlur={() => setTyping(null)}
          onKeyDown={onEnter}
          onChange={(e) => typeSale(e.target.value)}
          trailing={
            own ? (
              <button
                type="button"
                className={s.reset}
                onClick={() => {
                  setTyping(null)
                  onChange({ sale: '' })
                }}
                aria-label={
                  auto
                    ? t('promo.fields.backToAuto', { price: formatAmount({ low: Number(auto) }) })
                    : t('promo.fields.clearSale')
                }
                title={auto ? t('promo.fields.backToAutoShort') : t('promo.fields.clearSale')}
              >
                <RotateCcw size={14} />
              </button>
            ) : auto ? (
              <span className={s.auto} title={t('promo.fields.autoHint')}>
                <Sparkles size={14} />
              </span>
            ) : null
          }
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon
        className={s.remove}
        onClick={onRemove}
        aria-label={name ? t('promo.services.remove', { name }) : t('promo.services.removeUnnamed')}
        title={t('promo.services.removeUnnamed')}
      >
        <X size={16} />
      </Button>
    </li>
  )
}
