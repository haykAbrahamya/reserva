import { apiGet, apiPost } from './client'
import { toSearchParams, type BoardFilters } from '@/lib/filters'
import type {
  ApplyResult,
  BoardMeta,
  Paginated,
  VacancyCard,
  VacancyDetailResponse,
} from './types'

// ─────────────────────────────────────────────────────────────
// The board endpoints.
//
// Note that the wire query is built from the SAME `toSearchParams` the address
// bar uses. That is deliberate: the URL a visitor can see and the request the
// app makes are one serialization, so "the link I shared shows different
// results than my screen" is not a class of bug that can exist here.
// ─────────────────────────────────────────────────────────────

export interface ApplyInput {
  name: string
  phone: string
  email?: string
  note?: string
  locale?: string
}

/** Filter options, taxonomies and facet counts — one request for the panel. */
export function fetchMeta(signal?: AbortSignal): Promise<BoardMeta> {
  return apiGet<BoardMeta>('/board/meta', signal)
}

export function fetchVacancies(
  filters: BoardFilters,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<Paginated<VacancyCard>> {
  const params = toSearchParams(filters)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return apiGet<Paginated<VacancyCard>>(`/board/vacancies?${params}`, signal)
}

export function fetchVacancy(id: string, signal?: AbortSignal): Promise<VacancyDetailResponse> {
  return apiGet<VacancyDetailResponse>(`/board/vacancies/${encodeURIComponent(id)}`, signal)
}

/**
 * Apply to a listing.
 *
 * `authed` is optional and the endpoint is public either way. Passing it does
 * one thing: the server files the application under the signed-in account, so
 * it appears in that person's own history. Applying without an account has
 * always worked and still does — a salon reads exactly the same fields.
 */
export function applyToVacancy(
  id: string,
  input: ApplyInput,
  authed?: <T>(path: string, init?: RequestInit) => Promise<T>,
): Promise<ApplyResult> {
  const path = `/board/vacancies/${encodeURIComponent(id)}/apply`
  const body = JSON.stringify(input)
  return authed
    ? authed<ApplyResult>(path, { method: 'POST', body })
    : apiPost<ApplyResult>(path, input)
}
