// ─────────────────────────────────────────────────────────────
// Per-visitor drafts in localStorage. Every access is guarded: storage can be
// blocked (private mode, strict settings) and a tool must still work then —
// it just will not remember the draft.
// ─────────────────────────────────────────────────────────────

/** The stored value, or null when absent, unreadable, or rejected by `parse`. */
export function readStored<T>(key: string, parse: (value: unknown) => T | null): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? parse(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Full or blocked — the draft simply is not remembered.
  }
}

/** A stored string field, cut to its limit; anything that is not a string reads as empty. */
export function readText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

/** The stored value as an object to read fields from, or null when it is not one. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}
