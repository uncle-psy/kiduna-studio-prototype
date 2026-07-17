// Client for the landing-page "Start a conversation" contact form.
// Persists submissions via the Kinship backend:
//   POST {AUTH_API_URL}/early-access-users-info
//     { name, email, message, recaptchaToken }
// The backend verifies recaptchaToken with Google before saving.

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:6050'

export interface EarlyAccessUserInfo {
  id: string
  name: string
  email: string
  message: string
  createdAt: string | null
  updatedAt: string | null
}

export interface SaveEarlyAccessInfoInput {
  name: string
  email: string
  message: string
  /** reCAPTCHA v2 token from the checkbox widget. */
  recaptchaToken: string
}

/** Save a new contact-form submission. Throws on a non-2xx response. */
export async function saveEarlyAccessInfo(
  input: SaveEarlyAccessInfoInput,
): Promise<EarlyAccessUserInfo> {
  const res = await fetch(`${AUTH_API_URL}/early-access-users-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error || 'Failed to save your message. Please try again.')
  }
  return body?.data as EarlyAccessUserInfo
}
