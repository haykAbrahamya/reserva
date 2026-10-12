import { useCallback, useMemo, useState } from 'react'
import { useStoredDraft } from '@/lib/useStoredDraft'
import { parseDraft, type Arrangement, type BeforeAfterDraft, type Format, type Side } from './model'
import { loadPhoto, type Framing, type Photo } from './photos'

const STORAGE_KEY = 'reserva-tools:before-after:v1'

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
  const [draft, setDraft] = useStoredDraft(STORAGE_KEY, parseDraft, () => INITIAL)
  const [photos, setPhotos] = useState<Record<Side, Photo | null>>({ before: null, after: null })

  const actions = useMemo(
    () => ({
      setFormat(format: Format) {
        setDraft((d) => ({ ...d, format }))
      },
      setArrangement(arrangement: Arrangement) {
        setDraft((d) => ({ ...d, arrangement }))
      },
      setText(field: 'beforeLabel' | 'afterLabel' | 'handle', value: string) {
        setDraft((d) => ({ ...d, [field]: value }))
      },
      setFraming(side: Side, framing: Partial<Framing>) {
        setPhotos((p) => {
          const photo = p[side]
          return photo ? { ...p, [side]: { ...photo, ...framing } } : p
        })
      },
      removePhoto(side: Side) {
        setPhotos((p) => ({ ...p, [side]: null }))
      },
    }),
    [setDraft],
  )

  /** Decodes the file; rejects when the browser cannot open it. */
  const pickPhoto = useCallback(async (side: Side, file: File) => {
    const photo = await loadPhoto(file)
    setPhotos((p) => ({ ...p, [side]: photo }))
  }, [])

  return { draft, photos, pickPhoto, ...actions }
}
