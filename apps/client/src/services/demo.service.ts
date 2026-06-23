// Public "Book a demo" submission. No auth — posts a lead to the backend,
// which platform staff triage in the internal console.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

export interface DemoRequestInput {
  name: string
  company?: string
  phone?: string
  email?: string
  notes?: string
}

export class DemoRequestError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
  }
}

export async function submitDemoRequest(input: DemoRequestInput): Promise<void> {
  const res = await fetch(`${API_URL}/public/demo-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const err = json?.error
    throw new DemoRequestError(err?.code ?? 'NETWORK', err?.message ?? 'Request failed')
  }
}
