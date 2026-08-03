import { useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { Modal, Button, useToast } from '@/components/ui'
import { partnersService } from '@/services/partners.service'
import { errorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n'
import type { Service } from '@/types'
import s from './ReorderServicesModal.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful save so the page can reload its list. */
  onSaved: () => void
}

/**
 * Dedicated drag-to-reorder popup for a partner's services. Sidesteps the
 * paginated table by loading EVERY service unpaginated (`all: true`) into one
 * flat, scrollable list. Desktop: grab the handle and drag. Mobile: tap the
 * ▲ ▼ buttons. Nothing persists until "Save order" — a single batch request
 * with the full ordered id list. Cancel discards.
 */
export function ReorderServicesModal({ open, onClose, onSaved }: Props) {
  const { t } = useI18n()
  const toast = useToast()

  const [items, setItems] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const dragIndex = useRef<number | null>(null)

  // Snapshot of the order we loaded, to detect "did anything actually change".
  const [initialIds, setInitialIds] = useState<string[]>([])

  // Load all services fresh each time the modal opens.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    partnersService
      .listServices({ includeInactive: true })
      .then((all) => {
        if (cancelled) return
        setItems(all)
        setInitialIds(all.map((x) => x.id))
      })
      .catch((err) => { if (!cancelled) toast(errorMessage(err, t)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, t, toast])

  const changed = useMemo(
    () => items.some((it, i) => it.id !== initialIds[i]),
    [items, initialIds],
  )

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return
    setItems((list) => {
      const next = [...list]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  // ── Native HTML5 drag (desktop). Reorder live as you drag over a row. ──
  const onDragStart = (i: number) => { dragIndex.current = i }
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === i) return
    move(from, i)
    dragIndex.current = i
  }
  const onDragEnd = () => { dragIndex.current = null }

  const save = async () => {
    if (!changed || saving) return
    setSaving(true)
    try {
      await partnersService.reorderServices(items.map((it) => it.id))
      onSaved()
      toast(t('services.reorder.saved'))
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
      onClose={saving ? () => undefined : onClose}
      title={t('services.reorder.title')}
      subtitle={t('services.reorder.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="accent" onClick={save} disabled={!changed || saving}>
            {saving ? t('services.reorder.saving') : t('services.reorder.save')}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className={s.state}>{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className={s.state}>{t('services.reorder.empty')}</div>
      ) : (
        <ul className={s.list}>
          {items.map((it, i) => (
            <li
              key={it.id}
              className={s.row}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={onDragEnd}
            >
              <span className={s.handle} aria-hidden="true"><GripVertical size={18} /></span>
              <span className={s.pos}>{i + 1}</span>
              <span className={s.name} title={it.name}>
                {it.name}
                {!it.active && <span className={s.inactive}>{t('services.reorder.inactive')}</span>}
              </span>
              <span className={s.arrows}>
                <button
                  type="button"
                  className={s.arrowBtn}
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={t('services.reorder.moveUp')}
                >
                  <ChevronUp size={17} />
                </button>
                <button
                  type="button"
                  className={s.arrowBtn}
                  onClick={() => move(i, i + 1)}
                  disabled={i === items.length - 1}
                  aria-label={t('services.reorder.moveDown')}
                >
                  <ChevronDown size={17} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
