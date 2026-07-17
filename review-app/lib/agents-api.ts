/**
 * Agents API Client
 *
 * Connects to the Python FastAPI backend (kinship-agent) for agent operations.
 */

import type { Presence, AgentTone, WorkerAccessLevel, PresenceSubtype } from "./agent-types";

// Backend URL - configure in .env as NEXT_PUBLIC_AGENT_API_URL
const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

/**
 * Read the stored auth token (kinship-backend JWT) on the client.
 * Kept inline to avoid importing the React auth-context into this API module.
 */
function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

/**
 * Build JSON headers, attaching `Authorization: Bearer <jwt>` when a token is
 * available. The agent backend uses this to enforce role-gated actions
 * (e.g. creating / setting the system-wide Ally requires role="wizard").
 */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePresenceParams {
  name: string;
  handle: string;
  briefDescription?: string;
  tagline?: string;
  tone?: AgentTone;
  presenceSubtype?: PresenceSubtype;
  /** Membership tier: member, founder, builder, sponsor, catalyst, luminary.
   *  Determines which public allies-directory tab the avatar appears in. */
  role?: string;
  wallet: string;
  platformId?: string;
  knowledgeBaseIds?: string[];
  skillIds?: string[];
  templateIds?: string[];
  promptId?: string;
  isPrimaryMember?: boolean;
  tools?: string[];
}

export interface CreateWorkerParams {
  name: string;
  handle?: string;
  briefDescription?: string;
  tagline?: string;
  role?: string;
  accessLevel?: WorkerAccessLevel;
  wallet: string;
  platformId?: string;
  parentId?: string;
  tools?: string[];
  knowledgeBaseIds?: string[];
  promptId?: string | null;
  systemPrompt?: string | null;
  skillIds?: string[];
  templateIds?: string[];
}

export interface UpdateAgentParams {
  name?: string;
  handle?: string;
  briefDescription?: string;
  description?: string;
  tagline?: string;
  role?: string;
  accessLevel?: WorkerAccessLevel;
  tone?: AgentTone;
  status?: string;
  knowledgeBaseIds?: string[];
  promptId?: string;
  tools?: string[];
  parentId?: string | null;
  parentIds?: string[];
  removeParentId?: string;
}

export interface AgentListResult {
  agents: Presence[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Empower Types (for shared user access)
// ─────────────────────────────────────────────────────────────────────────────

export type AccessType = "owned" | "shared";

export interface EmpowerPresence {
  id: string;
  name: string;
  handle?: string;
  type: string;
  status: string;
  description?: string;
  knowledge_base_ids?: string[];
  prompt_id?: string;
  access_level?: string;
  tone?: string;
  system_prompt?: string;
  access_type: AccessType;
  context_id?: string;
  context_name?: string;
}

export interface EmpowerWorker {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  parent_id: string;
  tools: string[];
  knowledge_base_ids?: string[];
  prompt_id?: string;
  access_type: AccessType;
  context_id?: string;
  context_name?: string;
  connected_tools: string[];
  external_handles: Record<string, string>;
}

export interface EmpowerAgentsResult {
  presences: EmpowerPresence[];
  workers: EmpowerWorker[];
  total_presences: number;
  total_workers: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all agents with optional filters
 */
export async function listAgents(params?: {
  wallet?: string;
  platformId?: string;
  type?: "PRESENCE" | "WORKER";
  includeWorkers?: boolean;
  presenceSubtype?: string;
}): Promise<AgentListResult> {
  const searchParams = new URLSearchParams();
  if (params?.wallet) searchParams.set("wallet", params.wallet);
  if (params?.platformId) searchParams.set("platformId", params.platformId);
  if (params?.type) searchParams.set("agentType", params.type);
  if (params?.includeWorkers !== undefined) {
    searchParams.set("includeWorkers", String(params.includeWorkers));
  }
  if (params?.presenceSubtype) {
    searchParams.set("presenceSubtype", params.presenceSubtype);
  }

  const response = await fetch(
    `${AGENT_API_URL}/api/agents?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to list agents");
  }

  return response.json();
}

/**
 * List all agents for empower page (owned + shared with tool connection status)
 * 
 * Returns agents accessible to the user with:
 * - access_type: "owned" or "shared"
 * - connected_tools: tools the current user has connected (their own, not others')
 * - external_handles: connection handles for the current user
 */
export async function listEmpowerAgents(params: {
  wallet: string;
}): Promise<EmpowerAgentsResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("wallet", params.wallet);

  const response = await fetch(
    `${AGENT_API_URL}/api/agents/empower?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to list empower agents");
  }

  return response.json();
}

/**
 * Get a single agent by ID
 */
export async function getAgent(agentId: string): Promise<Presence> {
  const response = await fetch(`${AGENT_API_URL}/api/agents/${agentId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Agent not found");
  }

  const data = await response.json();
  return data;
}

/**
 * List agents accessible to a wallet (from redeemed codes + public)
 */
export async function listAccessibleAgents(params: {
  wallet: string;
  excludePublic?: boolean;
}): Promise<AgentListResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("wallet", params.wallet);
  if (params.excludePublic) {
    searchParams.set("excludePublic", "true");
  }

  const response = await fetch(
    `${AGENT_API_URL}/api/agents/accessible?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to list accessible agents");
  }

  return response.json();
}

/**
 * Create a new Presence (Supervisor) agent
 */
export async function createPresenceAgent(
  params: CreatePresenceParams
): Promise<Presence> {
  const response = await fetch(`${AGENT_API_URL}/api/agents/presence`, {
    method: "POST",
    // Auth header lets the backend gate Ally creation to wizards.
    headers: authHeaders(),
    body: JSON.stringify({
      name: params.name,
      handle: params.handle,
      description: params.briefDescription,
      tagline: params.tagline || undefined,
      tone: params.tone || "neutral",
      presenceSubtype: params.presenceSubtype || undefined,
      role: params.role || undefined,
      isPrimaryMember: params.isPrimaryMember || false,
      wallet: params.wallet,
      platformId: params.platformId,
      knowledgeBaseIds: params.knowledgeBaseIds,
      skillIds: params.skillIds || [],
      templateIds: params.templateIds || [],
      promptId: params.promptId,
      tools: params.tools || [],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.error || "Failed to create presence");
  }

  return response.json();
}

/**
 * Check whether a handle is available.
 * Supports type: 'agent' (default), 'movement', or 'mission'.
 * Returns { available, handle, suggestion? }.
 */
export async function checkHandleAvailability(
  handle: string,
  type?: "agent" | "movement" | "mission"
): Promise<{ available: boolean; handle: string; suggestion?: string }> {
  const params = new URLSearchParams({ handle });
  if (type) params.set("type", type);
  const response = await fetch(
    `${AGENT_API_URL}/api/agents/handle-availability?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to check handle availability");
  }

  return response.json();
}

/**
 * Create a new Worker agent
 */
export async function createWorkerAgent(
  params: CreateWorkerParams
): Promise<Presence> {
  const response = await fetch(`${AGENT_API_URL}/api/agents/worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      handle: params.handle,
      description: params.briefDescription,
      tagline: params.tagline || undefined,
      role: params.role,
      accessLevel: params.accessLevel || "private",
      wallet: params.wallet,
      platformId: params.platformId,
      parentId: params.parentId,
      tools: params.tools,
      knowledgeBaseIds: params.knowledgeBaseIds,
      promptId: params.promptId,
      systemPrompt: params.systemPrompt,
      skillIds: params.skillIds || [],
      templateIds: params.templateIds || [],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    // Backend may nest error inside detail: { error: "...", code: "..." }
    const detail = error.detail || error
    const errorMsg = typeof detail === 'string' ? detail : detail.error || detail.message || 'Failed to create worker'
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Update an existing agent
 */
export async function updateAgent(
  agentId: string,
  params: UpdateAgentParams
): Promise<Presence> {
  const response = await fetch(`${AGENT_API_URL}/api/agents/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.error || "Failed to update agent");
  }

  return response.json();
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string): Promise<void> {
  const response = await fetch(`${AGENT_API_URL}/api/agents/${agentId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.error || "Failed to delete agent");
  }
}

/**
 * Get all workers for a Presence
 */
export async function getWorkersForPresence(
  presenceId: string
): Promise<AgentListResult> {
  const response = await fetch(
    `${AGENT_API_URL}/api/agents/${presenceId}/workers`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get workers");
  }

  return response.json();
}

/**
 * List unassigned workers (parent_id is null) for a wallet
 */
export async function listUnassignedWorkers(
  wallet: string
): Promise<AgentListResult> {
  const response = await fetch(
    `${AGENT_API_URL}/api/agents/unassigned/workers?wallet=${encodeURIComponent(wallet)}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get unassigned workers");
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// System Ally API (global singleton — one ally for all users)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the system-wide ally agent.
 * Returns null if no ally has been configured yet (404).
 */
export async function getSystemAlly(): Promise<Presence | null> {
  // Same-origin proxy avoids browser CORS / wrong-host issues when the app
  // is opened via LAN IP while AGENT_API_URL points at localhost.
  const response = await fetch(`${AGENT_API_URL}/api/agents/ally`, { cache: "no-store" });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error("Failed to fetch system ally");
  }

  return response.json();
}

/**
 * Set an agent as the system-wide ally.
 * Automatically unsets the previous ally (atomic swap).
 * Wizard-only — the backend rejects non-wizard callers with 403.
 */
export async function setAlly(agentId: string): Promise<Presence> {
  const response = await fetch(
    `${AGENT_API_URL}/api/agents/${agentId}/set-ally`,
    { method: "POST", headers: authHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to set ally");
  }

  return response.json();
}

/**
 * Remove the ally designation from an agent.
 * Wizard-only — the backend rejects non-wizard callers with 403.
 */
export async function unsetAlly(agentId: string): Promise<Presence> {
  const response = await fetch(
    `${AGENT_API_URL}/api/agents/${agentId}/unset-ally`,
    { method: "POST", headers: authHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to unset ally");
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Providers API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List agents for any public allies directory tab.
 * Pass role to filter by tier (member, founder, builder, sponsor, catalyst, luminary).
 * Omit role to get all members. No auth required.
 */
export async function listPublicDirectory(params?: {
  role?: string;
  limit?: number;
  offset?: number;
}): Promise<AgentListResult> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set("role", params.role);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const response = await fetch(
    `${AGENT_API_URL}/api/agents/public/directory?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch public directory");
  }

  return response.json();
}

/**
 * Sync the membership tier (role) onto all of a wallet's Presence avatars.
 * Call this after a successful membership purchase so the user's existing
 * avatars move into the correct public directory tab. No auth required.
 */
export async function syncWalletRole(
  wallet: string,
  role: string
): Promise<AgentListResult> {
  const searchParams = new URLSearchParams({ wallet, role });
  const response = await fetch(
    `${AGENT_API_URL}/api/agents/public/sync-role?${searchParams.toString()}`,
    { method: "POST" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to sync wallet role");
  }

  return response.json();
}

/**
 * Ensure a wallet is listed in the public allies directory for its tier.
 * Updates existing avatars' tier, or auto-creates a minimal member profile if
 * the wallet has none — so a user appears right after purchasing a membership,
 * even before building an avatar. No auth required.
 */
export async function ensureDirectoryPresence(params: {
  wallet: string;
  role: string;
  name?: string;
  handle?: string;
  platformId?: string;
}): Promise<AgentListResult> {
  const searchParams = new URLSearchParams({
    wallet: params.wallet,
    role: params.role,
  });
  if (params.name) searchParams.set("name", params.name);
  if (params.handle) searchParams.set("handle", params.handle);
  if (params.platformId) searchParams.set("platformId", params.platformId);

  const response = await fetch(
    `${AGENT_API_URL}/api/agents/public/ensure-directory-presence?${searchParams.toString()}`,
    { method: "POST" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to ensure directory presence");
  }

  return response.json();
}

export interface LLMProvider {
  id: string;
  name: string;
  models: Array<{
    id: string;
    name: string;
    default?: boolean;
  }>;
  available: boolean;
}

/**
 * Get available LLM providers
 */
export async function getLLMProviders(): Promise<LLMProvider[]> {
  const response = await fetch(`${AGENT_API_URL}/api/chat/providers`);

  if (!response.ok) {
    throw new Error("Failed to get LLM providers");
  }

  const data = await response.json();
  return data.providers;
}

export async function createPredefinedBlueskyAvatar(params: {
  wallet: string
  blueskyHandle: string
  blueskyAppPassword: string
  name?: string
}) {
  const res = await fetch(`${AGENT_API_URL}/api/agents/predefined/bluesky`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to create Bluesky avatar')
  }
  return res.json()
}

export async function listBlueskyAccounts(wallet: string) {
  const res = await fetch(
    `${AGENT_API_URL}/api/agents/predefined/bluesky/accounts?wallet=${encodeURIComponent(wallet)}`,
  )
  if (!res.ok) throw new Error('Failed to list accounts')
  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Pause / Resume
// ─────────────────────────────────────────────────────────────────────────────

export async function pauseAgent(agentId: string, wallet: string) {
  const res = await fetch(
    `${AGENT_API_URL}/api/agents/${agentId}/pause?wallet=${encodeURIComponent(wallet)}`,
    { method: 'POST' },
  )
  if (!res.ok) throw new Error('Failed to pause agent')
  return res.json()
}

export async function resumeAgent(agentId: string, wallet: string) {
  const res = await fetch(
    `${AGENT_API_URL}/api/agents/${agentId}/resume?wallet=${encodeURIComponent(wallet)}`,
    { method: 'POST' },
  )
  if (!res.ok) throw new Error('Failed to resume agent')
  return res.json()
}