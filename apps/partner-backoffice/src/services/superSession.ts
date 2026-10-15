// ─────────────────────────────────────────────────────────────
// A super admin's session in this browser: who signed in, and which partner
// they are looking at. Its presence is what puts the backoffice in super admin
// mode — the tokens themselves live in tokenStore, like anyone's.
//
// Nothing here is trusted by the server: every token is checked there, and the
// partner comes from the token, never from this. It only tells the UI what to
// show and where to renew the session.
// ─────────────────────────────────────────────────────────────

const KEY = 'reserva-super'

export interface SuperStaff {
  id: string
  name: string
  email: string
}

export interface SuperSessionState {
  staff: SuperStaff
  /** The partner entered, or null while choosing one. */
  partner: { id: string; name: string } | null
}

export const superSession = {
  get(): SuperSessionState | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as SuperSessionState) : null
    } catch {
      return null
    }
  },
  set(state: SuperSessionState) {
    localStorage.setItem(KEY, JSON.stringify(state))
  },
  setPartner(partner: SuperSessionState['partner']) {
    const current = this.get()
    if (current) this.set({ ...current, partner })
  },
  clear() {
    localStorage.removeItem(KEY)
  },
}

/** True while a super admin is signed in here (choosing a partner, or inside one). */
export const isSuperAdmin = (): boolean => superSession.get() !== null
