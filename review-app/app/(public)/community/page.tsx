import type { Metadata } from 'next'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import DunaLandingFooter from '@/components/landing/DunaLandingFooter'
import Eyebrow from '@/components/landing/ui/Eyebrow'
import DisplayHeading from '@/components/landing/ui/DisplayHeading'
import GoldEmphasis from '@/components/landing/ui/GoldEmphasis'
import StarDivider from '@/components/landing/ui/StarDivider'
import BackToOnboarding from '@/components/landing/BackToOnboarding'
import '../dunathon-landing.css'

export const metadata: Metadata = {
  title: 'Join Our Community — WV DUNA',
  description:
    'Join our communities on Telegram, Bluesky, and YouTube to learn more about Kinship and receive an early access invitation.',
}

/* ──────────────────────────────────────────────────────────────────────────
   Community channel links.
   TODO: replace the placeholder URLs below with the real Kinship channels.
   ────────────────────────────────────────────────────────────────────────── */
const COMMUNITY_LINKS = [
  {
    key: 'telegram',
    label: 'Telegram',
    blurb:
      'Join the conversation and request your early access invitation to the Genesis Kiduna.',
    cta: 'Open Telegram',
    href: 'https://t.me/kinship',
    color: '#229ED9',
    earlyAccess: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    key: 'bluesky',
    label: 'Bluesky',
    blurb:
      'Follow along and join the early access list to become a Co-founder of Kinship DUNA.',
    cta: 'Open Bluesky',
    href: 'https://bsky.app/profile/kinship.systems',
    color: '#0085FF',
    earlyAccess: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden>
        <path d="M5.7 3.5c2.5 1.9 5.2 5.7 6.3 7.8 1.1-2.1 3.8-5.9 6.3-7.8 1.8-1.4 4.7-2.4 4.7.9 0 .7-.4 5.5-.6 6.3-.7 2.7-3.4 3.4-5.9 3-.4-.1-.8-.1-1.2-.2.4.1.7.2 1.1.3 2.9.9 4 2.7 2.4 4.5-3 3.4-4.3-.9-4.7-1.9-.1-.2-.1-.3-.2-.5-.1.2-.1.3-.2.5-.4 1-1.5 5.3-4.7 1.9-1.6-1.8-.5-3.6 2.4-4.5.4-.1.7-.2 1.1-.3-.4.1-.8.1-1.2.2-2.5.4-5.2-.3-5.9-3-.2-.8-.6-5.6-.6-6.3 0-3.3 2.9-2.3 4.7-.9z" />
      </svg>
    ),
  },
  {
    key: 'youtube',
    label: 'YouTube',
    blurb:
      'Watch our videos to learn more about Kinship and how the DUNAVERSE works.',
    cta: 'Open YouTube',
    href: 'https://youtube.com/@kinship',
    color: '#FF0000',
    earlyAccess: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
]

export default function CommunityPage() {
  return (
    <div className="duna-landing">
      <DunaLandingNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-[76px] pb-[64px]"
        style={{
          background: `
            radial-gradient(900px 380px at 88% -18%, rgba(234,170,0,0.22), transparent 56%),
            radial-gradient(640px 440px at -8% 70%, rgba(3,204,217,0.14), transparent 60%),
            linear-gradient(135deg, #100E59, #09073A 80%)
          `,
        }}
      >
        {/* Ambient floating orbs */}
        <div
          aria-hidden
          className="comm-float comm-glow pointer-events-none absolute -top-24 right-[8%] h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(234,170,0,0.28), transparent 70%)' }}
        />
        <div
          aria-hidden
          className="comm-float comm-glow pointer-events-none absolute bottom-[-60px] left-[2%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(3,204,217,0.22), transparent 70%)', animationDelay: '1.5s' }}
        />

        <div className="relative z-[2] w-full max-w-[1180px] mx-auto px-6">
          <div className="comm-rise">
            <Eyebrow className="mb-5">
              Community <StarDivider /> Telegram <StarDivider /> Bluesky <StarDivider /> YouTube
            </Eyebrow>
          </div>
          <div className="comm-rise" style={{ animationDelay: '0.08s' }}>
            <DisplayHeading as="h1" className="mb-4">
              Join Our <GoldEmphasis>Community</GoldEmphasis>
            </DisplayHeading>
          </div>
          <p
            className="comm-rise text-[clamp(1.1rem,1.6vw,1.35rem)] text-white/80 max-w-[62ch] leading-[1.55]"
            style={{ animationDelay: '0.16s' }}
          >
            Join our active communities to learn more.
          </p>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <section className="w-full max-w-[1180px] mx-auto px-6 py-14 max-md:py-10">
        {/* Intro copy + early-access callout */}
        <div className="grid grid-cols-[1.2fr_1fr] max-lg:grid-cols-1 gap-8 mb-12 max-md:mb-9">
          <p
            className="comm-rise self-center text-white/85 text-[1.15rem] max-md:text-[1.05rem] leading-[1.7]"
            style={{ animationDelay: '0.1s' }}
          >
            Join our communities on{' '}
            <span className="text-white font-semibold">Telegram</span>,{' '}
            <span className="text-white font-semibold">Bluesky</span>, and{' '}
            <span className="text-white font-semibold">YouTube</span> to learn more
            about Kinship.
          </p>

          <div
            className="comm-rise relative overflow-hidden rounded-[16px] border border-accent/30 p-6"
            style={{
              animationDelay: '0.18s',
              background:
                'linear-gradient(135deg, rgba(234,170,0,0.12), rgba(3,204,217,0.06))',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl"
              style={{ background: 'radial-gradient(circle, rgba(234,170,0,0.35), transparent 70%)' }}
            />
            <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-accent mb-3">
              Early Access
            </span>
            <p className="relative text-white/85 text-[1rem] leading-[1.65]">
              Join our Telegram and Bluesky communities to receive an early access
              invitation and become a Co-founder of Kinship DUNA (the{' '}
              <GoldEmphasis>Genesis Kiduna</GoldEmphasis>).
            </p>
          </div>
        </div>

        {/* Channel cards */}
        <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-6">
          {COMMUNITY_LINKS.map((c, i) => (
            <a
              key={c.key}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="comm-card comm-rise group relative flex flex-col gap-4 overflow-hidden rounded-[18px] border border-card-border bg-card p-7 hover:border-white/25"
              style={{ animationDelay: `${0.24 + i * 0.1}s` }}
            >
              {/* Brand wash in the corner */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle, ${c.color}55, transparent 70%)` }}
              />

              <span
                className="comm-ico inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: `${c.color}1f`, color: c.color }}
              >
                {c.icon}
              </span>

              <div className="flex items-center gap-2">
                <h3 className="font-display text-[1.35rem] font-semibold text-white">
                  {c.label}
                </h3>
                {c.earlyAccess && (
                  <span className="rounded-full bg-accent/15 px-2 py-[2px] text-[0.62rem] font-bold uppercase tracking-wide text-accent">
                    Invite
                  </span>
                )}
              </div>

              <p className="text-white/65 text-[0.95rem] leading-[1.55] flex-1">
                {c.blurb}
              </p>

              <span
                className="mt-1 inline-flex items-center gap-1.5 text-[0.95rem] font-bold"
                style={{ color: c.color }}
              >
                {c.cta}
                <span className="comm-arrow">→</span>
              </span>
            </a>
          ))}
        </div>

        {/* Return path back to Step 6 of the signup wizard (reached here via the
            "Join Our Community" fallback on Step 6). Pins local progress to Step 6. */}
        <BackToOnboarding />
      </section>

      <DunaLandingFooter />
    </div>
  )
}
