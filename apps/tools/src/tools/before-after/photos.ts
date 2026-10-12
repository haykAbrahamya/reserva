import type { Box } from './model'

/**
 * A photo ready to draw, plus how it is framed in its slot. `focusX/Y` pick
 * which part of an image larger than its slot shows (0 = left/top edge,
 * 1 = right/bottom), `zoom` enlarges it past the size that just covers it.
 */
export interface Photo {
  source: CanvasImageSource
  width: number
  height: number
  focusX: number
  focusY: number
  zoom: number
}

export type Framing = Pick<Photo, 'focusX' | 'focusY' | 'zoom'>

/** Big enough for a sharp 1080px output at full zoom, small enough to redraw on every drag. */
const MAX_SIDE = 2400

/**
 * Decode a picked file into a drawable photo, entirely on the device.
 *
 * Drawn through an <img>, which applies the camera's EXIF rotation in every
 * current browser — so a portrait taken on a phone is not drawn on its side.
 * A format the browser cannot decode (HEIC on desktop Chrome) rejects here.
 */
export async function loadPhoto(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.round(image.naturalWidth * scale)
    const height = Math.round(image.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(image, 0, 0, width, height)

    return { source: canvas, width, height, focusX: 0.5, focusY: 0.5, zoom: 1 }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** The photo's drawn size in a box: covering it, then zoomed. */
export function coverSize(photo: Photo, box: Pick<Box, 'width' | 'height'>) {
  const scale = Math.max(box.width / photo.width, box.height / photo.height) * photo.zoom
  return { width: photo.width * scale, height: photo.height * scale }
}

/** Draw the photo filling `box`, cropped to it, framed by its focus and zoom. */
export function drawPhoto(ctx: CanvasRenderingContext2D, photo: Photo, box: Box) {
  const size = coverSize(photo, box)
  const x = box.x + (box.width - size.width) * photo.focusX
  const y = box.y + (box.height - size.height) * photo.focusY

  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.width, box.height)
  ctx.clip()
  ctx.drawImage(photo.source, x, y, size.width, size.height)
  ctx.restore()
}

/**
 * The focus after dragging the image by (dx, dy) in box units. Moving the
 * image right shows more of its left side, so the focus moves the other way;
 * an axis with nothing to reveal does not move at all.
 */
export function panFocus(photo: Photo, box: Pick<Box, 'width' | 'height'>, dx: number, dy: number): Framing {
  const size = coverSize(photo, box)
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const overflowX = box.width - size.width
  const overflowY = box.height - size.height
  return {
    focusX: overflowX < 0 ? clamp(photo.focusX + dx / overflowX) : photo.focusX,
    focusY: overflowY < 0 ? clamp(photo.focusY + dy / overflowY) : photo.focusY,
    zoom: photo.zoom,
  }
}
