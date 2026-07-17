import type { Metadata } from 'next'
import LoginForm from '@/components/landing/LoginForm'
import './app-login.css'

export const metadata: Metadata = {
  title: 'Sign in — Kiduna Club',
  description: 'Sign in to the DUNAVERSE.',
}

export default function LoginPage() {
  return (
    <div className="auth-page">
      {/* ===== NAV ===== */}
      <header className="site-header">
        <div className="wrap nav">
          <a className="brand-lockup" href="/">
            <img src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" style={{ height: 36, width: 'auto' }} />
          </a>
          <button className="nav-toggle" aria-label="Menu">☰</button>
          <nav className="nav-links">
            <a className="navlink" href="/showcase">Showcase</a>
            <a className="navlink" href="/#earn">How to Earn</a>
            <a className="navlink" href="/how-it-works">How it Works</a>
            <a className="navlink" href="/#events">Events</a>
            <a className="navlink" href="/#about">About</a>
            <a className="navlink" href="/nightpapers">Nightpapers</a>
            <a className="navlink" href="/launchpad">Launchpad</a>
            <span className="nav-sep"></span>
            <a className="nav-login" href="/#contact">Get in Touch</a>
            <a className="nav-login" href="/login">Log in</a>
            <a className="btn btn-gold" href="/#contact">Join Early Access</a>
          </nav>
        </div>
      </header>

      {/* ===== AUTH ===== */}
      <section id="auth" className="auth-wrap">
        <div className="auth-art">
          <a className="brand-lockup" href="/">
            <img src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" style={{ height: 36, width: 'auto' }} />
          </a>
         <div className="pitch" style={{ marginTop:0 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Welcome home <span className="star">✦</span> Identity · Authority · Accountability
            </div>
            <h1 className="display">
              Sign in to the <em className="wv-emph">DUNAVERSE.</em>
            </h1>
            <p>Your allies, your DUNAs, your treasury, and your tools — one place, on every device. Pick up exactly where the network left you.</p>
          </div>
          <div className="auth-foot">
            {/* Powered by <a href="https://kinship.systems" target="_blank" rel="noopener">Kinship Intelligence™</a> · A West Virginia decentralized nonprofit */}
          </div>
          <img className="ridge" src="/review/screens/images/landing/ridge-motif.svg" alt="" aria-hidden="true" />
        </div>

        <div className="auth-panel">
          <div className="auth-card">
            <h2>Sign in</h2>
            <p className="sub">Enter the DUNAVERSE and continue where you left off.</p>
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  )
}