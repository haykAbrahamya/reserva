import type { Paginated, PageParams } from '@/types'
import { apiDelete, apiGet, apiPatch, apiPost } from './http'

/** Where we stand with a lead. `partner`: became one. `lost`: not interested. */
export type LeadStatus = 'new' | 'contacted' | 'interested' | 'partner' | 'lost'
/** Where it came from: the sign-up form, a demo request, the free tools, or added by hand. */
export type LeadSource = 'signup' | 'demo' | 'tools' | 'manual'

export interface Lead {
  id: string
  source: LeadSource
  status: LeadStatus
  name: string | null
  company: string | null
  phone: string | null
  email: string | null
  /** Bare username: instagram.com/<instagram>. */
  instagram: string | null
  /** A tools lead's contact line, exactly as typed. */
  contact: string | null
  /** A sign-up's salon type and page address, a demo request's note. */
  context: string | null
  /** The tools a tools lead made something with (registry ids). */
  tools: string[]
  /** A tools lead's latest visit, for its journey in Analytics. */
  sessionId: string | null
  notes: string | null
  /** The partner it became. */
  partnerId: string | null
  lastActivityAt: string
  createdAt: string
}

export interface LeadsPage extends Paginated<Lead> {
  /** Leads per status, across the source filter and the search — for the tabs. */
  counts: Record<LeadStatus, number>
}

export interface ListLeadsParams extends PageParams {
  status?: LeadStatus
  source?: LeadSource
  search?: string
}

/** What staff write on a lead; an empty string clears a field. */
export interface LeadInput {
  name?: string
  company?: string
  phone?: string
  email?: string
  instagram?: string
  notes?: string
  status?: LeadStatus
}

export const leadsService = {
  list(params: ListLeadsParams = {}): Promise<LeadsPage> {
    return apiGet<LeadsPage>('/platform/leads', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        ...(params.status ? { status: params.status } : {}),
        ...(params.source ? { source: params.source } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    })
  },

  create(input: LeadInput): Promise<Lead> {
    return apiPost<Lead>('/platform/leads', input)
  },

  update(id: string, patch: LeadInput): Promise<Lead> {
    return apiPatch<Lead>(`/platform/leads/${id}`, patch)
  },

  remove(id: string): Promise<void> {
    return apiDelete(`/platform/leads/${id}`)
  },
}
