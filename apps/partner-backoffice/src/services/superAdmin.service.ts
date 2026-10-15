import type { AuthUser } from '@/store/auth.store'
import { apiGet, apiPost, tokenStore } from './http'
import { superSession, type SuperStaff } from './superSession'
import { markStaffBrowser } from '@/lib/staffCookie'

/** A partner a super admin can enter. */
export interface SuperPartner {
  id: string
  name: string
  slug: string | null
  type: string
  accent: string
  active: boolean
  kind: 'salon' | 'single'
}

interface SessionResult {
  accessToken: string
  refreshToken: string
  staff: SuperStaff
}

interface EntryResult {
  accessToken: string
  partner: SuperPartner
  user: {
    id: string
    name: string
    email: string
    phone: string
    role: 'admin' | 'manager'
    partnerId: string
    locationId: string | null
  }
}

/**
 * Super admin sign-in: Reserva staff an owner allowed to act as any partner's
 * admin. The server decides everything — which partners, whose account,
 * whether the right still holds — on every request.
 */
export const superAdminService = {
  async login(email: string, password: string): Promise<SuperStaff> {
    const res = await apiPost<SessionResult>('/auth/super/login', { email, password })
    tokenStore.set(res.accessToken, res.refreshToken)
    superSession.set({ staff: res.staff, partner: null })
    // Reserva's own visits never count as a partner's or a client's in analytics.
    markStaffBrowser()
    return res.staff
  },

  partners(search?: string): Promise<SuperPartner[]> {
    return apiGet<SuperPartner[]>('/auth/super/partners', { params: search ? { search } : {} })
  },

  /** Enter (or switch to) a partner: from now on the backoffice is that partner's, as its admin. */
  async enter(partnerId: string): Promise<{ token: string; user: AuthUser; partner: SuperPartner }> {
    const res = await apiPost<EntryResult>('/auth/super/enter', { partnerId })
    tokenStore.set(res.accessToken, tokenStore.refresh ?? '')
    superSession.setPartner({ id: res.partner.id, name: res.partner.name })
    const u = res.user
    return {
      token: res.accessToken,
      user: { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, partnerId: u.partnerId, locationId: u.locationId },
      partner: res.partner,
    }
  },

  /** End the session on the server and here. */
  async exit(): Promise<void> {
    const refreshToken = tokenStore.refresh
    if (refreshToken) await apiPost('/auth/super/logout', { refreshToken }).catch(() => undefined)
    tokenStore.clear()
    superSession.clear()
  },
}
