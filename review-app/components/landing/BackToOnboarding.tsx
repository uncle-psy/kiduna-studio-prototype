'use client'

import { useRouter } from 'next/navigation'
import { STORAGE_KEY } from '@/components/landing/SignupWizard/constants'

/**
 * "Go to Onboarding" return affordance for the /community page.
 *
 * The signup wizard has no URL-driven step — it resumes from the furthest of
 * the local cache (`localStorage[STORAGE_KEY]`) and server-side progress. So to
 * send the user back to Step 6 we simply pin the local cache's `currentStep` to
 * "6" (and refresh `_savedAt` so useSignupStorage's 1-hour TTL / "stale Step 1"
 * reset doesn't wipe it on the next mount), then navigate to /signup.
 *
 * We preserve any existing fields (email/fullName/password/kinshipCode/etc.).
 * If localStorage is unavailable (private mode, quota), we still navigate —
 * server-side resume will recover whatever progress exists. We deliberately do
 * NOT write "complete" (that path redirects to checkout).
 */
export default function BackToOnboarding() {
  const router = useRouter()

  const handleClick = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      let data: Record<string, unknown> = {}
      if (raw) {
        try {
          data = JSON.parse(raw) ?? {}
        } catch {
          data = {}
        }
      }
      data.currentStep = '6'
      data._savedAt = Date.now()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage unavailable — fall through to navigation; server resume covers it.
    }
    // One-shot bypass signal for /signup's auth-redirect guard. Authenticated
    // users with onboardingStatus === 'needs_code' are normally bounced to
    // /community, but THIS click is an explicit "take me back to Step 6"
    // intent. The signup page reads + clears this flag on mount.
    try {
      sessionStorage.setItem('resumeWizardOnce', '1')
    } catch {
      // Session storage unavailable — without the flag, /signup will redirect
      // back to /community. Nothing we can do from here; surface a no-op.
    }
    router.push('/signup')
  }

  return (
    <div className="mt-10 flex justify-center">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-6 py-3 text-[0.95rem] font-bold text-accent transition-colors hover:bg-accent/20 hover:border-accent/60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Go to Onboarding — Step 6
      </button>
    </div>
  )
}