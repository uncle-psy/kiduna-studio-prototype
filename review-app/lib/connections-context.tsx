'use client'

/**
 * Member connections state — web port of Flutter's AgentsProvider connection
 * slice (lib/provider/agents_provider.dart).
 *
 * Holds the wallet's connected-member ids + full connected-member objects +
 * hidden-member ids, and exposes connect/disconnect/hide/unhide that hit the
 * SAME Agents backend endpoints as mobile. Mounted once in (active)/layout so
 * the Seek member-detail screen and the Chat list share one source of truth —
 * exactly like the mobile provider shared between MemberDetailScreen and
 * ChatsListWrapper.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  getConnectedMemberIds,
  getConnectedMembers,
  getHiddenMemberIds,
  connectMember as apiConnect,
  disconnectMember as apiDisconnect,
  hideMember as apiHide,
  unhideMember as apiUnhide,
  type Agent,
} from '@/lib/seek-api'

interface ConnectionsValue {
  connectedMemberIds: Set<string>
  connectedMembers: Agent[]
  hiddenMemberIds: Set<string>
  loading: boolean
  isConnected: (agentId: string) => boolean
  isHidden: (agentId: string) => boolean
  connect: (agent: Agent) => Promise<void>
  disconnect: (agentId: string) => Promise<void>
  hide: (agentId: string) => Promise<void>
  unhide: (agentId: string) => Promise<void>
  refresh: () => Promise<void>
}

const ConnectionsContext = createContext<ConnectionsValue | null>(null)

export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const wallet = user?.wallet || ''

  const [connectedMemberIds, setConnectedMemberIds] = useState<Set<string>>(
    new Set()
  )
  const [connectedMembers, setConnectedMembers] = useState<Agent[]>([])
  const [hiddenMemberIds, setHiddenMemberIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const loadedWallet = useRef<string | null>(null)

  // Mirrors AgentsProvider._fetchAgents() (connection slice only).
  const refresh = useCallback(async () => {
    if (!wallet) {
      setConnectedMemberIds(new Set())
      setConnectedMembers([])
      setHiddenMemberIds(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    const [ids, members, hidden] = await Promise.all([
      getConnectedMemberIds(wallet),
      getConnectedMembers(wallet),
      getHiddenMemberIds(wallet),
    ])
    setConnectedMemberIds(ids)
    setConnectedMembers(members)
    setHiddenMemberIds(hidden)
    setLoading(false)
  }, [wallet])

  useEffect(() => {
    if (loadedWallet.current === wallet) return
    loadedWallet.current = wallet
    refresh()
  }, [wallet, refresh])

  const isConnected = useCallback(
    (id: string) => connectedMemberIds.has(id),
    [connectedMemberIds]
  )
  const isHidden = useCallback(
    (id: string) => hiddenMemberIds.has(id),
    [hiddenMemberIds]
  )

  // Mirrors AgentsProvider.connectMember(): optimistic local update on success.
  const connect = useCallback(
    async (agent: Agent) => {
      if (!wallet) return
      const ok = await apiConnect(agent.id, wallet)
      if (!ok) return
      setConnectedMemberIds((prev) => new Set(prev).add(agent.id))
      setConnectedMembers((prev) =>
        prev.some((a) => a.id === agent.id) ? prev : [...prev, agent]
      )
    },
    [wallet]
  )

  const disconnect = useCallback(
    async (agentId: string) => {
      if (!wallet) return
      const ok = await apiDisconnect(agentId, wallet)
      if (!ok) return
      setConnectedMemberIds((prev) => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
      setConnectedMembers((prev) => prev.filter((a) => a.id !== agentId))
    },
    [wallet]
  )

  const hide = useCallback(
    async (agentId: string) => {
      if (!wallet) return
      const ok = await apiHide(agentId, wallet)
      if (!ok) return
      setHiddenMemberIds((prev) => new Set(prev).add(agentId))
    },
    [wallet]
  )

  const unhide = useCallback(
    async (agentId: string) => {
      if (!wallet) return
      const ok = await apiUnhide(agentId, wallet)
      if (!ok) return
      setHiddenMemberIds((prev) => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
    },
    [wallet]
  )

  const value: ConnectionsValue = {
    connectedMemberIds,
    connectedMembers,
    hiddenMemberIds,
    loading,
    isConnected,
    isHidden,
    connect,
    disconnect,
    hide,
    unhide,
    refresh,
  }

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  )
}

export function useConnections(): ConnectionsValue {
  const ctx = useContext(ConnectionsContext)
  if (!ctx)
    throw new Error('useConnections must be used within ConnectionsProvider')
  return ctx
}
