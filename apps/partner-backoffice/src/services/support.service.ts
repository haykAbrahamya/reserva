import { apiGet, apiPost } from './http'

/** A support message as returned by the API (dates are ISO strings). */
export interface SupportMessage {
  id: string
  threadId: string
  senderType: 'partner' | 'platform'
  senderUserId: string | null
  senderName: string
  body: string
  createdAt: string
  /** ISO time the other side read it, or null (unseen). */
  readAt: string | null
}

export interface SupportThreadView {
  /** Null until the partner sends their first message (no empty tickets). */
  threadId: string | null
  status: 'open' | 'closed'
  messages: SupportMessage[]
}

/** Partner-side support API. The backend derives the partner from the token, so
 *  no ids are passed — a partner can only touch their own thread. */
export const supportService = {
  thread(): Promise<SupportThreadView> {
    return apiGet<SupportThreadView>('/support/thread')
  },
  /** Older messages before a given message id (oldest-first page). */
  history(before?: string, take = 30): Promise<SupportMessage[]> {
    return apiGet<SupportMessage[]>('/support/messages', {
      params: { ...(before ? { before } : {}), take },
    })
  },
  unread(): Promise<{ count: number }> {
    return apiGet<{ count: number }>('/support/unread')
  },
  markRead(): Promise<{ ok: boolean }> {
    return apiPost<{ ok: boolean }>('/support/read')
  },
  send(body: string): Promise<SupportMessage> {
    return apiPost<SupportMessage>('/support/messages', { body })
  },
}
