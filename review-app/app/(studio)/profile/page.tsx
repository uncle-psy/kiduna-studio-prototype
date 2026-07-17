'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useStudio } from '@/lib/studio-context'
import { tierLabel, TIER_NAMES } from '@/lib/tier-utils'
import { listAgents } from '@/lib/agents-api'

export default function ProfilePage() {
    const { user } = useAuth()
    const { currentPlatform } = useStudio()
    const router = useRouter()
    const levelName = tierLabel(user?.subscription)
    const lvlIdx = TIER_NAMES.indexOf((user?.subscription || 'member') as any)
    const LEVELS = TIER_NAMES
    const [allies, setAllies] = useState<any[]>([])

    useEffect(() => {
        listAgents({ wallet: user?.wallet, platformId: currentPlatform?.id }).then(r => setAllies(r.agents || [])).catch(() => { })
    }, [])

    const initial = user?.name?.charAt(0).toUpperCase() || 'U'

    return (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 32 }}>

            {/* Left — avatar + badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{
                    width: 180, height: 180, borderRadius: 16,
                    background: '#100E59', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 72, fontWeight: 800, color: '#EAAA00',
                    fontFamily: 'var(--font-display)',
                }}>
                    {user?.profileImage
                        ? <img src={user.profileImage} alt={user.name || ''} style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }} />
                        : initial}
                </div>

                {/* Member badge */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    border: '1px solid rgba(234,170,0,0.45)', borderRadius: 999,
                    padding: '5px 14px', background: 'transparent',
                }}>
                    <span style={{ display: 'inline-flex', gap: 3 }}>
                        {LEVELS.map((_, i) => (
                            <span key={i} style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: i <= lvlIdx ? '#EAAA00' : 'rgba(234,170,0,0.2)',
                            }} />
                        ))}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#EAAA00', letterSpacing: '0.06em' }}>{levelName}</span>
                </div>
            </div>

            {/* Right — profile info */}
            <div style={{ flex: 1, minWidth: 0 }}>

                {/* YOUR PROFILE label */}
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#03CCD9', marginBottom: 6 }}>
                    Your Profile
                </div>

                {/* Name */}
                <h1 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 6px', lineHeight: 1.1, fontFamily: 'var(--font-display)' }}>
                    {user?.name || 'User'}
                </h1>

                {/* Handle + joined */}
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 12px' }}>
                    @{user?.name?.toLowerCase().replace(/\s+/g, '') || 'user'} · joined at genesis
                </p>

                {/* Bio */}
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', margin: '0 0 24px', lineHeight: 1.6 }}>
                    {levelName} of the genesis DUNA. Building community wireless with Mountain Mesh. Pseudonymous by choice.
                </p>

                {/* Stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
                    {[
                        { label: 'STANDING', value: levelName },
                        { label: 'WVDUNA HELD', value: '$0' },
                        { label: 'ALLOTMENT', value: 'Starter' },
                    ].map(card => (
                        <div key={card.label} style={{
                            background: '#0A0B2E', border: '1px solid rgba(255,255,255,0.09)',
                            borderRadius: 12, padding: '14px 16px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EAAA00', flexShrink: 0 }} />
                                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{card.label}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Your allies */}
                {allies.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px', fontFamily: 'var(--font-display)' }}>Your allies</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {allies.map(ally => (
                                <div key={ally.id} style={{
                                    background: '#0A0B2E', border: '1px solid rgba(255,255,255,0.09)',
                                    borderRadius: 12, padding: '14px 16px',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 8, background: '#100E59',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 14, fontWeight: 800, color: '#EAAA00',
                                    }}>
                                        {ally.name?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{ally.name}</div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>
                                            {ally.ally_type || 'Personal'} · {ally.status || 'draft'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/agent/${ally.id}`)}
                                        style={{
                                            fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                                        }}>
                                        Open in Builder
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Your DUNAs */}
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px', fontFamily: 'var(--font-display)' }}>Your DUNAs</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {currentPlatform ? (
                            <div style={{
                                background: '#0A0B2E', border: '1px solid rgba(255,255,255,0.09)',
                                borderRadius: 12, padding: '14px 16px',
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #EAAA00, #C8920A)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 800, color: '#09073A',
                                }}>WV</div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>WV DUNA</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Genesis · home</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: '#0A0B2E', border: '1px solid rgba(255,255,255,0.09)',
                                borderRadius: 12, padding: '14px 16px',
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #EAAA00, #C8920A)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 800, color: '#09073A',
                                }}>WV</div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>WV DUNA</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Genesis · home</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}