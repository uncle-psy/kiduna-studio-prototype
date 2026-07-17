'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import StudioHeader from '@/components/StudioHeader'
import StudioSidebar from '@/components/StudioSidebar'
import AskDunaTab from '@/components/AskDunaTab'
import PrototypeControls from '@/components/PrototypeControls'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuth } from '@/lib/auth-context'
import { hasMinTier } from '@/lib/tier-utils'
import { listAgents } from '@/lib/agents-api'
import { listContexts } from '@/lib/context-api'
import { getRawOnboarding } from '@/lib/onboarding'
import { StudioMarketProvider } from '@/lib/studio-market-context'
import { SolanaWalletProvider } from '@/components/wallet/SolanaWalletProvider'
import '@solana/wallet-adapter-react-ui/styles.css'
import { PrototypeProvider } from '@/lib/prototype-context'

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)
  const [showKidunaHint, setShowKidunaHint] = useState(false)

  // ── Ask WV DUNA dock ───────────────────────────────────────────────────────
  // Owned here so the page content can shrink to make room for the dock (the
  // screen "adjusts") instead of the dock overlaying the content.
  const [dockOpen, setDockOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  // Push the layout aside by the dock width on desktop; on mobile the dock
  // covers most of the screen, so overlaying it (no push) is the right call.
  const dockPush = dockOpen && isDesktop ? 'min(360px, 92vw)' : '0px'

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      if (isLoading) return

      // Allow /wallet access without onboarding checks (guest users need it)
      if (pathname === '/wallet') { if (!cancelled) setChecked(true); return }

      if (!user?.wallet) return

      // Wizard and sponsor users skip all checks
      if (user.role === 'wizard' || user.role === 'sponsor') { setChecked(true); return }

      // All authenticated users with any subscription can enter studio.
      // Feature gating happens inside individual pages, not at the layout level.

      // Onboarding checks.
      // Use the RAW record so we can see the 'complete' state — getOnboarding()
      // returns null when complete, which would hide it from the check below.
      try {
        const ob = await getRawOnboarding(user.wallet)

        // Onboarding explicitly complete → allow through immediately. The
        // onboarding record is the source of truth; don't re-derive completion
        // from agent inspection (which is racy and breaks on subtype mismatch).
        if (ob?.currentStep === 'complete') {
          if (!cancelled) setChecked(true)
          return
        }

        // An in-progress onboarding record exists → resume the flow.
        if (ob) {
          if (!cancelled) router.replace('/onboarding')
          return
        }

        // No onboarding record at all (legacy users created before onboarding
        // was tracked) → fall back to inspecting their agents.
        const result = await listAgents({ wallet: user.wallet, includeWorkers: true })
        const agents = result.agents || []
        const hasBigAvatar = agents.some(
          (a: any) => (a.presenceSubtype || a.presence_subtype || '').toUpperCase() === 'BIG_AVATAR'
        )
        const hasWorker = agents.some(
          (a: any) => (a.type || a.agent_type || '').toLowerCase() === 'worker'
        )

        if (!hasBigAvatar || !hasWorker) {
          if (!cancelled) router.replace('/onboarding')
          return
        }
      } catch {
        if (!cancelled) router.replace('/onboarding')
        return
      }

      if (!cancelled) setChecked(true)
    }

    checkAccess()
    return () => { cancelled = true }
  }, [user?.wallet, isLoading, pathname])


  // Check if user needs Kiduna hint (shown after onboarding, hidden once Kiduna created)
  useEffect(() => {
    if (!checked || !user?.wallet) return
    async function checkKiduna() {
      try {
        const hintFlag = localStorage.getItem('kinship_show_kiduna_hint')
        if (!hintFlag) return
        const contexts = await listContexts(user!.wallet)
        if (Array.isArray(contexts) && contexts.length > 0) {
          localStorage.removeItem('kinship_show_kiduna_hint')
          setShowKidunaHint(false)
        } else {
          if (hasMinTier(user?.subscription, 'member') || user?.role === 'wizard') {
            setShowKidunaHint(true)
          }
        }
      } catch {
        if (hasMinTier(user?.subscription, 'member') || user?.role === 'wizard') {
          setShowKidunaHint(true)
        }
      }
    }
    checkKiduna()
  }, [checked, user?.wallet, pathname])

  // Instantly hide hint when a Kiduna is created anywhere in the app
  useEffect(() => {
    const handler = () => {
      setShowKidunaHint(false)
      try { localStorage.removeItem('kinship_show_kiduna_hint') } catch { }
    }
    window.addEventListener('kiduna-created', handler)
    return () => window.removeEventListener('kiduna-created', handler)
  }, [])

  return (
    <AuthGuard>
      <SolanaWalletProvider>
      <StudioMarketProvider>
      <PrototypeProvider>
      {!checked ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted text-sm">Loading...</p>
          </div>
        </div>
      ) : (
        <div className="bg-background" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingRight: dockPush, transition: 'padding-right 0.26s ease' }}>
          <StudioHeader />
          <AskDunaTab open={dockOpen} onOpenChange={setDockOpen} />
          <PrototypeControls />
          <div className="flex flex-1 min-h-0" style={{ overflow: 'hidden', flex: 1, minHeight: 0 }}>
            <StudioSidebar />
            <main className="flex-1 ml-0 md:ml-[64px] lg:ml-[220px] p-3 sm:p-4 md:p-6 lg:p-8 transition-[margin] duration-200 min-w-0" style={{ overflowY: 'auto', overflowX: 'hidden', height: '100%', minHeight: 0 }}>
              <div className="max-w-[1240px] mx-auto w-full">
              {showKidunaHint && user?.role !== 'member' && user?.role !== 'guest' && (
                <div style={{
                  marginBottom: 16, padding: '14px 18px', borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(234,170,0,0.08) 0%, rgba(99,102,241,0.06) 100%)',
                  border: '1px solid rgba(234,170,0,0.2)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(234,170,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon icon="lucide:rocket" width={18} height={18} style={{ color: '#EAAA00' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>
                      Your onboarding is complete! 🎉
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                      Create your first <strong style={{ color: '#EAAA00' }}>Kiduna</strong> to set up a movement or community space.
                    </p>
                  </div>
                  <button onClick={() => router.push('/context')} style={{
                    padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(234,170,0,0.35)',
                    background: 'rgba(234,170,0,0.1)', color: '#EAAA00', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  }}>
                    <Icon icon="lucide:plus" width={13} height={13} />
                    Create Kiduna
                  </button>
                  <button onClick={() => { setShowKidunaHint(false); try { localStorage.removeItem('kinship_show_kiduna_hint') } catch {} }} style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 3, flexShrink: 0,
                  }}>
                    <Icon icon="lucide:x" width={15} height={15} />
                  </button>
                </div>
              )}
              {children}
              </div>
            </main>
          </div>
        </div>
      )}
      </PrototypeProvider>
      </StudioMarketProvider>
      </SolanaWalletProvider>
    </AuthGuard>
  )
}