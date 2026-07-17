'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DunaDef } from '@/lib/allies-data'

function AuthModal({ open, onClose, dunaName }: { open: boolean; onClose: () => void; dunaName: string }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(3,1,27,0.72)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 200, padding: 20,
      }}
    >
      <div style={{
        background: 'var(--surface, #0A0D33)', border: '1px solid var(--border-strong, rgba(255,255,255,0.22))',
        borderRadius: 14, padding: 30, maxWidth: 420, width: '100%',
        boxShadow: '0 18px 48px rgba(3,1,27,0.55)', position: 'relative',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 14, background: 'none', border: 0,
            color: 'var(--fg-soft, rgba(255,255,255,0.60))', fontSize: '1.6rem', lineHeight: 1, cursor: 'pointer',
          }}
        >
          &times;
        </button>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: '1.2rem',
          background: 'var(--bg-deep, #03011B)', padding: 4, borderRadius: 9999,
        }}>
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSubmitted(false) }}
              style={{
                flex: 1, padding: '0.5rem', border: 0, borderRadius: 9999, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.88rem',
                transition: '160ms',
                background: tab === t ? 'var(--accent, #EAAA00)' : 'transparent',
                color: tab === t ? 'var(--on-accent, #09073A)' : 'var(--fg-muted, #CDCDCD)',
              }}
            >
              {t === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem',
          margin: '0 0 0.3rem', color: 'var(--fg, #fff)',
        }}>
          {tab === 'login' ? 'Welcome back' : 'Create your account'}
        </h3>
        <p style={{ color: 'var(--fg-muted, #CDCDCD)', fontSize: '0.92rem', margin: '0 0 1.2rem' }}>
          {tab === 'login' ? 'Log in' : 'Sign up'} to join {dunaName} and start participating.
        </p>

        {/* Form */}
        <div>
          {tab === 'signup' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--fg-soft, rgba(255,255,255,0.60))', marginBottom: 4 }}>Full name</label>
              <input type="text" placeholder="Your name" style={{
                width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border, rgba(255,255,255,0.12))',
                background: 'var(--bg, #09073A)', color: 'var(--fg, #fff)', fontSize: '0.92rem',
                fontFamily: 'var(--font-sans)', outline: 'none',
              }} />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--fg-soft, rgba(255,255,255,0.60))', marginBottom: 4 }}>Email</label>
            <input type="email" placeholder="you@example.com" style={{
              width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border, rgba(255,255,255,0.12))',
              background: 'var(--bg, #09073A)', color: 'var(--fg, #fff)', fontSize: '0.92rem',
              fontFamily: 'var(--font-sans)', outline: 'none',
            }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--fg-soft, rgba(255,255,255,0.60))', marginBottom: 4 }}>Password</label>
            <input type="password" placeholder="••••••••" style={{
              width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border, rgba(255,255,255,0.12))',
              background: 'var(--bg, #09073A)', color: 'var(--fg, #fff)', fontSize: '0.92rem',
              fontFamily: 'var(--font-sans)', outline: 'none',
            }} />
          </div>
          <button
            onClick={() => setSubmitted(true)}
            style={{
              width: '100%', padding: '1rem 1.8rem', borderRadius: 4, border: 0, cursor: 'pointer',
              background: 'var(--accent, #EAAA00)', color: 'var(--on-accent, #09073A)',
              fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.02rem',
            }}
          >
            {tab === 'login' ? 'Log in & join' : 'Sign up & join'}
          </button>
          {submitted && (
            <p style={{ color: 'var(--fg-muted, #CDCDCD)', fontSize: '0.88rem', marginTop: '1rem' }}>
              This is a draft preview, so accounts aren&rsquo;t wired up yet. In the live site you&rsquo;d be joined right after signing in.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DunaDirectoryCard({ d }: { d: DunaDef }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <article className="flex flex-col bg-surface border border-border rounded-[14px] overflow-hidden transition-all duration-150 hover:border-border-strong hover:-translate-y-0.5">
        {/* Cover */}
        <div
          className="relative h-[124px] flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 50% 32%, #100E59, #09073A 70%)' }}
        >
          <span className="absolute top-3 left-3 text-[0.62rem] tracking-[0.1em] uppercase font-bold py-[4px] px-[9px] rounded-full text-white" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
            {d.tag}
          </span>
          <span className={`absolute top-3 right-3 text-[0.62rem] tracking-[0.12em] uppercase font-bold py-[0.2rem] px-[0.5rem] rounded-full border ${d.type === 'Public' ? 'text-[#4ade80] border-[rgba(74,222,128,0.4)]' : 'text-dim border-border'}`}>
            {d.type}
          </span>
          <span className="text-[2rem] text-muted opacity-40">✦</span>
          <span className="absolute bottom-3 left-3 text-[0.72rem] font-bold text-accent bg-[rgba(234,170,0,0.12)] border border-[rgba(234,170,0,0.3)] rounded-full px-[0.5rem] py-[0.15rem]">
            {d.coin}
          </span>
        </div>
        {/* Body */}
        <div className="px-[20px] pt-[18px] pb-5 flex flex-col flex-1 gap-[10px]">
          <h3 className="font-display font-normal text-[1.3rem] text-white m-0 leading-[1.1]">{d.name}</h3>
          <div className="text-[0.78rem] text-dim -mt-1">
            by <b className="text-muted">{d.by}</b> · Registered {d.created}
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-border">
            {[
              { v: d.treasury, k: 'Treasury' },
              { v: d.members, k: 'Members' },
              { v: d.mcap, k: 'Market cap' },
            ].map((s) => (
              <div key={s.k}>
                <div className="font-display text-white text-[1.1rem] leading-none">{s.v}</div>
                <div className="text-[0.58rem] tracking-[0.1em] uppercase text-dim">{s.k}</div>
              </div>
            ))}
          </div>
          {/* CTAs */}
          <div className="flex items-center justify-between gap-3 mt-auto">
            <button
              onClick={() => setModalOpen(true)}
              className="font-sans font-bold text-[0.8rem] py-[0.46rem] px-[1.05rem] rounded-[4px] bg-accent text-on-accent hover:bg-accent-hover transition-all duration-150 cursor-pointer border-0"
            >
              Join
            </button>
            <Link href={`/duna/${d.id}`} className="text-skyblue font-semibold text-[0.84rem] flex items-center hover:text-white transition-colors">
              Learn more →
            </Link>
          </div>
        </div>
      </article>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} dunaName={d.name} />
    </>
  )
}
