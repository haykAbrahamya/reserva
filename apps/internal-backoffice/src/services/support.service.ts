import { apiGet, apiPost } from './http'

export interface SupportMessage {
  id: string
  threadId: string
  senderType: 'partner' | 'platform'
  senderUserId: string | null
  senderName: string
  body: string
  createdAt: string
  readAt: string | null
}

export interface SupportThreadSummary {
  id: string
  partnerId: string
  partnerName: string
  partnerSlug: string | null
  status: 'open' | 'closed'
  lastMessageAt: string
  platformUnread: number
  lastMessage: string | null
}

export interface SupportThreadMessages {
  threadId: string
  status: 'open' | 'closed'
  messages: SupportMessage[]
}

/** Platform-side support API (internal-backoffice). */
export const supportService = {
  threads(): Promise<SupportThreadSummary[]> {
    return apiGet<SupportThreadSummary[]>('/platform/support/threads')
  },
  unread(): Promise<{ count: number }> {
    return apiGet<{ count: number }>('/platform/support/unread')
  },
  messages(threadId: string): Promise<SupportThreadMessages> {
    return apiGet<SupportThreadMessages>(`/platform/support/threads/${threadId}/messages`)
  },
  history(threadId: string, before?: string, take = 30): Promise<SupportMessage[]> {
    return apiGet<SupportMessage[]>(`/platform/support/threads/${threadId}/history`, {
      params: { ...(before ? { before } : {}), take },
    })
  },
  markRead(threadId: string): Promise<{ ok: boolean }> {
    return apiPost<{ ok: boolean }>(`/platform/support/threads/${threadId}/read`)
  },
  reply(threadId: string, body: string): Promise<SupportMessage> {
    return apiPost<SupportMessage>(`/platform/support/threads/${threadId}/messages`, { body })
  },
  close(threadId: string): Promise<{ ok: boolean }> {
    return apiPost<{ ok: boolean }>(`/platform/support/threads/${threadId}/close`)
  },
}
