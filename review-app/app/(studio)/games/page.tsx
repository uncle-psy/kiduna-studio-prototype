'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStudio } from '@/lib/studio-context'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { fetchWalletGatheringGames, fetchGamesByIds } from '@/lib/codes-api'
import { Card, StatusBadge, EmptyState, Spinner } from '@/components/UI'

export default function GamesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    currentPlatform,
    games,
    gamesLoading,
    gamesError,
    enterGame,
    exitGame,
    handleCreateGame,
    refetchGames,
  } = useStudio()

  // ── Merged game listing ────────────────────────────────────────────────────
  // Always show user-created games (from useStudio) + gathering-redeemed games.
  // Deduplicate by ID so a game never appears twice.
  const [gatheringGames, setGatheringGames] = useState<typeof games>([])
  const [gatheringLoading, setGatheringLoading] = useState(false)

  useEffect(() => {
    if (!user?.wallet) {
      setGatheringGames([])
      setGatheringLoading(false)
      return
    }

    let cancelled = false
    async function loadGatheringGames() {
      try {
        setGatheringLoading(true)

        const result = await fetchWalletGatheringGames(user!.wallet)
        if (cancelled) return

        if (result.game_ids.length === 0) {
          setGatheringGames([])
          setGatheringLoading(false)
          return
        }

        const gameSummaries = await fetchGamesByIds(result.game_ids)
        if (cancelled) return

        const transformed = gameSummaries.map((g) => ({
          id: g.id,
          platform_id: g.platform_id,
          name: g.name,
          slug: g.slug,
          description: g.description || '',
          icon: g.icon || '🎮',
          image_url: g.image_url,
          status: g.status || 'draft',
          scenes_count: g.scenes_count || 0,
          quests_count: g.quests_count || 0,
          created_by: g.created_by,
        }))

        setGatheringGames(transformed as typeof games)
      } catch {
        if (!cancelled) setGatheringGames([])
      } finally {
        if (!cancelled) setGatheringLoading(false)
      }
    }
    loadGatheringGames()
    return () => { cancelled = true }
  }, [user?.wallet])

  // Merge user-created games + gathering games, deduplicate by ID
  const isLoading = gamesLoading || gatheringLoading
  const visibleGames = (() => {
    const seen = new Set<string>()
    const merged: typeof games = []
    for (const g of games) {
      if (!seen.has(g.id)) { seen.add(g.id); merged.push(g) }
    }
    for (const g of gatheringGames) {
      if (!seen.has(g.id)) { seen.add(g.id); merged.push(g) }
    }
    return merged
  })()

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIcon, setNewIcon] = useState('🌿')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetCreate = () => {
    setShowCreate(false)
    setNewName('')
    setNewDesc('')
    setNewIcon('🌿')
    setImageFile(null)
    setImagePreview(null)
    setError('')
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }
    setImageFile(file)
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleCreate = async () => {
    if (!newName.trim() || !currentPlatform) return
    setSaving(true)
    setError('')
    try {
      // Upload image first if provided
      let imageUrl: string | undefined
      if (imageFile) {
        const uploadResult = await api.uploadFile(imageFile, 'games')
        imageUrl = uploadResult.file_url
      }

      await handleCreateGame({
        platform_id: currentPlatform.id,
        name: newName.trim(),
        description: newDesc.trim(),
        icon: newIcon,
        image_url: imageUrl,
        created_by: user?.id || 'studio-user',
      })
      // Exit the game context to stay on games list page
      exitGame()
      resetCreate()
    } catch (err) {
      setError((err as Error).message || 'Failed to create game')
    } finally {
      setSaving(false)
    }
  }

  const handleEnterGame = (game: (typeof games)[0]) => {
    enterGame(game)
    router.push('/game-editor')
  }

  if (!currentPlatform) {
    return (
      <EmptyState
        icon="🎮"
        title="No platform selected"
        description="Select a platform to view its games."
      />
    )
  }

  return (
    <>
      {/* Header — matches the WV DUNA reference Gatherings view */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="text-[0.66rem] font-bold tracking-[0.16em] uppercase text-[#03CCD9] mb-2">
            Building mode · Flows
          </div>
          <h1
            className="text-[2.1rem] font-normal text-white leading-none m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Gatherings
          </h1>
          <p className="text-[0.9rem] text-white/60 mt-1.5">
            Schedule and run events, calls, and votes for your members.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 bg-accent hover:bg-accent-hover text-[#09073A] font-bold text-[0.92rem] px-5 py-[0.7rem] rounded-md transition-colors flex items-center gap-2"
        >
          <span className="text-base leading-none">＋</span>
          New gathering
        </button>
      </div>

      {/* Upgrade note */}
      <div
        className="flex items-center gap-3.5 rounded-[14px] px-5 py-[18px] mb-5 border border-[rgba(234,170,0,0.32)]"
        style={{ background: 'linear-gradient(160deg, rgba(234,170,0,0.12), transparent 70%)' }}
      >
        <span className="w-11 h-11 shrink-0 rounded-full grid place-items-center bg-accent text-[#09073A]">
          🔒
        </span>
        <div className="min-w-0 flex-1">
          <h4
            className="text-[1.15rem] font-normal text-white m-0 mb-0.5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Gatherings open at Founder
          </h4>
          <p className="text-[0.84rem] text-white/60 m-0">
            Host member calls, town halls, and live votes once you run your own DUNA.
          </p>
        </div>
        <button
          onClick={() => router.push('/earn')}
          className="shrink-0 bg-accent hover:bg-accent-hover text-[#09073A] font-bold text-[0.8rem] px-[1.05rem] py-[0.46rem] rounded-[4px] transition-colors"
        >
          See levels
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <style>{`@keyframes gm-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl overflow-hidden" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'gm-shimmer 1.4s ease-in-out infinite', zIndex: 1 }} />
              {/* image banner */}
              <div className="h-32 bg-white/[0.04]" />
              <div className="p-5">
                {/* icon + name + badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, width: '60%', borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />
                    <div style={{ height: 18, width: 52, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
                {/* description */}
                <div style={{ height: 12, width: '90%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 5 }} />
                <div style={{ height: 12, width: '65%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 12 }} />
                {/* stat boxes */}
                <div className="grid grid-cols-2 gap-3">
                  {[0,1].map(j => (
                    <div key={j} className="bg-sidebar rounded-xl p-3 text-center">
                      <div style={{ height: 20, width: 32, borderRadius: 4, background: 'rgba(255,255,255,0.07)', margin: '0 auto 4px' }} />
                      <div style={{ height: 10, width: 40, borderRadius: 4, background: 'rgba(255,255,255,0.04)', margin: '0 auto' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : gamesError ? (
        <EmptyState
          icon="⚠️"
          title="Failed to load games"
          description={gamesError}
          action={
            <button
              onClick={refetchGames}
              className="btn bg-accent hover:bg-accent-dark text-white border-0 rounded-[4px] font-bold"
            >
              Retry
            </button>
          }
        />
      ) : visibleGames.length === 0 ? (
        <EmptyState
          icon="🎮"
          title="No games yet"
          description={`Create your first game in ${currentPlatform.name} to get started.`}
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="btn bg-accent hover:bg-accent-dark text-white border-0 rounded-[4px] font-bold"
            >
              + Create Game
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleGames.map((game) => (
            <Card key={game.id} hover onClick={() => handleEnterGame(game)}>
              {game.image_url && (
                <div className="h-32 overflow-hidden rounded-t-2xl">
                  <img
                    src={game.image_url}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{game.icon || '🌿'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm truncate">
                      {game.name}
                    </h3>
                    <StatusBadge status={game.status} />
                  </div>
                </div>

                {game.description && (
                  <p className="text-muted text-xs mb-3 line-clamp-2">
                    {game.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-sidebar rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-accent">
                      {(game as any).scenes_count ?? 0}
                    </div>
                    <div className="text-[10px] text-muted font-medium">
                      Scenes
                    </div>
                  </div>
                  <div className="bg-sidebar rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-blue-400">
                      {(game as any).quests_count ?? 0}
                    </div>
                    <div className="text-[10px] text-muted font-medium">
                      Quests
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-white/40">
                    Click to enter game →
                  </span>
                </div>
              </div>
            </Card>
          ))}

          {/* Create new card */}
          <div
            onClick={() => setShowCreate(true)}
            className="border border-dashed border-card-border rounded flex flex-col items-center justify-center p-8 text-center hover:border-accent/40 hover:bg-accent/10 cursor-pointer transition-all"
          >
            <span className="text-3xl mb-2">+</span>
            <span className="text-sm font-semibold text-muted">
              New Game
            </span>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={resetCreate}
          />
          <div className="relative bg-card border border-card-border rounded p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-4">
              Create New Game
            </h3>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs text-white/70 font-semibold block mb-1">
                  Game Name
                </label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. The Journey"
                  className="w-full bg-input border border-card-border rounded px-4 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 font-semibold block mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What is this game about?"
                  rows={2}
                  className="w-full bg-input border border-card-border rounded px-4 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 font-semibold block mb-1">
                  Icon
                </label>
                <div className="flex gap-2">
                  {['🌿', '🌅', '⛰️', '🌳', '🏝️', '📚', '🎯', '🧘'].map(
                    (emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewIcon(emoji)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                          newIcon === emoji
                            ? 'bg-accent/20 border border-accent/40 scale-110'
                            : 'bg-white/[0.1] hover:bg-white/[0.1]'
                        }`}
                      >
                        {emoji}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="text-xs text-white/70 font-semibold block mb-1">
                  Cover Image
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-36 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview(null)
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border border-dashed border-card-border rounded hover:border-accent/40 hover:bg-accent/10 transition-colors flex flex-col items-center gap-1.5"
                  >
                    <span className="text-xl">📷</span>
                    <span className="text-xs text-muted">
                      Click to upload cover image
                    </span>
                    <span className="text-[10px] text-white/40">
                      PNG, JPG up to 10MB
                    </span>
                  </button>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={resetCreate}
                disabled={saving}
                className="flex-1 bg-card border border-card-border hover:border-white/[0.22] text-white rounded-md py-[0.7rem] font-bold text-[0.92rem] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="flex-1 bg-accent hover:bg-accent-hover text-[#09073A] rounded-md py-[0.7rem] font-bold text-[0.92rem] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" /> Uploading...
                  </>
                ) : (
                  'Create Gathering'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}