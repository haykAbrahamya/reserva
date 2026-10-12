/**
 * The Instagram story canvas, in pixels.
 *
 * The safe zones are where Instagram draws its own UI over a story — the
 * progress bar and profile row at the top, the reply bar at the bottom — so
 * nothing a viewer must read goes there. Meta's guidance is ~250px each end.
 */
export const STORY = {
  width: 1080,
  height: 1920,
  safeTop: 250,
  safeBottom: 250,
} as const
