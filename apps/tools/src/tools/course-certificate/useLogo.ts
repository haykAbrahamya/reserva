import { useCallback, useEffect, useState } from 'react'
import { toolEvents } from '@/lib/analytics/pulse'
import { readStored, writeStored } from '@/lib/storage'

const STORAGE_KEY = 'reserva-tools:course-certificate:logo:v1'
const events = toolEvents('courseCertificate')

/** Sharp at the size a certificate prints a logo (about 4 cm at 300 dpi), small enough to remember. */
const MAX_SIDE = 640

const isImageUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith('data:image/')

/**
 * A picked image as a PNG data URL, at most MAX_SIDE across — decoded and
 * redrawn on the device, nothing uploaded. PNG keeps a logo's transparency.
 * An SVG with no size of its own is drawn at MAX_SIDE.
 */
async function prepareLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Not an image')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const width = image.naturalWidth || MAX_SIDE
    const height = image.naturalHeight || MAX_SIDE
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * The school's logo: optional, and remembered in this browser — a school
 * makes a certificate for every student, and should not upload it every
 * time. Kept apart from the draft, so the draft stays small.
 */
export function useLogo() {
  const [url, setUrl] = useState<string | null>(() => readStored(STORAGE_KEY, (v) => (isImageUrl(v) ? v : null)))
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  // The drawing is synchronous, so the logo is decoded once, ahead of it.
  useEffect(() => {
    if (!url) {
      setImage(null)
      return
    }
    let cancelled = false
    const next = new Image()
    next.src = url
    next
      .decode()
      .then(() => {
        if (!cancelled) setImage(next)
      })
      .catch(() => {
        if (!cancelled) setImage(null)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  /** Rejects when the file is not an image the browser can open. */
  const pick = useCallback(async (file: File) => {
    const next = await prepareLogo(file)
    setUrl(next)
    writeStored(STORAGE_KEY, next)
    events.action('logo')
  }, [])

  const remove = useCallback(() => {
    setUrl(null)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Blocked storage: nothing was remembered either.
    }
  }, [])

  return { image, url, pick, remove }
}
