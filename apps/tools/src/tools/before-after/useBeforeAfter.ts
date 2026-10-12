import { useCallback, useMemo, useState } from 'react'
import { toolEvents } from '@/lib/analytics/pulse'
import { useStoredDraft } from '@/lib/useStoredDraft'
import { parseDraft, type Arrangement, type BeforeAfterDraft, type Format, type Side } from './model'
import { loadPhoto, type Framing, type Photo } from './photos'

const STORAGE_KEY = 'reserva-tools:before-after:v1'
const events = toolEvents('beforeAfter')

const INITIAL: BeforeAfterDraft = {
  format: 'post',
  arrangement: 'side',
  beforeLabel: '',
  afterLabel: '',
  handle: '',
}

/**
 * The before/after state. The choices and words are remembered like every
 * tool's draft; the photos are deliberately NOT — they live in memory for this
 * visit only and never leave the device.
 */
export function useBeforeAfter() {
  const [draft, setStored] = useStoredDraft(STORAGE_KEY, parseDraft, () => INITIAL)
  // Every change goes through here, so the first one in a page view is counted.
  const setDraft: typeof setStored = useCallback((next) => {
    events.edited()
    setStored(next)
  }, [setStored])
  const [photos, setPhotos] = useState<Record<Side, Photo | null>>({ before: null, after: null })

  const actions = useMemo(
    () => ({
      setFormat(format: Format) {
        setDraft((d) => ({ ...d, format }))
        events.action('format', format)
      },
      setArrangement(arrangement: Arrangement) {
        setDraft((d) => ({ ...d, arrangement }))
        events.action('layout', arrangement)
      },
      setText(field: 'beforeLabel' | 'afterLabel' | 'handle', value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },
      setFraming(side: Side, framing: Partial<Framing>) {
        // A drag or a zoom fires on every move: one per side per page view says enough.
        events.edited()
        events.actionOnce('adjust', side)
        setPhotos((p) => {
          const photo = p[side]
          return photo ? { ...p, [side]: { ...photo, ...framing } } : p
        })
      },
      removePhoto(side: Side) {
        events.edited()
        events.action('photo_remove', side)
        setPhotos((p) => ({ ...p, [side]: null }))
      },
    }),
    [setDraft],
  )

  /** Decodes the file; rejects when the browser cannot open it. */
  const pickPhoto = useCallback(async (side: Side, file: File) => {
    let photo: Photo
    try {
      photo = await loadPhoto(file)
    } catch (err) {
      events.failed('photo')
      throw err
    }
    events.edited()
    events.action('photo', side)
    setPhotos((p) => ({ ...p, [side]: photo }))
  }, [])

  return { draft, photos, pickPhoto, ...actions }
}
