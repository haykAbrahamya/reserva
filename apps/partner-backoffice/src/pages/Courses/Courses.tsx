import { useState } from 'react'
import { GraduationCap, Plus } from 'lucide-react'
import { usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { Button, Empty, ConfirmDialog, useToast } from '@/components/ui'
import { partnersService } from '@/services/partners.service'
import { coursesService, type CourseInput } from '@/services/courses.service'
import { errorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n'
import type { Course } from '@/types'
import { CourseCard } from './components/CourseCard'
import { CourseEditorModal } from './components/CourseEditorModal'
import { CourseDetailModal } from './components/CourseDetailModal'
import s from './Courses.module.scss'

/**
 * Courses page — a salon's academy. Lists courses as cards; opening one manages
 * its current run + members; editing opens the course editor. Orchestration only
 * (data + modal wiring) — every piece of UI is its own small component.
 */
export function Courses() {
  const partner = usePartner()
  const { t, tp } = useI18n()
  const toast = useToast()

  const { data: courses, reload } = useResource(() => coursesService.list(true), [], [])
  // Specialists (for the tutor picker) + locations (for the run's branch).
  const { data: specialists } = useResource(() => partnersService.listSpecialists(), [], [])
  const { data: locations } = useResource(() => partnersService.listLocations(), [], [])

  const [editing, setEditing] = useState<Course | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [detail, setDetail] = useState<Course | null>(null)
  const [confirmDel, setConfirmDel] = useState<Course | null>(null)
  const [saving, setSaving] = useState(false)

  if (!partner) return null

  const openNew = () => { setEditing(null); setEditorOpen(true) }
  const openEdit = (course: Course) => { setEditing(course); setEditorOpen(true) }

  const saveCourse = async (data: CourseInput, cover: { file: File | null; cleared: boolean }) => {
    setSaving(true)
    try {
      const saved = editing
        ? await coursesService.update(editing.id, data)
        : await coursesService.create(data)
      // Commit the staged cover after the course id exists.
      if (cover.file) await coursesService.uploadCover(saved.id, cover.file)
      else if (cover.cleared && editing?.coverUrl) await coursesService.removeCover(saved.id)

      await reload()
      setEditorOpen(false)
      setEditing(null)
      toast(editing ? t('courses.updatedToast') : t('courses.createdToast'))
    } catch (err) { toast(errorMessage(err, t)) } finally { setSaving(false) }
  }

  const del = async () => {
    if (!confirmDel) return
    try {
      await coursesService.remove(confirmDel.id)
      await reload()
      toast(t('courses.removedToast'))
    } catch (err) { toast(errorMessage(err, t)); return } finally { setConfirmDel(null) }
  }

  const total = courses.length

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{t('courses.title')}</h1>
          <p className={s.sub}>{tp('courses.subtitle', total, { count: total })}</p>
        </div>
        <Button variant="accent" onClick={openNew}><Plus size={14} /> {t('courses.addCourse')}</Button>
      </div>

      {total === 0 ? (
        <Empty
          icon={GraduationCap}
          title={t('courses.emptyTitle')}
          description={t('courses.emptyDesc')}
          action={<Button variant="accent" onClick={openNew}><Plus size={14} /> {t('courses.addCourse')}</Button>}
        />
      ) : (
        <div className={s.grid}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onOpen={() => setDetail(course)}
              onEdit={() => openEdit(course)}
              onDelete={() => setConfirmDel(course)}
            />
          ))}
        </div>
      )}

      {editorOpen && (
        <CourseEditorModal
          course={editing}
          specialists={specialists}
          saving={saving}
          onClose={() => { setEditorOpen(false); setEditing(null) }}
          onSubmit={saveCourse}
        />
      )}

      {detail && (
        <CourseDetailModal
          course={detail}
          locations={locations}
          onClose={() => setDetail(null)}
          onChanged={reload}
        />
      )}

      <ConfirmDialog
        open={!!confirmDel}
        title={t('courses.delete.title')}
        message={t('courses.delete.body', { name: confirmDel?.title ?? '' })}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={del}
        onClose={() => setConfirmDel(null)}
      />
    </div>
  )
}
