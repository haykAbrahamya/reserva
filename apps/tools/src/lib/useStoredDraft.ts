import { useEffect, useState } from 'react'
import { readStored, writeStored } from './storage'

/**
 * A tool's draft, remembered in this browser between visits — someone who
 * comes back next week to change one line finds their work where they left it.
 *
 * `parse` checks whatever comes back from storage (it is user-controlled data);
 * anything it rejects falls back to `initial`.
 */
export function useStoredDraft<T>(key: string, parse: (value: unknown) => T | null, initial: () => T) {
  const [draft, setDraft] = useState<T>(() => readStored(key, parse) ?? initial())

  useEffect(() => writeStored(key, draft), [key, draft])

  return [draft, setDraft] as const
}
