'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import ActiveTopbar from '@/components/active/ActiveTopbar'
import AskDunaTab from '@/components/AskDunaTab'
import ActiveSidebar from '@/components/active/ActiveSidebar'
import { ConnectionsProvider } from '@/lib/connections-context'
import { StudioProvider } from '@/lib/studio-context'
import { StudioMarketProvider } from '@/lib/studio-market-context'
import { PrototypeProvider } from '@/lib/prototype-context'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuth } from '@/lib/auth-context'
import { getRawOnboarding } from '@/lib/onboarding'
import { listAgents } from '@/lib/agents-api'

export default function ActiveLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      if (isLoading) return

      if (!user?.wallet) return

      // Wizard and sponsor users skip all checks
      if (user.role === 'wizard' || user.role === 'sponsor') { setChecked(true); return }

      try {
        const ob = await getRawOnboarding(user.wallet)

        if (ob?.currentStep === 'complete') {
          if (!cancelled) setChecked(true)
          return
        }

        if (ob) {
          if (!cancelled) router.replace('/onboarding')
          return
        }

        // Legacy fallback — check agents
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

  const dockPush = dockOpen && isDesktop ? 'min(360px, 92vw)' : '0px'

  return (
    <AuthGuard>
    <ConnectionsProvider>
      <StudioMarketProvider>
      <PrototypeProvider>
      <StudioProvider>
        {!checked ? (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-muted text-sm">Loading...</p>
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', paddingRight: dockPush, transition: 'padding-right 0.26s ease' }}>
          <ActiveTopbar />
            <AskDunaTab open={dockOpen} onOpenChange={setDockOpen} />
          <div className="active-app-shell" style={{ flex: 1 }}>
            <ActiveSidebar />
            <div className="active-main-content">
              <div className="active-page-body">{children}</div>
            </div>
          </div>
        </div>
        )}
      </StudioProvider>
      </PrototypeProvider>
      </StudioMarketProvider>
    </ConnectionsProvider>
    </AuthGuard>
  )
}