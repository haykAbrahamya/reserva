import { useCallback, useMemo } from 'react'
import { Input } from '@reserva/ui'
import { useI18n, useT } from '@/i18n'
import { BookingPitch } from '@/components/tools/BookingPitch/BookingPitch'
import { BrandFields } from '@/components/tools/BrandFields/BrandFields'
import { CanvasPreview } from '@/components/tools/CanvasPreview/CanvasPreview'
import { ExportActions } from '@/components/tools/ExportActions/ExportActions'
import { ThemePicker } from '@/components/tools/ThemePicker/ThemePicker'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { ToolLayout } from '@/layouts/ToolLayout/ToolLayout'
import { ToolWorkspace } from '@/layouts/ToolWorkspace/ToolWorkspace'
import { loadFonts } from '@/lib/canvas/fonts'
import { useCanvasFile } from '@/lib/canvas/useCanvasFile'
import { formatLongDay, useCalendarWords } from '@/lib/dates'
import { fileNameFor } from '@/lib/fileName'
import { STORY } from '@/lib/story/size'
import { themeById } from '@/lib/story/themes'
import { toolById } from '@/tools/registry'
import { DayPicker } from './components/DayPicker/DayPicker'
import { SlotGrid } from './components/SlotGrid/SlotGrid'
import { FREE_SLOTS_FONTS, drawFreeSlots } from './drawFreeSlots'
import { LIMITS, draftText } from './model'
import { useFreeSlotsDraft } from './useFreeSlotsDraft'
import s from './FreeSlotsPage.module.scss'

const tool = toolById('freeSlots')

/** Free slots: tap the open times, post a story clients can book from. */
export function FreeSlotsPage() {
  const t = useT()
  const { locale } = useI18n()
  const { draft, setBrand, setTheme, setDate, setNote, toggleSlot, clearSlots } = useFreeSlotsDraft(locale)

  const words = useCalendarWords()
  const theme = themeById(draft.themeId)
  const dayLine = formatLongDay(draft.date, words)
  const text = useMemo(() => draftText(draft, dayLine), [draft, dayLine])

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => drawFreeSlots(ctx, draft, theme, dayLine),
    [draft, theme, dayLine],
  )
  const prepare = useCallback(() => loadFonts(FREE_SLOTS_FONTS, text), [text])

  const { getFile, ready } = useCanvasFile({
    width: STORY.width,
    height: STORY.height,
    draw,
    prepare,
    fileName: fileNameFor('free-slots', draft.title),
  })

  return (
    <ToolLayout tool={tool}>
      <ToolWorkspace
        editor={
          <>
            <ToolSection title={t('editor.style')}>
              <ThemePicker value={draft.themeId} onChange={setTheme} label={t('editor.style')} />
            </ToolSection>
            <ToolSection title={t('freeSlots.sections.day')}>
              <DayPicker value={draft.date} onChange={setDate} />
            </ToolSection>
            <SlotGrid slots={draft.slots} onToggle={toggleSlot} onClear={clearSlots} />
            <ToolSection title={t('editor.details')}>
              <BrandFields
                value={draft}
                onChange={setBrand}
                headingPlaceholder={t('freeSlots.headingPlaceholder')}
              />
              <div className={s.note}>
                <Input
                  label={t('freeSlots.note.label')}
                  value={draft.note}
                  maxLength={LIMITS.note}
                  placeholder={t('freeSlots.note.placeholder')}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </ToolSection>
          </>
        }
        preview={
          <>
            <CanvasPreview
              width={STORY.width}
              height={STORY.height}
              draw={draw}
              prepare={prepare}
              label={t('freeSlots.preview')}
            />
            <ExportActions
              getFile={getFile}
              ready={ready}
              shareTitle={draft.title.trim() || t('tools.freeSlots.title')}
              format={t('freeSlots.format')}
            />
          </>
        }
        footer={
          <BookingPitch title={t('freeSlots.pitch.title')} body={t('freeSlots.pitch.body')} source="free-slots" />
        }
      />
    </ToolLayout>
  )
}
