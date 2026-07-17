/**
 * DunaLandingFooter — the single shared public-landing site footer.
 *
 * Mirrors the home page footer so every `.duna-landing` page shows an
 * identical footer. Must be rendered inside a `.duna-landing` wrapper so the
 * scoped styles in `app/(public)/dunathon-landing.css` apply (those pages
 * already import that CSS).
 *
 * Links use absolute paths (e.g. `/#earn`) so they work from any route.
 */
export default function DunaLandingFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <a href="/" className="brand-lockup">
              <img className="footer-logo" src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" />
            </a>
            <p className="faint" style={{ marginTop: '0.6rem', maxWidth: '42ch' }}>Software as big as the world. A global on-ramp to the agentic economy, run through your very own member-governed internet-native organization registered in the state of West Virginia, with legal standing all around the world.</p>
            <p className="faint" style={{ fontSize: '0.8rem' }}>Powered by <a href="https://kinship.institute" target="_blank" rel="noopener">Kinship Intelligence™</a>, Put your Good where it Does the Most.</p>
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
            <a href="#">Bluesky</a>
            <a href="#">Telegram</a>
            <a href="#">YouTube</a>
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
          <span>© 2026 Kiduna Club™, all rights reserved. Patent Pending.</span>
          <span className="legal-links"><a href="/tos">Terms of Service</a> · <a href="/privacy">Privacy Policy</a></span>
        </div>
      </div>
    </footer>
  )
}
