'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { hasMinTier } from '@/lib/tier-utils'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import LandingFooter from '@/components/landing/LandingFooter'
import type { CampaignDetail } from '@/lib/launchpad-api-types'
import { Icon } from '@iconify/react'
import '../dunathon-landing.css'

const LAUNCHPAD_SLUG = process.env.NEXT_PUBLIC_LAUNCHPAD_SLUG || 'kiduna'
const TOTAL_MEMBER_TARGET = 100

const COMMUNITY_LINKS = [
  {
    key: 'telegram',
    label: 'Telegram',
    blurb: 'Join the conversation with fellow Co-founders and the Kinship team.',
    cta: 'Open Telegram',
    href: 'https://t.me/kinship',
    color: '#229ED9',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    key: 'bluesky',
    label: 'Bluesky',
    blurb: 'Follow updates and connect with the Kinship community.',
    cta: 'Open Bluesky',
    href: 'https://bsky.app/profile/kinship.systems',
    color: '#0085FF',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M5.7 3.5c2.5 1.9 5.2 5.7 6.3 7.8 1.1-2.1 3.8-5.9 6.3-7.8 1.8-1.4 4.7-2.4 4.7.9 0 .7-.4 5.5-.6 6.3-.7 2.7-3.4 3.4-5.9 3-.4-.1-.8-.1-1.2-.2.4.1.7.2 1.1.3 2.9.9 4 2.7 2.4 4.5-3 3.4-4.3-.9-4.7-1.9-.1-.2-.1-.3-.2-.5-.1.2-.1.3-.2.5-.4 1-1.5 5.3-4.7 1.9-1.6-1.8-.5-3.6 2.4-4.5.4-.1.7-.2 1.1-.3-.4.1-.8.1-1.2.2-2.5.4-5.2-.3-5.9-3-.2-.8-.6-5.6-.6-6.3 0-3.3 2.9-2.3 4.7-.9z" />
      </svg>
    ),
  },
  {
    key: 'youtube',
    label: 'YouTube',
    blurb: 'Watch tutorials and learn how the DUNAVERSE works.',
    cta: 'Open YouTube',
    href: 'https://youtube.com/@kinship',
    color: '#FF0000',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
]

export default function CofounderPage() {
  const { token, user } = useAuth()
  // Studio access requires a real membership (member+) or the wizard role.
  // A co-founder credit maps to 'guest' in auth-context, so an un-upgraded
  // co-founder resolves to false here and is sent to /guest instead of being
  // bounced around the (active) route guards on /chat.
  const canEnterStudio = user?.role === 'wizard' || hasMinTier(user?.subscription, 'member')
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [codeCopied, setCodeCopied] = useState(false)

  const fetchCampaign = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/v1/launchpad/${LAUNCHPAD_SLUG}`, { headers })
      if (res.ok) {
        const data: CampaignDetail = await res.json()
        setCampaign(data)
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  const memberCount = campaign?.contributorCount ?? 0
  const totalCommitted = campaign?.totalCommitted ?? 0
  const minRaise = campaign?.minRaise ?? 0
  const progressPercent = minRaise > 0 ? Math.min((totalCommitted / minRaise) * 100, 100) : 0
  const memberProgressPercent = Math.min((memberCount / TOTAL_MEMBER_TARGET) * 100, 100)

  return (
    <>
      <div className="duna-landing">
        <DunaLandingNav />
      </div>

      {/* Inline animations */}
      <style jsx global>{`
        @keyframes cf-rise {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cf-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(12px, -18px) scale(1.05); }
        }
        @keyframes cf-glow {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes cf-count {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes cf-progress {
          from { width: 0; }
        }
        .cf-rise {
          opacity: 0;
          animation: cf-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .cf-float { animation: cf-float 8s ease-in-out infinite; }
        .cf-glow  { animation: cf-glow 4s ease-in-out infinite; }
        .cf-count {
          opacity: 0;
          animation: cf-count 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .cf-card {
          transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 0.3s ease,
                      box-shadow 0.3s ease;
        }
        .cf-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px -8px rgba(0,0,0,0.35);
        }
        .cf-arrow { transition: transform 0.2s ease; }
        .cf-card:hover .cf-arrow { transform: translateX(4px); }
      `}</style>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden pt-[80px] pb-[72px]"
        style={{
          background: `
            radial-gradient(900px 380px at 88% -18%, rgba(234,170,0,0.22), transparent 56%),
            radial-gradient(640px 440px at -8% 70%, rgba(3,204,217,0.14), transparent 60%),
            linear-gradient(135deg, #100E59, #09073A 80%)
          `,
        }}
      >
        {/* Ambient orbs */}
        <div
          aria-hidden
          className="cf-float cf-glow pointer-events-none absolute -top-24 right-[8%] h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(234,170,0,0.28), transparent 70%)' }}
        />
        <div
          aria-hidden
          className="cf-float cf-glow pointer-events-none absolute bottom-[-60px] left-[2%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(3,204,217,0.22), transparent 70%)', animationDelay: '1.5s' }}
        />

        <div className="relative z-[2] w-full max-w-[1080px] mx-auto px-6 text-center">
          {/* Crown icon with glow ring */}
          <div
            className="cf-rise inline-flex items-center justify-center w-[88px] h-[88px] rounded-full mb-6"
            style={{
              background: 'radial-gradient(circle, rgba(234,170,0,0.18), rgba(234,170,0,0.04))',
              border: '2px solid rgba(234,170,0,0.3)',
              boxShadow: '0 0 40px rgba(234,170,0,0.15), inset 0 0 20px rgba(234,170,0,0.05)',
            }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#EAAA00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
            </svg>
          </div>

          <div className="cf-rise" style={{ animationDelay: '0.08s' }}>
            <h1
              className="font-display text-[clamp(2.2rem,5vw,3.4rem)] font-normal text-white leading-[1.05] mb-4"
              style={{ textWrap: 'balance' }}
            >
              Welcome, <em className="font-display text-accent" style={{ fontStyle: 'italic' }}>Co-founder</em>
            </h1>
          </div>

          <p
            className="cf-rise text-[clamp(1.02rem,1.4vw,1.2rem)] text-white/65 max-w-[54ch] mx-auto leading-[1.65]"
            style={{ animationDelay: '0.16s' }}
          >
            {user?.name ? `${user.name}, you are` : 'You are'} now a founding member of the Genesis Kiduna.
            Your commitment helps shape the future of the DUNAVERSE.
          </p>
        </div>
      </section>

      {/* ── Stats Panel ── */}
      <section className="w-full max-w-[1080px] mx-auto px-6 -mt-8 relative z-[3]">
        <div
          className="cf-rise rounded-[20px] p-7 sm:p-9"
          style={{
            animationDelay: '0.28s',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px -6px rgba(0,0,0,0.3)',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-white/40">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              Loading campaign stats…
            </div>
          ) : (
            <>
              {/* Progress section */}
              <div className="mb-8">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-[0.7rem] font-bold tracking-[0.12em] uppercase text-white/35 mb-1.5">Co-founders committed</p>
                    <p className="cf-count text-[2.2rem] font-bold text-white leading-none" style={{ animationDelay: '0.5s' }}>
                      {memberCount} <span className="text-[1rem] font-normal text-white/30">/ {TOTAL_MEMBER_TARGET}</span>
                    </p>
                  </div>
                  <span
                    className="cf-count text-[1.1rem] font-bold text-accent"
                    style={{ animationDelay: '0.6s' }}
                  >
                    {memberProgressPercent.toFixed(0)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(memberProgressPercent, 1)}%`,
                      background: 'linear-gradient(90deg, #EAAA00 0%, #D4950A 60%, #C07A08 100%)',
                      boxShadow: '0 0 12px rgba(234,170,0,0.4)',
                      animation: 'cf-progress 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                      animationDelay: '0.7s',
                    }}
                  />
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: 'users', label: 'Members', value: memberCount.toString(), delay: '0.4s' },
                  { icon: 'target', label: 'Target', value: TOTAL_MEMBER_TARGET.toString(), delay: '0.5s' },
                  { icon: 'coins', label: 'Total committed', value: `${totalCommitted.toLocaleString()} USDC`, delay: '0.6s' },
                  { icon: 'bar-chart-3', label: 'USDC progress', value: `${progressPercent.toFixed(0)}%`, delay: '0.7s' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="cf-rise cf-card rounded-2xl p-4 text-center cursor-default"
                    style={{
                      animationDelay: stat.delay,
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Icon icon={`lucide:${stat.icon}`} width={20} height={20} className="text-accent mx-auto mb-1.5" />
                    <p className="text-[0.6rem] font-bold tracking-[0.1em] uppercase text-white/30 mb-1">{stat.label}</p>
                    <p className="text-[1.15rem] font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Referral Rewards ── */}
      <section className="w-full max-w-[1080px] mx-auto px-6 pt-14 pb-2 max-md:pt-10">

        {/* Header */}
        <div className="cf-rise text-center mb-8" style={{ animationDelay: '0.32s' }}>
          <p className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-accent/70 mb-4">
            Earn ✦ Share ✦ Grow
          </p>
          <h2 className="font-display text-[clamp(1.6rem,3.5vw,2.3rem)] font-normal text-white leading-snug mb-3">
            Lifetime <em className="text-accent" style={{ fontStyle: 'italic' }}>Referral Rewards</em>
          </h2>
          <p className="text-white/50 text-[1rem] max-w-[52ch] mx-auto leading-[1.6]">
            Share your Kinship Code and earn a percentage of every contribution — not just once, but for life across four levels.
          </p>
        </div>

        {/* Kinship Code — hero card */}
        {user?.kinshipCode && (
          <div
            className="cf-rise mx-auto max-w-[520px] mb-8 rounded-[20px] relative overflow-hidden"
            style={{
              animationDelay: '0.38s',
              background: 'linear-gradient(145deg, rgba(234,170,0,0.1), rgba(234,170,0,0.03))',
              border: '1px solid rgba(234,170,0,0.2)',
            }}
          >
            {/* Glow */}
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(234,170,0,0.2), transparent 70%)' }} />
            <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-16 h-40 w-40 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(3,204,217,0.12), transparent 70%)' }} />

            <div className="relative p-6 sm:p-8 text-center">
              <p className="text-[0.65rem] font-bold tracking-[0.18em] uppercase text-white/30 mb-3">Your Kinship Code</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(user.kinshipCode!)
                  setCodeCopied(true)
                  setTimeout(() => setCodeCopied(false), 2500)
                }}
                className="group relative mx-auto flex items-center gap-3 rounded-2xl px-8 py-4 transition-all duration-200 hover:scale-[1.02] cursor-pointer bg-transparent border-0"
                style={{
                  background: codeCopied
                    ? 'rgba(74,222,128,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  border: codeCopied
                    ? '1.5px solid rgba(74,222,128,0.3)'
                    : '1.5px solid rgba(255,255,255,0.08)',
                }}
              >
                <span
                  className="font-mono text-[clamp(1.5rem,4vw,2.2rem)] font-bold tracking-[0.15em] transition-colors duration-200"
                  style={{ color: codeCopied ? '#4ade80' : '#EAAA00' }}
                >
                  {user.kinshipCode}
                </span>
                <span
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: codeCopied ? 'rgba(74,222,128,0.15)' : 'rgba(234,170,0,0.12)',
                    border: `1px solid ${codeCopied ? 'rgba(74,222,128,0.3)' : 'rgba(234,170,0,0.2)'}`,
                  }}
                >
                  {codeCopied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EAAA00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  )}
                </span>
              </button>
              <p className="text-[0.8rem] text-white/30 mt-3 transition-colors duration-200">
                {codeCopied ? 'Copied to clipboard!' : 'Click to copy and share with friends'}
              </p>
            </div>
          </div>
        )}

        {/* Reward tiers */}
        <div className="grid grid-cols-4 max-md:grid-cols-2 gap-4 max-w-[680px] mx-auto">
          {[
            { level: 1, pct: '20%', label: 'Direct referral', desc: 'Someone you invite', color: '#EAAA00', delay: '0.42s' },
            { level: 2, pct: '5%', label: '2nd degree', desc: 'Their referrals', color: '#D4950A', delay: '0.48s' },
            { level: 3, pct: '3%', label: '3rd degree', desc: 'Three levels deep', color: '#B8820E', delay: '0.54s' },
            { level: 4, pct: '2%', label: '4th degree', desc: 'Four levels deep', color: '#9A6E12', delay: '0.6s' },
          ].map((t) => (
            <div
              key={t.level}
              className="cf-rise cf-card group rounded-[18px] p-5 text-center cursor-default relative overflow-hidden"
              style={{
                animationDelay: t.delay,
                background: 'rgba(255,255,255,0.015)',
                border: `1px solid ${t.color}18`,
              }}
            >
              {/* Hover glow */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at 50% 30%, ${t.color}12, transparent 70%)` }}
              />

              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `${t.color}15`, border: `1.5px solid ${t.color}28` }}
                >
                  <span className="text-xs font-bold" style={{ color: t.color }}>L{t.level}</span>
                </div>
                <p className="text-[1.7rem] font-bold text-white leading-none mb-1.5">{t.pct}</p>
                <p className="text-xs font-semibold text-white/60 mb-0.5">{t.label}</p>
                <p className="text-[10px] text-white/30">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Join Our Community ── */}
      <section className="w-full max-w-[1080px] mx-auto px-6 pt-16 pb-10 max-md:pt-12">
        <div className="cf-rise text-center mb-10" style={{ animationDelay: '0.3s' }}>
          <p className="text-[0.7rem] font-bold tracking-[0.16em] uppercase text-skyblue mb-4">
            Community ✦ Connect ✦ Grow
          </p>
          <h2
            className="font-display text-[clamp(1.6rem,3.5vw,2.3rem)] font-normal text-white leading-snug mb-3"
          >
            Join Our <em className="font-display text-accent" style={{ fontStyle: 'italic' }}>Community</em>
          </h2>
          <p className="text-white/55 text-[1rem] max-w-[48ch] mx-auto leading-[1.6]">
            Connect with fellow Co-founders, stay updated, and shape the DUNAVERSE together.
          </p>
        </div>

        <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-5">
          {COMMUNITY_LINKS.map((c, i) => (
            <a
              key={c.key}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="cf-card cf-rise group relative flex flex-col gap-4 overflow-hidden rounded-[18px] border border-card-border bg-card p-6 hover:border-white/20"
              style={{ animationDelay: `${0.4 + i * 0.1}s` }}
            >
              {/* Brand wash on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle, ${c.color}55, transparent 70%)` }}
              />

              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110"
                style={{ background: `${c.color}18`, color: c.color }}
              >
                {c.icon}
              </span>

              <h3 className="font-display text-[1.2rem] font-semibold text-white">{c.label}</h3>
              <p className="text-white/55 text-[0.9rem] leading-[1.55] flex-1">{c.blurb}</p>

              <span
                className="mt-1 inline-flex items-center gap-1.5 text-[0.9rem] font-bold"
                style={{ color: c.color }}
              >
                {c.cta}
                <span className="cf-arrow">→</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Studio CTA ── */}
      <section
        className="cf-rise w-full max-w-[1080px] mx-auto px-6 pb-16 text-center"
        style={{ animationDelay: '0.5s' }} 
      >
        <div
          className="rounded-[20px] p-8 sm:p-10 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(234,170,0,0.08), rgba(3,204,217,0.04))',
            border: '1px solid rgba(234,170,0,0.15)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(234,170,0,0.2), transparent 70%)' }}
          />

          <h3 className="relative font-display text-[clamp(1.2rem,2vw,1.5rem)] font-semibold text-white mb-2">
            Ready to build?
          </h3>
          <p className="relative text-white/50 text-[0.95rem] leading-[1.6] max-w-[42ch] mx-auto mb-6">
            Create your AI agents, define your identity, and start governing the DUNAVERSE.
          </p>
          <Link
            href={canEnterStudio ? '/chat' : '/guest'}
            className="relative inline-flex items-center gap-2 rounded-[8px] px-7 py-3.5 font-sans text-[0.95rem] font-bold transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_6px_20px_-4px_rgba(234,170,0,0.35)]"
            style={{
              background: 'linear-gradient(135deg, #EAAA00 0%, #D4950A 100%)',
              color: '#0A0D33',
            }}
          >
            Enter the Studio
            <span className="cf-arrow">→</span>
          </Link>
        </div>
      </section>

      <LandingFooter />
    </>
  )
}