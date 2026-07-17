'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import SignupWizard from '@/components/landing/SignupWizard'
import '../login/app-login.css'

export default function SignupPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  // If user is already logged in and NOT in an incomplete onboarding state,
  // redirect them away from signup. Users with 'incomplete' status ARE allowed
  // here because they need to resume the wizard.
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return // not logged in — allow signup

    // Wizards have unrestricted access — never funnel them through the
    // signup/onboarding flow; send them straight to the studio.
    if (user?.role === 'wizard') { router.replace('/chat'); return }

    // One-shot bypass: when the user clicks "Go to Onboarding" on /community,
    // BackToOnboarding sets sessionStorage.resumeWizardOnce. Consume it here so
    // a 'needs_code' user lands on Step 6 of the wizard exactly once instead of
    // bouncing back to /community. We read + clear in the same tick so a later
    // refresh still triggers the normal redirect.
    let bypassRedirect = false
    try {
      if (sessionStorage.getItem('resumeWizardOnce') === '1') {
        sessionStorage.removeItem('resumeWizardOnce')
        bypassRedirect = true
      }
    } catch {
      // sessionStorage unavailable — fall through to normal redirect logic.
    }
    if (bypassRedirect) return

    const status = user?.onboardingStatus
    // Allow 'incomplete' users to stay — they're resuming the wizard
    if (status === 'incomplete') return
    // All other logged-in users should not be here
    if (status === 'needs_code')   { router.replace('/community'); return }
    if (status === 'paid')         { router.replace(`/launchpad/${process.env.NEXT_PUBLIC_LAUNCHPAD_SLUG || 'kiduna'}`); return }
    if (status === 'committed')    { router.replace('/cofounder'); return }
    // Old user or complete — go to guest/chat
    if (user?.hasCofounderCredit)  { router.replace(`/launchpad/${process.env.NEXT_PUBLIC_LAUNCHPAD_SLUG || 'kiduna'}`); return }
    router.replace('/guest')
  }, [isLoading, isAuthenticated, user, router])

  return (
    <div className="auth-page">

      {/* ===== HEADER ===== */}
      <header className="site-header">
        <div className="wrap nav">
          <a className="brand-lockup" href="/">
            <img className="brand-logo" src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" />
          </a>
          <button className="nav-toggle" aria-label="Menu" onClick={() => setMobileOpen(p => !p)}>☰</button>
          <nav className="nav-links">
            <a className="navlink" href="/showcase">Showcase</a>
            <a className="navlink" href="/#earn">How to Earn</a>
            <a className="navlink" href="/how-it-works">How it Works</a>
            <a className="navlink" href="/#events">Events</a>
            <a className="navlink" href="/#about">About</a>
            <a className="navlink" href="/nightpapers">Nightpapers</a>
            <a className="navlink" href="/launchpad">Launchpad</a>
            <span className="nav-sep" />
            <a className="nav-login" href="/#contact">Get in Touch</a>
            <a className="nav-login" href="/login">Log in</a>
            <a className="btn btn-gold" href="/#contact">Join Early Access</a>
          </nav>
        </div>
      </header>

      {/* ===== SECTION ===== */}
      <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', padding: '60px 0' }}>
        <div className="wrap signup-hero-grid">
          <div>
            <div className="eyebrow">Build Something that Matters</div>
            <h1 className="display" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>Claim Your <em className="wv-emph">Place</em></h1>
            <p className="lede">Join a trusted network of creators, builders, sponsors, organizers, and intelligent agents. Create your identity, connect with communities that share your purpose, and help shape the future of the agentic economy.</p>
            <p className="muted">Already have an account? <a href="/login">Log in here →</a></p>
          </div>
          <div>
            <SignupWizard />
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <a href="/"><img className="footer-logo" src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" /></a>
              <p className="faint" style={{ marginTop: '0.6rem', maxWidth: '42ch' }}>Software as big as the world. A global on-ramp to the agentic economy, run through your very own member-governed internet-native organization registered in the state of West Virginia, with legal standing all around the world.</p>
              <p className="faint" style={{ fontSize: '0.8rem' }}>Powered by <a href="https://kinship.systems" target="_blank" rel="noopener">Kinship Intelligence™</a>, Human Agency for the Agentic Era.</p>
            </div>
            <div>
              <h4>Explore</h4>
              <a href="/showcase">Showcase</a>
              <a href="/#earn">How to Earn</a>
              <a href="/how-it-works">How it Works</a>
              <a href="/#events">Events</a>
              <a href="/#about">About</a>
              <a href="/nightpapers">Nightpapers</a>
            </div>
            <div>
              <h4>Get started</h4>
              <a href="/#contact">Join Early Access</a>
              <a href="/login">Login</a>
              <h4 style={{ marginTop: '1rem' }}>Our Communities</h4>
              <a>Bluesky</a><a>Telegram</a><a>YouTube</a>
            </div>
            <div>
              <h4>About the Institute</h4>
              <p className="faint" style={{ margin: '0 0 0.7rem', fontSize: '0.85rem', maxWidth: '34ch' }}>
                <a className="kin-link" href="https://kinship.systems" target="_blank" rel="noopener">Kinship Intelligence Institute</a> is an independent 501(c)(3) ensuring the agentic AI era serves the wellbeing, autonomy, and prosperity of people and communities the market would otherwise pass over.
              </p>
              <a href="https://kinship.systems" target="_blank" rel="noopener">Learn more ↗</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Kiduna Club</span>
            <span className="legal-links"><a href="/tos">Terms of Service</a> · <a href="/privacy">Privacy Policy</a></span>
          </div>
        </div>
      </footer>

    </div>
  )
}