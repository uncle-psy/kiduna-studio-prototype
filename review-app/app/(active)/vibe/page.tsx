'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, ArrowLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { Platform, Game } from '@/lib/types'

function sceneProgressKey(gameId: string) {
  return `kinship_scene_progress_${gameId}`
}
function getSavedSceneId(gameId: string): string | null {
  try {
    return localStorage.getItem(sceneProgressKey(gameId))
  } catch {
    return null
  }
}

function colorFromString(s: string): string {
  const palette = [
    '#EB8000',
    '#1d6fa8',
    '#22c55e',
    '#9b7bb8',
    '#e07b4c',
    '#f59e0b',
    '#3b82f6',
    '#ec4899',
    '#14b8a6',
    '#8b5cf6',
  ]
  let h = 0
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            background: '#0A0D33',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: 1 - i * 0.18,
            animation: 'vibe-pulse 1.6s ease-in-out infinite',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 13,
                borderRadius: 5,
                background: 'rgba(255,255,255,0.07)',
                marginBottom: 8,
                width: '50%',
              }}
            />
            <div
              style={{
                height: 10,
                borderRadius: 5,
                background: 'rgba(255,255,255,0.04)',
                width: '32%',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: 'rgba(255,255,255,0.45)',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
      <div
        style={{
          fontSize: 14,
          marginBottom: 16,
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        {message}
      </div>
      <button
        onClick={onRetry}
        style={{
          background: 'rgba(235,128,0,0.12)',
          border: '1px solid rgba(235,128,0,0.35)',
          color: '#EB8000',
          borderRadius: 8,
          padding: '8px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  )
}

function PlatformCard({
  platform,
  onClick,
}: {
  platform: Platform
  onClick: () => void
}) {
  const color = platform.color || colorFromString(platform.name)
  return (
    <div
      onClick={onClick}
      style={{
        background: '#0A0D33',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: 12,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(255,255,255,0.22)'
        ;(e.currentTarget as HTMLDivElement).style.background = '#100E59'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(255,255,255,0.10)'
        ;(e.currentTarget as HTMLDivElement).style.background = '#0A0D33'
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          flexShrink: 0,
          background: `${color}1a`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          border: `1px solid ${color}40`,
        }}
      >
        {platform.icon || '🎮'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {platform.name}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          {platform.games_count ?? 0} games · {platform.assets_count ?? 0}{' '}
          assets
        </div>
        {platform.description && (
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.30)',
              marginTop: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {platform.description}
          </div>
        )}
      </div>
      <ChevronRight
        size={18}
        style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}
      />
    </div>
  )
}

function GameCard({
  game,
  onClick,
  navigating,
}: {
  game: Game
  onClick: () => void
  navigating: boolean
}) {
  const isPublished = game.status === 'published'
  const [imgError, setImgError] = useState(false)
  return (
    <div
      onClick={!navigating ? onClick : undefined}
      style={{
        background: '#0A0D33',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: navigating ? 'wait' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        opacity: navigating ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!navigating) {
          ;(e.currentTarget as HTMLDivElement).style.borderColor =
            'rgba(255,255,255,0.22)'
          ;(e.currentTarget as HTMLDivElement).style.transform =
            'translateY(-2px)'
        }
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(255,255,255,0.10)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      }}
    >
      <div
        style={{
          height: 80,
          position: 'relative',
          background: 'rgba(235,128,0,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {game.image_url && !imgError ? (
          <img
            src={game.image_url}
            alt={game.name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 30 }}>{game.icon || '🌿'}</span>
        )}
      </div>
      <div
        style={{
          padding: 12,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {game.name}
        </div>
        <div
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            padding: '2px 8px',
            borderRadius: 6,
            background: isPublished
              ? 'rgba(34,197,94,0.15)'
              : 'rgba(235,128,0,0.15)',
            color: isPublished ? '#22c55e' : '#EB8000',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {game.status.toUpperCase()}
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            background: 'rgba(235,128,0,0.10)',
            borderRadius: 8,
            padding: '7px 0',
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#EB8000', fontWeight: 700, fontSize: 15 }}>
            {game.scenes_count ?? 0}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
            Scenes
          </div>
        </div>
      </div>
    </div>
  )
}

function SubHeader({
  title,
  subtitle,
  onBack,
  onRefresh,
  loading,
}: {
  title: string
  subtitle?: string
  onBack: () => void
  onRefresh: () => void
  loading: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
      }}
    >
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.65)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            'rgba(255,255,255,0.10)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            'rgba(255,255,255,0.06)')
        }
      >
        <ArrowLeft size={15} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: '"Goudy Heavyface", Georgia, serif',
            fontSize: 28,
            fontWeight: 400,
            color: '#fff',
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.40)',
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.45)',
          cursor: 'pointer',
          opacity: loading ? 0.5 : 1,
        }}
      >
        <RotateCcw
          size={13}
          style={{
            animation: loading ? 'vibe-spin 1s linear infinite' : undefined,
          }}
        />
      </button>
    </div>
  )
}

type View = 'flow' | 'platforms' | 'games'

export default function VibePage() {
  const router = useRouter()

  const [view, setView] = useState<View>('flow')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null
  )

  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [platformsLoading, setPlatformsLoading] = useState(false)
  const [platformsError, setPlatformsError] = useState<string | null>(null)

  const [games, setGames] = useState<Game[]>([])
  const [gamesLoading, setGamesLoading] = useState(false)
  const [gamesError, setGamesError] = useState<string | null>(null)

  const [navigatingGameId, setNavigatingGameId] = useState<string | null>(null)

  const fetchPlatforms = useCallback(async () => {
    setPlatformsLoading(true)
    setPlatformsError(null)
    try {
      const result = await api.listPlatforms()
      const list: Platform[] = Array.isArray(result)
        ? result
        : ((result as any)?.data ?? [])
      setPlatforms(list)
    } catch (err) {
      console.error('[VibePage] fetchPlatforms error:', err)
      setPlatformsError('Failed to load platforms')
    } finally {
      setPlatformsLoading(false)
    }
  }, [])

  const fetchGames = useCallback(async (platformId: string) => {
    setGamesLoading(true)
    setGamesError(null)
    setGames([])
    try {
      const result = await api.listGames(platformId)
      const list: Game[] = Array.isArray(result)
        ? result
        : ((result as any)?.data ?? [])
      setGames(list)
    } catch (err) {
      console.error('[VibePage] fetchGames error:', err)
      setGamesError('Failed to load games')
    } finally {
      setGamesLoading(false)
    }
  }, [])

  const onPlatformTap = useCallback(
    (platform: Platform) => {
      setSelectedPlatform(platform)
      setView('games')
      fetchGames(platform.id)
    },
    [fetchGames]
  )

  const onGameTap = useCallback(
    async (game: Game) => {
      if (navigatingGameId) return
      setNavigatingGameId(game.id)
      let sceneId: string | null = null
      try {
        sceneId = getSavedSceneId(game.id)
        if (!sceneId && game.starting_scene_id) sceneId = game.starting_scene_id
        if (!sceneId) {
          const scenes = await api.listScenes(undefined, game.id)
          if (scenes.length > 0) {
            const sorted = [...scenes].sort((a, b) => {
              const oa = (a as any).scene_order ?? (a as any).order ?? 999
              const ob = (b as any).scene_order ?? (b as any).order ?? 999
              if (oa !== ob) return oa - ob
              return (a.name ?? 'zzz')
                .toLowerCase()
                .localeCompare((b.name ?? 'zzz').toLowerCase())
            })
            sceneId = sorted[0].id
          }
        }
      } catch (err) {
        console.error('[VibePage] Error resolving sceneId:', err)
      }
      setNavigatingGameId(null)
      if (!sceneId) {
        alert('This game has no scenes yet')
        return
      }
      router.push(`/play/${sceneId}`)
    },
    [navigatingGameId, router]
  )

  const goBack = useCallback(() => {
    if (view === 'games') {
      setView('platforms')
      setGames([])
    } else if (view === 'platforms') setView('flow')
  }, [view])

  useEffect(() => {
    if (view === 'platforms') fetchPlatforms()
  }, [view, fetchPlatforms])

  return (
    <div style={{ width: '100%', overflowY: 'auto' }}>
      <style>{`
        @keyframes vibe-pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes vibe-spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        .vibe-games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
      `}</style>

      <div
        style={{ maxWidth: 1200, margin: '0 auto', padding: '30px 30px 80px' }}
      >
        {/* ══════════ FLOW VIEW ══════════ */}
        {view === 'flow' && (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#03ccd9',
                marginBottom: 10,
              }}
            >
              Active mode
            </div>
            <h1
              style={{
                fontFamily: '"Goudy Heavyface", Georgia, serif',
                fontSize: 42,
                fontWeight: 400,
                color: '#ffffff',
                margin: '0 0 12px',
                lineHeight: 1.05,
              }}
            >
              Vibe
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.52)',
                margin: '0 0 36px',
                lineHeight: 1.55,
              }}
            >
              Experiences, games, and mini-apps across the network — for you and
              your allies.
            </p>

            {/* Game Platforms — only real card */}
            <div
              onClick={() => setView('platforms')}
              style={{
                background: '#0A0D33',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 16,
                padding: '28px 24px 24px',
                cursor: 'pointer',
                transition:
                  'border-color 0.18s, background 0.18s, transform 0.18s',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                maxWidth: 360,
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor =
                  'rgba(255,255,255,0.22)'
                ;(e.currentTarget as HTMLDivElement).style.background =
                  '#100E59'
                ;(e.currentTarget as HTMLDivElement).style.transform =
                  'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor =
                  'rgba(255,255,255,0.10)'
                ;(e.currentTarget as HTMLDivElement).style.background =
                  '#0A0D33'
                ;(e.currentTarget as HTMLDivElement).style.transform =
                  'translateY(0)'
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                  background: 'rgba(130,80,255,0.18)',
                  border: '1px solid rgba(130,80,255,0.35)',
                }}
              >
                🎮
              </div>
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#ffffff',
                    marginBottom: 8,
                    lineHeight: 1.3,
                    fontFamily:
                      '"Goudy Heavyface", "Goudy Old Style", Georgia, serif',
                  }}
                >
                  Game Platforms
                </div>{' '}
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'rgba(255,255,255,0.52)',
                    lineHeight: 1.6,
                  }}
                >
                  Explore and play isometric games with your allies.
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════ PLATFORMS VIEW ══════════ */}
        {view === 'platforms' && (
          <>
            <SubHeader
              title="Game Platforms"
              subtitle="Select a platform to browse games"
              onBack={goBack}
              onRefresh={fetchPlatforms}
              loading={platformsLoading}
            />
            {platformsLoading && <SkeletonList />}
            {!platformsLoading && platformsError && (
              <ErrorState message={platformsError} onRetry={fetchPlatforms} />
            )}
            {!platformsLoading && !platformsError && platforms.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'rgba(255,255,255,0.40)',
                }}
              >
                <div style={{ fontSize: 52, marginBottom: 14 }}>🎮</div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.60)',
                    marginBottom: 8,
                  }}
                >
                  No platforms available
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  Check back later for new platforms
                </div>
              </div>
            )}
            {!platformsLoading && !platformsError && platforms.length > 0 && (
              <div>
                {platforms.map((p) => (
                  <PlatformCard
                    key={p.id}
                    platform={p}
                    onClick={() => onPlatformTap(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══════════ GAMES VIEW ══════════ */}
        {view === 'games' && selectedPlatform && (
          <>
            <SubHeader
              title={selectedPlatform.name}
              subtitle={
                games.length > 0
                  ? `${games.length} game${games.length !== 1 ? 's' : ''}`
                  : 'Select a game to play'
              }
              onBack={goBack}
              onRefresh={() => fetchGames(selectedPlatform.id)}
              loading={gamesLoading}
            />

            {navigatingGameId && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 50,
                  background: 'rgba(9,7,58,0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '3px solid rgba(235,128,0,0.25)',
                    borderTopColor: '#EB8000',
                    animation: 'vibe-spin 0.9s linear infinite',
                  }}
                />
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                  Loading game…
                </div>
              </div>
            )}

            {gamesLoading && (
              <div className="vibe-games-grid">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: '#0A0D33',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      height: 200,
                      animation: 'vibe-pulse 1.6s ease-in-out infinite',
                    }}
                  />
                ))}
              </div>
            )}
            {!gamesLoading && gamesError && (
              <ErrorState
                message={gamesError}
                onRetry={() => fetchGames(selectedPlatform.id)}
              />
            )}
            {!gamesLoading && !gamesError && games.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'rgba(255,255,255,0.40)',
                }}
              >
                <div style={{ fontSize: 52, marginBottom: 14 }}>🌿</div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.60)',
                    marginBottom: 8,
                  }}
                >
                  No games available
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  Check back later for new games in {selectedPlatform.name}
                </div>
              </div>
            )}
            {!gamesLoading && !gamesError && games.length > 0 && (
              <div className="vibe-games-grid">
                {games.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    onClick={() => onGameTap(g)}
                    navigating={navigatingGameId === g.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
