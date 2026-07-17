const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://192.168.1.19:6050'

/**
 * Check if the current user should skip payment (email-based, backend-validated).
 * Returns true if the user's email is in SKIP_PAYMENT_EMAILS on the server.
 * When true, the backend also activates the user as 'member' tier automatically.
 * Falls back to false on any error (safe default — user goes to checkout).
 */
export async function shouldSkipPayment(token?: string | null): Promise<boolean> {
  if (!token) return false
  try {
    const res = await fetch(`${AUTH_API_URL}/auth/check-payment-skip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.skip === true
  } catch {
    return false // safe fallback — normal checkout flow
  }
}