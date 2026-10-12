const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

export const isTime = (value: unknown): value is string => typeof value === 'string' && TIME.test(value)

/** Unique and in order — "09:30" sorts before "14:00" as plain strings do. */
export function sortTimes(times: Iterable<string>): string[] {
  return [...new Set(times)].filter(isTime).sort()
}

/** Every half hour from 08:00 to 22:00: the grid a working day is picked from. */
export const DAY_TIMES: readonly string[] = Array.from({ length: 29 }, (_, i) => {
  const minutes = 8 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
