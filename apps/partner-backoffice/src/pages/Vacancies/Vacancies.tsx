import { useState } from 'react'
import { Briefcase, Plus, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Empty, ConfirmDialog, SegmentedFilter, Pagination, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { partnersService } from '@/services/partners.service'
import {
  vacanciesService, specialtiesService,
  type Vacancy, type VacancyInput, type VacancyAction, type VacancyStatus,
} from '@/services/vacancies.service'
import { errorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n'
import { VacancyCard } from './components/VacancyCard'
import { VacancyEditorModal } from './components/VacancyEditorModal'
import s from './Vacancies.module.scss'

const PAGE_SIZE = 12

type StatusFilter = 'all' | VacancyStatus

/** Order the chips by how often they are wanted, not by the enum. */
const FILTERS: StatusFilter[] = ['all', 'published', 'draft', 'paused', 'expired', 'closed']

/**
 * The Vacancies page — a partner's open positions, chair rentals and commission
 * places.
 *
 * Orchestration only: data, filters and modal wiring. The card and the editor
 * are their own components, matching how Courses is structured.
 */
export function Vacancies() {
  const { t, tp } = useI18n()
  const toast = useToast()

  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Vacancy | null>(null)
  const [confirmDel, setConfirmDel] = useState<Vacancy | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data, loading, reload } = useResource(
    () => vacanciesService.list({ status, page, pageSize: PAGE_SIZE }),
    [status, page],
  )
  const { data: counts, reload: reloadCounts } = useResource(() => vacanciesService.counts(), [], {})
  // The catalog and the branches change rarely — fetched once for the editor.
  const { data: groups } = useResource(() => specialtiesService.catalog(), [], [])
  const { data: locations } = useResource(() => partnersService.listLocations(), [], [])

  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = data?.pageCount ?? 1

  const refresh = async () => {
    await Promise.all([reload(), reloadCounts()])
  }

  const openNew = () => { setEditing(null); setEditorOpen(true) }
  const openEdit = (v: Vacancy) => { setEditing(v); setEditorOpen(true) }

  const save = async (input: VacancyInput) => {
    setSaving(true)
    try {
      if (editing) await vacanciesService.update(editing.id, input)
      else await vacanciesService.create(input)
      await refresh()
      setEditorOpen(false)
      setEditing(null)
      toast(editing ? t('vacancies.updatedToast') : t('vacancies.createdToast'))
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSaving(false)
    }
  }

  const act = async (v: Vacancy, action: VacancyAction) => {
    setBusyId(v.id)
    try {
      await vacanciesService.act(v.id, action)
      await refresh()
      toast(t(`vacancies.toast.${action}`))
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setBusyId(null)
    }
  }

  const del = async () => {
    if (!confirmDel) return
    try {
      await vacanciesService.remove(confirmDel.id)
      await refresh()
      toast(t('vacancies.removedToast'))
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setConfirmDel(null)
    }
  }

  // Changing the filter must reset paging, or "page 3 of published" silently
  // shows an empty page when the new filter has fewer results.
  const changeFilter = (next: StatusFilter) => {
    setStatus(next)
    setPage(1)
  }

  const hasAny = (counts.all ?? 0) > 0
  const noBranches = locations.length === 0

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('vacancies.title')}</h1>
          <p className={s.sub}>
            {hasAny ? tp('vacancies.subtitle', counts.all ?? 0, { count: counts.all ?? 0 }) : t('vacancies.subtitleEmpty')}
          </p>
        </div>
        <Button variant="accent" onClick={openNew} disabled={noBranches}>
          <Plus size={14} /> {t('vacancies.new')}
        </Button>
      </div>

      {/* A partner with no branch cannot post at all — Location is
          organization-level and every listing anchors to one. Say so once, at
          the top, with the way to fix it. */}
      {noBranches && (
        <div className={s.blocker}>
          <span className={s.blockerIcon}><MapPin size={16} /></span>
          <div>
            <div className={s.blockerTitle}>{t('vacancies.noBranchTitle')}</div>
            <p className={s.blockerText}>{t('vacancies.noBranchText')}</p>
          </div>
          <Link to="/locations" className={s.blockerLink}>{t('vacancies.noBranchCta')}</Link>
        </div>
      )}

      {hasAny && (
        <div className={s.filters}>
          <SegmentedFilter
            value={status}
            onChange={(v) => changeFilter(v as StatusFilter)}
            ariaLabel={t('vacancies.filterLabel')}
            options={FILTERS.map((f) => ({
              value: f,
              label: f === 'all' ? t('common.all') : t(`vacancies.status.${f}`),
              count: counts[f] ?? 0,
            }))}
          />
        </div>
      )}

      {!loading && rows.length === 0 ? (
        <Empty
          icon={Briefcase}
          title={hasAny ? t('vacancies.emptyFilterTitle') : t('vacancies.emptyTitle')}
          description={hasAny ? t('vacancies.emptyFilterDesc') : t('vacancies.emptyDesc')}
          action={
            hasAny ? undefined : (
              <Button variant="accent" onClick={openNew} disabled={noBranches}>
                <Plus size={14} /> {t('vacancies.new')}
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className={s.grid}>
            {rows.map((v) => (
              <VacancyCard
                key={v.id}
                vacancy={v}
                busy={busyId === v.id}
                onEdit={openEdit}
                onAction={act}
                onDelete={setConfirmDel}
              />
            ))}
          </div>

          {pageCount > 1 && (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              summary={t('vacancies.pageSummary', { shown: rows.length, total })}
            />
          )}
        </>
      )}

      <VacancyEditorModal
        open={editorOpen}
        editing={editing}
        groups={groups}
        locations={locations}
        saving={saving}
        onClose={() => { setEditorOpen(false); setEditing(null) }}
        onSave={save}
      />

      <ConfirmDialog
        open={!!confirmDel}
        title={t('vacancies.deleteTitle')}
        message={t('vacancies.deleteMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={del}
        onClose={() => setConfirmDel(null)}
      />
    </div>
  )
}
