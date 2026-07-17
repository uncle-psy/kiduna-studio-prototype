'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import ReCAPTCHA from 'react-google-recaptcha'
import { useAuth } from '@/lib/auth-context'
import './dunathon-landing.css'
import DunaLandingFooter from '@/components/landing/DunaLandingFooter'
import { saveEarlyAccessInfo } from '@/lib/early-access-info-api'

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''

export default function LandingPage() {
  const [contactStatus, setContactStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [contactSending, setContactSending] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [walletCopied, setWalletCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close user menu on click outside
  useEffect(() => {
    if (!userMenuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  const handleContactSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    // Honeypot: silently drop bot submissions that fill the hidden field.
    if ((data.get('_gotcha') as string)?.trim()) {
      form.reset()
      setContactStatus({
        msg: `Thank you! We've received your message and will be in touch soon for early access.`,
        ok: true,
      })
      return
    }

    const name = (data.get('name') as string)?.trim() ?? ''
    const email = (data.get('email') as string)?.trim() ?? ''
    const message = (data.get('message') as string)?.trim() ?? ''

    // reCAPTCHA must be completed before we submit. (Also narrows the token to
    // a non-null string for the API call; the backend re-verifies it.)
    if (!recaptchaToken) {
      setContactStatus({
        msg: 'Please complete the reCAPTCHA before submitting.',
        ok: false,
      })
      return
    }

    setContactSending(true)
    setContactStatus(null)
    try {
      await saveEarlyAccessInfo({ name, email, message, recaptchaToken })
      form.reset()
      // A reCAPTCHA token is single-use — clear it and reset the widget so a
      // second submission requires a fresh challenge.
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
      setContactStatus({
        msg: `Thank you! We've received your message and will be in touch soon for early access.`,
        ok: true,
      })
    } catch (err) {
      // The previous token is now spent (or rejected) — force a fresh one.
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
      setContactStatus({
        msg: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        ok: false,
      })
    } finally {
      setContactSending(false)
    }
  }

  useEffect(() => {
    const burger = document.querySelector('.nav-burger') as HTMLElement
    const mobile = document.querySelector('.nav-mobile') as HTMLElement
    if (!burger || !mobile) return
    const toggle = () => mobile.classList.toggle('open')
    const close = () => mobile.classList.remove('open')
    burger.addEventListener('click', toggle)
    mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', close))
    return () => {
      burger.removeEventListener('click', toggle)
      mobile.querySelectorAll('a').forEach(a => a.removeEventListener('click', close))
    }
  }, [])

  return (
    <div className="duna-landing">
      {/* ===== NAV ===== */}
      <div className="nav-shell">
        <div className="wrap">
          <nav className="nav">
            <a href="#home" className="logo-link">
              <img className="logo" src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" />
            </a>
            <div className="nav-links">
              <a href="/showcase">Showcase</a>
              <a href="#earn">How to Earn</a>
              <a href="/how-it-works">How it Works</a>
              <a href="#events">Events</a>
              <a href="#about">About</a>
              <a href="/nightpapers">Nightpapers</a>
            </div>
            <div className="nav-actions">
              {authLoading ? (
                <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              ) : isAuthenticated ? (
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setUserMenuOpen(p => !p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      background: 'transparent', border: 'none', padding: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: '#100E59', border: '1.5px solid rgba(255,255,255,0.18)',
                        color: '#fff', fontSize: 15, fontWeight: 600,
                      }}
                    >
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </button>
                  {userMenuOpen && (
                    <div
                      style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                        width: 240, borderRadius: 14, zIndex: 200, overflow: 'hidden',
                        background: '#0E0C3A', border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 16px 48px rgba(3,1,27,0.7)',
                      }}
                    >
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {user?.name || 'User'} · <span style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.subscription === 'cofounder' ? 'Guest' : (user?.subscription || 'Guest')}</span>
                        </div>
                      </div>
                      {user?.wallet && (
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ borderRadius: 10, padding: '8px 12px', background: 'rgba(234,170,0,0.06)', border: '1px solid rgba(234,170,0,0.15)' }}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>Wallet</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{user.wallet.slice(0, 6)}…{user.wallet.slice(-5)}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(user!.wallet); setWalletCopied(true); setTimeout(() => setWalletCopied(false), 2000) }}
                                style={{
                                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                                  padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                                  background: walletCopied ? 'rgba(74,222,128,0.15)' : 'rgba(234,170,0,0.12)',
                                  color: walletCopied ? '#4ade80' : '#EAAA00',
                                  border: `1px solid ${walletCopied ? 'rgba(74,222,128,0.3)' : 'rgba(234,170,0,0.25)'}`,
                                }}
                              >
                                {walletCopied ? '✓ Copied' : '⎘ Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ padding: '6px 0' }}>
                        <button onClick={() => { router.push('/chat'); setUserMenuOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          Go to Studio
                        </button>
                        <button onClick={() => { router.push('/launchpad'); setUserMenuOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          Launchpad
                        </button>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                        <button onClick={() => { logout(); setUserMenuOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.45)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <a href="/login" className="nav-login">Log in</a>
                  <a href="#contact" className="nav-cta">Join Early Access →</a>
                </>
              )}
            </div>
            <button className="nav-burger" aria-label="Menu">☰</button>
          </nav>
          <div className="nav-mobile">
            <a href="/showcase">Showcase</a>
            <a href="#earn">How to Earn</a>
            <a href="/how-it-works">How it Works</a>
            <a href="#events">Events</a>
            <a href="#about">About</a>
            <a href="/nightpapers">Nightpapers</a>
            {isAuthenticated ? (
              <>
                <a href="/chat">Go to Studio</a>
                <a href="#" onClick={(e) => { e.preventDefault(); logout() }}>Sign out</a>
              </>
            ) : (
              <>
                <a href="/login">Log in</a>
                <a href="#contact">Join Early Access →</a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <header className="hero" id="home">
        <img className="ridge" src="/review/screens/images/landing/ridge-motif.svg" alt="" />
        <div className="wrap">
          <div className="inner">
            <div className="eyebrow"><span className="dot"></span>Software as Big as the World.</div>
            <h1>The Agentic Economy <em className="wv-emph">Starts Here.</em></h1>
            <p className="lead">Build, launch, and scale agentic organizations on the open internet at <strong>machine speed</strong>. Join a living ecosystem where exceptional people and intelligent agents collaborate to create applications, experiences, movements, markets, knowledge, and entirely new ways of working, playing, creating, and thriving.</p>
            <p className="lead"><b>Everyone builds. Everyone contributes. Everyone can earn.</b></p>
            <p className="lead">Build with people who elevate your craft and agents that amplify your impact in an ecosystem where every contribution expands the frontier of individual, organizational, and collective agency.</p>
            <div className="callout" style={{ maxWidth: '680px' }}>
              <p><b>Founding Membership is limited to 1,000 people and closes August 11.</b> Membership is available by invitation only. Founders receive <b>bonus compute credits</b>, exclusive rewards, early access to every major release, special airdrops and giveaways, and permanent recognition as a founding member of the organizations building the first generation of the agentic economy.</p>
            </div>
            <div className="cta-row">
              <a href="#contact" className="btn btn-primary">Join Early Access →</a>
            </div>
            <div className="stamp"><span className="pin">◆</span> Get invited — meet the community, connect with Founders, or tell us what you&apos;d like to build or contribute to request an invitation.</div>
          </div>
        </div>
      </header>

      {/* ===== 01 · THE SHOWCASE ===== */}
      <section className="section" id="agentic-commerce">
        <div className="wrap">
          <div className="sec-kicker">01 · The Showcase · An invitation to the future you want to create</div>
          <h2 className="sec-title">Explore the Realms of <em className="wv-emph">Possibility.</em></h2>
          <p className="sec-lead">Each Realm is a new frontier of the agentic economy—a place where extraordinary people and intelligent agents come together to imagine, build, govern, and grow organizations, technologies, cultures, markets, and new ways of flourishing as individuals and as a collective.</p>
          <div className="lead-prose">
            <p>Every Realm is a place to belong, contribute, collaborate, and grow—each with its own purpose, community, culture, mission, and future to build. Together, the Realms form the living fabric of the agentic economy.</p>
            <p>Choose the ones that call to you. When you join a Realm, you become part of its story. You help shape its mission, build relationships that matter, create and share in its value, and take a stand for the future you want to bring into the world.</p>
          </div>

          <div className="def-row" style={{ marginTop: '48px' }}>
            <div className="def">
              <div className="n">Cultural Commons</div>
              <h3>The Ceremonial Machine</h3>
              <p>A timeless global festival for the agentic age—immersive music, art, story, ritual, and shared experience created by musicians, DJs, visual artists, game designers, storytellers, performers, and intelligent agents. The Ceremonial Machine brings the scale and intensity of a great festival into homes, venues, public spaces, big screens, XR glasses, and deep worlds that can appear anywhere people gather.</p>
            </div>
            <div className="def">
              <div className="n">Regenerative Agriculture</div>
              <h3>Cultivate Africa</h3>
              <p>Growing the next generation of African farmers, entrepreneurs, educators, and community leaders by strengthening the institutions and relationships that make regenerative agriculture flourish. By combining practical skills, agentic commerce, and human-centered leadership, Cultivate Africa helps healthy soil nourish thriving communities, resilient economies, and a more abundant future.</p>
            </div>
            <div className="def">
              <div className="n">Community Wealth</div>
              <h3>Freehold Finance</h3>
              <p>Reimagining homeownership through member-owned mortgage finance, shared equity, and pooled investment. Freehold Finance deploys intelligent agents to help people finance homes, build wealth together, and keep more of the value in the communities that create it.</p>
            </div>
            <div className="def">
              <div className="n">Family &amp; Belonging</div>
              <h3>Feathered Nest</h3>
              <p>Families are humanity&apos;s first communities. Feathered Nest helps them become places of belonging, wonder, resilience, and joy. By weaving together play, learning, caregiving, shared experiences, intelligent agents, and community support, it helps every generation grow stronger together while creating a richer world for the generations yet to come.</p>
            </div>
            <div className="def">
              <div className="n">Veteran Support</div>
              <h3>Service Alliance</h3>
              <p>Building enduring connections across generations of military service through mutual aid, recognition, shared memory, and a living history of the people, places, and moments that define a life of service.</p>
            </div>
            <div className="def">
              <div className="n">Whole-Person Health</div>
              <h3>Inner Clinic</h3>
              <p>Healthcare is more than appointments. Inner Clinic is continual care, weaving together people, practitioners, researchers, communities, intelligent agents, and continuous health data into a lifelong network of support. From prevention and diagnosis to treatment, recovery, home care, and advocacy, it keeps the whole person—emotional, physical, mental, and social—at the center of every decision, every day, between every visit, and through every stage of life.</p>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#contact" className="btn btn-primary">Join as a Founder →</a>
            <a href="/showcase" style={{ fontWeight: 700, fontSize: '14px', alignSelf: 'center' }}>Explore the Showcase →</a>
          </div>
        </div>
      </section>

      {/* ===== 02 · EARN TOGETHER ===== */}
      <section className="section" id="earn">
        <div className="wrap">
          <div className="sec-kicker">02 · Earn Together • Reciprocal Wealth in the Agentic Economy</div>
          <h2 className="sec-title">Turn your passion and experience into income, ownership, and <em className="wv-emph">meaningful work.</em></h2>
          <p className="sec-lead">Realms are real organizations with real members, real assets, real relationships, real legal standing, and real opportunities to build wealth and create value. Whether you&apos;re looking for a side hustle, a freelance practice, a growing business, or a lifelong career, you can earn by contributing your creativity, expertise, resources, and community to the projects that inspire you. Every contribution strengthens the ecosystem while opening new paths for shared prosperity.</p>

          <div className="grid-2" style={{ marginTop: '48px' }}>
            <div className="card">
              <div className="n">Earn through creativity</div>
              <h3>Create</h3>
              <p>Craft living institutions, not just content. Design Realms, alliances, and intelligent agents with purpose, personality, wisdom, and heart. Instead of producing media that is consumed and forgotten, create living beings that learn, grow, build relationships, and continue creating value long after you&apos;ve brought them into the world.</p>
            </div>
            <div className="card">
              <div className="n">Earn through craftsmanship</div>
              <h3>Build</h3>
              <p>Develop the infrastructure of the agentic age. Build deep agents, applications, workflows, marketplaces, governance systems, integrations, and developer tools that extend what organizations can accomplish. Develop software that powers mass movements around the globe.</p>
            </div>
            <div className="card">
              <div className="n">Earn through sponsorship</div>
              <h3>Sponsor</h3>
              <p>Bring real-world value into the ecosystem. Invest in organizations, offer products and services, provide expertise, fund initiatives, connect institutions, and help communities grow. Sponsors earn by contributing resources, relationships, and opportunities that strengthen the entire network.</p>
            </div>
            <div className="card">
              <div className="n">Earn through connectivity</div>
              <h3>Grow</h3>
              <p>Help communities flourish by introducing new members, welcoming new perspectives, mentoring creators, organizing events, cultivating partnerships, and expanding the reach of the Realms you&apos;re passionate about. As ecosystems gain in value, so do the opportunities they create for everyone who helps them grow.</p>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#contact" className="btn btn-primary">Join Now →</a>
          </div>
        </div>
      </section>

      {/* ===== 03 · AGENCY ===== */}
      <section className="section" id="agency">
        <div className="wrap">
          <div className="sec-kicker">03 · Individual Agency • Organizational Agency • Collective Agency</div>
          <h2 className="sec-title">Expanding human agency through shared intelligence, coordinated resources, and <em className="wv-emph">collective action.</em></h2>
          <p className="sec-lead">Agency is the ability to perceive, decide, and act in the world. It is the defining quality of every living organism, every human life, every ecosystem, and every organization. For centuries, institutions gained scale by compressing human agency into roles, hierarchies, and transactions. Today, intelligent agents and decentralized systems make it possible to reverse that pattern.</p>
          <div className="lead-prose">
            <p>Kiduna combines agentic AI, blockchain infrastructure, and the legal standing of the West Virginia DUNA Act to create internet-native organizations where humans and intelligent agents can reason, create policy, coordinate resources, and act in concert. Governance, economics, technology, and culture become composable building blocks that help communities expand what they can envision, create, and achieve together.</p>
          </div>

          <div className="def-row" style={{ marginTop: '48px' }}>
            <div className="def">
              <h3>Shared Intelligence</h3>
              <p>Bring together people and intelligent agents that learn continuously, preserve knowledge, reason collectively, and cultivate a living intelligence that grows wiser with every experience, every contribution, and every interaction.</p>
            </div>
            <div className="def">
              <h3>Coordinated Resources</h3>
              <p>Pool talent, capital, information, relationships, tools, and real-world assets through trusted governance, shared ownership, and transparent economic systems that unlock entirely new possibilities.</p>
            </div>
            <div className="def">
              <h3>Collective Action</h3>
              <p>Transform shared purpose into coordinated execution. Launch organizations, build products, fund projects, provide services, care for one another, and solve real-world problems with humans and intelligent agents working as one.</p>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#contact" className="btn btn-primary">Become a Founder →</a>
            <a href="/how-it-works" style={{ fontWeight: 700, fontSize: '14px', alignSelf: 'center' }}>See how it all works →</a>
          </div>
        </div>
      </section>

      {/* ===== 04 · EVENTS ===== */}
      <section className="section" id="events">
        <div className="wrap">
          <div className="sec-kicker">04 · Events that Celebrate · Coordinate · Orchestrate</div>
          <h2 className="sec-title">Join the launch of the <em className="wv-emph">agentic age.</em></h2>
          <p className="sec-lead">From the AI Engineer World&apos;s Fair and policy-focused DUNA Days to the global Dunathon and Kiduna Live!, our events bring together founders, builders, creators, educators, investors, policymakers, researchers, and community leaders to learn, build, and launch the first generation of internet-native organizations. Whether you&apos;re curious, exploring an idea, or ready to build a company, community, or movement, there&apos;s a place to begin—and people ready to build alongside you.</p>

          <div className="inline-cta">
            <a href="#contact" className="btn btn-primary">Join Early Access →</a>
            <a href="https://luma.com/dunathon" target="_blank" rel="noopener" style={{ fontWeight: 700, fontSize: '14px', alignSelf: 'center' }}>Live event calendar →</a>
          </div>
        </div>
      </section>

      {/* ===== 05 · ABOUT ===== */}
      <section className="section" id="about">
        <div className="wrap">
          <div className="sec-kicker">05 · About · Why I built this</div>
          <h2 className="sec-title">Thirty Years to Build <em className="wv-emph">One Thing.</em></h2>
          <p className="sec-lead">I&apos;ve spent more than three decades building internet companies, platforms, and technologies while searching for something that seemed ever more elusive—a way to unite purpose and prosperity without sacrificing either.</p>
          <div className="lead-prose">
            <p>Along the way I found extraordinary mentors, developed powerful platforms, led movements, and explored technology, economics, governance, and culture. While each of these four structural elements offered part of the solution, none addressed the greatest challenges on their own.</p>
            <p>That journey led to Kinship DUNA—the genesis DUNA—and to Kiduna, the agentic software system that supports it. Enabled by the West Virginia DUNA Act, Kiduna is the first opportunity to build internet-native organizations with real legal standing, shared ownership, intelligent agents, and economies designed to help people and ecosystems flourish together.</p>
            <p>To me, this isn&apos;t just another project or product launch. I&apos;m offering an invitation to be a real co-founder, and to co-create the next chapter of the internet itself.</p>
          </div>

          <div className="grid-2" style={{ marginTop: '48px' }}>
            <div className="card"><h3>Technology</h3><p>Building systems that amplify and promote human agency instead of replacing or flattening it.</p></div>
            <div className="card"><h3>Economics</h3><p>Creating reciprocal economies where value flows back to the people who create it.</p></div>
            <div className="card"><h3>Governance</h3><p>Designing organizations that are transparent, participatory, and capable of coordinated action.</p></div>
            <div className="card"><h3>Culture</h3><p>Strengthening the relationships, stories, rituals, and communities that make life meaningful, joyful, and deeply connected.</p></div>
          </div>

          <div className="callout">
            <p>For most of history, these structural elements of society have evolved separately. <b>Kiduna is where they compose.</b></p>
          </div>

          <div className="inline-cta">
            <a href="#contact" className="btn btn-primary">Join now! →</a>
            <a href="https://youtu.be/o-VRMB0-R98" target="_blank" rel="noopener" style={{ fontWeight: 700, fontSize: '14px', alignSelf: 'center' }}>Learn about our Origin Story →</a>
          </div>
        </div>
      </section>

      {/* ===== 06 · THE NIGHTPAPERS ===== */}
      {/* <section className="section" id="nightpapers">
        <div className="wrap">
          <div className="sec-kicker">06 · The Nightpapers · Go Deeper</div>
          <h2 className="sec-title">Where Big Ideas Become <em className="wv-emph">Real.</em></h2>
          <p className="sec-lead">The best ideas rarely arrive in meetings, at your desk, or on your phone. They visit you in the shower, late at night, or on a hike, when the noise of the world quiets down so you can hear your own inner voice.</p>
          <div className="lead-prose">
            <p>Part technical spec, part personal essay, part research notebook, and part invitation to conspire, the Nightpapers are where those voices enter into conversations. This is where the living process of invention begins, before ideas become agents, apps, organizations, and Realms.</p>
            <p>The Nightpapers are where curiosity becomes conversation—exploring the technologies, philosophies, economics, governance, and personal journeys shaping the future of the agentic economy.</p>
            <p>Whether you&apos;re interested in protocol design, organizational theory, intelligent agents, culture, consciousness, or the personal stories that inspired this work, this is where you&apos;ll find the questions, insights, and imagination behind the infrastructure.</p>
          </div>
          <div className="inline-cta">
            <a href="#contact" className="btn btn-primary">Be a co-founder →</a>
          </div>
        </div>
      </section> */}

      {/* ===== CONTACT ===== */}
      <section className="section" id="contact">
        <div className="wrap">
          <div className="sec-kicker">Be a Founding Member</div>
          <h2 className="sec-title">Join <em className="wv-emph">Early Access.</em></h2>
          <p className="sec-lead">We&apos;re looking for passionate creators, builders, organizers, sponsors, and partners to help shape the future of the agentic economy. Join the founding community for early access, exclusive events, product updates, and opportunities to build alongside exceptional people and intelligent agents at the frontiers of governance, technology, economics, and culture.</p>
          <form className="contact-form" onSubmit={handleContactSubmit}>
            <div className="cf-row">
              <label className="cf-field"><span>Name *</span><input type="text" name="name" autoComplete="name" required /></label>
              <label className="cf-field"><span>Email *</span><input type="email" name="email" autoComplete="email" required /></label>
            </div>
            <label className="cf-field"><span>Message</span><textarea name="message" rows={5} /></label>
            <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
            <div className="cf-recaptcha" style={{ marginTop: '0.5rem' }}>
              {RECAPTCHA_SITE_KEY ? (
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                  onErrored={() => setRecaptchaToken(null)}
                />
              ) : (
                <p className="cf-status cf-err" role="status">
                  reCAPTCHA is not configured. Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY to enable this form.
                </p>
              )}
            </div>
            <div className="inline-cta">
              <button type="submit" className="btn btn-primary" disabled={contactSending || !recaptchaToken}>
                {contactSending ? 'Sending' : 'Join Early Access →'}
              </button>
            </div>
            <p className="cf-consent" style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.5 }}>
              By joining early access, you agree to receive occasional emails from Kiduna about your invitation, product updates, events, and opportunities to participate. You may unsubscribe at any time.
            </p>
            {contactStatus && (
              <p className={`cf-status ${contactStatus.ok ? 'cf-ok' : 'cf-err'}`} role="status" aria-live="polite">
                {contactStatus.msg}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <DunaLandingFooter />
    </div>
  )
}