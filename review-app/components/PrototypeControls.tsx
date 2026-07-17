'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { usePrototype, DUNAS, LEVELS, type DunaId } from '@/lib/prototype-context'

/**
 * PrototypeControls — floating "Prototype controls" tool (matches WV DUNA ref).
 * Each button performs the same effect as the reference app.js engine:
 *   • Membership level → header membership badge
 *   • Mode            → Active (/chat) / Building (/agents)
 *   • Current DUNA    → workspace + Ask-dock ally name/avatar (toast)
 *   • Environment     → install banner shown (web) / hidden (installed)
 *   • Operating system→ install banner text + CTA per OS
 *   • Device frame    → live responsive preview (iframe in a device bezel)
 *   • Session         → First-run toggle / Show login / Reset state
 *
 * The device preview iframe loads `?protoframe=1`; when present this renders
 * nothing, so there's no nested FAB inside the preview.
 */

type Device = 'off' | 'tablet' | 'phone'

const DEVICES: Record<Exclude<Device, 'off'>, { w: number; h: number; label: string }> = {
  tablet: { w: 834, h: 900, label: 'Tablet' },
  phone: { w: 390, h: 820, label: 'Phone' },
}

export default function PrototypeControls() {
  const router = useRouter()
  const { logout } = useAuth()
  const { state, ready, set, reset, toast } = usePrototype()

  const [mounted, setMounted] = useState(false)
  const [isFrame, setIsFrame] = useState(false)
  const [open, setOpen] = useState(false)
  const [device, setDevice] = useState<Device>('off')
  const [viewport, setViewport] = useState({ w: 1280, h: 800 })

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    setIsFrame(params.has('protoframe'))
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!mounted || isFrame || !ready) return null

  const previewSrc = (() => {
    const url = new URL(window.location.href)
    url.searchParams.set('protoframe', '1')
    return url.toString()
  })()

  const segBtn = (active: boolean): CSSProperties => ({
    fontSize: '0.74rem',
    fontWeight: 700,
    padding: '5px 10px',
    borderRadius: 999,
    border: `1px solid ${active ? 'rgba(234,170,0,0.5)' : 'rgba(255,255,255,0.12)'}`,
    background: active ? 'rgba(234,170,0,0.14)' : '#03011B',
    color: active ? '#EAAA00' : '#CDCDCD',
    cursor: 'pointer',
    transition: '120ms',
  })

  function Group({
    label,
    options,
    value,
    onSelect,
  }: {
    label: string
    options: { value: string; label: string }[]
    value: string
    onSelect: (v: string) => void
  }) {
    return (
      <div style={{ marginBottom: 14 }}>
        <span style={labStyle}>{label}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {options.map((o) => (
            <button key={o.value} style={segBtn(value === o.value)} onClick={() => onSelect(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  function handleReset() {
    if (!window.confirm('Reset prototype state to defaults?')) return
    reset()
    setDevice('off')
    toast('Prototype state reset')
  }

  function handleShowLogin() {
    try { logout() } catch {}
    router.push('/login')
  }

  return (
    <>
      {/* ── Device preview overlay ── */}
      {device !== 'off' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 250,
            background: '#05030f',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            gap: 16,
          }}
          onClick={() => setDevice('off')}
        >
          <DeviceFrame device={device} viewport={viewport} src={previewSrc} />
          <button
            onClick={() => setDevice('off')}
            style={{
              background: '#EAAA00',
              color: '#09073A',
              border: 0,
              borderRadius: 6,
              padding: '0.5rem 1rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Exit {DEVICES[device].label} preview
          </button>
        </div>
      )}

      {/* ── Control panel ── */}
      {open && (
        <aside
          style={{
            position: 'fixed',
            right: 18,
            bottom: 78,
            zIndex: 300,
            width: 312,
            maxWidth: 'calc(100vw - 36px)',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            background: '#0A0D33',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 14,
            boxShadow: '0 18px 48px rgba(3,1,27,0.55)',
            padding: 16,
          }}
        >
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.1rem', margin: '0 0 2px', color: '#fff' }}>
            Prototype controls
          </h4>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', margin: '0 0 14px' }}>
            Not part of the product — flip these to preview the adaptive experience.
          </p>

          <Group
            label="Membership level"
            value={state.level}
            onSelect={(v) => set({ level: v })}
            options={LEVELS.map((l) => ({ value: l.id, label: l.name }))}
          />

          <Group
            label="Mode"
            value={state.mode}
            onSelect={(v) => {
              set({ mode: v as 'active' | 'builder' })
              router.push(v === 'builder' ? '/agents' : '/chat')
            }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'builder', label: 'Building' },
            ]}
          />

          <Group
            label="Current DUNA (theme + economics)"
            value={state.duna}
            onSelect={(v) => {
              set({ duna: v as DunaId })
              toast('Now in ' + DUNAS[v as DunaId].name)
            }}
            options={Object.entries(DUNAS).map(([id, d]) => ({ value: id, label: d.name }))}
          />

          <Group
            label="Environment"
            value={state.env}
            onSelect={(v) => set({ env: v as 'web' | 'installed' })}
            options={[
              { value: 'web', label: 'Web app' },
              { value: 'installed', label: 'Installed app' },
            ]}
          />

          <Group
            label="Operating system"
            value={state.os}
            onSelect={(v) => set({ os: v })}
            options={[
              { value: 'mac', label: 'macOS' },
              { value: 'windows', label: 'Windows' },
              { value: 'chromeos', label: 'ChromeOS' },
              { value: 'ios', label: 'iOS' },
              { value: 'android', label: 'Android' },
            ]}
          />

          {/* Device frame — functional responsive preview */}
          <div style={{ marginBottom: 14 }}>
            <span style={labStyle}>Device frame</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button style={segBtn(device === 'off')} onClick={() => setDevice('off')}>Off</button>
              <button style={segBtn(device === 'tablet')} onClick={() => setDevice('tablet')}>Tablet</button>
              <button style={segBtn(device === 'phone')} onClick={() => setDevice('phone')}>Phone</button>
            </div>
          </div>

          {/* Session — functional */}
          <div style={{ marginBottom: 14 }}>
            <span style={labStyle}>Session</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button style={segBtn(state.firstRun)} onClick={() => set({ firstRun: !state.firstRun })}>
                First-run: {state.firstRun ? 'ON' : 'OFF'}
              </button>
              <button style={segBtn(false)} onClick={handleShowLogin}>Show login</button>
              <button style={segBtn(false)} onClick={handleReset}>Reset state</button>
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginTop: 6 }}>
            State persists in this browser (localStorage). <b style={{ color: 'rgba(255,255,255,0.7)' }}>Reset state</b> restores defaults.
          </div>
        </aside>
      )}

      {/* ── FAB (sun / brightness icon) ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Prototype controls"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 300,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#03CCD9',
          color: '#002',
          border: 0,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 18px 48px rgba(3,1,27,0.55)',
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
        </svg>
      </button>
    </>
  )
}

const labStyle: CSSProperties = {
  fontSize: '0.64rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.6)',
  marginBottom: 7,
  display: 'block',
}

function DeviceFrame({
  device,
  viewport,
  src,
}: {
  device: Exclude<Device, 'off'>
  viewport: { w: number; h: number }
  src: string
}) {
  const { w, h, label } = DEVICES[device]
  const scale = Math.min(1, (viewport.h - 150) / h, (viewport.w - 60) / w)

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ width: w * scale, height: h * scale }}>
      <div
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: '#09073A',
          borderRadius: 42,
          border: '14px solid #15131f',
          boxShadow: '0 18px 48px rgba(3,1,27,0.55)',
          overflow: 'hidden',
        }}
      >
        <iframe
          src={src}
          title={`${label} preview`}
          style={{ width: '100%', height: '100%', border: 0, display: 'block', borderRadius: 28 }}
        />
      </div>
    </div>
  )
}
