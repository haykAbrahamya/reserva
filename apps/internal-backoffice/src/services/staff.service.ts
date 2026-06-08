import type { Paginated, PageParams } from '@/types'
import type { PlatformRole } from '@/store/auth.store'
import { apiGet, apiPost, apiPatch, apiDelete } from './http'

export interface StaffMember {
  id: string
  name: string
  email: string
  role: PlatformRole
  active: boolean
  lastLogin: string | null
  mustChangePassword: boolean
  createdAt: string
}

export interface CreateStaffInput {
  name: string
  email: string
  role: PlatformRole
  password?: string
}

export interface CreateStaffResult {
  user: StaffMember
  otp: string | null
}

export interface UpdateStaffInput {
  name?: string
  role?: PlatformRole
  active?: boolean
}

export const staffService = {
  list(params: PageParams = {}): Promise<Paginated<StaffMember>> {
    return apiGet<Paginated<StaffMember>>('/platform/staff', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 5,
        ...(params.search ? { search: params.search } : {}),
      },
    })
  },

  create(input: CreateStaffInput): Promise<CreateStaffResult> {
    return apiPost<CreateStaffResult>('/platform/staff', input)
  },

  update(id: string, patch: UpdateStaffInput): Promise<StaffMember> {
    return apiPatch<StaffMember>(`/platform/staff/${id}`, patch)
  },

  remove(id: string): Promise<void> {
    return apiDelete(`/platform/staff/${id}`)
  },
}
