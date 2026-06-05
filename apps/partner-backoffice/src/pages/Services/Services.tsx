import { useState, useEffect } from 'react'
import { Plus, Sparkles, Pencil, Clock, Scissors } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { Button, Table, Th, Td, Tr, Toggle, Modal, Input, Empty, Pagination, usePagination } from '@/components/ui'
import { fmtAMD, fmtDuration } from '@/utils/format'
import { partnersService } from '@/services/partners.service'
import { useI18n } from '@/i18n'
import type { Service } from '@/types'
import s from './Services.module.scss'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

const EMPTY_FORM = { name: '', price: '', duration: '', category: '', active: true }

export function Services() {
  const partner     = usePartner()
  const setPartners = useAppStore(st => st.setPartners)
  const isMobile    = useIsMobile()
  const { t, tp }   = useI18n()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]   = useState<Service | null>(null)
  const [form,      setForm]      = useState(EMPTY_FORM)

  // Desktop pagination over the service list (mobile uses category cards).
  const { pageItems: pagedServices, page, pageCount, setPage, pageSize, setPageSize, from, to, total } =
    usePagination(partner?.services ?? [])

  if (!partner) return null

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (svc: Service) => {
    setEditing(svc)
    setForm({ name: svc.name, price: String(svc.price), duration: String(svc.duration), category: svc.category, active: svc.active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const data = { name: form.name, price: Number(form.price), duration: Number(form.duration), category: form.category, active: form.active }
    if (editing) await partnersService.updateService(partner.id, editing.id, data)
    else         await partnersService.createService(partner.id, data)
    setPartners(await partnersService.list())
    setModalOpen(false)
  }

  const handleToggleActive = async (svc: Service) => {
    await partnersService.updateService(partner.id, svc.id, { active: !svc.active })
    setPartners(await partnersService.list())
  }

  // Group by category for mobile
  const grouped = partner.services.reduce<Record<string, Service[]>>((acc, svc) => {
    const cat = svc.category || t('services.otherCategory')
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('services.title')}</h1>
          <p className={s.sub}>{tp('services.subtitle', partner.services.length, { name: partner.name })}</p>
        </div>
        <Button variant="accent" onClick={openNew}><Plus size={14} /> {t('services.addService')}</Button>
      </div>

      {partner.services.length === 0 ? (
        <Empty icon={Sparkles} title={t('services.emptyTitle')} description={t('services.emptyDesc')}
          action={<Button variant="accent" onClick={openNew}><Plus size={14} /> {t('services.addService')}</Button>}
        />
      ) : isMobile ? (
        /* ── Mobile: grouped cards ── */
        <div className={s.groupList}>
          {Object.entries(grouped).map(([cat, svcs]) => (
            <div key={cat}>
              <div className={s.groupLabel}>{cat}</div>
              <div className={s.cardList}>
                {svcs.map(svc => (
                  <div key={svc.id} className={s.svcCard} onClick={() => openEdit(svc)}>
                    <div className={s.svcIconWrap}>
                      <Scissors size={18} />
                    </div>
                    <div className={s.svcCardBody}>
                      <div className={s.svcCardName}>{svc.name}</div>
                      <div className={s.svcCardMeta}>
                        <Clock size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {fmtDuration(svc.duration)}
                      </div>
                    </div>
                    <div className={s.svcCardRight}>
                      <span className={s.svcCardPrice}>{fmtAMD(svc.price)}</span>
                      <Toggle
                        checked={svc.active}
                        onChange={e => { e; handleToggleActive(svc) }}
                        disabled={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Desktop: table ── */
        <div className={s.tableWrap}>
          <Table>
            <thead>
              <tr>
                <Th>{t('services.col.name')}</Th>
                <Th>{t('services.col.category')}</Th>
                <Th>{t('services.col.duration')}</Th>
                <Th>{t('services.col.price')}</Th>
                <Th>{t('services.col.active')}</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {pagedServices.map(svc => (
                <Tr key={svc.id}>
                  <Td><span className={s.svcName}>{svc.name}</span></Td>
                  <Td><span className={s.category}>{svc.category}</span></Td>
                  <Td><span className={s.duration}>{fmtDuration(svc.duration)}</span></Td>
                  <Td><span className={s.price}>{fmtAMD(svc.price)}</span></Td>
                  <Td><Toggle checked={svc.active} onChange={() => handleToggleActive(svc)} /></Td>
                  <Td>
                    <Button variant="ghost" size="sm" icon onClick={e => { e.stopPropagation(); openEdit(svc) }}>
                      <Pencil size={13} />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeLabel={t('pagination.perPage')}
            summary={t('pagination.summary', { from, to, total })}
          />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('services.modal.editTitle') : t('services.modal.newTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="accent" onClick={handleSave}>{t('services.modal.save')}</Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <div className={s.formFull}>
            <Input label={t('services.modal.nameLabel')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('services.modal.namePlaceholder')} />
          </div>
          <Input label={t('services.modal.priceLabel')} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder={t('services.modal.pricePlaceholder')} />
          <Input label={t('services.modal.durationLabel')} type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder={t('services.modal.durationPlaceholder')} />
          <div className={s.formFull}>
            <Input label={t('services.modal.categoryLabel')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder={t('services.modal.categoryPlaceholder')} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} />
            <span style={{ fontSize: 13 }}>{t('services.modal.active')}</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
