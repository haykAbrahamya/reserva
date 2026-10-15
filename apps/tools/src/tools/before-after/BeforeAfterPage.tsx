import { useCallback, useMemo } from 'react'
import { useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import { BookingPitch } from '@/components/tools/BookingPitch/BookingPitch'
import { CanvasPreview } from '@/components/tools/CanvasPreview/CanvasPreview'
import { ExportActions } from '@/components/tools/ExportActions/ExportActions'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { ToolLayout } from '@/layouts/ToolLayout/ToolLayout'
import { ToolWorkspace } from '@/layouts/ToolWorkspace/ToolWorkspace'
import { loadFonts } from '@/lib/canvas/fonts'
import { useCanvasFile } from '@/lib/canvas/useCanvasFile'
import { fileNameFor } from '@/lib/fileName'
import { instagramHandle } from '@/lib/instagram'
import { toolById } from '@/tools/registry'
import { LabelFields } from './components/LabelFields/LabelFields'
import { LayoutOptions } from './components/LayoutOptions/LayoutOptions'
import { PhotoSlot } from './components/PhotoSlot/PhotoSlot'
import { BEFORE_AFTER_FONTS, drawBeforeAfter, type BeforeAfterLabels } from './drawBeforeAfter'
import { canvasSize, photoAspect, photoBoxes, type Side } from './model'
import { useBeforeAfter } from './useBeforeAfter'
import s from './BeforeAfterPage.module.scss'

const tool = toolById('beforeAfter')

/** Before & after: two photos in, one clean collage out — never uploaded. */
export function BeforeAfterPage() {
  const t = useT()
  const toast = useToast()
  const { draft, photos, pickPhoto, setFormat, setArrangement, setText, setFraming, removePhoto } = useBeforeAfter()

  // The canvas follows the photos' shape — see canvasSize.
  const aspect = photoAspect([photos.before, photos.after])
  const size = useMemo(() => canvasSize(draft.format, draft.arrangement, aspect), [draft.format, draft.arrangement, aspect])
  const boxes = useMemo(() => photoBoxes(size, draft.arrangement), [size, draft.arrangement])
  const complete = Boolean(photos.before && photos.after)

  const labels = useMemo<BeforeAfterLabels>(
    () => ({
      before: t('beforeAfter.defaults.before'),
      after: t('beforeAfter.defaults.after'),
      addPhoto: t('beforeAfter.photos.add'),
    }),
    [t],
  )
  const text = [draft.beforeLabel, draft.afterLabel, labels.before, labels.after]
    .join(' ')
    .toUpperCase()
    .concat(` ${draft.handle} ${labels.addPhoto} reserva.am …`)

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => drawBeforeAfter(ctx, { draft, photos, labels, size, boxes }),
    [draft, photos, labels, size, boxes],
  )
  const prepare = useCallback(() => loadFonts(BEFORE_AFTER_FONTS, text), [text])

  const { getFile, ready } = useCanvasFile({
    width: size.width,
    height: size.height,
    draw,
    prepare,
    fileName: fileNameFor('before-after', draft.handle),
  })

  const pick = (side: Side) => (file: File) => {
    pickPhoto(side, file).catch(() => toast(t('beforeAfter.photos.failed')))
  }

  const slot = (side: Side) => (
    <PhotoSlot
      title={(side === 'before' ? draft.beforeLabel : draft.afterLabel).trim() || labels[side]}
      photo={photos[side]}
      box={boxes[side]}
      onPick={pick(side)}
      onFraming={(framing) => setFraming(side, framing)}
      onRemove={() => removePhoto(side)}
    />
  )

  return (
    <ToolLayout tool={tool}>
      <ToolWorkspace
        previewAspect={size.width / size.height}
        editor={
          <>
            <ToolSection title={t('beforeAfter.sections.photos')} sub={t('beforeAfter.photos.private')}>
              <div className={s.photos}>
                {slot('before')}
                {slot('after')}
              </div>
            </ToolSection>
            <ToolSection title={t('beforeAfter.sections.layout')}>
              <LayoutOptions draft={draft} onFormat={setFormat} onArrangement={setArrangement} />
            </ToolSection>
            <ToolSection title={t('beforeAfter.sections.labels')}>
              <LabelFields draft={draft} onChange={setText} />
            </ToolSection>
          </>
        }
        preview={
          <>
            <CanvasPreview
              width={size.width}
              height={size.height}
              draw={draw}
              prepare={prepare}
              label={t('beforeAfter.preview')}
            />
            <ExportActions
              getFile={getFile}
              ready={ready && complete}
              shareTitle={t('tools.beforeAfter.title')}
              format={
                complete
                  ? t(draft.format === 'post' ? 'beforeAfter.formatPost' : 'beforeAfter.formatStory', {
                      width: size.width,
                      height: size.height,
                    })
                  : t('beforeAfter.needPhotos')
              }
              details={{ fmt: `${draft.format}-${draft.arrangement}`, ig: instagramHandle(draft.handle), contact: draft.handle || undefined }}
            />
          </>
        }
        footer={
          <BookingPitch title={t('beforeAfter.pitch.title')} body={t('beforeAfter.pitch.body')} source="before-after" />
        }
      />
    </ToolLayout>
  )
}
