import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Modal } from '@/components/ui'
import { useI18n } from '@/i18n'
import { useActiveProduct, useGrantedProducts, useSwitchProduct } from '@/products/useProducts'
import { productDef, FALLBACK_PRODUCT_ICON, type ProductKey } from '@/products/products.config'
import s from './ProductSwitcher.module.scss'

/**
 * Switches the console between the products this organization holds.
 *
 * Renders NOTHING for a partner with a single product — the overwhelming
 * majority today. A control that can only do one thing is noise, and hiding it
 * means existing partners see no change at all until the day they take a second
 * product.
 */
export function ProductSwitcher({ collapsed }: { collapsed?: boolean }) {
  const products = useGrantedProducts()
  const active = useActiveProduct()
  const switchTo = useSwitchProduct()
  const { t } = useI18n()

  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Dismiss on outside click or Escape — a popover you cannot close without
  // choosing something is a trap.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (products.length < 2 || !active) return null

  const current = productDef(active)
  const CurrentIcon = current?.icon ?? FALLBACK_PRODUCT_ICON

  const pick = (key: ProductKey) => {
    setOpen(false)
    if (key !== active) switchTo(key)
  }

  return (
    <div className={[s.wrap, collapsed ? s.collapsed : ''].filter(Boolean).join(' ')} ref={wrapRef}>
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={collapsed ? t('products.switch') : undefined}
      >
        <span className={s.triggerIcon}><CurrentIcon size={15} /></span>
        {!collapsed && (
          <>
            <span className={s.triggerName}>{current ? t(current.labelKey) : active}</span>
            <ChevronsUpDown size={13} className={s.chev} />
          </>
        )}
      </button>

      {open && (
        <div className={s.menu} role="listbox" aria-label={t('products.switch')}>
          {products.map((p) => {
            const Icon = p.icon
            const isActive = p.key === active
            return (
              <button
                key={p.key}
                type="button"
                role="option"
                aria-selected={isActive}
                className={[s.option, isActive ? s.optionActive : ''].filter(Boolean).join(' ')}
                onClick={() => pick(p.key)}
              >
                <span className={s.optionIcon}><Icon size={16} /></span>
                <span className={s.optionName}>{t(p.labelKey)}</span>
                {isActive && <Check size={14} className={s.optionCheck} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * The product list inside the mobile sheet.
 *
 * Rows rather than the horizontal pills this replaced: with three products the
 * pill row scrolled, and the ACTIVE pill was the one clipped at the right edge
 * — precisely the one that has to be readable. Rows cannot clip and give a
 * full-width tap target.
 */
function ProductSwitcherRows({ onPick }: { onPick?: () => void }) {
  const products = useGrantedProducts()
  const active = useActiveProduct()
  const switchTo = useSwitchProduct()
  const { t } = useI18n()

  if (products.length < 2 || !active) return null

  return (
    <div className={s.rows}>
      {products.map((p) => {
        const Icon = p.icon
        const isActive = p.key === active
        return (
          <button
            key={p.key}
            type="button"
            aria-current={isActive}
            className={[s.row, isActive ? s.rowActive : ''].filter(Boolean).join(' ')}
            onClick={() => {
              if (p.key !== active) switchTo(p.key)
              onPick?.()
            }}
          >
            <span className={s.rowIcon}><Icon size={17} /></span>
            <span className={s.rowName}>{t(p.labelKey)}</span>
            {isActive && <Check size={15} className={s.rowCheck} />}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The mobile product switcher: a full-width context strip under the topbar.
 *
 * It began as a chip inside the topbar, which does not fit: at 390px that row's
 * content budget is 308px and the logo, language, theme, bell and avatar
 * already consume all of it, leaving ~40px of label — every product name
 * truncated to two characters.
 *
 * A strip has the whole width instead, so the name never truncates, it answers
 * "which product am I in?" without opening anything, and switching is one tap
 * from any screen. It sits directly above the public-link bar and matches its
 * height, so the two read as one band of context rather than two designs.
 *
 * The sheet is the shared Modal, which already renders as a bottom sheet on
 * mobile (drag-to-dismiss included) — no second sheet implementation.
 */
export function ProductSwitcherHeader() {
  const products = useGrantedProducts()
  const active = useActiveProduct()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  if (products.length < 2 || !active) return null

  const current = productDef(active)
  const CurrentIcon = current?.icon ?? FALLBACK_PRODUCT_ICON

  return (
    <>
      <button
        type="button"
        className={s.bar}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t('products.switch')}
      >
        <span className={s.barIcon}><CurrentIcon size={15} /></span>
        <span className={s.barName}>{current ? t(current.labelKey) : active}</span>
        <ChevronsUpDown size={14} className={s.barChev} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t('products.switch')}>
        <ProductSwitcherRows onPick={() => setOpen(false)} />
      </Modal>
    </>
  )
}
