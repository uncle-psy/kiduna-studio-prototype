'use client'

import { useState, useRef, useEffect } from 'react'
import { useStudio } from '@/lib/studio-context'
import { Spinner } from './UI'

const STATIC_PLATFORMS = [
  { icon: 'WV', name: 'WV DUNA', tag: 'GENESIS', tagColor: '#03CCD9', bg: '#EAAA00', textColor: '#09073A' },
  // { icon: 'MM', name: 'Mountain Mesh',    tag: 'Member',  tagColor: 'rgba(255,255,255,0.45)', bg: '#22c55e', textColor: '#fff' },
  // { icon: 'CC', name: 'WV Commerce Club', tag: 'Founder', tagColor: 'rgba(255,255,255,0.45)', bg: '#f43f5e', textColor: '#fff' },
]

export default function PlatformSwitcher() {
  const {
    platforms,
    platformsLoading,
    currentPlatform,
    setPlatform,
    handleCreatePlatform,
  } = useStudio()

  const [open,     setOpen]     = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newDesc,  setNewDesc]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState(0)

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setError('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    setError('')
    try {
      await handleCreatePlatform({
        name:        newName.trim(),
        description: newDesc.trim(),
        created_by:  'studio-user',
      })
      setNewName('')
      setNewDesc('')
      setCreating(false)
      setOpen(false)
    } catch (err) {
      setError((err as Error).message || 'Failed to create platform')
    } finally {
      setSaving(false)
    }
  }

  if (platformsLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-card-border bg-input min-w-0 lg:min-w-[180px]">
        <Spinner size="sm" />
        <span className="text-xs text-muted">Loading...</span>
      </div>
    )
  }

  const current = STATIC_PLATFORMS[selected]

  return (
    <div ref={ref} className="relative">

      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '5px 12px 5px 7px',
          background: open ? 'rgba(234,170,0,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(234,170,0,0.30)' : 'rgba(255,255,255,0.10)'}`,
          borderRadius: 999, cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
          minWidth: 164,
        }}
        onMouseEnter={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.16)'
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.10)'
          }
        }}
      >
        {/* Avatar */}
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background: current.bg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: current.textColor,
          flexShrink: 0, fontFamily: 'var(--font-display)',
        }}>
          {current.icon}
        </span>

        {/* Name + tag */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
            {current.name}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 800, letterSpacing: '0.13em',
            textTransform: 'uppercase' as const, color: current.tagColor, flexShrink: 0,
          }}>
            {current.tag}
          </span>
        </div>

        {/* Chevron */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.40)" strokeWidth="2.5"
          style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          width: 236,
          background: 'rgba(7,5,40,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 14,
          boxShadow: '0 12px 36px rgba(3,1,27,0.65)',
          zIndex: 999, overflow: 'hidden',
          animation: 'wvDropIn 0.14s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Section label */}
          <div style={{
            padding: '11px 16px 5px',
            fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.28)',
          }}>
            Your DUNAs
          </div>

          {/* Platform rows */}
          {STATIC_PLATFORMS.map((d, i) => {
            const isActive = selected === i
            return (
              <button
                key={d.icon}
                onClick={() => { setSelected(i); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  width: '100%', padding: '9px 14px',
                  background: isActive ? 'rgba(234,170,0,0.07)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '2px solid #EAAA00' : '2px solid transparent',
                  cursor: 'pointer', textAlign: 'left' as const,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {/* Avatar */}
                <span style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: d.bg,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: d.textColor, flexShrink: 0,
                  fontFamily: 'var(--font-display)',
                  boxShadow: isActive ? '0 0 0 2px rgba(234,170,0,0.30)' : 'none',
                }}>
                  {d.icon}
                </span>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? '#EAAA00' : '#fff', lineHeight: 1.25 }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: isActive ? 'rgba(234,170,0,0.70)' : d.tagColor, marginTop: 1 }}>
                    {d.tag}
                  </div>
                </div>

                {/* Active check */}
                {isActive && (
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(234,170,0,0.12)',
                    border: '1.5px solid rgba(234,170,0,0.45)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#EAAA00" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            )
          })}

          {/* Divider — kept (hidden visually since "Start a new DUNA" is commented out, but preserved for re-enable) */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />

          {/* Start a new DUNA — commented out */}
          {/* <button
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '10px 16px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.70)',
              fontWeight: 600, fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <span style={{ fontSize: 16 }}>+</span> Start a new DUNA
          </button> */}
        </div>
      )}

      <style>{`
        @keyframes wvDropIn {
          from { opacity: 0; transform: translateY(-5px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}