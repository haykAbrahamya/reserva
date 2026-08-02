import type {
  Course,
  CourseCohort,
  CourseEnrollment,
  CourseLevel,
  EnrollmentStatus,
  LocalizedText,
  Paginated,
} from '@/types'
import http, { apiGet, apiPost, apiPatch, apiDelete } from './http'

// ─────────────────────────────────────────────────────────────
// API client for the Courses domain (courses → runs → members). Kept in its own
// module — separate from partners.service — so this large feature stays isolated
// and easy to evolve. All routes are tenant-scoped by the backend via the JWT.
// ─────────────────────────────────────────────────────────────

/** Writable course fields (create/update). Server fills id/timestamps/relations. */
export interface CourseInput {
  title: string
  titleI18n?: LocalizedText | null
  summary?: string
  summaryI18n?: LocalizedText | null
  description?: string
  descriptionI18n?: LocalizedText | null
  price?: number
  tutorSpecialistId?: string | null
  tutorName?: string
  tutorTitle?: string
  level?: CourseLevel | null
  active?: boolean
}

/** Editable fields of a run (never its status — use the transition endpoint). */
export interface CohortInput {
  locationId?: string | null
  startDate?: string | null
  endDate?: string | null
  scheduleText?: string
  capacity?: number
  registrationOpen?: boolean
}

export type CohortAction = 'open' | 'start' | 'finish' | 'archive'

/** A past run with its confirmed-member count (History view). */
export type CohortHistoryEntry = CourseCohort & { _count: { enrollments: number } }

export interface AddMemberInput {
  memberName: string
  memberPhone: string
  memberEmail?: string
  notes?: string | null
}

export interface ListMembersParams {
  status?: EnrollmentStatus
  search?: string
}

export const coursesService = {
  // ── Courses ──
  async list(includeInactive = true): Promise<Course[]> {
    const res = await apiGet<Paginated<Course>>('/courses', {
      params: { all: true, includeInactive },
    })
    return res.items
  },
  async get(id: string): Promise<Course> {
    return apiGet<Course>(`/courses/${id}`)
  },
  async create(data: CourseInput): Promise<Course> {
    return apiPost<Course>('/courses', data)
  },
  async update(id: string, patch: Partial<CourseInput>): Promise<Course> {
    return apiPatch<Course>(`/courses/${id}`, patch)
  },
  async remove(id: string): Promise<void> {
    await apiDelete(`/courses/${id}`)
  },

  // ── Cover image ──
  async uploadCover(id: string, file: File): Promise<{ coverUrl: string }> {
    const form = new FormData()
    form.append('file', file)
    const res = await http.post(`/courses/${id}/cover`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (res.data?.data ?? res.data) as { coverUrl: string }
  },
  async removeCover(id: string): Promise<{ coverUrl: string }> {
    const res = await http.delete(`/courses/${id}/cover`)
    return (res.data?.data ?? res.data) as { coverUrl: string }
  },

  // ── Runs (cohorts) ──
  async currentRun(courseId: string): Promise<CourseCohort> {
    return apiGet<CourseCohort>(`/courses/${courseId}/runs/current`)
  },
  async runHistory(courseId: string): Promise<CohortHistoryEntry[]> {
    return apiGet<CohortHistoryEntry[]>(`/courses/${courseId}/runs/history`)
  },
  async startNewRun(courseId: string, seed: CohortInput = {}): Promise<CourseCohort> {
    return apiPost<CourseCohort>(`/courses/${courseId}/runs`, seed)
  },
  async updateRun(cohortId: string, patch: CohortInput): Promise<CourseCohort> {
    return apiPatch<CourseCohort>(`/courses/runs/${cohortId}`, patch)
  },
  async transitionRun(cohortId: string, action: CohortAction): Promise<CourseCohort> {
    return apiPost<CourseCohort>(`/courses/runs/${cohortId}/transition`, { action })
  },

  // ── Members (enrollments) ──
  /** Fetch a run's members. Runs are small, so we load them all in one page
   *  (`all: true`) rather than paginating — avoids a pageSize cap and keeps the
   *  members panel a single, live list. */
  async listMembers(cohortId: string, params: ListMembersParams = {}): Promise<CourseEnrollment[]> {
    const res = await apiGet<Paginated<CourseEnrollment>>(`/courses/runs/${cohortId}/members`, {
      params: {
        all: true,
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    })
    return res.items
  },
  async addMember(cohortId: string, data: AddMemberInput): Promise<CourseEnrollment> {
    return apiPost<CourseEnrollment>(`/courses/runs/${cohortId}/members`, data)
  },
  async updateMember(id: string, patch: Partial<AddMemberInput>): Promise<CourseEnrollment> {
    return apiPatch<CourseEnrollment>(`/courses/members/${id}`, patch)
  },
  async setMemberStatus(id: string, status: EnrollmentStatus): Promise<CourseEnrollment> {
    return apiPatch<CourseEnrollment>(`/courses/members/${id}/status`, { status })
  },
  async removeMember(id: string): Promise<void> {
    await apiDelete(`/courses/members/${id}`)
  },
}
