'use client'

import DunaLandingNav from '@/components/landing/DunaLandingNav'
import '../dunathon-landing.css'
import DunaLandingFooter from '@/components/landing/DunaLandingFooter'
import './nightpapers.css'

export default function NightpapersPage() {
  return (
    <div className="duna-landing nightpapers-page">

      {/* ===== NAV ===== */}
      <DunaLandingNav />

      {/* ===== PAGE HERO ===== */}
      <header className="page-hero">
        <img className="ridge" src="/review/screens/images/landing/ridge-motif.svg" alt="" aria-hidden="true" />
        <div className="wrap">
          <div className="eyebrow"><span className="dot" />From Organisms to Ecosystems · Agency for All</div>
          <h1>Go <em className="wv-emph">Deeper.</em></h1>
          <p className="lead">The best ideas rarely arrive in meetings, at your desk, or on your phone. They visit you in the shower, late at night, or on a hike, when the noise of the world quiets down so you can hear your own inner voice.</p>
        </div>
      </header>

      {/* ===== SECTION ===== */}
      <section className="section" id="nightpapers">
        <div className="wrap">
          <div className="lead-prose">
            <p>Part technical spec, part personal essay, part research notebook, and part invitation to conspire, the Nightpapers are where those voices enter into conversations. This is where the living process of invention begins, before ideas become agents, apps, organizations, and Realms.</p>
            <p>The Nightpapers are where curiosity becomes conversation—exploring the technologies, philosophies, economics, governance, and personal journeys shaping the future of the agentic economy. Some are deeply technical. Others are deeply human. All are invitations to look beneath the surface, challenge assumptions, and imagine what comes next.</p>
            <p>Whether you're interested in protocol design, organizational theory, intelligent agents, culture, consciousness, or the personal stories that inspired this work, this is where you'll find the questions, insights, and imagination behind the infrastructure.</p>
            <p>The Nightpapers are written for people who want to understand not just what we're building, but why, and for those who want to help shape where it goes next.</p>
          </div>
          <div className="inline-cta" style={{ marginTop: 32 }}>
            <a href="/signup" className="btn btn-primary">Be a co-founder →</a>
          </div>
          <p className="faint" style={{ marginTop: 20 }}>The first papers are on their way. Check back soon.</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <DunaLandingFooter />

    </div>
  )
}