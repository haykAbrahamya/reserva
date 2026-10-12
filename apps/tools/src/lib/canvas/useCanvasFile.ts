import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasToFile, renderCanvas } from './exportFile'

interface Options {
  width: number
  height: number
  /** Memoize it (useCallback) — a new function is a new image to render. */
  draw: (ctx: CanvasRenderingContext2D) => void
  /** Runs before each render, e.g. loading the fonts `draw` needs. Memoize it too. */
  prepare?: () => Promise<void>
  fileName: string
  /** Quiet time after the last change before re-rendering. */
  delay?: number
}

/**
 * Keeps an up-to-date PNG of `draw`, rendered off-screen once the input settles.
 *
 * Rendering ahead of time is what makes Share work on iPhones: Safari only
 * opens the share sheet inside the tap that asked for it, and encoding a
 * 1080×1920 PNG after the tap can outlast that window. `getFile` resolves at
 * once with the ready file, or with the next one if an edit is still settling,
 * so a tap straight after typing never exports the previous version.
 */
export function useCanvasFile({ width, height, draw, prepare, fileName, delay = 250 }: Options) {
  const fileRef = useRef<File | null>(null)
  const pendingRef = useRef(true)
  const waitersRef = useRef<Array<{ resolve: (file: File) => void; reject: (err: unknown) => void }>>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    pendingRef.current = true

    const timer = window.setTimeout(async () => {
      try {
        await prepare?.()
        const file = await canvasToFile(renderCanvas(width, height, draw), fileName)
        if (cancelled) return

        fileRef.current = file
        pendingRef.current = false
        setReady(true)
        waitersRef.current.splice(0).forEach((w) => w.resolve(file))
      } catch (err) {
        if (cancelled) return
        pendingRef.current = false
        waitersRef.current.splice(0).forEach((w) => w.reject(err))
      }
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [width, height, draw, prepare, fileName, delay])

  const getFile = useCallback((): Promise<File> => {
    if (!pendingRef.current) {
      return fileRef.current
        ? Promise.resolve(fileRef.current)
        : Promise.reject(new Error('The image could not be rendered'))
    }
    return new Promise((resolve, reject) => waitersRef.current.push({ resolve, reject }))
  }, [])

  return { getFile, ready }
}
