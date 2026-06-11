// Fetches a one-tap Telegram connect deep link for a just-created booking.
// Returns null when Telegram is disabled server-side or the customer is already
// connected — in which case the client simply hides the "Get notified" button.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

export async function getTelegramConnectLink(bookingId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/public/telegram/connect-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    const url = (json?.data ?? json)?.url
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}
