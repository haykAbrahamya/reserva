// ─────────────────────────────────────────────────────────────
// Getting a drawn image out of the browser: as a file, a download, or the
// phone's share sheet (where Instagram Stories is one tap away).
// ─────────────────────────────────────────────────────────────

/** A fresh off-screen canvas with `draw` run on it. */
export function renderCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')
  draw(ctx)
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas could not be encoded'))),
      type,
      quality,
    )
  })
}

export async function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new File([await canvasToBlob(canvas)], name, { type: 'image/png' })
}

/** Can this browser hand an image file to the system share sheet? */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    return navigator.canShare({ files: [new File([''], 'probe.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/**
 * An iPhone or iPad, where saving means the share sheet. iOS keeps a download
 * in the Files app, never in Photos — and Photos is where a story has to be
 * for Instagram to find it. No page can write to Photos itself; the share
 * sheet's "Save Image" can. iPadOS presents itself as a Mac with a touch screen.
 */
export function savesToPhotosByShare(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  return ios && canShareFiles()
}

/** Open the share sheet. Resolves false when the visitor dismissed it. */
export async function shareFile(file: File, title?: string): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title })
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false
    throw err
  }
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked on the next task, after the browser has started reading it.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
