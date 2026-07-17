'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const STEPS = ['INFORM', 'INSTRUCT', 'EMPOWER', 'ALIGN']

/* ── Step 1 — Inform ─────────────────────────────────── */
function StepInform({ name, setName, handle, setHandle, source, setSource }: {
  name: string; setName: (v: string) => void
  handle: string; setHandle: (v: string) => void
  source: string; setSource: (v: string) => void
}) {
  const options = [
    { id: 'profile', icon: '◐', label: 'Use my profile', sub: 'Your interests, your DUNAs, what you\'ve told the network.' },
    { id: 'knowledge', icon: '❡', label: 'Add knowledge bases', sub: 'Kiduna Nightpapers, your documents, a DUNA\'s library.' },
    { id: 'blank', icon: '○', label: 'Start blank', sub: 'Teach it as you go.' },
  ]
  return (
    <div style={{ background: '#0D0F2E', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '32px 36px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#03CCD9', marginBottom: 10 }}>
        Step 1 · Inform
      </div>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 8px', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
        What should your Ally know?
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px' }}>
        Start from you, pull in shared knowledge, or begin with a blank slate.
      </p>

      {/* Name */}
      <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 8 }}>Name your Ally</label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Concierge"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#080A25', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6, padding: '12px 16px', color: '#fff', fontSize: 14,
          marginBottom: 20, outline: 'none',
        }}
      />

      {/* Handle */}
      <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 8 }}>Handle</label>
      <input
        value={handle}
        onChange={e => setHandle(e.target.value)}
        placeholder="@ada"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#080A25', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6, padding: '12px 16px', color: '#fff', fontSize: 14,
          marginBottom: 24, outline: 'none',
        }}
      />

      {/* Source options */}
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => setSource(opt.id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 16,
            background: source === opt.id ? 'rgba(180,100,0,0.18)' : '#080A25',
            border: `1px solid ${source === opt.id ? 'rgba(180,100,0,0.55)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
            marginBottom: 10, textAlign: 'left',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: '#100E59', border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#EAAA00',
          }}>{opt.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{opt.sub}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ── Step 2 — Instruct ───────────────────────────────── */
function StepInstruct({ stance, setStance, custom, setCustom }: {
  stance: string; setStance: (v: string) => void
  custom: string; setCustom: (v: string) => void
}) {
  const options = [
    { id: 'concierge', icon: '✦', label: 'Concierge', sub: 'Warm, helpful, keeps track of what matters to you.' },
    { id: 'guide', icon: '☿', label: 'Guide', sub: 'Reflective and probing, like The Alchemist.' },
    { id: 'operator', icon: '⚙', label: 'Operator', sub: 'Direct and task-focused — gets things done.' },
    { id: 'custom', icon: '❝', label: 'Custom', sub: 'Write the stance yourself.' },
  ]
  return (
    <div style={{ background: '#0D0F2E', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '32px 36px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#03CCD9', marginBottom: 10 }}>
        Step 2 · Instruct
      </div>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 8px', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
        Who is your Ally?
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px' }}>
        Pick a stance — its role and voice. You can refine the exact words later in Builder Mode.
      </p>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => setStance(opt.id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 16,
            background: stance === opt.id ? 'rgba(180,100,0,0.18)' : '#080A25',
            border: `1px solid ${stance === opt.id ? 'rgba(180,100,0,0.55)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
            marginBottom: 10, textAlign: 'left',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: '#100E59', border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#EAAA00',
          }}>{opt.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{opt.sub}</div>
          </div>
        </button>
      ))}
      {stance === 'custom' && (
        <textarea
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="In your own words…"
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box', marginTop: 8,
            background: '#080A25', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, padding: '12px 16px', color: '#fff', fontSize: 14,
            outline: 'none', resize: 'vertical',
          }}
        />
      )}
    </div>
  )
}

/* ── Step 3 — Empower ────────────────────────────────── */
function StepEmpower({ tools, setTools }: { tools: string[]; setTools: (v: string[]) => void }) {
  const options = [
    { id: 'google', icon: 'G', label: 'Google', sub: 'Calendar, Drive, Gmail' },
    { id: 'telegram', icon: '✈', label: 'Telegram', sub: 'Messages & bots' },
    { id: 'solana', icon: '◎', label: 'Solana', sub: 'Wallet & treasury — read-only to start' },
    { id: 'bluesky', icon: '☁', label: 'Bluesky', sub: 'Post & reply' },
  ]
  const toggle = (id: string) =>
    setTools(tools.includes(id) ? tools.filter(t => t !== id) : [...tools, id])
  return (
    <div style={{ background: '#0D0F2E', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '32px 36px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#03CCD9', marginBottom: 10 }}>
        Step 3 · Empower
      </div>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 8px', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
        What can it touch?
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px' }}>
        Connect only what you want. You stay in control — anything consequential routes through Approve.
      </p>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => toggle(opt.id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 16,
            background: tools.includes(opt.id) ? 'rgba(180,100,0,0.18)' : '#080A25',
            border: `1px solid ${tools.includes(opt.id) ? 'rgba(180,100,0,0.55)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
            marginBottom: 10, textAlign: 'left',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: '#100E59', border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#EAAA00',
          }}>{opt.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{opt.sub}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ── Step 4 — Align ──────────────────────────────────── */
function StepAlign({ skills, setSkills }: { skills: string[]; setSkills: (v: string[]) => void }) {
  const options = [
    { id: 'morning', icon: '☼', label: 'Morning briefing', sub: 'When it\'s 7am, summarize what\'s new across my DUNAs.' },
    { id: 'email', icon: '✉', label: 'Email replies', sub: 'When an email arrives, draft a friendly reply for my review.' },
    { id: 'nothing', icon: '○', label: 'Nothing for now', sub: 'I\'ll set skills up later. Just let me chat.' },
  ]
  const toggle = (id: string) =>
    setSkills(skills.includes(id) ? skills.filter(s => s !== id) : [...skills, id])
  return (
    <div style={{ background: '#0D0F2E', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '32px 36px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#03CCD9', marginBottom: 10 }}>
        Step 4 · Align
      </div>
      <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 8px', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
        When should it act?
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px' }}>
        Turn on a starter skill or two — or leave it all off and just chat. Skills run quietly in the background.
      </p>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => toggle(opt.id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 16,
            background: skills.includes(opt.id) ? 'rgba(180,100,0,0.18)' : '#080A25',
            border: `1px solid ${skills.includes(opt.id) ? 'rgba(180,100,0,0.55)' : 'rgba(255,255,255,0.09)'}`,
            borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
            marginBottom: 10, textAlign: 'left',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: '#100E59', border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#EAAA00',
          }}>{opt.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{opt.sub}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────── */
export default function SetupAllyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('Concierge')
  const [handle, setHandle] = useState(`@${user?.name?.toLowerCase().replace(/\s+/g, '') || 'ada'}`)
  const [source, setSource] = useState('profile')
  const [stance, setStance] = useState('concierge')
  const [custom, setCustom] = useState('')
  const [tools, setTools] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])

  const isLast = step === STEPS.length - 1

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#03CCD9', marginBottom: 6 }}>
            Create your Ally
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: '#fff', margin: '0 0 6px', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            Make it yours
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Four short steps. Stop anytime — you can always just chat.
          </p>
        </div>
        <button
          onClick={() => router.push('/agents')}
          style={{
            fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '8px 18px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
          Skip — just chat
        </button>
      </div>

      {/* Step tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              height: 3, width: '100%', borderRadius: 2,
              background: i <= step ? '#EAAA00' : 'rgba(255,255,255,0.1)',
              marginBottom: 8,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.10em',
              color: i === step ? '#fff' : 'rgba(255,255,255,0.35)',
            }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <StepInform name={name} setName={setName} handle={handle} setHandle={setHandle} source={source} setSource={setSource} />}
      {step === 1 && <StepInstruct stance={stance} setStance={setStance} custom={custom} setCustom={setCustom} />}
      {step === 2 && <StepEmpower tools={tools} setTools={setTools} />}
      {step === 3 && <StepAlign skills={skills} setSkills={setSkills} />}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button
          onClick={() => step === 0 ? router.push('/agents') : setStep(step - 1)}
          style={{
            fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '12px 24px', cursor: 'pointer',
          }}>
          ← Back
        </button>
        <button
          onClick={() => isLast ? router.push('/agents') : setStep(step + 1)}
          style={{
            fontSize: 14, fontWeight: 700, color: '#09073A',
            background: '#EAAA00', border: 'none',
            borderRadius: 10, padding: '12px 28px', cursor: 'pointer',
          }}>
          {isLast ? 'Finish →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}