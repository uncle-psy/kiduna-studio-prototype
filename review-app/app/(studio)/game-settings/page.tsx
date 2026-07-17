'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStudio } from '@/lib/studio-context'
import { useScenes, useAssets, updateGame, deleteGame } from '@/hooks/useApi'
import { api, backendApi } from '@/lib/api'
import PageHeader from '@/components/PageHeader'
import { Card, EmptyState, Spinner, ConfirmDialog } from '@/components/UI'
import type { HeartsFacet, SpriteSheetConfig } from '@/lib/types'

// ═══════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════

const ICONS = [
  '🌿',
  '🌅',
  '⛰️',
  '🌳',
  '🏝️',
  '📚',
  '🎯',
  '🧘',
  '🏰',
  '🌊',
  '🔥',
  '💎',
  '🦋',
  '🌸',
  '🍄',
  '⭐',
]

const HEARTS_FACETS: { key: HeartsFacet; name: string; color: string; description: string }[] = [
  {
    key: 'H',
    name: 'Harmony',
    color: '#10b981',
    description: 'Balance, peace, and environmental connection',
  },
  {
    key: 'E',
    name: 'Empowerment',
    color: '#f59e0b',
    description: 'Confidence, agency, and self-efficacy',
  },
  {
    key: 'A',
    name: 'Awareness',
    color: '#8b5cf6',
    description: 'Mindfulness and present-moment attention',
  },
  {
    key: 'R',
    name: 'Resilience',
    color: '#ef4444',
    description: 'Adaptability and recovery from setbacks',
  },
  {
    key: 'T',
    name: 'Tenacity',
    color: '#3b82f6',
    description: 'Persistence and goal-oriented behavior',
  },
  {
    key: 'Si',
    name: 'Self-insight',
    color: '#ec4899',
    description: 'Self-reflection and emotional understanding',
  },
  {
    key: 'So',
    name: 'Social',
    color: '#06b6d4',
    description: 'Connection, empathy, and relationships',
  },
]

const TABS = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'gameplay', label: 'Gameplay', icon: '🎮' },
  { id: 'player', label: 'Player', icon: '🧍' },
  { id: 'hearts', label: 'HEARTS', icon: '❤️' },
  { id: 'publish', label: 'Publish', icon: '🚀' },
  { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
]

// ═══════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════

interface HeartsConfig {
  enabled_facets: HeartsFacet[]
  weights: Record<string, number>
  display_mode: 'bars' | 'radar' | 'minimal'
}

interface DifficultyConfig {
  global_multiplier: number
  time_limits_enabled: boolean
  default_time_limit_sec: number
  hints_mode: 'always' | 'after_attempts' | 'never'
  hints_after_attempts: number
  show_correct_answer: boolean
}

interface PlayerConfig {
  starting_lives: number
  max_lives: number
  starting_inventory: string[]
  respawn_behavior: 'restart_scene' | 'checkpoint' | 'game_over'
  checkpoint_enabled: boolean
}

interface PublishConfig {
  visibility: 'public' | 'unlisted' | 'private'
  allow_embedding: boolean
  show_leaderboard: boolean
  collect_analytics: boolean
}

interface PlayerAvatar {
  asset_id: string
  file_url?: string
  sprite_sheet?: SpriteSheetConfig | null
}

// ═══════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════

export default function GameSettingsPage() {
  const router = useRouter()
  const { currentGame, currentPlatform, isInGame, refetchGames, exitGame } =
    useStudio()

  // Active tab
  const [activeTab, setActiveTab] = useState('general')

  // ─── General Settings ───
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('🌿')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    'draft'
  )
  const [startingSceneId, setStartingSceneId] = useState<string | null>(null)

  // ─── Grid Configuration ───
  const [gridWidth, setGridWidth] = useState(16)
  const [gridHeight, setGridHeight] = useState(16)
  const [tileWidth, setTileWidth] = useState(128)
  const [tileHeight, setTileHeight] = useState(64)

  // ─── Image ───
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── HEARTS Configuration ───
  const [heartsConfig, setHeartsConfig] = useState<HeartsConfig>({
    enabled_facets: ['H', 'E', 'A', 'R', 'T', 'Si', 'So'],
    weights: { H: 1, E: 1, A: 1, R: 1, T: 1, Si: 1, So: 1 },
    display_mode: 'bars',
  })

  // ─── Difficulty Settings ───
  const [difficultyConfig, setDifficultyConfig] = useState<DifficultyConfig>({
    global_multiplier: 1.0,
    time_limits_enabled: false,
    default_time_limit_sec: 60,
    hints_mode: 'always',
    hints_after_attempts: 2,
    show_correct_answer: true,
  })

  // ─── Player Settings ───
  const [playerConfig, setPlayerConfig] = useState<PlayerConfig>({
    starting_lives: 3,
    max_lives: 5,
    starting_inventory: [],
    respawn_behavior: 'restart_scene',
    checkpoint_enabled: true,
  })

  // ─── Player Avatar ───
  const [playerAvatar, setPlayerAvatar] = useState<PlayerAvatar | null>(null)
  const [avatarPicking, setAvatarPicking] = useState(false)
  const { data: avatarAssetsResp, refetch: refetchAvatars } = useAssets({
    type: 'avatar',
    platform_id: currentPlatform?.id,
    limit: 100,
  })
  const avatarAssets = avatarAssetsResp?.data || []

  // ─── AI Avatar Generation ───
  const [genAppearance, setGenAppearance] = useState('')
  const [genActions, setGenActions] = useState('idle, walk')
  const [generating, setGenerating] = useState(false)

  // ─── Avatar preview player ───
  const [previewState, setPreviewState] = useState('idle')
  const [previewFrame, setPreviewFrame] = useState(0)
  const [previewPlaying, setPreviewPlaying] = useState(true)
  const previewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pick a sensible default preview state when the avatar changes
  useEffect(() => {
    const states = playerAvatar?.sprite_sheet?.states
    if (!states) return
    const keys = Object.keys(states)
    setPreviewState(keys.includes('idle') ? 'idle' : keys[0] ?? 'idle')
    setPreviewFrame(0)
    setPreviewPlaying(true)
  }, [playerAvatar?.asset_id])

  // Animate the preview at the selected state's fps
  useEffect(() => {
    if (previewIntervalRef.current) clearInterval(previewIntervalRef.current)
    const sheet = playerAvatar?.sprite_sheet
    if (!sheet || !previewPlaying) return
    const state = sheet.states?.[previewState]
    if (!state || state.fps <= 0) return
    const frameCount = state.end_col - state.start_col + 1
    if (frameCount <= 1) return
    previewIntervalRef.current = setInterval(
      () => {
        setPreviewFrame((prev) => {
          const next = prev + 1
          if (next >= frameCount) return state.loop ? 0 : frameCount - 1
          return next
        })
      },
      1000 / state.fps
    )
    return () => {
      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current)
    }
  }, [playerAvatar, previewState, previewPlaying])

  // ─── Publish Settings ───
  const [publishConfig, setPublishConfig] = useState<PublishConfig>({
    visibility: 'private',
    allow_embedding: true,
    show_leaderboard: false,
    collect_analytics: true,
  })

  // ─── UI State ───
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    msg: string
  } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Scenes for starting scene picker
  const { data: scenes } = useScenes(undefined, currentGame?.id)

  // Generate share URL
  const shareUrl = useMemo(() => {
    if (!currentGame) return ''
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/play/${currentGame.slug || currentGame.id}`
  }, [currentGame])

  // Generate embed code
  const embedCode = useMemo(() => {
    if (!currentGame) return ''
    return `<iframe src="${shareUrl}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`
  }, [shareUrl, currentGame])

  // Populate fields when game loads
  useEffect(() => {
    if (!currentGame) return
    setName(currentGame.name)
    setDescription(currentGame.description || '')
    setIcon(currentGame.icon || '🌿')
    setStatus(currentGame.status as any)
    setStartingSceneId(currentGame.starting_scene_id)
    setImageUrl(currentGame.image_url || null)
    setImagePreview(currentGame.image_url || null)

    const cfg = currentGame.config || {}
    setGridWidth(cfg.grid_width || 16)
    setGridHeight(cfg.grid_height || 16)
    setTileWidth(cfg.tile_width || 128)
    setTileHeight(cfg.tile_height || 64)

    // Load HEARTS config
    if (cfg.hearts) {
      setHeartsConfig({
        enabled_facets: (cfg.hearts.enabled_facets || [
          'H',
          'E',
          'A',
          'R',
          'T',
          'Si',
          'So',
        ]) as HeartsFacet[],
        weights: cfg.hearts.weights || {
          H: 1,
          E: 1,
          A: 1,
          R: 1,
          T: 1,
          Si: 1,
          So: 1,
        },
        display_mode: cfg.hearts.display_mode || 'bars',
      })
    }

    // Load difficulty config
    if (cfg.difficulty) {
      setDifficultyConfig({
        global_multiplier: cfg.difficulty.global_multiplier ?? 1.0,
        time_limits_enabled: cfg.difficulty.time_limits_enabled ?? false,
        default_time_limit_sec: cfg.difficulty.default_time_limit_sec ?? 60,
        hints_mode: cfg.difficulty.hints_mode ?? 'always',
        hints_after_attempts: cfg.difficulty.hints_after_attempts ?? 2,
        show_correct_answer: cfg.difficulty.show_correct_answer ?? true,
      })
    }

    // Load player config
    if (cfg.player) {
      setPlayerConfig({
        starting_lives: cfg.player.starting_lives ?? 3,
        max_lives: cfg.player.max_lives ?? 5,
        starting_inventory: cfg.player.starting_inventory || [],
        respawn_behavior: cfg.player.respawn_behavior ?? 'restart_scene',
        checkpoint_enabled: cfg.player.checkpoint_enabled ?? true,
      })
    }

    // Load publish config
    if (cfg.publish) {
      setPublishConfig({
        visibility: cfg.publish.visibility ?? 'private',
        allow_embedding: cfg.publish.allow_embedding ?? true,
        show_leaderboard: cfg.publish.show_leaderboard ?? false,
        collect_analytics: cfg.publish.collect_analytics ?? true,
      })
    }

    // Load player avatar
    setPlayerAvatar(cfg.player_avatar ?? null)

    setDirty(false)
  }, [currentGame])

  // Select an avatar — fetches the full asset to capture sprite_sheet + file_url
  const handleSelectAvatar = async (assetId: string) => {
    if (playerAvatar?.asset_id === assetId) {
      // Toggle off
      setPlayerAvatar(null)
      markDirty()
      return
    }
    setAvatarPicking(true)
    try {
      const asset = await api.getAsset(assetId)
      setPlayerAvatar({
        asset_id: assetId,
        file_url: asset.file_url,
        sprite_sheet: asset.metadata?.sprite_sheet ?? null,
      })
      markDirty()
    } catch (err) {
      showToast('error', 'Failed to load avatar metadata')
    } finally {
      setAvatarPicking(false)
    }
  }

  // Generate an avatar from a text description via AI, then auto-select it
  const handleGenerateAvatar = async () => {
    if (!genAppearance.trim()) {
      showToast('error', 'Describe the avatar first')
      return
    }
    setGenerating(true)
    try {
      const actions = genActions
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
      const result = await backendApi.generateAvatar({
        appearance: genAppearance.trim(),
        actions,
        platform_id: currentPlatform?.id,
        created_by: 'studio',
      })
      if (result.status !== 'ok' || !result.asset?.id) {
        showToast('error', result.detail || 'Generation failed')
        return
      }
      // Select the freshly generated avatar
      setPlayerAvatar({
        asset_id: result.asset.id,
        file_url: result.asset.file_url ?? undefined,
        sprite_sheet:
          (result.asset.sprite_sheet as SpriteSheetConfig | null) ?? null,
      })
      markDirty()
      refetchAvatars()
      setGenAppearance('')
      showToast('success', 'Avatar generated! Review the preview, then Save.')
    } catch (err) {
      showToast('error', (err as Error).message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Handlers ───

  const markDirty = () => setDirty(true)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Image must be under 10MB')
      return
    }
    setImageFile(file)
    markDirty()
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageUrl(null)
    markDirty()
  }

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('error', 'Game name is required')
      return
    }
    if (!currentGame) return

    setSaving(true)
    try {
      // Upload new image if selected
      let finalImageUrl = imageUrl
      if (imageFile) {
        const result = await api.uploadFile(imageFile, 'games')
        finalImageUrl = result.file_url
      }

      await updateGame(currentGame.id, {
        name: name.trim(),
        description: description.trim(),
        icon,
        image_url: finalImageUrl,
        status,
        starting_scene_id: startingSceneId,
        config: {
          grid_width: gridWidth,
          grid_height: gridHeight,
          tile_width: tileWidth,
          tile_height: tileHeight,
          hearts: heartsConfig,
          difficulty: difficultyConfig,
          player: playerConfig,
          publish: publishConfig,
          player_avatar: playerAvatar,
        },
      })

      setImageUrl(finalImageUrl)
      setImageFile(null)
      setDirty(false)
      refetchGames()
      showToast('success', 'Settings saved')
    } catch (err) {
      showToast('error', (err as Error).message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = (
    newStatus: 'draft' | 'published' | 'archived'
  ) => {
    if (newStatus === 'published' && status !== 'published') {
      setShowPublishConfirm(true)
    } else if (newStatus === 'archived') {
      setShowArchiveConfirm(true)
    } else {
      setStatus(newStatus)
      markDirty()
    }
  }

  const confirmPublish = () => {
    setStatus('published')
    markDirty()
    setShowPublishConfirm(false)
  }

  const confirmArchive = () => {
    setStatus('archived')
    markDirty()
    setShowArchiveConfirm(false)
  }

  const handleDuplicate = async () => {
    if (!currentGame) return
    setDuplicating(true)
    try {
      // Create a copy with modified name
      const newGame = await api.createGame({
        platform_id: currentGame.platform_id,
        name: `${currentGame.name} (Copy)`,
        description: currentGame.description,
        icon: currentGame.icon,
        status: 'draft',
        config: currentGame.config,
        created_by: currentGame.created_by || 'studio',
      })
      refetchGames()
      showToast('success', 'Game duplicated! Redirecting...')
      setTimeout(() => {
        router.push(`/games/${newGame.id}`)
      }, 1000)
    } catch (err) {
      showToast('error', 'Failed to duplicate game')
    } finally {
      setDuplicating(false)
    }
  }

  // Assign every platform-less asset to this game's platform so the AI
  // generator (which filters by platform) can find assets uploaded before
  // the upload UI attached a platform.
  const handleBackfillAssets = async () => {
    const platformId = currentGame?.platform_id || currentPlatform?.id
    if (!platformId) {
      showToast('error', 'No platform for this game')
      return
    }
    setBackfilling(true)
    try {
      const { updated } = await api.backfillAssetPlatform(platformId)
      showToast(
        'success',
        updated > 0
          ? `Assigned ${updated} unassigned asset(s) to this platform`
          : 'No unassigned assets found'
      )
    } catch (err) {
      showToast('error', (err as Error).message || 'Backfill failed')
    } finally {
      setBackfilling(false)
    }
  }

  const handleDelete = async () => {
    if (!currentGame) return
    setDeleting(true)
    try {
      await deleteGame(currentGame.id)
      exitGame()
      router.push('/games')
    } catch (err) {
      showToast('error', 'Failed to delete game')
      setDeleting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      showToast('error', 'Failed to copy')
    }
  }

  // ─── Render ───

  if (!isInGame || !currentGame) {
    return (
      <EmptyState
        icon="⚙️"
        title="Select a game first"
        description="Game settings are game-specific."
        action={
          <Link
            href="/games"
            className="btn bg-accent hover:bg-accent-dark text-white border-0 rounded-xl font-bold"
          >
            View Games
          </Link>
        }
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Game Settings"
        subtitle={`${currentGame.icon || '🎮'} ${currentGame.name}`}
        breadcrumbs={[
          { label: currentGame.name, href: '/dashboard' },
          { label: 'Settings' },
        ]}
        action={
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn bg-accent hover:bg-accent-dark text-white border-0 rounded-[4px] font-bold flex items-center gap-2 disabled:opacity-40"
          >
            {saving ? (
              <>
                <Spinner size="sm" /> Saving...
              </>
            ) : (
              '💾 Save Changes'
            )}
          </button>
        }
      />

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-semibold border ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-card/40 rounded-xl mb-6 max-w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? tab.id === 'danger'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-accent/15 text-accent'
                : 'text-muted hover:text-white/70'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl">
        {/* ═══════════════════════════════════════════════ */}
        {/* GENERAL TAB */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Game Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        markDirty()
                      }}
                      className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50"
                      placeholder="Enter game name..."
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value)
                        markDirty()
                      }}
                      rows={3}
                      placeholder="What is this game about?"
                      className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none"
                    />
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Icon
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ICONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setIcon(emoji)
                            markDirty()
                          }}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                            icon === emoji
                              ? 'bg-accent/20 border-2 border-accent/50 scale-110'
                              : 'bg-card border border-card-border hover:bg-white/[0.1]'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
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
                          alt="Cover"
                          className="w-full h-40 object-cover rounded-xl"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-8 h-8 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/80"
                          >
                            📷
                          </button>
                          <button
                            onClick={removeImage}
                            className="w-8 h-8 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-500/80"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-8 border border-dashed border-card-border rounded-xl hover:border-accent/40 hover:bg-accent/10 transition-colors flex flex-col items-center gap-1.5"
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
              </div>
            </Card>

            {/* Grid Configuration */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Grid Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Grid Width (tiles)
                    </label>
                    <input
                      type="number"
                      value={gridWidth}
                      onChange={(e) => {
                        setGridWidth(parseInt(e.target.value) || 16)
                        markDirty()
                      }}
                      min={4}
                      max={64}
                      className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Grid Height (tiles)
                    </label>
                    <input
                      type="number"
                      value={gridHeight}
                      onChange={(e) => {
                        setGridHeight(parseInt(e.target.value) || 16)
                        markDirty()
                      }}
                      min={4}
                      max={64}
                      className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Tile Width (pixels)
                    </label>
                    <input
                      type="number"
                      value={tileWidth}
                      onChange={(e) => {
                        setTileWidth(parseInt(e.target.value) || 128)
                        markDirty()
                      }}
                      min={32}
                      max={512}
                      className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Tile Height (pixels)
                    </label>
                    <input
                      type="number"
                      value={tileHeight}
                      onChange={(e) => {
                        setTileHeight(parseInt(e.target.value) || 64)
                        markDirty()
                      }}
                      min={16}
                      max={256}
                      className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent/50"
                    />
                  </div>
                </div>

                {/* Grid Preview */}
                <div className="mt-4 p-4 bg-sidebar/40 rounded-xl border border-card-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted font-semibold">
                      PREVIEW
                    </span>
                    <span className="text-[10px] text-white/70">
                      World: {gridWidth * tileWidth}×{gridHeight * tileHeight}px
                    </span>
                  </div>
                  <div
                    className="relative bg-input rounded-lg overflow-hidden mx-auto"
                    style={{
                      width: Math.min(gridWidth * 8, 300),
                      height: Math.min(gridHeight * 4, 150),
                    }}
                  >
                    {/* Mini grid visualization */}
                    <svg width="100%" height="100%" className="opacity-30">
                      <defs>
                        <pattern
                          id="grid"
                          width={Math.min(gridWidth * 8, 300) / gridWidth}
                          height={Math.min(gridHeight * 4, 150) / gridHeight}
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d={`M ${Math.min(gridWidth * 8, 300) / gridWidth} 0 L 0 0 0 ${Math.min(gridHeight * 4, 150) / gridHeight}`}
                            fill="none"
                            stroke="#374151"
                            strokeWidth="0.5"
                          />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-muted">
                        {gridWidth}×{gridHeight} tiles
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Starting Scene */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Starting Scene
                </h3>
                {scenes && scenes.length > 0 ? (
                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                    {scenes.map((scene) => (
                      <button
                        key={scene.id}
                        onClick={() => {
                          setStartingSceneId(
                            scene.id === startingSceneId ? null : scene.id
                          )
                          markDirty()
                        }}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all text-left ${
                          startingSceneId === scene.id
                            ? 'bg-accent/20 border-accent/40 text-accent'
                            : 'border-card-border text-white/70 hover:bg-card'
                        }`}
                      >
                        <span className="text-sm">🏞️</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {scene.scene_name || 'Untitled'}
                          </div>
                          <div className="text-[10px] opacity-60">
                            {scene.scene_type}
                          </div>
                        </div>
                        {startingSceneId === scene.id && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent/20 text-accent">
                            START
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <span className="text-2xl mb-2 block">🏞️</span>
                    <p className="text-muted text-xs mb-2">No scenes yet</p>
                    <Link
                      href="/game-editor"
                      className="text-accent text-xs hover:underline"
                    >
                      Create scenes with AI →
                    </Link>
                  </div>
                )}
              </div>
            </Card>

            {/* Status */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Game Status
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['draft', 'published', 'archived'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all ${
                        status === s
                          ? s === 'published'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : s === 'archived'
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                              : 'bg-accent/15 border-amber-500/30 text-accent'
                          : 'border-card-border text-muted hover:bg-card'
                      }`}
                    >
                      <span className="text-2xl">
                        {s === 'draft' ? '📝' : s === 'published' ? '🚀' : '📦'}
                      </span>
                      <div className="text-xs font-semibold capitalize">
                        {s}
                      </div>
                      <div className="text-[10px] opacity-60 text-center">
                        {s === 'draft'
                          ? 'Work in progress'
                          : s === 'published'
                            ? 'Live & playable'
                            : 'Hidden'}
                      </div>
                      {status === s && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Asset Library */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Asset Library
                </h3>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-white font-semibold mb-1">
                      Fix unassigned assets
                    </div>
                    <p className="text-[11px] text-muted">
                      Assets uploaded without a platform are invisible to the AI
                      generator (which only sees this platform&rsquo;s assets).
                      Assign all unassigned assets to this platform so they can
                      be used in generation.
                    </p>
                  </div>
                  <button
                    onClick={handleBackfillAssets}
                    disabled={backfilling}
                    className="px-4 py-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-xl hover:bg-accent/20 transition-colors whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                  >
                    {backfilling ? (
                      <>
                        <Spinner size="sm" /> Assigning...
                      </>
                    ) : (
                      '🔗 Assign to platform'
                    )}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* GAMEPLAY TAB */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'gameplay' && (
          <div className="space-y-6">
            {/* Difficulty Settings */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Difficulty Settings
                </h3>
                <div className="space-y-5">
                  {/* Global Multiplier */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-white/70 font-semibold">
                        Difficulty Multiplier
                      </label>
                      <span className="text-xs text-accent font-mono">
                        {difficultyConfig.global_multiplier.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2}
                      step={0.1}
                      value={difficultyConfig.global_multiplier}
                      onChange={(e) => {
                        setDifficultyConfig({
                          ...difficultyConfig,
                          global_multiplier: parseFloat(e.target.value),
                        })
                        markDirty()
                      }}
                      className="w-full accent-[#EAAA00]"
                    />
                    <div className="flex justify-between text-[10px] text-white/40 mt-1">
                      <span>Easy (0.5x)</span>
                      <span>Normal (1x)</span>
                      <span>Hard (2x)</span>
                    </div>
                  </div>

                  {/* Time Limits */}
                  <div className="flex items-center justify-between p-3 bg-sidebar/40 rounded-xl">
                    <div>
                      <div className="text-xs text-white/70 font-semibold">
                        Challenge Time Limits
                      </div>
                      <div className="text-[10px] text-muted">
                        Add countdown timer to challenges
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={difficultyConfig.time_limits_enabled}
                        onChange={(e) => {
                          setDifficultyConfig({
                            ...difficultyConfig,
                            time_limits_enabled: e.target.checked,
                          })
                          markDirty()
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>

                  {difficultyConfig.time_limits_enabled && (
                    <div>
                      <label className="text-xs text-white/70 font-semibold block mb-1.5">
                        Default Time Limit (seconds)
                      </label>
                      <input
                        type="number"
                        value={difficultyConfig.default_time_limit_sec}
                        onChange={(e) => {
                          setDifficultyConfig({
                            ...difficultyConfig,
                            default_time_limit_sec:
                              parseInt(e.target.value) || 60,
                          })
                          markDirty()
                        }}
                        min={10}
                        max={600}
                        className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent/50"
                      />
                    </div>
                  )}

                  {/* Hints Mode */}
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-2">
                      Hint Availability
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          value: 'always',
                          label: 'Always',
                          desc: 'Show hints immediately',
                        },
                        {
                          value: 'after_attempts',
                          label: 'After Attempts',
                          desc: 'Show after failures',
                        },
                        {
                          value: 'never',
                          label: 'Never',
                          desc: 'No hints available',
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setDifficultyConfig({
                              ...difficultyConfig,
                              hints_mode: opt.value as any,
                            })
                            markDirty()
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            difficultyConfig.hints_mode === opt.value
                              ? 'bg-accent/20 border-accent/40 text-accent'
                              : 'border-card-border text-white/70 hover:bg-card'
                          }`}
                        >
                          <div className="text-xs font-semibold">
                            {opt.label}
                          </div>
                          <div className="text-[10px] opacity-60">
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {difficultyConfig.hints_mode === 'after_attempts' && (
                    <div>
                      <label className="text-xs text-white/70 font-semibold block mb-1.5">
                        Show hints after X failed attempts
                      </label>
                      <input
                        type="number"
                        value={difficultyConfig.hints_after_attempts}
                        onChange={(e) => {
                          setDifficultyConfig({
                            ...difficultyConfig,
                            hints_after_attempts: parseInt(e.target.value) || 2,
                          })
                          markDirty()
                        }}
                        min={1}
                        max={10}
                        className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent/50"
                      />
                    </div>
                  )}

                  {/* Show Correct Answer */}
                  <div className="flex items-center justify-between p-3 bg-sidebar/40 rounded-xl">
                    <div>
                      <div className="text-xs text-white/70 font-semibold">
                        Show Correct Answer on Fail
                      </div>
                      <div className="text-[10px] text-muted">
                        Reveal the right answer after wrong attempts
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={difficultyConfig.show_correct_answer}
                        onChange={(e) => {
                          setDifficultyConfig({
                            ...difficultyConfig,
                            show_correct_answer: e.target.checked,
                          })
                          markDirty()
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>
              </div>
            </Card>

            {/* Lives & Respawn */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Lives &amp; Respawn
                </h3>
                <div className="space-y-5">
                  {/* Lives */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/70 font-semibold block mb-1.5">
                        Starting Lives
                      </label>
                      <input
                        type="number"
                        value={playerConfig.starting_lives}
                        onChange={(e) => {
                          setPlayerConfig({
                            ...playerConfig,
                            starting_lives: parseInt(e.target.value) || 3,
                          })
                          markDirty()
                        }}
                        min={1}
                        max={10}
                        className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/70 font-semibold block mb-1.5">
                        Maximum Lives
                      </label>
                      <input
                        type="number"
                        value={playerConfig.max_lives}
                        onChange={(e) => {
                          setPlayerConfig({
                            ...playerConfig,
                            max_lives: parseInt(e.target.value) || 5,
                          })
                          markDirty()
                        }}
                        min={1}
                        max={20}
                        className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-accent/50"
                      />
                    </div>
                  </div>

                  {/* Lives Preview */}
                  <div className="p-3 bg-sidebar/40 rounded-xl border border-card-border">
                    <div className="text-[10px] text-muted mb-2">
                      Preview
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: playerConfig.max_lives }).map(
                        (_, i) => (
                          <span
                            key={i}
                            className={`text-lg ${
                              i < playerConfig.starting_lives
                                ? ''
                                : 'opacity-30'
                            }`}
                          >
                            ❤️
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Respawn Behavior */}
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-2">
                      Respawn Behavior
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          value: 'restart_scene',
                          label: 'Restart Scene',
                          desc: 'Return to scene entrance',
                        },
                        {
                          value: 'checkpoint',
                          label: 'Checkpoint',
                          desc: 'Return to last checkpoint',
                        },
                        {
                          value: 'restart_game',
                          label: 'Restart Game',
                          desc: 'Go back to starting scene',
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setPlayerConfig({
                              ...playerConfig,
                              respawn_behavior: opt.value as any,
                            })
                            markDirty()
                          }}
                          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left ${
                            playerConfig.respawn_behavior === opt.value
                              ? 'bg-accent/20 border-accent/40 text-accent'
                              : 'border-card-border text-white/70 hover:bg-card'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="text-xs font-semibold">
                              {opt.label}
                            </div>
                            <div className="text-[10px] opacity-60">
                              {opt.desc}
                            </div>
                          </div>
                          {playerConfig.respawn_behavior === opt.value && (
                            <span className="text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Checkpoint Toggle */}
                  {playerConfig.respawn_behavior === 'checkpoint' && (
                    <div className="flex items-center justify-between p-3 bg-sidebar/40 rounded-xl">
                      <div>
                        <div className="text-xs text-white/70 font-semibold">
                          Auto-Checkpoint
                        </div>
                        <div className="text-[10px] text-muted">
                          Automatically save at scene transitions
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={playerConfig.checkpoint_enabled}
                          onChange={(e) => {
                            setPlayerConfig({
                              ...playerConfig,
                              checkpoint_enabled: e.target.checked,
                            })
                            markDirty()
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* PLAYER TAB */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'player' && (
          <div className="space-y-6">
            {/* Avatar Builder */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                    Player Avatar
                  </h3>
                  {avatarPicking && <Spinner size="sm" />}
                </div>
                <p className="text-[11px] text-muted mb-4">
                  The character the player controls — shared across every scene
                  in this game. Upload avatar assets (type
                  &ldquo;avatar&rdquo;) under Assets, then pick one here. Leave on
                  Default to use the bundled character.
                </p>

                {avatarAssets.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-card-border rounded-xl">
                    <span className="text-2xl mb-2 block">🧍</span>
                    <p className="text-muted text-xs mb-2">
                      No avatar assets yet
                    </p>
                    <Link
                      href="/assets/upload"
                      className="text-accent text-xs hover:underline"
                    >
                      Upload an avatar →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {/* Default (bundled) option */}
                    <button
                      onClick={() => {
                        setPlayerAvatar(null)
                        markDirty()
                      }}
                      className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        !playerAvatar
                          ? 'bg-accent/20 border-accent/40 text-accent'
                          : 'border-card-border text-white/60 hover:bg-card'
                      }`}
                    >
                      <span className="text-2xl">🧍</span>
                      <span className="text-[9px] font-semibold">Default</span>
                    </button>

                    {avatarAssets.map((asset) => {
                      const selected = playerAvatar?.asset_id === asset.id
                      const thumb = asset.thumbnail_url || asset.file_url
                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleSelectAvatar(asset.id)}
                          disabled={avatarPicking}
                          className={`relative aspect-square rounded-xl border overflow-hidden transition-all disabled:opacity-50 ${
                            selected
                              ? 'border-accent ring-2 ring-accent/40'
                              : 'border-card-border hover:border-accent/40'
                          }`}
                          title={asset.display_name || asset.name}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={asset.display_name || asset.name}
                              className="w-full h-full object-contain bg-sidebar/40"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-sidebar/40 text-xl">
                              🧍
                            </div>
                          )}
                          {selected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-white text-[9px] flex items-center justify-center">
                              ✓
                            </span>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] py-0.5 px-1 truncate">
                            {asset.display_name || asset.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* AI Generate */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                    ✨ Generate with AI
                  </h3>
                  {generating && <Spinner size="sm" />}
                </div>
                <p className="text-[11px] text-muted mb-4">
                  Describe how the avatar looks and what it does. The AI generates
                  a sprite sheet, detects its animation states, and adds it as an
                  avatar asset — ready to use below.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Appearance
                    </label>
                    <textarea
                      value={genAppearance}
                      onChange={(e) => setGenAppearance(e.target.value)}
                      rows={3}
                      disabled={generating}
                      placeholder="e.g. a small round robot with a glowing blue visor and stubby legs, friendly cartoon style"
                      className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 font-semibold block mb-1.5">
                      Actions{' '}
                      <span className="text-white/40">
                        (comma-separated animation states)
                      </span>
                    </label>
                    <input
                      value={genActions}
                      onChange={(e) => setGenActions(e.target.value)}
                      disabled={generating}
                      placeholder="idle, walk, wave, jump"
                      className="w-full bg-input border border-card-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 disabled:opacity-50"
                    />
                  </div>
                  <button
                    onClick={handleGenerateAvatar}
                    disabled={generating || !genAppearance.trim()}
                    className="w-full py-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-xl text-accent text-sm font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <Spinner size="sm" /> Generating… (~20s)
                      </>
                    ) : (
                      '✨ Generate Avatar'
                    )}
                  </button>
                  <p className="text-[10px] text-white/40">
                    Sprite-sheet results vary — review the preview below and
                    regenerate if needed. You can refine frames later by editing
                    the avatar asset.
                  </p>
                </div>
              </div>
            </Card>

            {/* Live Preview + Sprite Summary (only when a sprite-sheet avatar is selected) */}
            {playerAvatar?.file_url && playerAvatar.sprite_sheet && (
              <Card>
                <div className="p-6">
                  <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                    Animation Preview
                  </h3>
                  {(() => {
                    const sheet = playerAvatar.sprite_sheet!
                    const states = sheet.states || {}
                    const stateKeys = Object.keys(states)
                    const state = states[previewState] || states[stateKeys[0]]
                    const fw = sheet.frame_width || 64
                    const fh = sheet.frame_height || 64
                    const cols = sheet.columns || 1
                    const rows = sheet.rows || 1
                    // Display frame scaled to fit ~120px box
                    const disp = Math.min(120, Math.max(fw, fh))
                    const scale = disp / Math.max(fw, fh)
                    const dispW = fw * scale
                    const dispH = fh * scale
                    // Resolve row: direction map → 'down' row if present, else state.row
                    let row = state?.row ?? 0
                    if (sheet.direction_map) {
                      const downRow = Object.entries(sheet.direction_map).find(
                        ([, dir]) => dir === 'down'
                      )?.[0]
                      if (downRow != null) row = parseInt(downRow)
                    }
                    const col = (state?.start_col ?? 0) + previewFrame
                    return (
                      <div className="flex flex-wrap items-start gap-6">
                        {/* Animated frame */}
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className="rounded-lg overflow-hidden border border-card-border"
                            style={{
                              width: dispW,
                              height: dispH,
                              backgroundImage: `url(${playerAvatar.file_url})`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: `${-col * fw * scale}px ${-row * fh * scale}px`,
                              backgroundSize: `${cols * fw * scale}px ${rows * fh * scale}px`,
                              imageRendering: 'pixelated',
                              backgroundColor: 'rgba(255,255,255,0.04)',
                            }}
                          />
                          <button
                            onClick={() => setPreviewPlaying((p) => !p)}
                            className="text-[10px] px-3 py-1 rounded-lg bg-card border border-card-border text-white/70 hover:text-white"
                          >
                            {previewPlaying ? '⏸ Pause' : '▶ Play'}
                          </button>
                        </div>

                        {/* State selector + summary */}
                        <div className="flex-1 min-w-[180px] space-y-3">
                          <div>
                            <label className="text-[10px] text-white/50 block mb-1">
                              Preview state
                            </label>
                            <select
                              value={previewState}
                              onChange={(e) => {
                                setPreviewState(e.target.value)
                                setPreviewFrame(0)
                                setPreviewPlaying(true)
                              }}
                              className="bg-input border border-card-border rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                            >
                              {stateKeys.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                            <span className="text-muted">Frame size</span>
                            <span className="text-white/70 font-mono">
                              {fw}×{fh}px
                            </span>
                            <span className="text-muted">Sheet grid</span>
                            <span className="text-white/70 font-mono">
                              {cols}×{rows}
                            </span>
                            <span className="text-muted">Directional</span>
                            <span className="text-white/70 font-mono">
                              {sheet.direction_map ? 'yes' : 'no (flip)'}
                            </span>
                            <span className="text-muted">Current frame</span>
                            <span className="text-white/70 font-mono">
                              {previewFrame + 1} /{' '}
                              {(state?.end_col ?? 0) - (state?.start_col ?? 0) + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Animation states list */}
                  <div className="mt-5">
                    <span className="text-[10px] text-white/40 tracking-widest uppercase">
                      Animation States
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(playerAvatar.sprite_sheet.states || {}).map(
                        ([name, s]) => (
                          <div
                            key={name}
                            className="px-3 py-1.5 rounded-lg bg-input border border-card-border text-[11px]"
                          >
                            <span className="text-accent font-mono font-bold">
                              {name}
                            </span>
                            <span className="text-white/40 ml-2">
                              {s.end_col - s.start_col + 1}f @ {s.fps}fps
                              {s.loop ? ' ↻' : ''}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Warning when avatar has no sprite sheet */}
            {playerAvatar && !playerAvatar.sprite_sheet && (
              <Card>
                <div className="p-6">
                  <p className="text-xs text-amber-400/80">
                    ⚠️ This avatar has no sprite sheet configured — it will render
                    as a static image and won&rsquo;t animate.{' '}
                    <Link
                      href={`/assets/${playerAvatar.asset_id}/edit`}
                      className="text-accent hover:underline"
                    >
                      Edit the asset
                    </Link>{' '}
                    to add sprite states.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* HEARTS TAB */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'hearts' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Enabled Facets
                </h3>
                <p className="text-[11px] text-muted mb-4">
                  Choose which HEARTS facets are active in this game. Disabled
                  facets won't be tracked or displayed.
                </p>
                <div className="space-y-2">
                  {HEARTS_FACETS.map((facet) => {
                    const isEnabled = heartsConfig.enabled_facets.includes(
                      facet.key
                    )
                    return (
                      <div
                        key={facet.key}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isEnabled
                            ? 'bg-opacity-10 border-opacity-30'
                            : 'border-card-border opacity-50'
                        }`}
                        style={{
                          backgroundColor: isEnabled
                            ? `${facet.color}15`
                            : undefined,
                          borderColor: isEnabled
                            ? `${facet.color}40`
                            : undefined,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: facet.color }}
                        >
                          {facet.key}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-white">
                            {facet.name}
                          </div>
                          <div className="text-[10px] text-muted">
                            {facet.description}
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              const newFacets: HeartsFacet[] = e.target.checked
                                ? [...heartsConfig.enabled_facets, facet.key]
                                : heartsConfig.enabled_facets.filter(
                                    (f) => f !== facet.key
                                  )
                              setHeartsConfig({
                                ...heartsConfig,
                                enabled_facets: newFacets,
                              })
                              markDirty()
                            }}
                            className="sr-only peer"
                          />
                          <div
                            className="w-9 h-5 bg-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"
                            style={{
                              backgroundColor: isEnabled
                                ? facet.color
                                : undefined,
                            }}
                          ></div>
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Facet Weights
                </h3>
                <p className="text-[11px] text-muted mb-4">
                  Adjust the importance of each facet. Higher weights mean
                  challenges/quests affecting that facet have more impact.
                </p>
                <div className="space-y-4">
                  {HEARTS_FACETS.filter((f) =>
                    heartsConfig.enabled_facets.includes(f.key)
                  ).map((facet) => (
                    <div key={facet.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold"
                            style={{ backgroundColor: facet.color }}
                          >
                            {facet.key}
                          </div>
                          <span className="text-xs text-white/70">
                            {facet.name}
                          </span>
                        </div>
                        <span className="text-xs text-accent font-mono">
                          {(heartsConfig.weights[facet.key] || 1).toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={heartsConfig.weights[facet.key] || 1}
                        onChange={(e) => {
                          setHeartsConfig({
                            ...heartsConfig,
                            weights: {
                              ...heartsConfig.weights,
                              [facet.key]: parseFloat(e.target.value),
                            },
                          })
                          markDirty()
                        }}
                        className="w-full"
                        style={{ accentColor: facet.color }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Display Mode
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      value: 'bars',
                      label: 'Bars',
                      icon: '📊',
                      desc: 'Horizontal progress bars',
                    },
                    {
                      value: 'radar',
                      label: 'Radar',
                      icon: '🎯',
                      desc: 'Spider/radar chart',
                    },
                    {
                      value: 'minimal',
                      label: 'Minimal',
                      icon: '💫',
                      desc: 'Small icons only',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setHeartsConfig({
                          ...heartsConfig,
                          display_mode: opt.value as any,
                        })
                        markDirty()
                      }}
                      className={`p-4 rounded-xl border transition-all text-center ${
                        heartsConfig.display_mode === opt.value
                          ? 'bg-accent/20 border-accent/40 text-accent'
                          : 'border-card-border text-white/70 hover:bg-card'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{opt.icon}</span>
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[10px] opacity-60">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* PUBLISH TAB */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'publish' && (
          <div className="space-y-6">
            {/* Visibility */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Visibility
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      value: 'public',
                      label: 'Public',
                      icon: '🌍',
                      desc: 'Anyone can find and play',
                    },
                    {
                      value: 'unlisted',
                      label: 'Unlisted',
                      icon: '🔗',
                      desc: 'Only accessible via direct link',
                    },
                    {
                      value: 'private',
                      label: 'Private',
                      icon: '🔒',
                      desc: 'Only you can access',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setPublishConfig({
                          ...publishConfig,
                          visibility: opt.value as any,
                        })
                        markDirty()
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left ${
                        publishConfig.visibility === opt.value
                          ? 'bg-accent/20 border-accent/40 text-accent'
                          : 'border-card-border text-white/70 hover:bg-card'
                      }`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <div className="flex-1">
                        <div className="text-xs font-semibold">{opt.label}</div>
                        <div className="text-[10px] opacity-60">{opt.desc}</div>
                      </div>
                      {publishConfig.visibility === opt.value && (
                        <span className="text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Share Link */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Share Link
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-input border border-card-border rounded-xl px-4 py-2.5 text-white/70 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(shareUrl)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      copiedLink
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25'
                    }`}
                  >
                    {copiedLink ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                {status !== 'published' && (
                  <p className="text-[10px] text-accent mt-2">
                    ⚠️ Game must be published for this link to work
                  </p>
                )}
              </div>
            </Card>

            {/* Embed Code */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                    Embed Code
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={publishConfig.allow_embedding}
                      onChange={(e) => {
                        setPublishConfig({
                          ...publishConfig,
                          allow_embedding: e.target.checked,
                        })
                        markDirty()
                      }}
                      className="rounded border-white/[0.15]"
                    />
                    Allow embedding
                  </label>
                </div>
                {publishConfig.allow_embedding ? (
                  <>
                    <pre className="bg-input border border-card-border rounded-xl p-4 text-[11px] text-white/70 font-mono overflow-x-auto">
                      {embedCode}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(embedCode)}
                      className="mt-3 px-4 py-2 rounded-xl text-xs font-semibold bg-input text-white/70 hover:bg-white/[0.1] transition-colors"
                    >
                      📋 Copy Embed Code
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted">
                    Enable embedding to generate an iframe code
                  </p>
                )}
              </div>
            </Card>

            {/* Options */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Options
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-sidebar/40 rounded-xl">
                    <div>
                      <div className="text-xs text-white/70 font-semibold">
                        Show Leaderboard
                      </div>
                      <div className="text-[10px] text-muted">
                        Display high scores publicly
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publishConfig.show_leaderboard}
                        onChange={(e) => {
                          setPublishConfig({
                            ...publishConfig,
                            show_leaderboard: e.target.checked,
                          })
                          markDirty()
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-sidebar/40 rounded-xl">
                    <div>
                      <div className="text-xs text-white/70 font-semibold">
                        Collect Analytics
                      </div>
                      <div className="text-[10px] text-muted">
                        Track player behavior for insights
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publishConfig.collect_analytics}
                        onChange={(e) => {
                          setPublishConfig({
                            ...publishConfig,
                            collect_analytics: e.target.checked,
                          })
                          markDirty()
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>
              </div>
            </Card>

            {/* Meta Info */}
            <Card>
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">
                  Game Info
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Game ID', value: currentGame.id },
                    { label: 'Slug', value: currentGame.slug || '—' },
                    { label: 'Platform', value: currentPlatform?.name || '—' },
                    { label: 'Scenes', value: String(scenes?.length || 0) },
                    {
                      label: 'Created',
                      value: new Date(
                        currentGame.created_at
                      ).toLocaleDateString(),
                    },
                    {
                      label: 'Updated',
                      value: currentGame.updated_at
                        ? new Date(currentGame.updated_at).toLocaleDateString()
                        : '—',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[11px] text-muted">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-white/70 font-mono max-w-[180px] truncate">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* DANGER ZONE TAB */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <Card className="border-red-500/15">
              <div className="p-6">
                <h3 className="text-[10px] font-bold text-red-400/60 tracking-widest uppercase mb-4">
                  Danger Zone
                </h3>

                <div className="space-y-4">
                  {/* Duplicate */}
                  <div className="p-4 rounded-xl border border-card-border bg-sidebar/40">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-white font-semibold mb-1">
                          Duplicate Game
                        </div>
                        <p className="text-[11px] text-muted">
                          Create a copy of this game with all settings. Scenes,
                          NPCs, challenges, quests, and routes will not be
                          copied.
                        </p>
                      </div>
                      <button
                        onClick={handleDuplicate}
                        disabled={duplicating}
                        className="px-4 py-2 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors whitespace-nowrap flex items-center gap-2"
                      >
                        {duplicating ? (
                          <>
                            <Spinner size="sm" /> Duplicating...
                          </>
                        ) : (
                          '📋 Duplicate'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Archive */}
                  <div className="p-4 rounded-xl border border-card-border bg-sidebar/40">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-white font-semibold mb-1">
                          Archive Game
                        </div>
                        <p className="text-[11px] text-muted">
                          Hide this game from players. You can unarchive it
                          later from Game Status.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowArchiveConfirm(true)}
                        disabled={status === 'archived'}
                        className="px-4 py-2 text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-colors whitespace-nowrap disabled:opacity-40"
                      >
                        📦 Archive
                      </button>
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-white font-semibold mb-1">
                          Delete Game
                        </div>
                        <p className="text-[11px] text-muted">
                          Permanently delete this game. All scenes, NPCs,
                          quests, and challenges linked to this game will be
                          orphaned. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors whitespace-nowrap"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Game?"
        message={`Are you sure you want to delete "${currentGame.name}"? All associated content will be orphaned. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showArchiveConfirm}
        title="Archive Game?"
        message={`This will hide "${currentGame.name}" from players. You can unarchive it later.`}
        confirmLabel="Archive"
        variant="warning"
        onConfirm={confirmArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />

      <ConfirmDialog
        open={showPublishConfirm}
        title="Publish Game?"
        message={`This will make "${currentGame.name}" live and playable. Make sure you've tested everything!`}
        confirmLabel="Publish"
        variant="info"
        onConfirm={confirmPublish}
        onCancel={() => setShowPublishConfirm(false)}
      />
    </>
  )
}
