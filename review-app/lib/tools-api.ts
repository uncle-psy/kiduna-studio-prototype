/**
 * Tools API Client — Global Wallet-Level Tool Accounts
 *
 * All save/list/remove operations are scoped to a wallet (not per-performer).
 * Each wallet stores accounts globally; agents select from the pool.
 */

const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

export interface VerifyToolResult {
  success: boolean;
  error?: string;
  externalHandle?: string;
  externalUserId?: string;
  credentials?: Record<string, string>;
}

export interface SavedTool {
  id: string;
  toolName: string;
  externalHandle?: string;
  externalUserId?: string;
  status: string;
}

/**
 * Verify tool credentials with backend (without saving).
 * Stateless — no wallet or agent needed.
 */
export async function verifyToolCredentials(
  toolName: string,
  credentials: Record<string, string>
): Promise<VerifyToolResult> {
  try {
    const response = await fetch(`${AGENT_API_URL}/api/tools/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool_name: toolName,
        credentials,
      }),
    });

    const data = await response.json();

    return {
      success: data.success,
      error: data.error,
      externalHandle: data.external_handle,
      externalUserId: data.external_user_id,
      credentials: data.credentials,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

/**
 * Save a verified tool account to the global pool.
 * Wallet-scoped — no worker_id needed.
 */
export async function saveToolConfig(
  wallet: string,
  toolName: string,
  credentials: Record<string, string>
): Promise<{ success: boolean; error?: string; externalHandle?: string }> {
  const response = await fetch(`${AGENT_API_URL}/api/tools/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet,
      tool_name: toolName,
      credentials,
    }),
  });

  return response.json();
}

/**
 * List all tool accounts connected for a wallet.
 * Returns all accounts across all tools.
 */
export async function listSavedTools(
  wallet: string
): Promise<SavedTool[]> {
  const response = await fetch(
    `${AGENT_API_URL}/api/tools/saved?wallet=${encodeURIComponent(wallet)}`
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return (data.tools || []).map((t: Record<string, unknown>) => ({
    id: t.id,
    toolName: t.tool_name,
    externalHandle: t.external_handle,
    externalUserId: t.external_user_id,
    status: t.status,
  }));
}

/**
 * Remove a tool account from the global pool.
 * Pass account ID (gta_xxx) for specific account, or tool name for all.
 */
export async function removeSavedTool(
  wallet: string,
  identifier: string,
  force: boolean = false
): Promise<{ success: boolean; error?: string; connectedAvatars?: string[]; avatarCount?: number }> {
  const response = await fetch(
    `${AGENT_API_URL}/api/tools/saved/${identifier}?wallet=${encodeURIComponent(wallet)}${force ? '&force=true' : ''}`,
    { method: "DELETE" }
  );

  const data = await response.json();
  if (response.status === 409) {
    const detail = data.detail || data
    return {
      success: false,
      error: detail.message || 'Account is connected to avatars',
      connectedAvatars: detail.connectedAvatars || [],
      avatarCount: detail.avatarCount || 0,
    }
  }
  return data;
}