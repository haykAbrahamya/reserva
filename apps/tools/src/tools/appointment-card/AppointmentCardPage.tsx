import { useMemo } from 'react'
import { Textarea } from '@reserva/ui'
import { useI18n, useT } from '@/i18n'
import { BookingPitch } from '@/components/tools/BookingPitch/BookingPitch'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { ToolLayout } from '@/layouts/ToolLayout/ToolLayout'
import { ToolWorkspace } from '@/layouts/ToolWorkspace/ToolWorkspace'
import { toolById } from '@/tools/registry'
import { SalonFields } from './components/SalonFields/SalonFields'
import { ShareActions } from './components/ShareActions/ShareActions'
import { VisitCard } from './components/VisitCard/VisitCard'
import { VisitFields } from './components/VisitFields/VisitFields'
import { LIMITS, isComplete } from './model'
import { useAppointmentDraft } from './useAppointmentDraft'
import type { Visit } from './visitLink'
import s from './AppointmentCardPage.module.scss'

const tool = toolById('appointmentCard')

/**
 * Appointment card: the salon fills in a visit once, and sends the client a
 * link to a card with everything for the day — no app, no account, no server.
 */
export function AppointmentCardPage() {
  const t = useT()
  const { locale } = useI18n()
  const { draft, setField } = useAppointmentDraft(locale)
  const visit = useMemo<Visit>(() => ({ ...draft, locale }), [draft, locale])

  return (
    <ToolLayout tool={tool}>
      <ToolWorkspace
        editor={
          <>
            <ToolSection title={t('appointmentCard.sections.visit')}>
              <VisitFields draft={draft} onChange={setField} />
            </ToolSection>
            <ToolSection title={t('appointmentCard.sections.salon')} sub={t('appointmentCard.salonHint')}>
              <SalonFields draft={draft} onChange={setField} />
            </ToolSection>
            <ToolSection title={t('appointmentCard.sections.note')}>
              <Textarea
                value={draft.note}
                maxLength={LIMITS.note}
                rows={2}
                aria-label={t('appointmentCard.sections.note')}
                placeholder={t('appointmentCard.fields.notePlaceholder')}
                onChange={(e) => setField('note', e.target.value)}
              />
            </ToolSection>
          </>
        }
        preview={
          <>
            <p className={s.caption}>{t('appointmentCard.preview')}</p>
            <VisitCard visit={visit} />
            <ShareActions visit={visit} complete={isComplete(draft)} />
          </>
        }
        footer={
          <BookingPitch
            title={t('appointmentCard.pitch.title')}
            body={t('appointmentCard.pitch.body')}
            source="appointment-card"
          />
        }
      />
    </ToolLayout>
  )
}
