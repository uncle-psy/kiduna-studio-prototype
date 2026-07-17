'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

/**
 * PrototypeProvider — shared state for the "Prototype controls" tool, mirroring
 * the WV DUNA reference (prototype-only, persisted in localStorage).
 *
 * Each control drives the same real effect as the reference:
 *   • level   → membership badge in the header
 *   • mode    → Active (/chat) vs Building (/agents) navigation
 *   • duna    → workspace + Ask-dock ally name / avatar / coin symbol
 *   • env     → install banner shown (web) / hidden (installed)
 *   • os      → install banner text + CTA per operating system
 *   • firstRun→ session flag
 */

export const LEVELS = [
  { id: 'guest', name: 'Guest' },
  { id: 'member', name: 'Member' },
  { id: 'founder', name: 'Founder' },
  { id: 'builder', name: 'Builder' },
  { id: 'sponsor', name: 'Sponsor' },
  { id: 'catalyst', name: 'Catalyst' },
  { id: 'luminary', name: 'Luminary' },
] as const

export const DUNAS = {
  wv: { name: 'WV DUNA', short: 'WV', ally: 'WV DUNA Ally', tag: 'Genesis', sym: 'WVDUNA' },
  mesh: { name: 'Mountain Mesh', short: 'MM', ally: 'Mountain Mesh Ally', tag: '', sym: 'MESH' },
  cc: { name: 'WV Commerce Club', short: 'CC', ally: 'Commerce Club Ally', tag: '', sym: 'CCLUB' },
} as const

export type DunaId = keyof typeof DUNAS

export const OS_LABELS: Record<string, string> = {
  mac: 'macOS',
  windows: 'Windows',
  chromeos: 'ChromeOS',
  ios: 'iOS',
  android: 'Android',
  linux: 'Linux',
}

export interface ProtoState {
  level: string
  mode: 'active' | 'builder'
  duna: DunaId
  env: 'web' | 'installed'
  os: string
  firstRun: boolean
}

const DEFAULTS: ProtoState = {
  level: 'member',
  mode: 'active',
  duna: 'wv',
  env: 'web',
  os: 'mac',
  firstRun: true,
}

const STORAGE_KEY = 'wvduna_proto'

function detectOS(): string {
  if (typeof navigator === 'undefined') return 'mac'
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/CrOS/i.test(ua)) return 'chromeos'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Linux/i.test(ua)) return 'linux'
  return 'mac'
}

/** Install-banner copy derived from env + os, matching the reference. */
// export function bannerCopy(state: ProtoState): { show: boolean; text: string; bold: string; tail: string; cta: string } {
//   const osName = OS_LABELS[state.os] || 'your device'
//   const mobile = state.os === 'ios' || state.os === 'android'
//   return {
//     show: state.env === 'web',
//     text: "You're on the web app. ",
//     bold: mobile ? 'Get the WVDUNA app' : `Install WVDUNA for ${osName}`,
//     tail: mobile ? ` for ${osName}.` : ' for a faster, native experience.',
//     cta: mobile ? 'Open in App Store' : `Download for ${osName}`,
//   }
// }

export const levelIndex = (level: string) => Math.max(0, LEVELS.findIndex((l) => l.id === level))

interface PrototypeContextValue {
  state: ProtoState
  ready: boolean
  set: (patch: Partial<ProtoState>) => void
  reset: () => void
  toast: (msg: string) => void
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null)

export function PrototypeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProtoState>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    let next = { ...DEFAULTS, os: detectOS() }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) next = { ...next, ...JSON.parse(saved) }
    } catch {}
    setState(next)
    setReady(true)
  }, [])

  // Reflect onto <html> so plain CSS can react if needed (matches data-* attrs)
  useEffect(() => {
    if (!ready) return
    const el = document.documentElement
    el.dataset.protoMode = state.mode
    el.dataset.protoDuna = state.duna
    el.dataset.protoEnv = state.env
    el.dataset.protoOs = state.os
    el.dataset.protoLevel = state.level
  }, [state, ready])

  const set = useCallback((patch: Partial<ProtoState>) => {
    setState((prev) => {
      const nextState = { ...prev, ...patch }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)) } catch {}
      return nextState
    })
  }, [])

  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setState({ ...DEFAULTS, os: detectOS() })
  }, [])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout((toast as any)._t)
    ;(toast as any)._t = window.setTimeout(() => setToastMsg(null), 2200)
  }, [])

  return (
    <PrototypeContext.Provider value={{ state, ready, set, reset, toast }}>
      {children}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 90,
            transform: 'translateX(-50%)',
            background: '#EAAA00',
            color: '#09073A',
            fontWeight: 700,
            padding: '11px 18px',
            borderRadius: 999,
            zIndex: 400,
            boxShadow: '0 18px 48px rgba(3,1,27,0.55)',
            fontSize: '0.9rem',
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          {toastMsg}
        </div>
      )}
    </PrototypeContext.Provider>
  )
}

export function usePrototype() {
  const ctx = useContext(PrototypeContext)
  if (!ctx) throw new Error('usePrototype must be used within PrototypeProvider')
  return ctx
}
