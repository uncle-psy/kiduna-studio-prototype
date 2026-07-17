/**
 * Onboarding State Management
 *
 * Tracks the onboarding flow:
 * 1. Create Big Avatar (Presence agent)
 * 2. Inform (Create Knowledge Base for Avatar)
 * 3. Stance (Create Prompt for Avatar)
 * 4. Worker (Create Worker agent with full form)
 * 5. Worker Inform (Create Knowledge Base for Worker)
 * 6. Worker Stance (Create Prompt for Worker)
 *
 * State is stored in the database via /api/onboarding endpoints.
 * All functions are async.
 */

import {
  fetchOnboarding,
  createOnboarding,
  updateOnboarding,
  completeOnboardingApi,
  deleteOnboarding,
  type OnboardingRecord,
} from '@/lib/onboarding-api'

const REVIEW_MODE = process.env.NEXT_PUBLIC_REVIEW_MODE === 'true'

export type OnboardingStep =
  | 'avatar'
  | 'inform'
  | 'instruct'
  | 'worker'
  | 'worker_inform'
  | 'worker_instruct'
  | 'complete'

export interface OnboardingState {
  currentStep: OnboardingStep
  bigAvatarId?: string
  bigAvatarHandle?: string
  wisdomId?: string
  stanceId?: string
  kidunaId?: string
  kidunaHandle?: string
  performerId?: string
  workerWisdomId?: string
  workerStanceId?: string
  formData?: Record<string, any>
}

/**
 * Convert API record to OnboardingState
 */
function toState(record: OnboardingRecord): OnboardingState {
  return {
    currentStep: record.currentStep as OnboardingStep,
    bigAvatarId: record.bigAvatarId,
    bigAvatarHandle: record.bigAvatarHandle,
    wisdomId: record.wisdomId,
    stanceId: record.stanceId,
    kidunaId: record.kidunaId,
    kidunaHandle: record.kidunaHandle,
    performerId: record.performerId,
    workerWisdomId: record.workerWisdomId,
    workerStanceId: record.workerStanceId,
    formData: record.formData,
  }
}

/** Start onboarding (step 1: avatar) */
export async function startOnboarding(
  wallet: string,
  data?: Partial<OnboardingState>
): Promise<OnboardingState | null> {
  const record = await createOnboarding(wallet, {
    currentStep: 'avatar',
    ...data,
  })
  return record ? toState(record) : null
}

/** Get current onboarding state (null if not in onboarding or already complete) */
export async function getOnboarding(wallet: string): Promise<OnboardingState | null> {
  if (REVIEW_MODE) return null
  const record = await fetchOnboarding(wallet)
  if (!record) return null
  if (record.currentStep === 'complete') return null
  return toState(record)
}

/** Get raw onboarding state including 'complete' (for checking completion) */
export async function getRawOnboarding(wallet: string): Promise<OnboardingState | null> {
  if (REVIEW_MODE) return { currentStep: 'complete' }
  const record = await fetchOnboarding(wallet)
  if (!record) return null
  return toState(record)
}

/** Update onboarding state (merge partial fields) */
export async function advanceOnboarding(
  wallet: string,
  update: Partial<OnboardingState>
): Promise<OnboardingState | null> {
  const record = await updateOnboarding(wallet, update)
  return record ? toState(record) : null
}

/** Mark onboarding as complete */
export async function completeOnboarding(wallet: string): Promise<void> {
  await completeOnboardingApi(wallet)
}

/** Delete onboarding record (reset progress) */
export async function resetOnboarding(wallet: string): Promise<boolean> {
  return deleteOnboarding(wallet)
}

/** Check if user is currently in onboarding */
export async function isOnboarding(wallet: string): Promise<boolean> {
  const state = await getOnboarding(wallet)
  return state !== null
}

/** Check if onboarding was completed (not just in progress) */
export async function isOnboardingComplete(wallet: string): Promise<boolean> {
  const raw = await getRawOnboarding(wallet)
  return raw?.currentStep === 'complete'
}

/** Map step key → 1-based step number for member flow */
const MEMBER_STEP_MAP: Record<string, number> = {
  avatar: 1,
  inform: 2,
  instruct: 3,
  worker: 4,
  worker_inform: 5,
  worker_instruct: 6,
}

/** Map step key → 1-based step number for sponsor flow */
const SPONSOR_STEP_MAP: Record<string, number> = {
  avatar: 1,
  inform: 2,
  instruct: 3,
  worker: 4,
  worker_inform: 5,
  worker_instruct: 6,
}

/** Get the 1-based step number from onboarding state */
export function getStepNumber(state: OnboardingState | null, isSponsor: boolean): number {
  if (!state) return 1
  const map = isSponsor ? SPONSOR_STEP_MAP : MEMBER_STEP_MAP
  return map[state.currentStep] || 1
}

/** Get the next route for the current onboarding step */
export function getOnboardingRoute(step: OnboardingStep): string {
  switch (step) {
    case 'avatar': return '/onboarding'
    case 'inform': return '/onboarding'
    case 'instruct': return '/onboarding'
    case 'worker': return '/onboarding'
    case 'worker_inform': return '/onboarding'
    case 'worker_instruct': return '/onboarding'
    case 'complete': return '/agents'
  }
}
