'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useAuth } from '@/lib/auth-context'
import { hasMinTier } from '@/lib/tier-utils'
import { useStudio } from '@/lib/studio-context'
import {
  createPresenceAgent,
  createWorkerAgent,
  updateAgent,
  checkHandleAvailability,
  listAgents,
} from '@/lib/agents-api'
import {
  suggestHandle as suggestAgentHandle,
  isValidHandle as isValidAgentHandle,
  HANDLE_MAX as AGENT_HANDLE_MAX,
} from '@/lib/agent-types'
import {
  suggestHandle as suggestContextHandle,
  validateHandle as validateContextHandle,
  validateName as validateContextName,
  validateDescription as validateContextDesc,
  HANDLE_MAX as CTX_HANDLE_MAX,
  NAME_MAX as CTX_NAME_MAX,
  DESCRIPTION_MIN as CTX_DESC_MIN,
  DESCRIPTION_MAX as CTX_DESC_MAX,
} from '@/lib/context-constants'
import { createContext } from '@/lib/context-api'
import { verifyToolCredentials } from '@/lib/tools-api'
import { completeOnboarding, startOnboarding, getOnboarding, advanceOnboarding, getStepNumber, isOnboardingComplete } from '@/lib/onboarding'

const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
const REVIEW_MODE = process.env.NEXT_PUBLIC_REVIEW_MODE === 'true'

/* ━━━ Validation Constants (match Studio AgentModals) ━━━━━━━━━━━━━━━━━━━━━ */

const PRESENCE_NAME_MAX = 25
const PRESENCE_DESCRIPTION_MIN = 50
const PRESENCE_DESCRIPTION_MAX = 5000
const PRESENCE_TAGLINE_MAX = 255
const GOAL_MAX = 500
const GOAL_MIN = 50
const INFORM_NAME_MIN = 3
const INFORM_NAME_MAX = 100
const STANCE_NAME_MIN = 3
const STANCE_NAME_MAX = 100
const SYSTEM_PROMPT_MAX = 50000
const FILE_MAX_SIZE = 5 * 1024 * 1024 // 5MB

function validatePresenceName(name: string): string | null {
  if (!name) return null
  if (name.trim().length === 0) return 'Name is required'
  if (name.length > PRESENCE_NAME_MAX) return `Max ${PRESENCE_NAME_MAX} characters`
  return null
}

function validatePresenceTagline(tagline: string): string | null {
  if (!tagline) return null
  if (tagline.length > PRESENCE_TAGLINE_MAX) return `Max ${PRESENCE_TAGLINE_MAX} characters`
  return null
}

function validatePresenceHandle(h: string): string | null {
  if (!h) return null
  if (!isValidAgentHandle(h)) return 'Only letters, numbers, underscores, and periods allowed'
  if (h.length > AGENT_HANDLE_MAX) return `Max ${AGENT_HANDLE_MAX} characters`
  return null
}

function validatePresenceDescription(desc: string): string | null {
  if (!desc) return null
  if (desc.trim().length === 0) return 'Description is required'
  if (desc.trim().length < PRESENCE_DESCRIPTION_MIN) return `At least ${PRESENCE_DESCRIPTION_MIN} characters required`
  if (desc.length > PRESENCE_DESCRIPTION_MAX) return `Max ${PRESENCE_DESCRIPTION_MAX} characters`
  return null
}

/* ━━━ Step Definitions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface StepDef { key: string; label: string }
const MEMBER_STEPS: StepDef[] = [
  { key: 'avatar', label: 'Big Avatar' },
  { key: 'inform', label: 'Inform' },
  { key: 'instruct', label: 'Stance' },
  { key: 'worker', label: 'Performer' },
  { key: 'worker_inform', label: 'Performer Inform' },
  { key: 'worker_instruct', label: 'Performer Stance' },
]
const SPONSOR_STEPS: StepDef[] = [
  { key: 'avatar', label: 'Big Avatar' },
  { key: 'inform', label: 'Inform' },
  { key: 'instruct', label: 'Stance' },
  { key: 'worker', label: 'Performer' },
  { key: 'worker_inform', label: 'Performer Inform' },
  { key: 'worker_instruct', label: 'Performer Stance' },
]

const TONES = [
  { value: 'friendly', label: 'Friendly', icon: 'lucide:smile' },
  { value: 'professional', label: 'Professional', icon: 'lucide:briefcase' },
  { value: 'neutral', label: 'Neutral', icon: 'lucide:minus' },
  { value: 'playful', label: 'Playful', icon: 'lucide:party-popper' },
  { value: 'wise', label: 'Wise', icon: 'lucide:book-open' },
  { value: 'strict', label: 'Strict', icon: 'lucide:shield' },
  { value: 'cool', label: 'Cool', icon: 'lucide:glasses' },
]

const PERSONAS = ['Assistant', 'Mentor', 'Expert', 'Teacher', 'Coach', 'Character', 'Narrator', 'Other']
const AUDIENCES = ['General', 'Technical', 'Creative', 'Business', 'Students', 'Other']

const TOOLS = [
  { id: 'bluesky', name: 'Bluesky', icon: 'simple-icons:bluesky', desc: 'Post, reply, and engage on Bluesky' },
  { id: 'telegram', name: 'Telegram', icon: 'simple-icons:telegram', desc: 'Send messages and manage bots' },
  { id: 'solana', name: 'Solana', icon: 'simple-icons:solana', desc: 'Connect external wallet' },
  { id: 'google', name: 'Google', icon: 'mdi:google', desc: 'Calendar, Drive, Gmail' },
]

/* ── Module-level Google Drive token cache (survives remounts, not refresh) ── */
const GDRIVE_TOKEN_LIFETIME_MS = 45 * 60 * 1000
let _gdCachedToken: string | null = null
let _gdCachedTokenTs = 0
let _gdTokenClient: any = null
let _gdPendingResolve: ((token: string) => void) | null = null
let _gdPendingReject: ((err: Error) => void) | null = null

function _isGdTokenValid(): boolean {
  return !!_gdCachedToken && Date.now() - _gdCachedTokenTs < GDRIVE_TOKEN_LIFETIME_MS
}

interface GoogleDriveConnection { email: string; name: string; connectedAt: number }
function getStoredGoogleConnection(): GoogleDriveConnection | null {
  try { const raw = localStorage.getItem('kinship_google_drive'); return raw ? JSON.parse(raw) : null } catch { return null }
}

/* ━━━ Main ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const { currentPlatform } = useStudio()

  const isSponsor = hasMinTier(user?.subscription, 'sponsor')
  const steps = isSponsor ? SPONSOR_STEPS : MEMBER_STEPS
  const totalSteps = steps.length

  const [checkingRedirect, setCheckingRedirect] = useState(true)
  const [cur, setCur] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Created IDs
  const [bigAvatarId, setBigAvatarId] = useState<string | null>(null)
  const [wisdomId, setWisdomId] = useState<string | null>(null)
  const [stanceId, setStanceId] = useState<string | null>(null)
  const [kidunaId, setKidunaId] = useState<string | null>(null)

  // Track handles created during this session (to avoid self-duplicate errors)
  const [createdAvatarHandle, setCreatedAvatarHandle] = useState<string | null>(null)
  const [createdKidunaHandle, setCreatedKidunaHandle] = useState<string | null>(null)

  // Step 1: Avatar
  const [aName, setAName] = useState('')
  const [aNameTouched, setANameTouched] = useState(false)
  const [aHandle, setAHandle] = useState('')
  const [aHandleTouched, setAHandleTouched] = useState(false)
  const [aHandleAvailable, setAHandleAvailable] = useState<boolean | null>(null)
  const [aHandleSuggestion, setAHandleSuggestion] = useState<string | null>(null)
  const [aHandleChecking, setAHandleChecking] = useState(false)
  const aHandleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aHandleVersion = useRef(0)
  const [aTagline, setATagline] = useState('')
  const [aTaglineTouched, setATaglineTouched] = useState(false)
  const [aDesc, setADesc] = useState('')
  const [aDescTouched, setADescTouched] = useState(false)
  const [aTone, setATone] = useState('friendly')

  // Step 2: Inform
  const [wName, setWName] = useState('')
  const [wNameTouched, setWNameTouched] = useState(false)
  const [wFiles, setWFiles] = useState<File[]>([])
  const [wFileError, setWFileError] = useState('')
  const [wExistingItems, setWExistingItems] = useState<{ id: string; name: string; status: string; fileSize?: number; url?: string; type?: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [wUploadSource, setWUploadSource] = useState<'files' | 'gdrive' | null>('files')
  const [gDriveFolderUrl, setGDriveFolderUrl] = useState('')
  const [gDriveImporting, setGDriveImporting] = useState(false)
  const [gDriveError, setGDriveError] = useState('')
  const [gDrivePickerReady, setGDrivePickerReady] = useState(false)
  const [gDriveImportedFiles, setGDriveImportedFiles] = useState<{ name: string; status: 'importing' | 'done' | 'error' }[]>([])
  const [gDriveConn, setGDriveConn] = useState<GoogleDriveConnection | null>(null)
  const [wItemToRemove, setWItemToRemove] = useState<number | null>(null)
  const [wItemRemoving, setWItemRemoving] = useState(false)
  const [wFileToRemove, setWFileToRemove] = useState<number | null>(null)

  // Step 3: Instruct
  const [sName, setSName] = useState('')
  const [sNameTouched, setSNameTouched] = useState(false)
  const [sPrompt, setSPrompt] = useState('')
  const [sTone, setSTone] = useState('')
  const [sCustomTone, setSCustomTone] = useState('')
  const [sIsCustomTone, setSIsCustomTone] = useState(false)
  const [sPersona, setSPersona] = useState('')
  const [sCustomPersona, setSCustomPersona] = useState('')
  const [sIsCustomPersona, setSIsCustomPersona] = useState(false)
  const [sAudience, setSAudience] = useState('')
  const [sCustomAudience, setSCustomAudience] = useState('')
  const [sIsCustomAudience, setSIsCustomAudience] = useState(false)
  const [sFormat, setSFormat] = useState('')
  const [sGoal, setSGoal] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [validating, setValidating] = useState(false)

  async function validateGoalClarity(goal: string, name: string): Promise<{ valid: boolean; message: string }> {
    try {
      const res = await fetch(`${AGENT_API_URL}/api/prompts/validate-goal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, name }),
      })
      if (res.ok) return await res.json()
      return { valid: true, message: '' }
    } catch { return { valid: true, message: '' } }
  }

  // Step 4: Kiduna
  const [kName, setKName] = useState('')
  const [kNameTouched, setKNameTouched] = useState(false)
  const [kHandle, setKHandle] = useState('')
  const [kHandleTouched, setKHandleTouched] = useState(false)
  const [kHandleAvailable, setKHandleAvailable] = useState<boolean | null>(null)
  const [kHandleSuggestion, setKHandleSuggestion] = useState<string | null>(null)
  const [kHandleChecking, setKHandleChecking] = useState(false)
  const kHandleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kHandleVersion = useRef(0)
  const [kDesc, setKDesc] = useState('')
  const [kDescTouched, setKDescTouched] = useState(false)
  const [kVis, setKVis] = useState<'public' | 'private' | 'secret'>('public')

  // Step 5: Empower
  const [pHandle, setPHandle] = useState('')
  const [pHandleTouched, setPHandleTouched] = useState(false)
  const [pHandleAvailable, setPHandleAvailable] = useState<boolean | null>(null)
  const [pHandleSuggestion, setPHandleSuggestion] = useState<string | null>(null)
  const [pHandleChecking, setPHandleChecking] = useState(false)
  const pHandleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pHandleVersion = useRef(0)
  const [createdPerformerHandle, setCreatedPerformerHandle] = useState<string | null>(null)
  const [performerId, setPerformerId] = useState<string | null>(null)

  // Step 4: Worker
  const [wkName, setWkName] = useState('')
  const [wkNameTouched, setWkNameTouched] = useState(false)
  const [wkHandle, setWkHandle] = useState('')
  const [wkHandleTouched, setWkHandleTouched] = useState(false)
  const [wkHandleAvailable, setWkHandleAvailable] = useState<boolean | null>(null)
  const [wkHandleSuggestion, setWkHandleSuggestion] = useState<string | null>(null)
  const [wkHandleChecking, setWkHandleChecking] = useState(false)
  const wkHandleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wkHandleVersion = useRef(0)
  const [wkTagline, setWkTagline] = useState('')
  const [wkTaglineTouched, setWkTaglineTouched] = useState(false)
  const [wkDesc, setWkDesc] = useState('')
  const [wkDescTouched, setWkDescTouched] = useState(false)
  const [wkTone, setWkTone] = useState('friendly')
  const [wkRole, setWkRole] = useState('')
  const [createdWorkerHandle, setCreatedWorkerHandle] = useState<string | null>(null)
  // Step 5: Worker Inform
  const [wkiName, setWkiName] = useState('')
  const [wkiNameTouched, setWkiNameTouched] = useState(false)
  const [wkiFiles, setWkiFiles] = useState<File[]>([])
  const [wkiFileError, setWkiFileError] = useState('')
  const wkiFileInputRef = useRef<HTMLInputElement>(null)
  const [workerWisdomId, setWorkerWisdomId] = useState<string | null>(null)
  const [wkiUploadSource, setWkiUploadSource] = useState<'files' | 'gdrive' | null>('files')
  const [wkiExistingItems, setWkiExistingItems] = useState<{ id: string; name: string; status: string; fileSize?: number; url?: string; type?: string }[]>([])
  const [wkiItemToRemove, setWkiItemToRemove] = useState<number | null>(null)
  const [wkiItemRemoving, setWkiItemRemoving] = useState(false)
  const [wkiFileToRemove, setWkiFileToRemove] = useState<number | null>(null)
  // Step 6: Worker Stance
  const [wksName, setWksName] = useState('')
  const [wksNameTouched, setWksNameTouched] = useState(false)
  const [wksPrompt, setWksPrompt] = useState('')
  const [wksGoal, setWksGoal] = useState('')
  const [wksPersona, setWksPersona] = useState('')
  const [wksAudience, setWksAudience] = useState('')
  const [workerStanceId, setWorkerStanceId] = useState<string | null>(null)

  // Shared: fetched KB and prompt lists for Kiduna + Performer steps
  const [allKBs, setAllKBs] = useState<{ id: string; name: string; description?: string }[]>([])
  const [allKBsLoading, setAllKBsLoading] = useState(false)
  const [allPrompts, setAllPrompts] = useState<{ id: string; name: string; content?: string }[]>([])
  const [allPromptsLoading, setAllPromptsLoading] = useState(false)
  const [promptAgentMap, setPromptAgentMap] = useState<Record<string, string>>({})

  // Kiduna step: Inform + Stance selections
  const [kSelectedKBIds, setKSelectedKBIds] = useState<string[]>([])
  const [kSelectedPromptId, setKSelectedPromptId] = useState<string | null>(null)
  const [kShowCreateKB, setKShowCreateKB] = useState(false)
  const [kShowCreateStance, setKShowCreateStance] = useState(false)

  // Performer step: Inform + Stance selections
  const [pSelectedKBIds, setPSelectedKBIds] = useState<string[]>([])
  const [pSelectedPromptId, setPSelectedPromptId] = useState<string | null>(null)
  const [pShowCreateKB, setPShowCreateKB] = useState(false)
  const [pShowCreateStance, setPShowCreateStance] = useState(false)

  // Inline KB creation state (shared)
  const [inlineKBName, setInlineKBName] = useState('')
  const [inlineKBNameTouched, setInlineKBNameTouched] = useState(false)
  const [inlineKBCreating, setInlineKBCreating] = useState(false)
  const [inlineKBError, setInlineKBError] = useState('')
  const [inlineKBFiles, setInlineKBFiles] = useState<File[]>([])
  const [inlineKBFileError, setInlineKBFileError] = useState('')
  const [inlineKBUploadSource, setInlineKBUploadSource] = useState<'files' | 'gdrive'>('files')
  const [inlineKBId, setInlineKBId] = useState<string | null>(null)
  const inlineKBFileRef = useRef<HTMLInputElement>(null)

  // Inline Stance creation state (shared)
  const [inlineSName, setInlineSName] = useState('')
  const [inlineSNameTouched, setInlineSNameTouched] = useState(false)
  const [inlineSGoal, setInlineSGoal] = useState('')
  const [inlineSPrompt, setInlineSPrompt] = useState('')
  const [inlineSGenerating, setInlineSGenerating] = useState(false)
  const [inlineSCreating, setInlineSCreating] = useState(false)
  const [inlineSError, setInlineSError] = useState('')
  const [inlineSTone, setInlineSTone] = useState('')
  const [inlineSCustomTone, setInlineSCustomTone] = useState('')
  const [inlineSIsCustomTone, setInlineSIsCustomTone] = useState(false)
  const [inlineSPersona, setInlineSPersona] = useState('')
  const [inlineSCustomPersona, setInlineSCustomPersona] = useState('')
  const [inlineSIsCustomPersona, setInlineSIsCustomPersona] = useState(false)
  const [inlineSAudience, setInlineSAudience] = useState('')
  const [inlineSCustomAudience, setInlineSCustomAudience] = useState('')
  const [inlineSIsCustomAudience, setInlineSIsCustomAudience] = useState(false)
  const [inlineSFormat, setInlineSFormat] = useState('')

  // Sub-flow mode: null = normal step, 'inform' = creating KB, 'stance' = creating stance
  const [createFlowMode, setCreateFlowMode] = useState<null | 'inform' | 'stance'>(null)
  const [createFlowFor, setCreateFlowFor] = useState<'kiduna' | 'performer'>('kiduna')

  // Saved snapshots for change detection (to avoid unnecessary API calls on back/forth)
  const savedAvatar = useRef<{ name: string; desc: string; tagline: string; tone: string } | null>(null)
  const savedInform = useRef<{ name: string } | null>(null)
  const savedStance = useRef<{ name: string; prompt: string; tone: string; persona: string; audience: string; format: string; goal: string } | null>(null)
  const savedKiduna = useRef<{ name: string; handle: string; desc: string; vis: string } | null>(null)
  const savedPerformer = useRef<{ handle: string } | null>(null)

  /** Collect all current form values into a single object for persistence */
  function collectFormData(): Record<string, any> {
    return {
      // Avatar
      aName, aHandle, aTagline, aDesc, aTone,
      // Inform
      wName,
      // Stance
      sName, sPrompt, sTone, sCustomTone, sIsCustomTone, sPersona, sCustomPersona, sIsCustomPersona, sAudience, sCustomAudience, sIsCustomAudience, sFormat, sGoal,
      // Worker
      wkName, wkHandle, wkTagline, wkDesc, wkTone, wkRole,
      // Worker Inform
      wkiName, workerWisdomId,
      // Worker Stance
      wksName, wksGoal, wksPersona, wksAudience, wksPrompt, workerStanceId,
    }
  }

  /* ── Restore state from database on mount ── */
  useEffect(() => {
    if (REVIEW_MODE) {
      const requestedStep = Number(new URLSearchParams(window.location.search).get('step'))
      if (requestedStep >= 1 && requestedStep <= totalSteps) setCur(requestedStep)
      setCheckingRedirect(false)
      return
    }
    if (!user?.wallet) return
    async function restore() {
      const ob = await getOnboarding(user!.wallet)
      if (!ob) return
      // Restore created IDs
      if (ob.bigAvatarId) setBigAvatarId(ob.bigAvatarId)
      if (ob.bigAvatarHandle) { setCreatedAvatarHandle(ob.bigAvatarHandle); setAHandleAvailable(true) }
      if (ob.wisdomId) setWisdomId(ob.wisdomId)
      if (ob.stanceId) setStanceId(ob.stanceId)
      if (ob.kidunaId) setKidunaId(ob.kidunaId)
      if (ob.kidunaHandle) { setCreatedKidunaHandle(ob.kidunaHandle); setKHandleAvailable(true) }
      if (ob.performerId) setPerformerId(ob.performerId)
      // Restore form field values
      const fd = ob.formData
      if (fd) {
        if (fd.aName) setAName(fd.aName)
        if (fd.aHandle) setAHandle(fd.aHandle)
        if (fd.aTagline) setATagline(fd.aTagline)
        if (fd.aDesc) setADesc(fd.aDesc)
        if (fd.aTone) setATone(fd.aTone)
        if (fd.wName) setWName(fd.wName)
        if (fd.sName) setSName(fd.sName)
        if (fd.sPrompt) setSPrompt(fd.sPrompt)
        if (fd.sGoal) setSGoal(fd.sGoal)
        if (fd.sGoal) setSGoal(fd.sGoal)
        if (fd.sTone) setSTone(fd.sTone)
        if (fd.sCustomTone) { setSCustomTone(fd.sCustomTone); setSIsCustomTone(true) }
        if (fd.sIsCustomTone) setSIsCustomTone(fd.sIsCustomTone)
        if (fd.sPersona) setSPersona(fd.sPersona)
        if (fd.sCustomPersona) { setSCustomPersona(fd.sCustomPersona); setSIsCustomPersona(true) }
        if (fd.sIsCustomPersona) setSIsCustomPersona(fd.sIsCustomPersona)
        if (fd.sAudience) setSAudience(fd.sAudience)
        if (fd.sCustomAudience) { setSCustomAudience(fd.sCustomAudience); setSIsCustomAudience(true) }
        if (fd.sIsCustomAudience) setSIsCustomAudience(fd.sIsCustomAudience)
        if (fd.sFormat) setSFormat(fd.sFormat)
        if (fd.kName) setKName(fd.kName)
        if (fd.kHandle) setKHandle(fd.kHandle)
        if (fd.kDesc) setKDesc(fd.kDesc)
        if (fd.kVis) setKVis(fd.kVis)
        if (fd.kSelectedKBIds) setKSelectedKBIds(fd.kSelectedKBIds)
        if (fd.kSelectedPromptId) setKSelectedPromptId(fd.kSelectedPromptId)
        if (fd.pHandle) setPHandle(fd.pHandle)
        if (fd.pSelectedKBIds) setPSelectedKBIds(fd.pSelectedKBIds)
        if (fd.pSelectedPromptId) setPSelectedPromptId(fd.pSelectedPromptId)
        // Restore saved snapshots so change-detection works correctly after refresh
        if (ob.bigAvatarId && fd.aName) savedAvatar.current = { name: fd.aName, desc: fd.aDesc || '', tagline: fd.aTagline || '', tone: fd.aTone || 'friendly' }
        if (ob.wisdomId && fd.wName) savedInform.current = { name: fd.wName }
        if (ob.stanceId && fd.sName) savedStance.current = { name: fd.sName, prompt: fd.sPrompt || '', tone: fd.sTone || '', persona: fd.sPersona || '', audience: fd.sAudience || '', format: fd.sFormat || '', goal: fd.sGoal || '' }
        if (ob.kidunaId && fd.kName) savedKiduna.current = { name: fd.kName, handle: fd.kHandle || '', desc: fd.kDesc || '', vis: fd.kVis || 'public' }
        if (ob.performerId && fd.wkHandle) savedPerformer.current = { handle: fd.wkHandle }
        // Worker fields
        if (fd.wkName) setWkName(fd.wkName)
        if (fd.wkHandle) { setWkHandle(fd.wkHandle); setWkHandleAvailable(true) }
        if (fd.wkTagline) setWkTagline(fd.wkTagline)
        if (fd.wkDesc) setWkDesc(fd.wkDesc)
        if (fd.wkTone) setWkTone(fd.wkTone)
        if (fd.wkRole) setWkRole(fd.wkRole)
        if (fd.wkiName) setWkiName(fd.wkiName)
        if (fd.workerWisdomId) setWorkerWisdomId(fd.workerWisdomId)
        if (fd.workerStanceId) setWorkerStanceId(fd.workerStanceId)
        if (fd.wksName) setWksName(fd.wksName)
        if (fd.wksGoal) setWksGoal(fd.wksGoal)
        if (fd.wksPrompt) setWksPrompt(fd.wksPrompt)
      }
      // Restore step number
      const stepNum = getStepNumber(ob, isSponsor)
      if (stepNum > 1) setCur(stepNum)
    }
    restore()
  }, [user?.wallet]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch existing KB items when wisdom already created and on inform step ── */
  useEffect(() => {
    setGDriveError(''); setGDriveImportedFiles([])
    if (!wisdomId || steps[cur - 1]?.key !== 'inform') return
    async function fetchItems() {
      try {
        const res = await fetch(`${AGENT_API_URL}/api/knowledge/${wisdomId}`)
        if (res.ok) {
          const data = await res.json()
          setWExistingItems((data.items || []).map((i: any) => ({ id: i.id, name: i.name, status: i.status, fileSize: i.fileSize, url: i.url, type: i.type })))
        }
      } catch { }
    }
    fetchItems()
  }, [wisdomId, cur]) // eslint-disable-line react-hooks/exhaustive-deps
  /* ── Fetch existing worker KB items when workerWisdomId exists and on worker_inform step ── */
  useEffect(() => {
    // Clear shared Google Drive state when switching to this step
    setGDriveError(''); setGDriveImportedFiles([])
    if (!workerWisdomId || steps[cur - 1]?.key !== 'worker_inform') return
    async function fetchItems() {
      try {
        const res = await fetch(`${AGENT_API_URL}/api/knowledge/${workerWisdomId}`)
        if (res.ok) {
          const data = await res.json()
          setWkiExistingItems((data.items || []).map((i: any) => ({ id: i.id, name: i.name, status: i.status, fileSize: i.fileSize, url: i.url, type: i.type })))
        }
      } catch { }
    }
    fetchItems()
  }, [workerWisdomId, cur]) // eslint-disable-line react-hooks/exhaustive-deps



  /* ── Load Google APIs for Drive picker (on mount) ── */
  useEffect(() => {
    setGDriveConn(getStoredGoogleConnection())
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) return
    let cancelled = false
    const loadScript = (src: string): Promise<void> => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
      const s = document.createElement('script'); s.src = src; s.async = true
      s.onload = () => resolve(); s.onerror = () => reject(new Error('Script load failed'))
      document.head.appendChild(s)
    })
    async function init() {
      try {
        await loadScript('https://apis.google.com/js/api.js')
        await loadScript('https://accounts.google.com/gsi/client')
        await new Promise<void>((resolve, reject) => {
          (window as any).gapi.load('client:picker', { callback: resolve, onerror: () => reject(new Error('Picker load failed')) })
        })
        // Initialize token client ONCE with stored account hint
        if (!_gdTokenClient) {
          const hint = getStoredGoogleConnection()?.email || ''
          _gdTokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            hint,
            prompt: hint ? '' : undefined,
            callback: (res: any) => {
              if (res.error) { _gdPendingReject?.(new Error(res.error)) }
              else { _gdCachedToken = res.access_token; _gdCachedTokenTs = Date.now(); _gdPendingResolve?.(res.access_token) }
              _gdPendingResolve = null; _gdPendingReject = null
            },
          })
        }
        if (!cancelled) setGDrivePickerReady(true)
      } catch { }
    }
    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Get Google OAuth token — cached, with optional force account switch */
  function getGDriveToken(forcePrompt = false): Promise<string> {
    if (!forcePrompt && _isGdTokenValid()) return Promise.resolve(_gdCachedToken!)
    if (!_gdTokenClient) return Promise.reject(new Error('Google auth not initialized'))
    return new Promise((resolve, reject) => {
      _gdPendingResolve = resolve
      _gdPendingReject = reject
      const overrides: Record<string, unknown> = {}
      if (forcePrompt) { overrides.prompt = 'select_account' }
      else if (gDriveConn?.email) { overrides.hint = gDriveConn.email; overrides.prompt = '' }
      _gdTokenClient.requestAccessToken(overrides)
    })
  }


  /** Ensure worker KB exists, auto-creating if needed. Returns kbId or null. */
  async function ensureWorkerWisdomId(): Promise<string | null> {
    if (workerWisdomId) return workerWisdomId
    if (!wkiName.trim() || wkiName.trim().length < 3) return null
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wkiName.trim(), wallet: user!.wallet, platformId: currentPlatform?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setWorkerWisdomId(data.id)
        return data.id
      }
    } catch { }
    return null
  }

  /** Ensure wisdom KB exists, auto-creating if needed. Returns kbId or null. */
  async function ensureWisdomId(): Promise<string | null> {
    if (wisdomId) return wisdomId
    // Auto-create KB if name is valid
    if (!wName.trim() || wName.trim().length < 3) {
      setGDriveError('Please enter an Inform Name (min 3 chars) first')
      return null
    }
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wName.trim(), wallet: user!.wallet, platformId: currentPlatform?.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setWisdomId(data.id)
        await advanceOnboarding(user!.wallet, { formData: collectFormData(), wisdomId: data.id })
        return data.id
      }
    } catch { }
    setGDriveError('Failed to create Inform')
    return null
  }

  /** Open Google Picker to browse and select files */
  async function openGooglePicker(switchAccount = false, targetKbId?: string | null, refreshFn?: (items: any[]) => void) {
    setGDriveError('')
    const kbId = targetKbId || await ensureWisdomId()
    if (!kbId) return
    try {
      const token = await getGDriveToken(switchAccount)
      const gPicker = (window as any).google.picker
      const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''
      const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
      const PICKER_MIMES = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.google-apps.document']
      const docsView = new gPicker.DocsView()
        .setIncludeFolders(true).setSelectFolderEnabled(true)
        .setMimeTypes(PICKER_MIMES.join(','))
      const appId = GOOGLE_CLIENT_ID.split('-')[0] || ''
      const builder = new gPicker.PickerBuilder()
        .addView(docsView).setOAuthToken(token).setDeveloperKey(GOOGLE_API_KEY)
        .setOrigin(window.location.protocol + '//' + window.location.host)
        .setTitle('Select files to import')
        .enableFeature(gPicker.Feature.MULTISELECT_ENABLED)
        .setSize(800, 550)
        .setCallback(async (data: any) => {
          if (data.action !== gPicker.Action.PICKED) return
          const folders = data.docs.filter((d: any) => d.mimeType === 'application/vnd.google-apps.folder')
          const files = data.docs.filter((d: any) => d.mimeType !== 'application/vnd.google-apps.folder' && PICKER_MIMES.includes(d.mimeType))
          // Resolve folders
          if (folders.length > 0) {
            for (const folder of folders) {
              try {
                const mimeFilter = PICKER_MIMES.map(m => `mimeType='${m}'`).join(' or ')
                const query = `'${folder.id}' in parents and trashed = false and (${mimeFilter})`
                const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent('files(id,name,mimeType,size)')}&pageSize=20`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                if (res.ok) { const d = await res.json(); files.push(...(d.files || [])) }
              } catch { }
            }
          }
          if (files.length === 0) return
          // Filter out oversized files (5MB limit) — Google Docs report size 0, skip check for those
          const MAX_FILE_SIZE = 5 * 1024 * 1024
          const oversizedFiles: string[] = []
          const sizedFiles = files.filter((f: any) => {
            const isWorkspaceFile = (f.mimeType as string).startsWith('application/vnd.google-apps.')
            const fileSize = f.sizeBytes ? Number(f.sizeBytes) : (f.size ? Number(f.size) : 0)
            if (!isWorkspaceFile && fileSize > MAX_FILE_SIZE) {
              oversizedFiles.push(`${f.name} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`)
              return false
            }
            return true
          })
          if (oversizedFiles.length > 0) {
            setGDriveError(`${oversizedFiles.length} file${oversizedFiles.length > 1 ? 's exceed' : ' exceeds'} the 5 MB limit: ${oversizedFiles.join(', ')}`)
          }
          if (sizedFiles.length === 0) return
          // Fetch current KB items fresh — compare by Drive file ID (from URL) for accuracy
          let currentDriveIds = new Set<string>()
          try {
            const freshRes = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`)
            if (freshRes.ok) {
              const d = await freshRes.json()
              for (const item of (d.items || [])) {
                // Extract Drive file ID from stored URL: https://drive.google.com/file/d/{fileId}/view
                const m = (item.url || '').match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
                if (m) currentDriveIds.add(m[1])
              }
            }
          } catch { }
          const uniqueFiles = sizedFiles.filter((f: any) => !currentDriveIds.has(f.id))
          if (uniqueFiles.length === 0) { setGDriveError(`${sizedFiles.length === 1 ? 'File already' : 'All files already'} uploaded`); return }
          if (uniqueFiles.length < sizedFiles.length) { setGDriveError(`${sizedFiles.length - uniqueFiles.length} duplicate file(s) skipped`) }
          // Import files
          setGDriveImporting(true)
          setGDriveImportedFiles(uniqueFiles.map((f: any) => ({ name: f.name, status: 'importing' as const })))
          for (let i = 0; i < uniqueFiles.length; i++) {
            try {
              await fetch('/api/knowledge/gdrive-import', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kbId: kbId, fileId: uniqueFiles[i].id, fileName: uniqueFiles[i].name, mimeType: uniqueFiles[i].mimeType, accessToken: token }),
              })
              setGDriveImportedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f))
            } catch {
              setGDriveImportedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error' } : f))
            }
          }
          setGDriveImporting(false)
          // Refresh items
          try {
            const kbRes = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`)
            if (kbRes.ok) {
              const d = await kbRes.json()
              const items = (d.items || []).map((i: any) => ({ id: i.id, name: i.name, status: i.status, fileSize: i.fileSize, url: i.url, type: i.type }))
              if (refreshFn) refreshFn(items)
              else setWExistingItems(items)
            }
          } catch { }
        })
      if (appId) builder.setAppId(appId)
      builder.build().setVisible(true)
    } catch (err: any) { setGDriveError(err?.message || 'Failed to open Google Drive') }
  }

  /* ── Auth guard: redirect to login if not authenticated ── */


  /** Start inline Inform creation flow */
  function startCreateInform(forStep: 'kiduna' | 'performer') {
    setInlineKBName(''); setInlineKBNameTouched(false); setInlineKBFiles([]); setInlineKBFileError(''); setInlineKBError(''); setInlineKBId(null); setInlineKBUploadSource('files')
    setCreateFlowFor(forStep); setCreateFlowMode('inform')
  }

  /** Start inline Stance creation flow */
  function startCreateStance(forStep: 'kiduna' | 'performer') {
    setInlineSName(''); setInlineSNameTouched(false); setInlineSGoal(''); setInlineSPrompt(''); setInlineSError('')
    setInlineSTone(''); setInlineSCustomTone(''); setInlineSIsCustomTone(false)
    setInlineSPersona(''); setInlineSCustomPersona(''); setInlineSIsCustomPersona(false)
    setInlineSAudience(''); setInlineSCustomAudience(''); setInlineSIsCustomAudience(false)
    setInlineSFormat('')
    setCreateFlowFor(forStep); setCreateFlowMode('stance')
  }

  /** Phase 1: Create KB with name only */
  async function handleInlineCreateKBPhase1() {
    if (!inlineKBName.trim() || inlineKBName.trim().length < 3) { setInlineKBError('Name must be at least 3 characters'); return }
    setInlineKBCreating(true); setInlineKBError('')
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inlineKBName.trim(), wallet: user!.wallet, platformId: currentPlatform?.id }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setInlineKBError(d.detail || 'Failed to create'); setInlineKBCreating(false); return }
      const data = await res.json()
      setInlineKBId(data.id)
    } catch { setInlineKBError('Failed to connect') }
    finally { setInlineKBCreating(false) }
  }

  /** Phase 2 done: finalize KB, add to list, select, return to step */
  function handleInlineCreateKBDone() {
    if (!inlineKBId) return
    setAllKBs(prev => {
      if (prev.find(k => k.id === inlineKBId)) return prev
      return [...prev, { id: inlineKBId!, name: inlineKBName.trim() }]
    })
    if (createFlowFor === 'kiduna') setKSelectedKBIds(prev => prev.includes(inlineKBId!) ? prev : [...prev, inlineKBId!])
    else setPSelectedKBIds(prev => prev.includes(inlineKBId!) ? prev : [...prev, inlineKBId!])
    setCreateFlowMode(null)
    setInlineKBId(null)
  }

  /** Create a new KB inline (legacy single-phase for local files only) */
  async function handleInlineCreateKB(forStep: 'kiduna' | 'performer') {
    if (!inlineKBName.trim() || inlineKBName.trim().length < 3) { setInlineKBError('Name must be at least 3 characters'); return }
    setInlineKBCreating(true); setInlineKBError('')
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inlineKBName.trim(), wallet: user!.wallet, platformId: currentPlatform?.id }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setInlineKBError(d.detail || 'Failed to create'); setInlineKBCreating(false); return }
      const data = await res.json()
      const kbId = data.id
      if (inlineKBFiles.length > 0) {
        const formData = new FormData()
        inlineKBFiles.forEach(f => formData.append('files', f))
        await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}/upload`, { method: 'POST', body: formData })
      }
      setAllKBs(prev => [...prev, { id: kbId, name: data.name }])
      if (forStep === 'kiduna') setKSelectedKBIds(prev => [...prev, kbId])
      else setPSelectedKBIds(prev => [...prev, kbId])
      setCreateFlowMode(null)
    } catch { setInlineKBError('Failed to connect') }
    finally { setInlineKBCreating(false) }
  }

  /** Create a new Stance inline, then return to step */
  async function handleInlineCreateStance(forStep: 'kiduna' | 'performer') {
    if (!inlineSName.trim() || inlineSName.trim().length < 3) { setInlineSError('Name must be at least 3 characters'); return }
    setInlineSCreating(true); setInlineSError('')
    try {
      const effTone = inlineSIsCustomTone ? inlineSCustomTone.trim() : (inlineSTone === 'Other' ? '' : inlineSTone)
      const effPersona = inlineSIsCustomPersona ? inlineSCustomPersona.trim() : (inlineSPersona === 'Other' ? '' : inlineSPersona)
      const effAudience = inlineSIsCustomAudience ? inlineSCustomAudience.trim() : (inlineSAudience === 'Other' ? '' : inlineSAudience)
      const res = await fetch(`${AGENT_API_URL}/api/prompts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inlineSName.trim(), content: inlineSPrompt, goal: inlineSGoal, tone: effTone, persona: effPersona, audience: effAudience, format: inlineSFormat, wallet: user!.wallet, platformId: currentPlatform?.id }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setInlineSError(d.detail || 'Failed to create'); setInlineSCreating(false); return }
      const data = await res.json()
      setAllPrompts(prev => [...prev, { id: data.id, name: data.name, content: data.content }])
      if (forStep === 'kiduna') setKSelectedPromptId(data.id)
      else setPSelectedPromptId(data.id)
      setCreateFlowMode(null)
    } catch { setInlineSError('Failed to connect') }
    finally { setInlineSCreating(false) }
  }

  /** Generate stance inline */
  async function handleInlineGenerate() {
    if (inlineSGoal.trim().length < GOAL_MIN) { setInlineSError(`Please enter a goal with at least ${GOAL_MIN} characters.`); return }
    setInlineSGenerating(true); setInlineSError('')
    const check = await validateGoalClarity(inlineSGoal.trim(), inlineSName)
    if (!check.valid) { setInlineSError(check.message); setInlineSGenerating(false); return }
    try {
      const genInstructions = `You are generating a system prompt (behavioral instructions) for an AI agent.

The stance is named "${inlineSName}" but do NOT use this name as the agent's identity. Instead, derive the agent's role and identity from the goal below.

The user's goal for this agent: ${inlineSGoal.trim()}

IMPORTANT RULES:
- If the goal says "generate a system prompt about X" or "create a prompt for X", do NOT create a meta prompt-generator. Create a system prompt that makes the agent an expert on X or a worker that performs X tasks.
- Do NOT start with "You are [stance name]". Start with "You are a [role derived from the goal]..."
- If the goal mentions "worker" or "agent", focus on actionable tasks the agent should PERFORM, not just knowledge it should have.
- Do NOT include meta-instructions like "do not generate prompts" or "do not create stories" in the output.

Generate a clear, actionable system prompt that:
- Defines the agent's role, purpose, and scope derived from the goal
- Specifies how the agent should behave, respond, and interact with users
- Includes guidelines on tone, boundaries, and what the agent should and should not do
- Is written as direct instructions to the AI (e.g. "You are a...", "Your role is...", "You should...")
- Is 3-5 paragraphs long

Do NOT generate creative prose, stories, or character descriptions. Generate only a functional system prompt.`
      const res = await fetch(`${AGENT_API_URL}/api/prompts/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inlineSName, goal: inlineSGoal, instructions: genInstructions }),
      })
      const data = await res.json()
      if (res.ok && data.content) setInlineSPrompt(data.content)
      else setInlineSError(data.detail || 'Generation failed')
    } catch { setInlineSError('Could not connect') }
    finally { setInlineSGenerating(false) }
  }
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    }
    if (!authLoading && user?.subscription === 'guest') {
      router.replace('/role')
    }
  }, [authLoading, isAuthenticated, user?.subscription, router])

  /* ── Redirect if already completed ── */
  useEffect(() => {
    if (REVIEW_MODE) { setCheckingRedirect(false); return }
    if (!user?.wallet) return
    if (user.role === 'wizard') { router.replace('/agents'); return }
    async function check() {
      try {
        const complete = await isOnboardingComplete(user!.wallet)
        if (complete) { router.replace('/agents'); return }
        const result = await listAgents({ wallet: user!.wallet })
        const agents = result.agents || []
        const hasBig = agents.some(
          (a: any) => (a.presenceSubtype || a.presence_subtype || '').toUpperCase() === 'BIG_AVATAR'
        )
        const hasWorker = agents.some(
          (a: any) => (a.type || a.agent_type || '').toLowerCase() === 'worker'
        )
        const ob = await getOnboarding(user!.wallet)
        if (!ob && hasBig && hasWorker) { router.replace('/agents'); return }
      } catch { }
      setCheckingRedirect(false)
    }
    check()
  }, [user, router])

  /* ── Show loading while auth is resolving ── */
  if (authLoading || !isAuthenticated || !user?.wallet || user?.subscription === 'guest' || checkingRedirect) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #080625 0%, #0F0D42 40%, #1a0e3e 100%)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(234,170,0,0.3)', borderTopColor: '#EAAA00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const step = steps[cur - 1]
  // Safety guard: clamp cur if it exceeds the step array
  if (!step && cur > 1) { setCur(steps.length); return null }
  const progress = (cur / totalSteps) * 100

  /* ━━━ Avatar Handle — debounced availability check (mirrors Studio) ━━━━━ */

  function scheduleAvatarHandleCheck(h: string) {
    if (aHandleTimer.current) clearTimeout(aHandleTimer.current)
    setAHandleAvailable(null)
    setAHandleSuggestion(null)
    if (!h || validatePresenceHandle(h)) { setAHandleChecking(false); return }
    // Skip API check if this handle was already created in this session
    if (createdAvatarHandle && h.toLowerCase() === createdAvatarHandle.toLowerCase()) {
      setAHandleAvailable(true); setAHandleChecking(false); return
    }
    setAHandleChecking(true)
    const version = ++aHandleVersion.current
    aHandleTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(h)
        if (version !== aHandleVersion.current) return
        setAHandleAvailable(result.available)
        setAHandleSuggestion(result.suggestion || null)
      } catch {
        if (version !== aHandleVersion.current) return
        setAHandleAvailable(null)
        setAHandleSuggestion(null)
      } finally {
        if (version === aHandleVersion.current) setAHandleChecking(false)
      }
    }, 400)
  }

  function onAvatarNameChange(val: string) {
    const clamped = val.slice(0, PRESENCE_NAME_MAX)
    setAName(clamped)
    setANameTouched(true)
    if (!clamped.trim()) {
      setAHandle(''); setAHandleTouched(false); setAHandleAvailable(null); setAHandleSuggestion(null); setAHandleChecking(false)
    } else if (!aHandleTouched) {
      const suggested = suggestAgentHandle(clamped)
      setAHandle(suggested)
      scheduleAvatarHandleCheck(suggested)
    }
  }

  function onAvatarHandleChange(val: string) {
    const cleaned = val.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, AGENT_HANDLE_MAX)
    setAHandle(cleaned)
    if (cleaned === '') {
      setAHandleTouched(false); setAHandleAvailable(null); setAHandleSuggestion(null); setAHandleChecking(false)
    } else {
      setAHandleTouched(true)
      scheduleAvatarHandleCheck(cleaned)
    }
  }

  function acceptAvatarHandleSuggestion() {
    if (aHandleSuggestion) {
      setAHandle(aHandleSuggestion); setAHandleTouched(true); setAHandleSuggestion(null)
      scheduleAvatarHandleCheck(aHandleSuggestion)
    }
  }

  /* ── Kiduna handle — debounced availability check (same as avatar) ── */

  function scheduleKidunaHandleCheck(h: string) {
    if (kHandleTimer.current) clearTimeout(kHandleTimer.current)
    setKHandleAvailable(null)
    setKHandleSuggestion(null)
    if (!h || validateContextHandle(h)) { setKHandleChecking(false); return }
    // Skip API check if this handle was already created in this session
    if (createdKidunaHandle && h.toLowerCase() === createdKidunaHandle.toLowerCase()) {
      setKHandleAvailable(true); setKHandleChecking(false); return
    }
    setKHandleChecking(true)
    const version = ++kHandleVersion.current
    kHandleTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(h)
        if (version !== kHandleVersion.current) return
        setKHandleAvailable(result.available)
        setKHandleSuggestion(result.suggestion || null)
      } catch {
        if (version !== kHandleVersion.current) return
        setKHandleAvailable(null)
        setKHandleSuggestion(null)
      } finally {
        if (version === kHandleVersion.current) setKHandleChecking(false)
      }
    }, 400)
  }

  function onKidunaNameChange(val: string) {
    const clamped = val.slice(0, CTX_NAME_MAX)
    setKName(clamped)
    setKNameTouched(true)
    if (!clamped.trim()) {
      setKHandle(''); setKHandleTouched(false); setKHandleAvailable(null); setKHandleSuggestion(null); setKHandleChecking(false)
    } else if (!kHandleTouched) {
      const suggested = suggestContextHandle(clamped)
      setKHandle(suggested)
      scheduleKidunaHandleCheck(suggested)
    }
  }

  function onKidunaHandleChange(val: string) {
    const cleaned = val.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, CTX_HANDLE_MAX)
    setKHandle(cleaned)
    if (cleaned === '') {
      setKHandleTouched(false); setKHandleAvailable(null); setKHandleSuggestion(null); setKHandleChecking(false)
    } else {
      setKHandleTouched(true)
      scheduleKidunaHandleCheck(cleaned)
    }
  }

  function acceptKidunaHandleSuggestion() {
    if (kHandleSuggestion) {
      setKHandle(kHandleSuggestion); setKHandleTouched(true); setKHandleSuggestion(null)
      scheduleKidunaHandleCheck(kHandleSuggestion)
    }
  }

  /* ── Performer handle — debounced availability check ── */

  function schedulePerformerHandleCheck(h: string) {
    if (pHandleTimer.current) clearTimeout(pHandleTimer.current)
    setPHandleAvailable(null)
    setPHandleSuggestion(null)
    if (!h || validatePresenceHandle(h)) { setPHandleChecking(false); return }
    if (createdPerformerHandle && h.toLowerCase() === createdPerformerHandle.toLowerCase()) {
      setPHandleAvailable(true); setPHandleChecking(false); return
    }
    setPHandleChecking(true)
    const version = ++pHandleVersion.current
    pHandleTimer.current = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability(h)
        if (version !== pHandleVersion.current) return
        setPHandleAvailable(result.available)
        setPHandleSuggestion(result.suggestion || null)
      } catch {
        if (version !== pHandleVersion.current) return
        setPHandleAvailable(null)
        setPHandleSuggestion(null)
      } finally {
        if (version === pHandleVersion.current) setPHandleChecking(false)
      }
    }, 400)
  }

  function onPerformerHandleChange(val: string) {
    const cleaned = val.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, AGENT_HANDLE_MAX).toLowerCase()
    setPHandle(cleaned)
    if (cleaned === '') {
      setPHandleTouched(false); setPHandleAvailable(null); setPHandleSuggestion(null); setPHandleChecking(false)
    } else {
      setPHandleTouched(true)
      schedulePerformerHandleCheck(cleaned)
    }
  }

  function acceptPerformerHandleSuggestion() {
    if (pHandleSuggestion) {
      setPHandle(pHandleSuggestion); setPHandleTouched(true); setPHandleSuggestion(null)
      schedulePerformerHandleCheck(pHandleSuggestion)
    }
  }

  /* ━━━ Inline validation errors (show only after touched) ━━━━━━━━━━━━━━━━ */

  // Avatar
  const avatarNameErr = aNameTouched ? validatePresenceName(aName) : null
  const avatarHandleFmtErr = aHandleTouched ? validatePresenceHandle(aHandle) : null
  const avatarHandleAvailErr = aHandle && !avatarHandleFmtErr && aHandleAvailable === false ? `@${aHandle} is already taken` : null
  const avatarHandleErr = avatarHandleFmtErr || avatarHandleAvailErr
  const avatarTaglineErr = aTaglineTouched ? validatePresenceTagline(aTagline) : null
  const avatarDescErr = aDescTouched ? validatePresenceDescription(aDesc) : null

  // Kiduna
  const kidunaNameErr = kNameTouched ? validateContextName(kName) : null
  const kidunaHandleFmtErr = kHandleTouched ? validateContextHandle(kHandle) : null
  const kidunaHandleAvailErr = kHandle && !kidunaHandleFmtErr && kHandleAvailable === false ? `@${kHandle} is already taken` : null
  const kidunaHandleErr = kidunaHandleFmtErr || kidunaHandleAvailErr
  const kidunaDescErr = kDescTouched ? validateContextDesc(kDesc) : null

  // Performer
  const performerHandleFmtErr = pHandleTouched ? validatePresenceHandle(pHandle) : null
  const performerHandleAvailErr = pHandle && !performerHandleFmtErr && pHandleAvailable === false ? `@${pHandle} is already taken` : null
  const performerHandleErr = performerHandleFmtErr || performerHandleAvailErr

  /* ━━━ Can proceed (strict validation per step) ━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  function canProceed(): boolean {
    switch (step.key) {
      case 'avatar':
        return !!(
          aName.trim() &&
          aHandle.trim() &&
          aDesc.trim() &&
          !validatePresenceName(aName) &&
          !validatePresenceHandle(aHandle) &&
          !validatePresenceDescription(aDesc) &&
          !validatePresenceTagline(aTagline) &&
          aHandleAvailable === true &&
          !aHandleChecking
        )
      case 'inform':
        return wName.trim().length >= INFORM_NAME_MIN && wName.length <= INFORM_NAME_MAX
      case 'instruct':
        return sName.trim().length >= STANCE_NAME_MIN && sName.length <= STANCE_NAME_MAX
      case 'kiduna':
        return !!(
          kName.trim() &&
          kHandle.trim() &&
          kDesc.trim() &&
          !validateContextName(kName) &&
          !validateContextHandle(kHandle) &&
          !validateContextDesc(kDesc) &&
          kHandleAvailable === true &&
          !kHandleChecking
        )
      case 'worker':
        return !!(wkHandle.trim() && wkRole.trim().length >= 3 && wkDesc.trim() && !validatePresenceHandle(wkHandle) && !validatePresenceDescription(wkDesc) && wkHandleAvailable === true && !wkHandleChecking)
      case 'worker_inform':
        return wkiName.trim().length >= INFORM_NAME_MIN && wkiName.length <= INFORM_NAME_MAX
      case 'worker_instruct':
        return wksName.trim().length >= STANCE_NAME_MIN && wksName.length <= STANCE_NAME_MAX
      default: return false
    }
  }

  /* ━━━ Continue handler ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  async function handleContinue() {
    if (!user?.wallet) return
    setError(null)
    setSaving(true)
    try {
      // ── AVATAR ──
      if (step.key === 'avatar') {
        const h = aHandle.trim() || suggestAgentHandle(aName.trim())
        if (!bigAvatarId) {
          // First time: create
          if (!(createdAvatarHandle && h.toLowerCase() === createdAvatarHandle.toLowerCase())) {
            const check = await checkHandleAvailability(h)
            if (!check.available) {
              setError(`Handle "@${h}" is already taken.${check.suggestion ? ` Try "@${check.suggestion}"` : ''}`)
              setSaving(false)
              return
            }
          }
          let agentId: string
          try {
            const agent = await createPresenceAgent({
              name: aName.trim(), handle: h, briefDescription: aDesc.trim(),
              tagline: aTagline.trim() || undefined, tone: aTone as any,
              presenceSubtype: 'big_avatar', isPrimaryMember: true,
              role: user.subscription || 'member',
              wallet: user.wallet, platformId: currentPlatform?.id,
            })
            agentId = agent.id
          } catch (createErr: any) {
            // If Big Avatar already exists (409), find and reuse it
            if (createErr?.message?.includes('already exists') || createErr?.status === 409) {
              const result = await listAgents({ wallet: user.wallet })
              const existing = (result.agents || []).find(
                (a: any) => (a.presenceSubtype || a.presence_subtype || '').toUpperCase() === 'BIG_AVATAR'
              )
              if (existing) {
                agentId = existing.id
                // Update the existing avatar with current form values
                try { await updateAgent(agentId, { name: aName.trim(), briefDescription: aDesc.trim(), tagline: aTagline.trim() || undefined, tone: aTone as any }) } catch { }
              } else {
                throw createErr
              }
            } else {
              throw createErr
            }
          }
          setBigAvatarId(agentId)
          setCreatedAvatarHandle(h)
          savedAvatar.current = { name: aName.trim(), desc: aDesc.trim(), tagline: aTagline.trim(), tone: aTone }
          await startOnboarding(user.wallet, { currentStep: 'inform', bigAvatarId: agentId, bigAvatarHandle: h, formData: collectFormData() })
        } else {
          // Already created: update if changed
          const snap = savedAvatar.current
          const changed = !snap || snap.name !== aName.trim() || snap.desc !== aDesc.trim() || snap.tagline !== aTagline.trim() || snap.tone !== aTone
          if (changed) {
            try {
              await updateAgent(bigAvatarId, { name: aName.trim(), briefDescription: aDesc.trim(), tagline: aTagline.trim() || undefined, tone: aTone as any })
              savedAvatar.current = { name: aName.trim(), desc: aDesc.trim(), tagline: aTagline.trim(), tone: aTone }
            } catch { }
          }
          await advanceOnboarding(user.wallet, { formData: collectFormData(), currentStep: 'inform' })
        }
      }

      // ── INFORM ──
      if (step.key === 'inform') {
        if (!wisdomId) {
          // First time: create
          const res = await fetch(`${AGENT_API_URL}/api/knowledge`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: wName.trim(), wallet: user.wallet, platformId: currentPlatform?.id }),
          })
          if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || d.error || 'Failed to create inform') }
          const data = await res.json()
          const kbId = data.id || data.knowledgeBaseId
          setWisdomId(kbId)
          savedInform.current = { name: wName.trim() }
          if (kbId && wFiles.length > 0) {
            const formData = new FormData()
            wFiles.forEach((f) => formData.append('files', f))
            try { await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}/upload`, { method: 'POST', body: formData }) } catch (uploadErr) { console.error('File upload failed:', uploadErr) }
          }
          if (bigAvatarId) try { await updateAgent(bigAvatarId, { knowledgeBaseIds: [kbId] }) } catch { }
          await advanceOnboarding(user.wallet, { formData: collectFormData(), currentStep: 'instruct', wisdomId: kbId })
        } else {
          // Already created: update name if changed
          const snap = savedInform.current
          const changed = !snap || snap.name !== wName.trim()
          if (changed) {
            try {
              await fetch(`${AGENT_API_URL}/api/knowledge/${wisdomId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: wName.trim() }),
              })
              savedInform.current = { name: wName.trim() }
            } catch { }
          }
          // Upload any new files
          if (wFiles.length > 0) {
            const formData = new FormData()
            wFiles.forEach((f) => formData.append('files', f))
            try { await fetch(`${AGENT_API_URL}/api/knowledge/${wisdomId}/upload`, { method: 'POST', body: formData }) } catch { }
            setWFiles([])
          }
          await advanceOnboarding(user.wallet, { formData: collectFormData(), currentStep: 'instruct' })
        }
      }

      // ── INSTRUCT (Stance) ──
      if (step.key === 'instruct') {
        const effectiveTone = sIsCustomTone ? sCustomTone.trim() : (sTone === 'Other' ? '' : sTone)
        const effectivePersona = sIsCustomPersona ? sCustomPersona.trim() : (sPersona === 'Other' ? '' : sPersona)
        const effectiveAudience = sIsCustomAudience ? sCustomAudience.trim() : (sAudience === 'Other' ? '' : sAudience)

        const body: Record<string, any> = { name: sName.trim(), wallet: user.wallet, platformId: currentPlatform?.id }
        if (sPrompt.trim()) body.content = sPrompt.trim()
        if (effectiveTone) body.tone = effectiveTone
        if (effectivePersona) body.persona = effectivePersona
        if (effectiveAudience) body.audience = effectiveAudience
        if (sFormat) body.format = sFormat
        if (sGoal.trim()) body.goal = sGoal.trim()

        const nextStep = 'worker'

        if (!stanceId) {
          const res = await fetch(`${AGENT_API_URL}/api/prompts`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || d.error || 'Failed to create stance') }
          const data = await res.json()
          const pId = data.id || data.promptId
          setStanceId(pId)
          savedStance.current = { name: sName.trim(), prompt: sPrompt.trim(), tone: effectiveTone, persona: effectivePersona, audience: effectiveAudience, format: sFormat, goal: sGoal.trim() }
          if (bigAvatarId && pId) try { await updateAgent(bigAvatarId, { promptId: pId }) } catch { }
          await advanceOnboarding(user.wallet, { formData: collectFormData(), currentStep: nextStep as any, stanceId: pId })
        } else {
          const snap = savedStance.current
          const changed = !snap || snap.name !== sName.trim() || snap.prompt !== sPrompt.trim() || snap.tone !== effectiveTone || snap.persona !== effectivePersona || snap.audience !== effectiveAudience || snap.format !== sFormat || snap.goal !== sGoal.trim()
          if (changed) {
            try {
              await fetch(`${AGENT_API_URL}/api/prompts/${stanceId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
              savedStance.current = { name: sName.trim(), prompt: sPrompt.trim(), tone: effectiveTone, persona: effectivePersona, audience: effectiveAudience, format: sFormat, goal: sGoal.trim() }
            } catch { }
          }
          await advanceOnboarding(user.wallet, { formData: collectFormData(), currentStep: nextStep as any })
        }
      }

      // ── WORKER ──
      if (step.key === 'worker') {
        const h = wkHandle.trim()
        if (!performerId) {
          const worker = await createWorkerAgent({
            name: `@${h}`, handle: h, briefDescription: wkDesc.trim(),
            role: wkRole.trim(),
            wallet: user.wallet, platformId: currentPlatform?.id,
          })
          setPerformerId(worker.id)
          setCreatedWorkerHandle(h)
          savedPerformer.current = { handle: h }
          await advanceOnboarding(user.wallet, { formData: collectFormData(), performerId: worker.id, currentStep: 'worker_inform' })
        } else {
          try { await updateAgent(performerId, { name: `@${h}`, handle: h, briefDescription: wkDesc.trim(), role: wkRole.trim() }) } catch { }
          savedPerformer.current = { handle: h }
          await advanceOnboarding(user.wallet, { formData: collectFormData(), currentStep: 'worker_inform' })
        }
      }

      // ── WORKER INFORM ──
      if (step.key === 'worker_inform') {
        let wkKbId = workerWisdomId
        if (!wkKbId) {
          // First time: create KB
          const res = await fetch(`${AGENT_API_URL}/api/knowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: wkiName.trim(), wallet: user.wallet, platformId: currentPlatform?.id }) })
          if (res.ok) { const data = await res.json(); wkKbId = data.id || data.knowledgeBaseId; setWorkerWisdomId(wkKbId) }
        } else {
          // Already created: update name if changed
          try { await fetch(`${AGENT_API_URL}/api/knowledge/${wkKbId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: wkiName.trim() }) }) } catch { }
        }
        // Upload any new files
        if (wkKbId && wkiFiles.length > 0) {
          const fd = new FormData(); wkiFiles.forEach(f => fd.append('files', f))
          try { await fetch(`${AGENT_API_URL}/api/knowledge/${wkKbId}/upload`, { method: 'POST', body: fd }) } catch { }
          setWkiFiles([])
        }
        if (wkKbId && performerId) try { await updateAgent(performerId, { knowledgeBaseIds: [wkKbId] }) } catch { }
        await advanceOnboarding(user.wallet, { formData: collectFormData(), currentStep: 'worker_instruct' } as any)
      }

      // ── WORKER STANCE (last) ──
      if (step.key === 'worker_instruct') {
        let wkPromptId = workerStanceId
        if (!wkPromptId) {
          // First time: create prompt
          const body: Record<string, any> = { name: wksName.trim(), wallet: user.wallet, platformId: currentPlatform?.id }
          if (wksPrompt.trim()) body.content = wksPrompt.trim()
          if (wksGoal.trim()) body.goal = wksGoal.trim()
          if (wksPersona) body.persona = wksPersona
          if (wksAudience) body.audience = wksAudience
          const res = await fetch(`${AGENT_API_URL}/api/prompts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          if (res.ok) { const data = await res.json(); wkPromptId = data.id || data.promptId; setWorkerStanceId(wkPromptId) }
        } else {
          // Already created: update
          const body: Record<string, any> = { name: wksName.trim() }
          if (wksPrompt.trim()) body.content = wksPrompt.trim()
          if (wksGoal.trim()) body.goal = wksGoal.trim()
          if (wksPersona) body.persona = wksPersona
          if (wksAudience) body.audience = wksAudience
          try { await fetch(`${AGENT_API_URL}/api/prompts/${wkPromptId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) } catch { }
        }
        if (wkPromptId && performerId) try { await updateAgent(performerId, { promptId: wkPromptId }) } catch { }
        await completeOnboarding(user.wallet)
        router.push('/agents')
        return
      }

      setCur((s) => s + 1)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  /* ━━━ Render ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  return (
    <div className="onb-page">
      <div className="onb-topbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" style={{ height: 32, width: 'auto' }} />
        </div>
        {/* Header */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#eb8000] to-amber-700 flex items-center justify-center overflow-hidden text-white text-sm font-medium">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.parentElement!.textContent =
                      user?.name?.charAt(0).toUpperCase() || 'U'
                  }}
                />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content z-[100] menu p-2 shadow-lg bg-card border border-card-border rounded-xl w-56 mt-2"
          >
            <li className="px-3 py-2">
              <div className="flex flex-col bg-transparent hover:bg-transparent cursor-default p-0">
                <span className="text-sm font-semibold text-white">
                  {user?.name || 'User'}
                </span>
                <span className="text-xs text-muted">{user?.email}</span>
              </div>
            </li>
            {user?.membership && (
              <li className="px-3 py-1">
                <div className="flex items-center gap-2 bg-transparent hover:bg-transparent cursor-default p-0">
                  <span className="text-[10px] font-semibold text-accent bg-accent/15 px-2 py-0.5 rounded capitalize">
                    {user.membership.type}
                  </span>
                  <span className="text-xs text-muted">
                    {user.membership.membershipType}
                  </span>
                </div>
              </li>
            )}
            <div className="border-t border-card-border my-2"></div>
            {user?.wallet && (
              <li>
                <a
                  href={`https://solscan.io/account/${user.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted hover:text-white hover:bg-input rounded-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {user.wallet.slice(0, 4)}...{user.wallet.slice(-4)}
                </a>
              </li>
            )}
            <div className="border-t border-card-border my-2"></div>
            <li>
              <button
                type="button"
                onClick={() => { logout(); router.push('/login') }}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Progress bar */}
      <div className="onb-progress-track"><div className="onb-progress-fill" style={{ width: `${progress}%` }} /></div>

      {/* Step dots */}
      <div className="onb-stepper">
        {steps.map((s, i) => {
          const done = (i + 1) < cur
          const active = (i + 1) === cur
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
              <div className="onb-step-item">
                <div className={`onb-step-dot ${done ? 'done' : active ? 'active' : ''}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`onb-step-label ${done ? 'done' : active ? 'active' : ''}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`onb-step-line ${done ? 'done' : ''}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Content */}
      <div className="onb-content">
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span className="onb-step-badge">Step {cur} of {totalSteps}</span>
          <h1 className="onb-title">
            {{ avatar: 'Create your Big Avatar', inform: 'Inform your Avatar', instruct: 'Set Your Stance', worker: 'Create your Performer', worker_inform: 'Inform your Performer', worker_instruct: 'Set Performer Stance' }[step.key as string]}
          </h1>
          <p className="onb-subtitle">
            {{ avatar: 'Your Big Avatar is your primary AI agent. Give it a name and description.', inform: 'Create an Inform and upload files to give your avatar knowledge.', instruct: "Set a Stance to define your avatar's role, personality, and behavior.", worker: 'Create a Performer agent to handle tasks.', worker_inform: 'Add knowledge files for your performer.', worker_instruct: "Define your performer's behavior and goals." }[step.key as string]}
          </p>
        </div>

        {/* Card */}
        <div className="onb-card">

          {/* ━━━ AVATAR ━━━ */}
          {step.key === 'avatar' && (
            <div className="onb-fields">
              {/* Name */}
              <div>
                <label className="onb-label">Avatar Name <span className="onb-req">*</span></label>
                <input type="text" value={aName} onChange={(e) => onAvatarNameChange(e.target.value)}
                  placeholder="Enter your avatar name" maxLength={PRESENCE_NAME_MAX}
                  className={`onb-input ${avatarNameErr ? 'error' : ''}`}
                />
                <div className="onb-field-footer">
                  {avatarNameErr && <span className="onb-field-error">{avatarNameErr}</span>}
                  <span className={`onb-counter ${aName.length >= PRESENCE_NAME_MAX ? 'max' : ''}`}>{aName.length}/{PRESENCE_NAME_MAX}</span>
                </div>
              </div>

              {/* Handle */}
              <div>
                <label className="onb-label">Avatar Handle <span className="onb-req">*</span></label>
                <div style={{ position: 'relative' }}>
                  <span className="onb-input-prefix">@</span>
                  <input type="text" value={aHandle} onChange={(e) => onAvatarHandleChange(e.target.value)}
                    placeholder="your_handle" maxLength={AGENT_HANDLE_MAX}
                    className={`onb-input has-prefix ${avatarHandleErr ? 'error' : aHandleAvailable === true && aHandle ? 'success' : ''}`}
                  />
                  {aHandleChecking && (
                    <span className="onb-input-suffix"><Icon icon="lucide:loader-2" width={14} height={14} style={{ animation: 'spin 1s linear infinite', color: 'rgba(255,255,255,0.4)' }} /></span>
                  )}
                  {!aHandleChecking && aHandleAvailable === true && aHandle && !avatarHandleFmtErr && (
                    <span className="onb-input-suffix"><Icon icon="lucide:check-circle" width={14} height={14} style={{ color: '#4CAF50' }} /></span>
                  )}
                </div>
                <div className="onb-field-footer">
                  {avatarHandleErr && <span className="onb-field-error">{avatarHandleErr}</span>}
                  {!avatarHandleErr && !aHandleChecking && aHandleAvailable === true && aHandle && (
                    <span className="onb-field-success">@{aHandle} is available</span>
                  )}
                  {aHandleSuggestion && (
                    <button type="button" onClick={acceptAvatarHandleSuggestion} className="onb-suggestion-btn">
                      Try @{aHandleSuggestion}
                    </button>
                  )}
                  <span className={`onb-counter ${aHandle.length >= AGENT_HANDLE_MAX ? 'max' : ''}`}>{aHandle.length}/{AGENT_HANDLE_MAX}</span>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="onb-label">Tagline</label>
                <input type="text" value={aTagline} onChange={(e) => { setATagline(e.target.value.slice(0, PRESENCE_TAGLINE_MAX)); setATaglineTouched(true) }}
                  placeholder="A short tagline for your avatar" maxLength={PRESENCE_TAGLINE_MAX}
                  className={`onb-input ${avatarTaglineErr ? 'error' : ''}`}
                />
                <div className="onb-field-footer">
                  {avatarTaglineErr && <span className="onb-field-error">{avatarTaglineErr}</span>}
                  <span className={`onb-counter ${aTagline.length >= PRESENCE_TAGLINE_MAX ? 'max' : ''}`}>{aTagline.length}/{PRESENCE_TAGLINE_MAX}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="onb-label">Description <span className="onb-req">*</span> <span className="onb-label-hint">(min {PRESENCE_DESCRIPTION_MIN} chars)</span></label>
                <textarea value={aDesc} onChange={(e) => { setADesc(e.target.value.slice(0, PRESENCE_DESCRIPTION_MAX)); setADescTouched(true) }}
                  placeholder="Describe your avatar's personality, expertise, and purpose..." rows={4}
                  maxLength={PRESENCE_DESCRIPTION_MAX}
                  className={`onb-textarea ${avatarDescErr ? 'error' : ''}`}
                />
                <div className="onb-field-footer">
                  {avatarDescErr && <span className="onb-field-error">{avatarDescErr}</span>}
                  <span className={`onb-counter ${aDesc.length >= PRESENCE_DESCRIPTION_MAX ? 'max' : ''}`}>{aDesc.length}/{PRESENCE_DESCRIPTION_MAX}</span>
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="onb-label">Personality Tone</label>
                <div className="onb-tone-grid">
                  {TONES.map((t) => (
                    <button key={t.value} type="button" onClick={() => setATone(t.value)}
                      className={`onb-tone-btn ${aTone === t.value ? 'active' : ''}`}>
                      <Icon icon={t.icon} width={14} height={14} />{t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ━━━ INFORM ━━━ */}
          {step.key === 'inform' && (
            <div className="onb-fields">
              <div>
                <label className="onb-label">Inform Name <span className="onb-req">*</span> <span className="onb-label-hint">(min {INFORM_NAME_MIN} chars)</span></label>
                <input type="text" value={wName} onChange={(e) => { setWName(e.target.value.slice(0, INFORM_NAME_MAX)); setWNameTouched(true) }}
                  placeholder="Name your knowledge base" maxLength={INFORM_NAME_MAX}
                  className={`onb-input ${wNameTouched && (wName.trim().length < INFORM_NAME_MIN || wName.length > INFORM_NAME_MAX) ? 'error' : ''}`} />
                <div className="onb-field-footer">
                  {wNameTouched && wName.trim().length > 0 && wName.trim().length < INFORM_NAME_MIN && (
                    <span className="onb-field-error">At least {INFORM_NAME_MIN} characters required</span>
                  )}
                  {wNameTouched && !wName.trim() && (
                    <span className="onb-field-error">Name is required</span>
                  )}
                  <span className={`onb-counter ${wName.length >= INFORM_NAME_MAX ? 'max' : ''}`}>{wName.length}/{INFORM_NAME_MAX}</span>
                </div>
              </div>
              <div>
                <label className="onb-label">Upload Content</label>
                <p className="onb-hint-text">Add files to give your avatar knowledge.</p>

                {/* Upload source tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button type="button" onClick={() => setWUploadSource('files')}
                    className={`onb-source-tab ${wUploadSource === 'files' ? 'active' : ''}`}>
                    <Icon icon="lucide:upload-cloud" width={16} height={16} />
                    Upload Files
                  </button>
                  <button type="button" onClick={() => setWUploadSource('gdrive')}
                    className={`onb-source-tab ${wUploadSource === 'gdrive' ? 'active' : ''}`}>
                    <Icon icon="lucide:hard-drive" width={16} height={16} />
                    Google Drive
                  </button>
                </div>

                {/* Files upload */}
                {wUploadSource === 'files' && (
                  <>
                    <div className="onb-dropzone" onClick={() => { setWFileError(''); fileInputRef.current?.click() }}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('dragover') }}
                      onDrop={(e) => {
                        e.preventDefault(); e.currentTarget.classList.remove('dragover')
                        setWFileError('')
                        const all = Array.from(e.dataTransfer.files)
                        const allowedExts = ['.pdf', '.txt', '.docx']
                        const validType = all.filter(f => allowedExts.some(ext => f.name.toLowerCase().endsWith(ext)))
                        const invalidType = all.filter(f => !allowedExts.some(ext => f.name.toLowerCase().endsWith(ext)))
                        const oversized = validType.filter(f => f.size > FILE_MAX_SIZE)
                        const sizeOk = validType.filter(f => f.size <= FILE_MAX_SIZE)
                        const existingSet = new Set([...wExistingItems.map(i => i.name.toLowerCase()), ...wFiles.map(f => f.name.toLowerCase())])
                        const duplicates = sizeOk.filter(f => existingSet.has(f.name.toLowerCase()))
                        const valid = sizeOk.filter(f => !existingSet.has(f.name.toLowerCase()))
                        const errors: string[] = []
                        if (invalidType.length > 0) errors.push(`${invalidType.map(f => f.name).join(', ')} — only PDF, TXT, DOCX allowed`)
                        if (oversized.length > 0) errors.push(`${oversized.map(f => f.name).join(', ')} — exceeded 5MB limit`)
                        if (duplicates.length > 0) errors.push(`${duplicates.map(f => f.name).join(', ')} — already uploaded`)
                        if (errors.length > 0) setWFileError(errors.join('. '))
                        if (valid.length) setWFiles(prev => [...prev, ...valid])
                      }}>
                      <Icon icon="lucide:file-text" width={36} height={36} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Drag & drop files here</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0 }}>PDF, TXT, DOCX — up to 5MB per file</p>
                    </div>
                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.docx" style={{ display: 'none' }}
                      onChange={(e) => {
                        setWFileError('')
                        const all = Array.from(e.target.files || [])
                        const allowedExts = ['.pdf', '.txt', '.docx']
                        const validType = all.filter(f => allowedExts.some(ext => f.name.toLowerCase().endsWith(ext)))
                        const invalidType = all.filter(f => !allowedExts.some(ext => f.name.toLowerCase().endsWith(ext)))
                        const oversized = validType.filter(f => f.size > FILE_MAX_SIZE)
                        const sizeOk = validType.filter(f => f.size <= FILE_MAX_SIZE)
                        const existingSet = new Set([...wExistingItems.map(i => i.name.toLowerCase()), ...wFiles.map(f => f.name.toLowerCase())])
                        const duplicates = sizeOk.filter(f => existingSet.has(f.name.toLowerCase()))
                        const valid = sizeOk.filter(f => !existingSet.has(f.name.toLowerCase()))
                        const errors: string[] = []
                        if (invalidType.length > 0) errors.push(`${invalidType.map(f => f.name).join(', ')} — unsupported file type`)
                        if (oversized.length > 0) errors.push(`${oversized.map(f => f.name).join(', ')} — exceeded 5MB limit`)
                        if (duplicates.length > 0) errors.push(`${duplicates.map(f => f.name).join(', ')} — already uploaded`)
                        if (errors.length > 0) setWFileError(errors.join('. '))
                        if (valid.length) setWFiles(prev => [...prev, ...valid])
                        e.target.value = ''
                      }} />
                  </>
                )}

                {/* Google Drive import */}
                {wUploadSource === 'gdrive' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Browse Google Drive button */}
                    <button type="button" onClick={gDrivePickerReady && !gDriveImporting ? () => openGooglePicker() : undefined}
                      disabled={!gDrivePickerReady || gDriveImporting}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', cursor: gDrivePickerReady ? 'pointer' : 'not-allowed', opacity: !gDrivePickerReady ? 0.5 : 1, transition: 'all 0.15s' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {!gDrivePickerReady ? (
                          <Icon icon="lucide:loader-2" width={22} height={22} style={{ color: 'rgba(59,130,246,0.5)', animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Icon icon="lucide:hard-drive" width={22} height={22} style={{ color: 'rgba(59,130,246,0.7)' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                          {!gDrivePickerReady ? 'Loading Google Drive...' : gDriveImporting ? 'Importing files...' : 'Browse Google Drive'}
                        </p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>
                          Select files or folders to import
                        </p>
                      </div>
                    </button>

                    {/* Switch account */}
                    {gDrivePickerReady && !gDriveImporting && (gDriveConn?.email || _isGdTokenValid()) && (
                      <button type="button" onClick={() => {
                        _gdCachedToken = null; _gdCachedTokenTs = 0
                        openGooglePicker(true)
                      }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#EAAA00', background: 'none', border: '1px solid rgba(234,170,0,0.3)', borderRadius: 6, cursor: 'pointer', padding: '6px 12px' }}>
                        <Icon icon="lucide:repeat-2" width={13} height={13} />
                        Use a different Google account
                      </button>
                    )}

                    {/* Folder URL alternative */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or paste a folder link</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" value={gDriveFolderUrl} onChange={(e) => setGDriveFolderUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="onb-input" style={{ flex: 1 }} />
                      <button type="button" disabled={!gDriveFolderUrl.trim() || gDriveImporting}
                        onClick={async () => {
                          const match = gDriveFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)
                          if (!match) { setGDriveError('Invalid Google Drive folder URL'); return }
                          setGDriveError('')
                          const kbId = await ensureWisdomId()
                          if (!kbId) return
                          setGDriveImporting(true)
                          try {
                            const token = await getGDriveToken()
                            // List files in folder via Google Drive API
                            const PICKER_MIMES = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.google-apps.document']
                            const mimeFilter = PICKER_MIMES.map(m => `mimeType='${m}'`).join(' or ')
                            const query = `'${match[1]}' in parents and trashed = false and (${mimeFilter})`
                            const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent('files(id,name,mimeType,size)')}&pageSize=20`, {
                              headers: { Authorization: `Bearer ${token}` },
                            })
                            if (!driveRes.ok) { setGDriveError('Failed to access folder. Make sure it is shared.'); setGDriveImporting(false); return }
                            const driveData = await driveRes.json()
                            const allFiles = driveData.files || []
                            if (allFiles.length === 0) { setGDriveError('No supported files found (PDF, TXT, DOCX, Google Docs)'); setGDriveImporting(false); return }
                            // Filter out oversized files (5MB limit) — Google Docs report size 0, skip check for those
                            const MAX_FILE_SIZE = 5 * 1024 * 1024
                            const oversizedNames: string[] = []
                            const validFiles = allFiles.filter((f: any) => {
                              const isWorkspaceFile = (f.mimeType as string).startsWith('application/vnd.google-apps.')
                              const fileSize = f.size ? Number(f.size) : 0
                              if (!isWorkspaceFile && fileSize > MAX_FILE_SIZE) {
                                oversizedNames.push(`${f.name} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`)
                                return false
                              }
                              return true
                            })
                            if (oversizedNames.length > 0) {
                              setGDriveError(`${oversizedNames.length} file${oversizedNames.length > 1 ? 's exceed' : ' exceeds'} the 5 MB limit: ${oversizedNames.join(', ')}`)
                            }
                            if (validFiles.length === 0) { setGDriveImporting(false); return }
                            // Fetch current KB items fresh — compare by Drive file ID for accuracy
                            let currentDriveIds = new Set<string>()
                            try {
                              const freshRes = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`)
                              if (freshRes.ok) {
                                const d = await freshRes.json()
                                for (const item of (d.items || [])) {
                                  const m = (item.url || '').match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
                                  if (m) currentDriveIds.add(m[1])
                                }
                              }
                            } catch { }
                            const files = validFiles.filter((f: any) => !currentDriveIds.has(f.id))
                            if (files.length === 0) { setGDriveError('All files already uploaded'); setGDriveImporting(false); return }
                            if (files.length < validFiles.length) { setGDriveError(`${validFiles.length - files.length} duplicate file(s) skipped`) }
                            // Import each file via the gdrive-import route
                            for (const f of files) {
                              try {
                                await fetch('/api/knowledge/gdrive-import', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ kbId: kbId, fileId: f.id, fileName: f.name, mimeType: f.mimeType, accessToken: token }),
                                })
                              } catch { }
                            }
                            setGDriveFolderUrl('')
                            // Refresh existing items
                            const kbRes = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`)
                            if (kbRes.ok) {
                              const data = await kbRes.json()
                              setWExistingItems((data.items || []).map((i: any) => ({ id: i.id, name: i.name, status: i.status, fileSize: i.fileSize, url: i.url, type: i.type })))
                            }
                          } catch (err: any) { setGDriveError(err?.message || 'Failed to import from Google Drive') }
                          finally { setGDriveImporting(false) }
                        }}
                        className="onb-generate-btn" style={{ padding: '10px 18px', width: 'auto', whiteSpace: 'nowrap' }}>
                        {gDriveImporting ? (
                          <><Icon icon="lucide:loader-2" width={14} height={14} style={{ animation: 'spin 1s linear infinite' }} /> Importing…</>
                        ) : (
                          <><Icon icon="lucide:folder-input" width={14} height={14} /> Import</>
                        )}
                      </button>
                    </div>

                    {gDriveError && (
                      <p style={{ fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon icon="lucide:alert-circle" width={14} height={14} />{gDriveError}
                      </p>
                    )}

                    {/* Import progress */}
                    {gDriveImportedFiles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                          {gDriveImporting ? `Importing ${gDriveImportedFiles.filter(f => f.status === 'done').length} of ${gDriveImportedFiles.length}...` : `${gDriveImportedFiles.filter(f => f.status === 'done').length} of ${gDriveImportedFiles.length} imported`}
                        </span>
                        {gDriveImportedFiles.map((f, i) => (
                          <div key={i} className="onb-file-item">
                            <Icon icon={f.status === 'done' ? 'lucide:check-circle' : f.status === 'error' ? 'lucide:x-circle' : 'lucide:loader-2'} width={14} height={14}
                              style={{ color: f.status === 'done' ? '#4CAF50' : f.status === 'error' ? '#f87171' : 'rgba(59,130,246,0.6)', flexShrink: 0, ...(f.status === 'importing' ? { animation: 'spin 1s linear infinite' } : {}) }} />
                            <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                            <span style={{ fontSize: 10, color: f.status === 'done' ? 'rgba(76,175,80,0.6)' : f.status === 'error' ? 'rgba(248,113,113,0.6)' : 'rgba(59,130,246,0.5)', flexShrink: 0 }}>
                              {f.status === 'done' ? 'Done' : f.status === 'error' ? 'Failed' : 'Importing...'}
                            </span>
                          </div>
                        ))}
                        {!gDriveImporting && (
                          <button type="button" onClick={() => setGDriveImportedFiles([])} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'right' }}>Clear list</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {wFileError && (
                  <p style={{ fontSize: 12, color: '#f87171', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon icon="lucide:alert-circle" width={14} height={14} />{wFileError}
                  </p>
                )}
                {/* Existing uploaded items */}
                {wExistingItems.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uploaded files</span>
                    {wExistingItems.map((item, i) => (
                      <div key={`existing-${i}`} className="onb-file-item">
                        <Icon icon={item.status === 'ingested' ? 'lucide:check-circle' : item.status === 'failed' ? 'lucide:x-circle' : 'lucide:clock'} width={16} height={16}
                          style={{ color: item.status === 'ingested' ? '#4CAF50' : item.status === 'failed' ? '#f87171' : '#f5a623', flexShrink: 0 }} />
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, fontSize: 13, color: '#EAAA00', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {item.name}
                            <Icon icon="lucide:external-link" width={11} height={11} style={{ opacity: 0.6, flexShrink: 0 }} />
                          </a>
                        ) : (
                          <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        )}
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                          {item.type === 'drive-link' ? 'Google Drive' : 'File'}
                        </span>
                        {item.fileSize != null && item.fileSize > 0 && (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                            {item.fileSize >= 1024 * 1024 ? `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB` : `${(item.fileSize / 1024).toFixed(0)} KB`}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: item.status === 'ingested' ? 'rgba(76,175,80,0.6)' : item.status === 'failed' ? 'rgba(248,113,113,0.6)' : 'rgba(245,166,35,0.6)', flexShrink: 0 }}>
                          {item.status === 'ingested' ? '✓ Uploaded' : item.status === 'failed' ? 'Failed' : 'Processing'}
                        </span>
                        {item.url && item.type !== 'drive-link' && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, color: '#EAAA00' }}>
                            <Icon icon="lucide:external-link" width={14} height={14} />
                          </a>
                        )}
                        <button type="button" onClick={() => setWItemToRemove(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                          <Icon icon="lucide:x" width={14} height={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* New files to upload */}
                {wFiles.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {wExistingItems.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New files</span>}
                    {wFiles.map((f, i) => (
                      <div key={i} className="onb-file-item">
                        <Icon icon="lucide:file-check" width={16} height={16} style={{ color: '#4CAF50', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{f.size >= 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`}</span>
                        <button type="button" onClick={() => setWFileToRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <Icon icon="lucide:x" width={14} height={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Remove file confirmation dialog */}
              {wItemToRemove !== null && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} onClick={() => !wItemRemoving && setWItemToRemove(null)} />
                  <div style={{ position: 'relative', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="lucide:trash-2" width={22} height={22} style={{ color: '#f87171' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Remove File</h3>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>This action cannot be undone</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 20px', lineHeight: 1.5 }}>
                      Are you sure you want to remove <strong style={{ color: '#fff' }}>{wExistingItems[wItemToRemove]?.name}</strong>?
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => setWItemToRemove(null)} disabled={wItemRemoving}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: wItemRemoving ? 'not-allowed' : 'pointer', opacity: wItemRemoving ? 0.5 : 1 }}>
                        Cancel
                      </button>
                      <button type="button" disabled={wItemRemoving} onClick={async () => {
                        const item = wExistingItems[wItemToRemove]
                        if (!item) { setWItemToRemove(null); return }
                        setWItemRemoving(true)
                        try {
                          await fetch(`${AGENT_API_URL}/api/knowledge/${wisdomId}/items/${item.id}`, { method: 'DELETE' })
                          setWExistingItems(prev => prev.filter((_, idx) => idx !== wItemToRemove))
                        } catch { }
                        setWItemRemoving(false)
                        setWItemToRemove(null)
                      }}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: wItemRemoving ? 'not-allowed' : 'pointer', opacity: wItemRemoving ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {wItemRemoving ? <Icon icon="lucide:loader-2" width={14} height={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon icon="lucide:trash-2" width={14} height={14} />}
                        {wItemRemoving ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Remove new (not-yet-uploaded) file confirmation dialog */}
              {wFileToRemove !== null && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} onClick={() => setWFileToRemove(null)} />
                  <div style={{ position: 'relative', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="lucide:trash-2" width={22} height={22} style={{ color: '#f87171' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Remove File</h3>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>This file won't be uploaded</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 20px', lineHeight: 1.5 }}>
                      Are you sure you want to remove <strong style={{ color: '#fff' }}>{wFiles[wFileToRemove]?.name}</strong>?
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => setWFileToRemove(null)}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button type="button" onClick={() => {
                        setWFiles(prev => prev.filter((_, idx) => idx !== wFileToRemove))
                        setWFileToRemove(null)
                      }}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Icon icon="lucide:trash-2" width={14} height={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ━━━ INSTRUCT ━━━ */}
          {step.key === 'instruct' && (
            <div className="onb-fields">
              <div>
                <label className="onb-label">Stance Name <span className="onb-req">*</span> <span className="onb-label-hint">(min {STANCE_NAME_MIN} chars)</span></label>
                <input type="text" value={sName} onChange={(e) => { setSName(e.target.value.slice(0, STANCE_NAME_MAX)); setSNameTouched(true) }}
                  placeholder="Name your stance" maxLength={STANCE_NAME_MAX}
                  className={`onb-input ${sNameTouched && (sName.trim().length < STANCE_NAME_MIN || sName.length > STANCE_NAME_MAX) ? 'error' : ''}`} />
                <div className="onb-field-footer">
                  {sNameTouched && sName.trim().length > 0 && sName.trim().length < STANCE_NAME_MIN && (
                    <span className="onb-field-error">At least {STANCE_NAME_MIN} characters required</span>
                  )}
                  {sNameTouched && !sName.trim() && (
                    <span className="onb-field-error">Name is required</span>
                  )}
                  <span className={`onb-counter ${sName.length >= STANCE_NAME_MAX ? 'max' : ''}`}>{sName.length}/{STANCE_NAME_MAX}</span>
                </div>
              </div>


              <div className="onb-guidance-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <Icon icon="lucide:sliders-horizontal" width={18} height={18} style={{ color: '#EAAA00' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Guidance</span>
                </div>
                <div className="onb-fields">
                  <div>
                    <label className="onb-label">Goal <span className="onb-label-hint">(min {GOAL_MIN} chars)</span></label>
                    <textarea value={sGoal} onChange={(e) => { setSGoal(e.target.value.slice(0, GOAL_MAX)); setGenerateError('') }} placeholder="What should this stance achieve? Describe the purpose and desired behavior." rows={3}
                      maxLength={GOAL_MAX}
                      className={`onb-textarea ${sGoal.trim().length > 0 && sGoal.trim().length < GOAL_MIN ? 'error' : ''}`} style={{ minHeight: 70 }} />
                    <div className="onb-field-footer">
                      {sGoal.trim().length > 0 && sGoal.trim().length < GOAL_MIN && (
                        <span className="onb-field-error">At least {GOAL_MIN} characters required</span>
                      )}
                      <span className={`onb-counter ${sGoal.length >= GOAL_MAX ? 'max' : ''}`}>{sGoal.length}/{GOAL_MAX}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                  {generateError && <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 10px' }}>{generateError}</p>}
                  <button type="button" disabled={generating || validating || sGoal.trim().length < GOAL_MIN} onClick={async () => {
                    setGenerateError('')
                    if (sGoal.trim().length < GOAL_MIN) { setGenerateError(`Please enter a goal with at least ${GOAL_MIN} characters.`); return }
                    setValidating(true)
                    const check = await validateGoalClarity(sGoal.trim(), sName)
                    setValidating(false)
                    if (!check.valid) { setGenerateError(check.message); return }
                    setGenerating(true)
                    try {
                      const instructions = `You are generating a system prompt (behavioral instructions) for an AI agent.

The stance is named "${sName}" but do NOT use this name as the agent's identity. Instead, derive the agent's role and identity from the goal below.

The user's goal for this agent: ${sGoal.trim()}

IMPORTANT RULES:
- If the goal says "generate a system prompt about X" or "create a prompt for X", do NOT create a meta prompt-generator. Create a system prompt that makes the agent an expert on X or a worker that performs X tasks.
- Do NOT start with "You are [stance name]". Start with "You are a [role derived from the goal]..."
- If the goal mentions "worker" or "agent", focus on actionable tasks the agent should PERFORM, not just knowledge it should have.
- Do NOT include meta-instructions like "do not generate prompts" or "do not create stories" in the output.

Generate a clear, actionable system prompt that:
- Defines the agent's role, purpose, and scope derived from the goal
- Specifies how the agent should behave, respond, and interact with users
- Includes guidelines on tone, boundaries, and what the agent should and should not do
- Is written as direct instructions to the AI (e.g. "You are a...", "Your role is...", "You should...")
- Is 3-5 paragraphs long

Do NOT generate creative prose, stories, or character descriptions. Generate only a functional system prompt.`
                      const res = await fetch(`${AGENT_API_URL}/api/prompts/generate`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: sName, goal: sGoal, instructions }),
                      })
                      const data = await res.json()
                      if (res.ok && data.content) { setSPrompt(data.content) }
                      else { setGenerateError(data.detail || data.error || 'Generation failed. You can write the stance manually.') }
                    } catch { setGenerateError('Could not connect to generation service.') }
                    finally { setGenerating(false) }
                  }} className="onb-generate-btn">
                    <Icon icon={generating || validating ? 'lucide:loader-2' : 'lucide:sparkles'} width={16} height={16} style={generating || validating ? { animation: 'spin 1s linear infinite' } : {}} />
                    {validating ? 'Checking goal...' : generating ? 'Generating...' : 'Generate with AI'}
                  </button>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '6px 0 0' }}>Generates a system prompt based on your goal</p>
                </div>
              </div>

              <div>
                <label className="onb-label">System Prompt {sPrompt && <span style={{ fontWeight: 400, color: 'rgba(76,175,80,0.7)', fontSize: 11, marginLeft: 6 }}>✓ {sPrompt.length} chars</span>}</label>
                <p className="onb-hint-text">
                  {sPrompt ? 'Review and edit the generated prompt, or write your own.' : 'Use Generate with AI above, or write your own instructions.'}
                </p>
                <textarea value={sPrompt} onChange={(e) => { if (e.target.value.length <= SYSTEM_PROMPT_MAX) setSPrompt(e.target.value) }}
                  placeholder="You are a helpful assistant that specializes in..." rows={6}
                  maxLength={SYSTEM_PROMPT_MAX}
                  className="onb-textarea" style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 13 }} />
                <div className="onb-field-footer">
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    {sPrompt.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                  <span className={`onb-counter ${sPrompt.length >= SYSTEM_PROMPT_MAX ? 'max' : sPrompt.length >= 40000 ? 'warn' : ''}`}>
                    {sPrompt.length}/{SYSTEM_PROMPT_MAX}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ━━━ WORKER ━━━ */}
          {step.key === 'worker' && (
            <div className="onb-fields">
              {/* Handle */}
              <div>
                <label className="onb-label">Performer Handle <span className="onb-req">*</span></label>
                <div style={{ position: 'relative' }}>
                  <span className="onb-input-prefix">@</span>
                  <input type="text" value={wkHandle} onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, AGENT_HANDLE_MAX).toLowerCase()
                    setWkHandle(cleaned); setWkHandleTouched(true); setWkHandleAvailable(null); setWkHandleSuggestion(null)
                    wkHandleVersion.current++; const v = wkHandleVersion.current
                    if (wkHandleTimer.current) clearTimeout(wkHandleTimer.current)
                    if (cleaned && !validatePresenceHandle(cleaned)) {
                      setWkHandleChecking(true)
                      wkHandleTimer.current = setTimeout(async () => {
                        try { const r = await checkHandleAvailability(cleaned); if (wkHandleVersion.current === v) { setWkHandleAvailable(r.available ?? r); setWkHandleChecking(false) } } catch { if (wkHandleVersion.current === v) setWkHandleChecking(false) }
                      }, 400)
                    }
                  }} placeholder="performer_handle" maxLength={AGENT_HANDLE_MAX}
                    className={`onb-input has-prefix ${wkHandleAvailable === true && wkHandle ? 'success' : wkHandleAvailable === false ? 'error' : ''}`} />
                  {wkHandleChecking && <span className="onb-input-suffix"><Icon icon="lucide:loader-2" width={14} height={14} style={{ animation: 'spin 1s linear infinite', color: 'rgba(255,255,255,0.4)' }} /></span>}
                  {!wkHandleChecking && wkHandleAvailable === true && wkHandle && <span className="onb-input-suffix"><Icon icon="lucide:check-circle" width={14} height={14} style={{ color: '#4CAF50' }} /></span>}
                </div>
                <div className="onb-field-footer">
                  {wkHandleAvailable === false && <span className="onb-field-error">@{wkHandle} is already taken</span>}
                  {!wkHandleChecking && wkHandleAvailable === true && wkHandle && <span className="onb-field-success">@{wkHandle} is available</span>}
                  <span className={`onb-counter ${wkHandle.length >= AGENT_HANDLE_MAX ? 'max' : ''}`}>{wkHandle.length}/{AGENT_HANDLE_MAX}</span>
                </div>
              </div>
              {/* Specialization / Role */}
              <div>
                <label className="onb-label">Specialization / Role <span className="onb-req">*</span> <span className="onb-label-hint">(min 3 chars)</span></label>
                <input type="text" value={wkRole} onChange={(e) => setWkRole(e.target.value)}
                  placeholder="e.g. Social Media Manager, Email Handler, Content Writer"
                  className={`onb-input ${wkRole.trim().length > 0 && wkRole.trim().length < 3 ? 'error' : ''}`} />
                <div className="onb-field-footer">
                  {wkRole.trim().length > 0 && wkRole.trim().length < 3 && <span className="onb-field-error">At least 3 characters required</span>}
                </div>
              </div>
              {/* Description */}
              <div>
                <label className="onb-label">Description <span className="onb-req">*</span> <span className="onb-label-hint">(min {PRESENCE_DESCRIPTION_MIN} chars)</span></label>
                <textarea value={wkDesc} onChange={(e) => { setWkDesc(e.target.value.slice(0, PRESENCE_DESCRIPTION_MAX)); setWkDescTouched(true) }}
                  placeholder="Describe what this performer does, its capabilities and responsibilities..." rows={4} maxLength={PRESENCE_DESCRIPTION_MAX}
                  className={`onb-textarea ${wkDescTouched && validatePresenceDescription(wkDesc) ? 'error' : ''}`} />
                <div className="onb-field-footer">
                  {wkDescTouched && validatePresenceDescription(wkDesc) && <span className="onb-field-error">{validatePresenceDescription(wkDesc)}</span>}
                  <span className={`onb-counter ${wkDesc.length >= PRESENCE_DESCRIPTION_MAX ? 'max' : ''}`}>{wkDesc.length}/{PRESENCE_DESCRIPTION_MAX}</span>
                </div>
              </div>
            </div>
          )}

          {/* ━━━ WORKER INFORM ━━━ */}
          {step.key === 'worker_inform' && (
            <div className="onb-fields">
              <div>
                <label className="onb-label">Inform Name <span className="onb-req">*</span> <span className="onb-label-hint">(min {INFORM_NAME_MIN} chars)</span></label>
                <input type="text" value={wkiName} onChange={(e) => { setWkiName(e.target.value.slice(0, INFORM_NAME_MAX)); setWkiNameTouched(true) }}
                  placeholder="Name your performer's knowledge base" maxLength={INFORM_NAME_MAX}
                  className={`onb-input ${wkiNameTouched && (wkiName.trim().length < INFORM_NAME_MIN || wkiName.length > INFORM_NAME_MAX) ? 'error' : ''}`} />
                <div className="onb-field-footer">
                  {wkiNameTouched && wkiName.trim().length > 0 && wkiName.trim().length < INFORM_NAME_MIN && (
                    <span className="onb-field-error">At least {INFORM_NAME_MIN} characters required</span>
                  )}
                  {wkiNameTouched && !wkiName.trim() && (
                    <span className="onb-field-error">Name is required</span>
                  )}
                  <span className={`onb-counter ${wkiName.length >= INFORM_NAME_MAX ? 'max' : ''}`}>{wkiName.length}/{INFORM_NAME_MAX}</span>
                </div>
              </div>
              <div>
                <label className="onb-label">Upload Content</label>
                <p className="onb-hint-text">Add files to give your performer knowledge.</p>

                {/* Upload source tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button type="button" onClick={() => setWkiUploadSource('files')}
                    className={`onb-source-tab ${wkiUploadSource === 'files' ? 'active' : ''}`}>
                    <Icon icon="lucide:upload-cloud" width={16} height={16} />
                    Upload Files
                  </button>
                  <button type="button" onClick={() => setWkiUploadSource('gdrive')}
                    className={`onb-source-tab ${wkiUploadSource === 'gdrive' ? 'active' : ''}`}>
                    <Icon icon="lucide:hard-drive" width={16} height={16} />
                    Google Drive
                  </button>
                </div>

                {/* Files upload */}
                {wkiUploadSource === 'files' && (
                  <>
                    <div className="onb-dropzone" onClick={() => { setWkiFileError(''); wkiFileInputRef.current?.click() }}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('dragover') }}
                      onDrop={(e) => {
                        e.preventDefault(); e.currentTarget.classList.remove('dragover')
                        setWkiFileError('')
                        const all = Array.from(e.dataTransfer.files)
                        const allowedExts = ['.pdf', '.txt', '.docx']
                        const validType = all.filter(f => allowedExts.some(ext => f.name.toLowerCase().endsWith(ext)))
                        const oversized = validType.filter(f => f.size > FILE_MAX_SIZE)
                        const sizeOk = validType.filter(f => f.size <= FILE_MAX_SIZE)
                        const existingSet = new Set([...wkiExistingItems.map(i => i.name.toLowerCase()), ...wkiFiles.map(f => f.name.toLowerCase())])
                        const duplicates = sizeOk.filter(f => existingSet.has(f.name.toLowerCase()))
                        const valid = sizeOk.filter(f => !existingSet.has(f.name.toLowerCase()))
                        const errors: string[] = []
                        if (all.length > validType.length) errors.push('Some files have unsupported format (only PDF, TXT, DOCX)')
                        if (oversized.length > 0) errors.push(`${oversized.map(f => f.name).join(', ')} — exceeded 5MB limit`)
                        if (duplicates.length > 0) errors.push(`${duplicates.map(f => f.name).join(', ')} — already uploaded`)
                        if (errors.length > 0) setWkiFileError(errors.join('. '))
                        if (valid.length) setWkiFiles(prev => [...prev, ...valid])
                      }}>
                      <Icon icon="lucide:file-text" width={36} height={36} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Drag & drop files here</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0 }}>PDF, TXT, DOCX — up to 5MB per file</p>
                    </div>
                    <input ref={wkiFileInputRef} type="file" multiple accept=".pdf,.txt,.docx" style={{ display: 'none' }}
                      onChange={(e) => {
                        setWkiFileError('')
                        const all = Array.from(e.target.files || [])
                        const allowedExts = ['.pdf', '.txt', '.docx']
                        const validType = all.filter(f => allowedExts.some(ext => f.name.toLowerCase().endsWith(ext)))
                        const oversized = validType.filter(f => f.size > FILE_MAX_SIZE)
                        const sizeOk = validType.filter(f => f.size <= FILE_MAX_SIZE)
                        const existingSet = new Set([...wkiExistingItems.map(i => i.name.toLowerCase()), ...wkiFiles.map(f => f.name.toLowerCase())])
                        const valid = sizeOk.filter(f => !existingSet.has(f.name.toLowerCase()))
                        const errors: string[] = []
                        if (all.length > validType.length) errors.push('Some files have unsupported format')
                        if (oversized.length > 0) errors.push(`${oversized.map(f => f.name).join(', ')} — exceeded 5MB limit`)
                        if (errors.length > 0) setWkiFileError(errors.join('. '))
                        if (valid.length) setWkiFiles(prev => [...prev, ...valid])
                        e.target.value = ''
                      }} />
                  </>
                )}

                {/* Google Drive import */}
                {wkiUploadSource === 'gdrive' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Browse Google Drive button */}
                    <button type="button" onClick={gDrivePickerReady && !gDriveImporting ? async () => {
                      const kbId = await ensureWorkerWisdomId()
                      if (!kbId) { setGDriveError('Please enter an Inform Name first'); return }
                      openGooglePicker(false, kbId, setWkiExistingItems)
                    } : undefined}
                      disabled={!gDrivePickerReady || gDriveImporting}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', cursor: gDrivePickerReady ? 'pointer' : 'not-allowed', opacity: !gDrivePickerReady ? 0.5 : 1, transition: 'all 0.15s' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {!gDrivePickerReady ? (
                          <Icon icon="lucide:loader-2" width={22} height={22} style={{ color: 'rgba(59,130,246,0.5)', animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Icon icon="lucide:hard-drive" width={22} height={22} style={{ color: 'rgba(59,130,246,0.7)' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                          {!gDrivePickerReady ? 'Loading Google Drive...' : gDriveImporting ? 'Importing files...' : 'Browse Google Drive'}
                        </p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>Select files or folders to import</p>
                      </div>
                    </button>

                    {/* Switch account */}
                    {gDrivePickerReady && !gDriveImporting && (gDriveConn?.email || _isGdTokenValid()) && (
                      <button type="button" onClick={async () => {
                        _gdCachedToken = null; _gdCachedTokenTs = 0
                        const kbId = await ensureWorkerWisdomId()
                        if (kbId) openGooglePicker(true, kbId, setWkiExistingItems)
                      }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#EAAA00', background: 'none', border: '1px solid rgba(234,170,0,0.3)', borderRadius: 6, cursor: 'pointer', padding: '6px 12px' }}>
                        <Icon icon="lucide:repeat-2" width={13} height={13} />
                        Use a different Google account
                      </button>
                    )}

                    {/* Folder URL alternative */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or paste a folder link</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" value={gDriveFolderUrl} onChange={(e) => setGDriveFolderUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="onb-input" style={{ flex: 1 }} />
                      <button type="button" disabled={!gDriveFolderUrl.trim() || gDriveImporting}
                        onClick={async () => {
                          const match = gDriveFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)
                          if (!match) { setGDriveError('Invalid Google Drive folder URL'); return }
                          setGDriveError('')
                          const kbId = await ensureWorkerWisdomId()
                          if (!kbId) return
                          setGDriveImporting(true)
                          try {
                            const token = await getGDriveToken()
                            const PICKER_MIMES = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.google-apps.document']
                            const mimeFilter = PICKER_MIMES.map(m => `mimeType='${m}'`).join(' or ')
                            const query = `'${match[1]}' in parents and trashed = false and (${mimeFilter})`
                            const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent('files(id,name,mimeType,size)')}&pageSize=20`, {
                              headers: { Authorization: `Bearer ${token}` },
                            })
                            if (!driveRes.ok) { setGDriveError('Failed to access folder. Make sure it is shared.'); setGDriveImporting(false); return }
                            const driveData = await driveRes.json()
                            const allFiles = driveData.files || []
                            if (allFiles.length === 0) { setGDriveError('No supported files found (PDF, TXT, DOCX, Google Docs)'); setGDriveImporting(false); return }
                            const MAX_FILE_SIZE = 5 * 1024 * 1024
                            const oversizedNames: string[] = []
                            const validFiles = allFiles.filter((f: any) => {
                              const isWorkspaceFile = (f.mimeType as string).startsWith('application/vnd.google-apps.')
                              const fileSize = f.size ? Number(f.size) : 0
                              if (!isWorkspaceFile && fileSize > MAX_FILE_SIZE) { oversizedNames.push(`${f.name} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`); return false }
                              return true
                            })
                            if (oversizedNames.length > 0) setGDriveError(`${oversizedNames.length} file${oversizedNames.length > 1 ? 's exceed' : ' exceeds'} the 5 MB limit: ${oversizedNames.join(', ')}`)
                            if (validFiles.length === 0) { setGDriveImporting(false); return }
                            let currentDriveIds = new Set<string>()
                            try {
                              const freshRes = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`)
                              if (freshRes.ok) { const d = await freshRes.json(); for (const item of (d.items || [])) { const m = (item.url || '').match(/\/file\/d\/([a-zA-Z0-9_-]+)/); if (m) currentDriveIds.add(m[1]) } }
                            } catch { }
                            const files = validFiles.filter((f: any) => !currentDriveIds.has(f.id))
                            if (files.length === 0) { setGDriveError('All files already uploaded'); setGDriveImporting(false); return }
                            for (const f of files) {
                              try { await fetch('/api/knowledge/gdrive-import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kbId, fileId: f.id, fileName: f.name, mimeType: f.mimeType, accessToken: token }) }) } catch { }
                            }
                            setGDriveFolderUrl('')
                            const kbRes = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`)
                            if (kbRes.ok) { const data = await kbRes.json(); setWkiExistingItems((data.items || []).map((i: any) => ({ id: i.id, name: i.name, status: i.status, fileSize: i.fileSize, url: i.url, type: i.type }))) }
                          } catch (err: any) { setGDriveError(err?.message || 'Failed to import from Google Drive') }
                          finally { setGDriveImporting(false) }
                        }}
                        className="onb-generate-btn" style={{ padding: '10px 18px', width: 'auto', whiteSpace: 'nowrap' }}>
                        {gDriveImporting ? (
                          <><Icon icon="lucide:loader-2" width={14} height={14} style={{ animation: 'spin 1s linear infinite' }} /> Importing…</>
                        ) : (
                          <><Icon icon="lucide:folder-input" width={14} height={14} /> Import</>
                        )}
                      </button>
                    </div>

                    {gDriveError && (
                      <p style={{ fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon icon="lucide:alert-circle" width={14} height={14} />{gDriveError}
                      </p>
                    )}

                    {/* Import progress */}
                    {gDriveImportedFiles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                          {gDriveImporting ? `Importing ${gDriveImportedFiles.filter(f => f.status === 'done').length} of ${gDriveImportedFiles.length}...` : `${gDriveImportedFiles.filter(f => f.status === 'done').length} of ${gDriveImportedFiles.length} imported`}
                        </span>
                        {gDriveImportedFiles.map((f, i) => (
                          <div key={i} className="onb-file-item">
                            <Icon icon={f.status === 'done' ? 'lucide:check-circle' : f.status === 'error' ? 'lucide:x-circle' : 'lucide:loader-2'} width={14} height={14}
                              style={{ color: f.status === 'done' ? '#4CAF50' : f.status === 'error' ? '#f87171' : 'rgba(59,130,246,0.6)', flexShrink: 0, ...(f.status === 'importing' ? { animation: 'spin 1s linear infinite' } : {}) }} />
                            <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                            <span style={{ fontSize: 10, color: f.status === 'done' ? 'rgba(76,175,80,0.6)' : f.status === 'error' ? 'rgba(248,113,113,0.6)' : 'rgba(59,130,246,0.5)', flexShrink: 0 }}>
                              {f.status === 'done' ? 'Done' : f.status === 'error' ? 'Failed' : 'Importing...'}
                            </span>
                          </div>
                        ))}
                        {!gDriveImporting && (
                          <button type="button" onClick={() => setGDriveImportedFiles([])} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'right' }}>Clear list</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {wkiFileError && <p style={{ fontSize: 12, color: '#f87171', margin: '8px 0 0' }}>{wkiFileError}</p>}

                {/* Existing uploaded items */}
                {wkiExistingItems.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uploaded files</span>
                    {wkiExistingItems.map((item, i) => (
                      <div key={item.id} className="onb-file-item">
                        <Icon icon={item.status === 'ingested' ? 'lucide:check-circle' : item.status === 'failed' ? 'lucide:x-circle' : 'lucide:clock'} width={16} height={16}
                          style={{ color: item.status === 'ingested' ? '#4CAF50' : item.status === 'failed' ? '#f87171' : '#f5a623', flexShrink: 0 }} />
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, fontSize: 13, color: '#EAAA00', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {item.name}
                            <Icon icon="lucide:external-link" width={11} height={11} style={{ opacity: 0.6, flexShrink: 0 }} />
                          </a>
                        ) : (
                          <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        )}
                        {item.fileSize != null && item.fileSize > 0 && (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                            {item.fileSize >= 1024 * 1024 ? `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB` : `${(item.fileSize / 1024).toFixed(0)} KB`}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: item.status === 'ingested' ? 'rgba(76,175,80,0.6)' : item.status === 'failed' ? 'rgba(248,113,113,0.6)' : 'rgba(245,166,35,0.6)', flexShrink: 0 }}>
                          {item.status === 'ingested' ? '✓ Uploaded' : item.status === 'failed' ? 'Failed' : 'Processing'}
                        </span>
                        {item.url && item.type !== 'drive-link' && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, color: '#EAAA00' }}>
                            <Icon icon="lucide:external-link" width={14} height={14} />
                          </a>
                        )}
                        <button type="button" onClick={() => setWkiItemToRemove(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                          <Icon icon="lucide:x" width={14} height={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New files to upload */}
                {wkiFiles.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {wkiExistingItems.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New files</span>}
                    {wkiFiles.map((f, i) => (
                      <div key={i} className="onb-file-item">
                        <Icon icon="lucide:file-check" width={16} height={16} style={{ color: '#4CAF50', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{f.size >= 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`}</span>
                        <button type="button" onClick={() => setWkiFileToRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          <Icon icon="lucide:x" width={14} height={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remove file confirmation dialog */}
              {wkiItemToRemove !== null && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} onClick={() => !wkiItemRemoving && setWkiItemToRemove(null)} />
                  <div style={{ position: 'relative', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="lucide:trash-2" width={22} height={22} style={{ color: '#f87171' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Remove File</h3>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>This action cannot be undone</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 20px', lineHeight: 1.5 }}>
                      Are you sure you want to remove <strong style={{ color: '#fff' }}>{wkiExistingItems[wkiItemToRemove]?.name}</strong>?
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => setWkiItemToRemove(null)} disabled={wkiItemRemoving}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: wkiItemRemoving ? 'not-allowed' : 'pointer' }}>
                        Cancel
                      </button>
                      <button type="button" disabled={wkiItemRemoving} onClick={async () => {
                        const item = wkiExistingItems[wkiItemToRemove]
                        if (!item) { setWkiItemToRemove(null); return }
                        setWkiItemRemoving(true)
                        try { await fetch(`${AGENT_API_URL}/api/knowledge/${workerWisdomId}/items/${item.id}`, { method: 'DELETE' }); setWkiExistingItems(prev => prev.filter((_, idx) => idx !== wkiItemToRemove)) } catch { }
                        setWkiItemRemoving(false); setWkiItemToRemove(null)
                      }}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: wkiItemRemoving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {wkiItemRemoving ? <Icon icon="lucide:loader-2" width={14} height={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon icon="lucide:trash-2" width={14} height={14} />}
                        {wkiItemRemoving ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Remove new (not-yet-uploaded) file confirmation dialog */}
              {wkiFileToRemove !== null && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} onClick={() => setWkiFileToRemove(null)} />
                  <div style={{ position: 'relative', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="lucide:trash-2" width={22} height={22} style={{ color: '#f87171' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Remove File</h3>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>This file won't be uploaded</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 20px', lineHeight: 1.5 }}>
                      Are you sure you want to remove <strong style={{ color: '#fff' }}>{wkiFiles[wkiFileToRemove]?.name}</strong>?
                    </p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => setWkiFileToRemove(null)}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button type="button" onClick={() => {
                        setWkiFiles(prev => prev.filter((_, idx) => idx !== wkiFileToRemove))
                        setWkiFileToRemove(null)
                      }}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Icon icon="lucide:trash-2" width={14} height={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ━━━ WORKER STANCE ━━━ */}
          {step.key === 'worker_instruct' && (
            <div className="onb-fields">
              <div>
                <label className="onb-label">Stance Name <span className="onb-req">*</span> <span className="onb-label-hint">(min {STANCE_NAME_MIN} chars)</span></label>
                <input type="text" value={wksName} onChange={(e) => { setWksName(e.target.value.slice(0, STANCE_NAME_MAX)); setWksNameTouched(true) }}
                  placeholder="Name your performer's stance" maxLength={STANCE_NAME_MAX}
                  className={`onb-input ${wksNameTouched && (wksName.trim().length < STANCE_NAME_MIN || wksName.length > STANCE_NAME_MAX) ? 'error' : ''}`} />
                <div className="onb-field-footer">
                  {wksNameTouched && wksName.trim().length > 0 && wksName.trim().length < STANCE_NAME_MIN && (
                    <span className="onb-field-error">At least {STANCE_NAME_MIN} characters required</span>
                  )}
                  {wksNameTouched && !wksName.trim() && (
                    <span className="onb-field-error">Name is required</span>
                  )}
                  <span className={`onb-counter ${wksName.length >= STANCE_NAME_MAX ? 'max' : ''}`}>{wksName.length}/{STANCE_NAME_MAX}</span>
                </div>
              </div>

              <div className="onb-guidance-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <Icon icon="lucide:sliders-horizontal" width={18} height={18} style={{ color: '#eb8000' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Guidance</span>
                </div>
                <div className="onb-fields">
                  <div>
                    <label className="onb-label">Goal <span className="onb-label-hint">(min {GOAL_MIN} chars)</span></label>
                    <textarea value={wksGoal} onChange={(e) => { setWksGoal(e.target.value.slice(0, GOAL_MAX)); setGenerateError('') }} placeholder="What should this performer accomplish? Describe the purpose and desired behavior." rows={3}
                      maxLength={GOAL_MAX}
                      className={`onb-textarea ${wksGoal.trim().length > 0 && wksGoal.trim().length < GOAL_MIN ? 'error' : ''}`} style={{ minHeight: 70 }} />
                    <div className="onb-field-footer">
                      {wksGoal.trim().length > 0 && wksGoal.trim().length < GOAL_MIN && (
                        <span className="onb-field-error">At least {GOAL_MIN} characters required</span>
                      )}
                      <span className={`onb-counter ${wksGoal.length >= GOAL_MAX ? 'max' : ''}`}>{wksGoal.length}/{GOAL_MAX}</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                  {generateError && <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 10px' }}>{generateError}</p>}
                  <button type="button" disabled={generating || wksGoal.trim().length < GOAL_MIN} onClick={async () => {
                    setGenerateError('')
                    if (wksGoal.trim().length < GOAL_MIN) { setGenerateError(`Please enter a goal with at least ${GOAL_MIN} characters.`); return }
                    setGenerating(true)
                    try {
                      const instructions = `You are generating a system prompt (behavioral instructions) for a Performer AI agent.

The stance is named "${wksName}" but do NOT use this name as the agent's identity. Instead, derive the agent's role and identity from the goal below.

The user's goal for this performer agent: ${wksGoal.trim()}

IMPORTANT RULES:
- If the goal says "generate a system prompt about X" or "create a prompt for X", do NOT create a meta prompt-generator. Create a system prompt that makes the agent an expert on X or a performer that performs X tasks.
- Do NOT start with "You are [stance name]". Start with "You are a [role derived from the goal]..."
- If the goal mentions "performer" or "agent", focus on actionable tasks the agent should PERFORM, not just knowledge it should have.
- Do NOT include meta-instructions like "do not generate prompts" or "do not create stories" in the output.

Generate a clear, actionable system prompt that:
- Defines the agent's role, purpose, and scope derived from the goal
- Specifies how the agent should behave, respond, and interact with users
- Includes guidelines on tone, boundaries, and what the agent should and should not do
- Is written as direct instructions to the AI (e.g. "You are a...", "Your role is...", "You should...")
- Is 3-5 paragraphs long

Do NOT generate creative prose, stories, or character descriptions. Generate only a functional system prompt.`
                      const res = await fetch(`${AGENT_API_URL}/api/prompts/generate`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: wksName, goal: wksGoal, instructions }),
                      })
                      const data = await res.json()
                      if (res.ok && data.content) { setWksPrompt(data.content) }
                      else { setGenerateError(data.detail || data.error || 'Generation failed. You can write the stance manually.') }
                    } catch { setGenerateError('Could not connect to generation service.') }
                    finally { setGenerating(false) }
                  }} className="onb-generate-btn">
                    <Icon icon={generating ? 'lucide:loader-2' : 'lucide:sparkles'} width={16} height={16} style={generating ? { animation: 'spin 1s linear infinite' } : {}} />
                    {generating ? 'Generating...' : 'Generate with AI'}
                  </button>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '6px 0 0' }}>Generates a system prompt based on your goal</p>
                </div>
              </div>

              <div>
                <label className="onb-label">System Prompt {wksPrompt && <span style={{ fontWeight: 400, color: 'rgba(76,175,80,0.7)', fontSize: 11, marginLeft: 6 }}>✓ {wksPrompt.length} chars</span>}</label>
                <p className="onb-hint-text">
                  {wksPrompt ? 'Review and edit the generated prompt, or write your own.' : 'Use Generate with AI above, or write your own instructions.'}
                </p>
                <textarea value={wksPrompt} onChange={(e) => { if (e.target.value.length <= SYSTEM_PROMPT_MAX) setWksPrompt(e.target.value) }}
                  placeholder="You are a helpful performer agent that specializes in..." rows={6}
                  maxLength={SYSTEM_PROMPT_MAX}
                  className="onb-textarea" style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 13 }} />
                <div className="onb-field-footer">
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    {wksPrompt.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                  <span className={`onb-counter ${wksPrompt.length >= SYSTEM_PROMPT_MAX ? 'max' : wksPrompt.length >= 40000 ? 'warn' : ''}`}>
                    {wksPrompt.length}/{SYSTEM_PROMPT_MAX}
                  </span>
                </div>
              </div>
            </div>
          )}


        </div>

        {/* Error */}
        {error && <div className="onb-error"><Icon icon="lucide:alert-circle" width={18} height={18} />{error}</div>}

        {/* Footer */}
        {/* Navigation — hidden during inline creation flows */}
        {!createFlowMode && (
          <div className="onb-footer">
            <div>
              {cur > 1 && (
                <button type="button" onClick={async () => {
                  // Persist current form data before navigating back
                  if (user?.wallet) await advanceOnboarding(user.wallet, { formData: collectFormData() })
                  setCur((s) => s - 1)
                }} className="onb-back-btn" disabled={saving || generating || gDriveImporting || wItemRemoving}
                  style={saving || generating || gDriveImporting || wItemRemoving ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>← Back</button>
              )}
            </div>
            <button type="button" onClick={handleContinue} disabled={!canProceed() || saving || generating || gDriveImporting || wItemRemoving} className={`onb-primary-btn ${canProceed() && !saving && !generating && !gDriveImporting && !wItemRemoving ? 'enabled' : ''}`}>
              {saving ? <><Icon icon="lucide:loader-2" width={16} height={16} style={{ animation: 'spin 1s linear infinite' }} />Creating...</>
                : cur === totalSteps ? 'Finish Setup ✓' : 'Continue →'}
            </button>
          </div>
        )}
      </div>

      {/* ━━━ Styles ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }

       .onb-page {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(160deg, #080625 0%, #0F0D42 40%, #1a0e3e 100%);
  font-family: inherit;
  color: #fff;

  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

        .onb-topbar { width: 100%; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); box-sizing: border-box; }
        .onb-logo { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #fff; }
        .onb-badge { font-size: 9px; font-weight: 800; background: #EAAA00; color: #fff; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.5px; margin-left: 10px; }
        .onb-switch-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .onb-switch-btn:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.04); }

        .onb-progress-track { width: 100%; height: 3px; background: rgba(255,255,255,0.06); }
        .onb-progress-fill { height: 100%; background: linear-gradient(90deg, #EAAA00, #f5a623); border-radius: 0 2px 2px 0; transition: width 0.5s ease; }

        .onb-stepper { display: flex; align-items: center; padding: 28px 16px 8px; flex-wrap: wrap; justify-content: center; gap: 0; }
        .onb-step-item { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 56px; }
        .onb-step-dot { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.3); transition: all 0.3s; }
        .onb-step-dot.active { background: rgba(234,170,0,0.2); border-color: #EAAA00; color: #EAAA00; }
        .onb-step-dot.done { background: rgba(76,175,80,0.2); border-color: rgba(76,175,80,0.5); color: #4CAF50; font-size: 14px; }
        .onb-step-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.25); transition: all 0.3s; }
        .onb-step-label.active { color: #EAAA00; }
        .onb-step-label.done { color: rgba(76,175,80,0.7); }
        .onb-step-line { width: 32px; height: 2px; margin-bottom: 22px; background: rgba(255,255,255,0.08); border-radius: 1px; transition: all 0.3s; flex-shrink: 0; }
        .onb-step-line.done { background: rgba(76,175,80,0.3); }

        .onb-content { width: 100%; max-width: 560px; padding: 16px 24px 48px; box-sizing: border-box; }
        .onb-step-badge { font-size: 10px; font-weight: 700; color: #EAAA00; background: rgba(234,170,0,0.15); padding: 4px 12px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
        .onb-title { font-size: 26px; font-weight: 800; margin: 14px 0 0; letter-spacing: -0.3px; }
        .onb-subtitle { font-size: 14px; color: rgba(255,255,255,0.45); margin: 8px 0 0; line-height: 1.6; }

        .onb-card { background: rgba(16, 14, 89, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 28px; }
        .onb-fields { display: flex; flex-direction: column; gap: 20px; }

        .onb-label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55); margin-bottom: 8px; }
        .onb-label-hint { font-weight: 400; color: rgba(255,255,255,0.25); }
        .onb-req { color: #EAAA00; }

        .onb-input { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; color: #fff; font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s; }
        .onb-input:focus { border-color: rgba(234,170,0,0.5); }
        .onb-input.error { border-color: rgba(239,68,68,0.5); }
        .onb-input.success { border-color: rgba(76,175,80,0.4); }
        .onb-input.has-prefix { padding-left: 30px; }
        .onb-input::placeholder { color: rgba(255,255,255,0.25); }

        .onb-input-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.3); font-size: 14px; pointer-events: none; }
        .onb-input-suffix { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); display: flex; }

        .onb-textarea { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; color: #fff; font-size: 14px; outline: none; box-sizing: border-box; resize: vertical; transition: border-color 0.2s; min-height: 110px; }
        .onb-textarea:focus { border-color: rgba(234,170,0,0.5); }
        .onb-textarea.error { border-color: rgba(239,68,68,0.5); }
        .onb-textarea::placeholder { color: rgba(255,255,255,0.25); }

        .onb-field-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; min-height: 18px; gap: 8px; flex-wrap: wrap; }
        .onb-field-error { font-size: 12px; color: #f87171; }
        .onb-field-success { font-size: 12px; color: #4CAF50; display: flex; align-items: center; gap: 4px; }
        .onb-counter { font-size: 11px; color: rgba(255,255,255,0.25); margin-left: auto; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .onb-counter.max { color: #f87171; }
        .onb-counter.warn { color: #f5a623; }

        .onb-suggestion-btn { background: none; border: 1px solid rgba(234,170,0,0.3); color: #EAAA00; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
        .onb-suggestion-btn:hover { background: rgba(234,170,0,0.1); }

        .onb-tone-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .onb-tone-btn { padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.45); transition: all 0.15s; }
        .onb-tone-btn.active { border-color: #EAAA00; background: rgba(234,170,0,0.12); color: #EAAA00; }

        .onb-vis-grid { display: flex; gap: 8px; }
        .onb-vis-btn { flex: 1; padding: 10px 0; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; text-transform: capitalize; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.4); transition: all 0.15s; }
        .onb-vis-btn.active { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.1); color: #818cf8; }

        .onb-guidance-box { padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }

        .onb-generate-btn { width: 100%; padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(234,170,0,0.3); background: rgba(234,170,0,0.08); color: #EAAA00; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
        .onb-generate-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .onb-source-tab { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.4); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; flex: 1; justify-content: center; }
        .onb-source-tab:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }
        .onb-source-tab.active { border-color: rgba(234,170,0,0.4); background: rgba(234,170,0,0.08); color: #EAAA00; }

        .onb-hint-text { font-size: 12px; color: rgba(255,255,255,0.35); margin: 0 0 12px; }

        .onb-dropzone { border: 2px dashed rgba(255,255,255,0.1); border-radius: 16px; padding: 36px 20px; text-align: center; background: rgba(255,255,255,0.015); cursor: pointer; transition: border-color 0.2s; }
        .onb-dropzone.dragover { border-color: #EAAA00; }

        .onb-file-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; background: rgba(76,175,80,0.08); border: 1px solid rgba(76,175,80,0.2); }

        .onb-sec-btn { flex: 1; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 600; cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s; }
        .onb-sec-btn:hover { background: rgba(255,255,255,0.06); }

        .onb-info-banner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px; background: rgba(234,170,0,0.06); border: 1px solid rgba(234,170,0,0.15); }

        .onb-success-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; background: rgba(76,175,80,0.08); border: 1px solid rgba(76,175,80,0.2); }

        .onb-tool-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: transparent; }
        .onb-tool-row.connected { border-color: rgba(76,175,80,0.3); background: rgba(76,175,80,0.06); }
        .onb-tool-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
        .onb-tool-icon.connected { background: rgba(76,175,80,0.12); border-color: rgba(76,175,80,0.25); }

        .onb-badge-connected { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(76,175,80,0.15); color: #4CAF50; text-transform: uppercase; }

        .onb-connect-btn { padding: 7px 16px; border-radius: 8px; border: 1px solid rgba(234,170,0,0.3); background: rgba(234,170,0,0.1); color: #EAAA00; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }

        .onb-disconnect-btn { padding: 7px 16px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.08); color: #f87171; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.15s; }
        .onb-disconnect-btn:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.5); }

        .onb-error { margin-top: 16px; padding: 12px 16px; border-radius: 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-size: 14px; display: flex; align-items: center; gap: 8px; }

        .onb-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; gap: 16px; }
        .onb-back-btn { background: none; border: none; color: rgba(255,255,255,0.35); font-size: 13px; cursor: pointer; padding: 8px 0; }

        .onb-primary-btn { padding: 12px 28px; border-radius: 4px; border: none; font-size: 14px; font-weight: 700; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.2); cursor: not-allowed; box-shadow: none; transition: all 0.2s; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .onb-primary-btn.enabled { background: #EAAA00; color: #000; cursor: pointer; box-shadow: none; }
        .onb-primary-btn.enabled:hover { background: #FFC229; }

        .onb-select { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; color: #fff; font-size: 14px; outline: none; box-sizing: border-box; appearance: none; cursor: pointer; transition: border-color 0.2s; }
        .onb-select:focus { border-color: rgba(234,170,0,0.5); }
        .onb-select option { background: #100e59; color: #fff; }

        /* ── Responsive ────────────────────────────────────────────────────── */
        @media (max-width: 640px) {
          .onb-content { padding: 12px 16px 40px; }
          .onb-card { padding: 20px 16px; border-radius: 16px; }
          .onb-title { font-size: 20px; }
          .onb-subtitle { font-size: 13px; }
          .onb-stepper { padding: 20px 8px 4px; }
          .onb-step-item { min-width: 44px; }
          .onb-step-dot { width: 26px; height: 26px; font-size: 11px; }
          .onb-step-dot.done { font-size: 12px; }
          .onb-step-label { font-size: 9px; }
          .onb-step-line { width: 20px; }
          .onb-tone-grid { gap: 4px; }
          .onb-tone-btn { padding: 6px 10px; font-size: 11px; }
          .onb-footer { flex-wrap: wrap; }
          .onb-primary-btn { padding: 12px 20px; font-size: 13px; }
          .onb-tool-row { flex-wrap: wrap; gap: 10px; }
          .onb-tool-icon { width: 32px; height: 32px; }
          .onb-vis-grid { gap: 6px; }
          .onb-vis-btn { padding: 8px 0; font-size: 12px; }
          .onb-dropzone { padding: 24px 16px; }
          .onb-guidance-box { padding: 16px; }
        }

        @media (max-width: 380px) {
          .onb-topbar { padding: 12px 16px; }
          .onb-content { padding: 10px 12px 32px; }
          .onb-card { padding: 16px 12px; }
          .onb-title { font-size: 18px; }
          .onb-step-item { min-width: 38px; }
          .onb-step-line { width: 14px; }
          .onb-primary-btn { padding: 10px 16px; }
        }
      `}</style>
    </div>
  )
}

/* ━━━ Sub-components ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SelField({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <div>
      <label className="onb-label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="onb-select">
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
