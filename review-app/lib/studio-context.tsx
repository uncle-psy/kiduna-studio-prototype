'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import {
  usePlatforms,
  useGamesByUser,
  createPlatform as apiCreatePlatform,
  createGame as apiCreateGame,
} from '@/hooks/useApi'
import { useAuth } from '@/lib/auth-context'
import type {
  Platform,
  Game,
  CreatePlatformPayload,
  CreateGamePayload,
} from '@/lib/types'

// ─── Context Value ──────────────────────────────────────

interface StudioContextValue {
  // Platform
  platforms: Platform[]
  platformsLoading: boolean
  platformsError: string | null
  currentPlatform: Platform | null
  setPlatform: (platform: Platform) => void
  handleCreatePlatform: (payload: CreatePlatformPayload) => Promise<Platform>
  refetchPlatforms: () => void

  // Game
  games: Game[]
  gamesLoading: boolean
  gamesError: string | null
  currentGame: Game | null
  enterGame: (game: Game) => void
  exitGame: () => void
  handleCreateGame: (payload: CreateGamePayload) => Promise<Game>
  refetchGames: () => void

  // Helpers
  isInGame: boolean

  // Sidebar responsiveness
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

// ─── Context ────────────────────────────────────────────

const StudioContext = createContext<StudioContextValue | null>(null)

// The Studio is scoped to the single shared "kiduna" platform — games, scenes,
// and assets are all created under this id. It was provisioned via
// POST /platforms on the assets API. Hardcoding it (rather than relying on the
// platform list auto-select) guarantees the Studio always has an active
// platform, so the games page never shows "No platform selected".
const KIDUNA_PLATFORM_ID = '365517ca-8808-4b4b-a7e6-faa350e45f4f'

const DEFAULT_PLATFORM: Platform = {
  id: KIDUNA_PLATFORM_ID,
  name: 'kiduna',
  slug: 'kiduna',
  description: 'Kiduna studio platform',
  icon: '🌿',
  color: '#03CCD9',
  is_active: true,
  created_by: 'studio-user',
  created_at: '2026-06-27T10:20:17.009Z',
  updated_at: '2026-06-27T10:20:17.009Z',
  assets_count: 0,
  games_count: 0,
}

const REVIEW_MODE = process.env.NEXT_PUBLIC_REVIEW_MODE === 'true'
const REVIEW_GAME: Game = {
  id: 'review-game',
  platform_id: KIDUNA_PLATFORM_ID,
  name: 'Kiduna Field Guide',
  slug: 'kiduna-field-guide',
  description: 'A sample game selected for presentation review.',
  icon: '🌎',
  image_url: null,
  status: 'draft',
  starting_scene_id: 'review-scene',
  config: { grid_width: 32, grid_height: 32, tile_width: 32, tile_height: 32 },
  is_active: true,
  created_by: 'review-user',
  created_at: '2026-07-15T12:00:00.000Z',
  updated_at: '2026-07-15T12:00:00.000Z',
  scenes_count: 4,
  quests_count: 3,
}

export function StudioProvider({ children }: { children: ReactNode }) {
  // Default to the hardcoded kiduna platform so currentPlatform is never null.
  const [currentPlatform, setCurrentPlatform] = useState<Platform | null>(DEFAULT_PLATFORM)
  const [currentGame, setCurrentGame] = useState<Game | null>(REVIEW_MODE ? REVIEW_GAME : null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  // ── Fetch Platforms ───────────────────────────────────
  const {
    data: platforms,
    loading: platformsLoading,
    error: platformsError,
    refetch: refetchPlatforms,
  } = usePlatforms()

  // Once the platform list loads, upgrade the hardcoded kiduna placeholder to
  // the live record (with real counts/fields) — only while the user is still
  // on the default platform, so manual switching via the PlatformSwitcher wins.
  useEffect(() => {
    if (!platforms || platforms.length === 0) return
    const liveKiduna = platforms.find((p) => p.id === KIDUNA_PLATFORM_ID)
    if (!currentPlatform) {
      setCurrentPlatform(liveKiduna ?? platforms[0])
    } else if (
      currentPlatform.id === KIDUNA_PLATFORM_ID &&
      liveKiduna &&
      liveKiduna !== currentPlatform
    ) {
      setCurrentPlatform(liveKiduna)
    }
  }, [platforms, currentPlatform])

  // If the active platform disappears from the list, fall back to kiduna (or
  // the first available / hardcoded default) — never to null, since the Studio
  // always needs an active platform.
  useEffect(() => {
    if (
      currentPlatform &&
      platforms &&
      platforms.length > 0 &&
      !platforms.find((p) => p.id === currentPlatform.id)
    ) {
      const fallback =
        platforms.find((p) => p.id === KIDUNA_PLATFORM_ID) ??
        platforms[0] ??
        DEFAULT_PLATFORM
      setCurrentPlatform(fallback)
      setCurrentGame(null)
    }
  }, [platforms, currentPlatform])

  // ── Fetch Games (scoped to current user, optionally filtered by platform) ────
  const {
    data: gamesResponse,
    loading: gamesLoading,
    error: gamesError,
    refetch: refetchGames,
  } = useGamesByUser(user?.id || null, {
    platform_id: currentPlatform?.id || undefined,
  })

  const games = REVIEW_MODE ? [REVIEW_GAME] : (gamesResponse?.data || [])

  // If current game was deleted or platform changed, reset game
  useEffect(() => {
    if (REVIEW_MODE) return
    if (currentGame && !games.find((g) => g.id === currentGame.id)) {
      setCurrentGame(null)
    }
  }, [games, currentGame])

  // ── Platform Actions ──────────────────────────────────

  const setPlatform = useCallback((platform: Platform) => {
    setCurrentPlatform(platform)
    setCurrentGame(null) // exit game when switching platform
  }, [])

  const handleCreatePlatform = useCallback(
    async (payload: CreatePlatformPayload): Promise<Platform> => {
      const newPlatform = await apiCreatePlatform(payload)
      refetchPlatforms()
      setCurrentPlatform(newPlatform)
      setCurrentGame(null)
      return newPlatform
    },
    [refetchPlatforms]
  )

  // ── Game Actions ──────────────────────────────────────

  const enterGame = useCallback((game: Game) => {
    setCurrentGame(game)
  }, [])

  const exitGame = useCallback(() => {
    setCurrentGame(null)
  }, [])

  const handleCreateGame = useCallback(
    async (payload: CreateGamePayload): Promise<Game> => {
      const newGame = await apiCreateGame(payload)
      refetchGames()
      setCurrentGame(newGame)
      return newGame
    },
    [refetchGames]
  )

  return (
    <StudioContext.Provider
      value={{
        platforms: platforms || [],
        platformsLoading,
        platformsError,
        currentPlatform,
        setPlatform,
        handleCreatePlatform,
        refetchPlatforms,

        games,
        gamesLoading,
        gamesError,
        currentGame,
        enterGame,
        exitGame,
        handleCreateGame,
        refetchGames,

        isInGame: currentGame !== null,

        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </StudioContext.Provider>
  )
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within StudioProvider')
  return ctx
}

// Re-export types for convenience
export type { Platform, Game } from '@/lib/types'
