/**
 * Platform-internal tools selected in Align skills.
 * These are always available to agents via chat/orchestration — they are not
 * Empower-connected accounts and should not block skill assignment.
 */
export const INTERNAL_SKILL_TOOLS = new Set([
  'chat',
  'vibes',
  'voting',
  'seek',
  'earning',
])

/**
 * Tool accounts are connected at the PROVIDER level (see ToolAccountSelector:
 * google, bluesky, telegram, solana, payload). Skills, however, declare
 * granular ACTION-level tools (e.g. `google_send_email`, `createPost`).
 *
 * To decide whether a skill's requirement is met we resolve each action to its
 * provider and check whether that provider account is connected. Without this
 * mapping the old exact-string match (`connectedToolNames.includes(tool)`) could
 * never succeed for granular actions, so skills stayed permanently blocked even
 * after the matching account was enabled on the Tools step.
 */

// Unprefixed action names that belong to a provider (raw MCP tool names).
const PROVIDER_ACTIONS: Record<string, Set<string>> = {
  bluesky: new Set([
    'createPost', 'replyToPost', 'likePost', 'repost', 'quotePost',
    'deletePost', 'sendDirectMessage', 'readTimeline', 'follow', 'unfollow',
  ]),
  solana: new Set([
    'get_balance', 'transfer_sol', 'send_sol', 'transfertoken',
    'getreceiverwallet',
  ]),
}

// Prefix → provider (covers the `<provider>_<action>` naming convention).
const PROVIDER_PREFIXES: { provider: string; prefixes: string[] }[] = [
  { provider: 'google',   prefixes: ['google_', 'gmail_', 'gcal_', 'gcalendar_'] },
  { provider: 'bluesky',  prefixes: ['bluesky_', 'bsky_'] },
  { provider: 'telegram', prefixes: ['telegram_', 'tg_'] },
  { provider: 'solana',   prefixes: ['solana_', 'sol_'] },
  { provider: 'payload',  prefixes: ['payload_', 'website_', 'web_'] },
]

/** Human-friendly names for the tool providers, for warnings/labels. */
export const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  bluesky: 'Bluesky',
  telegram: 'Telegram',
  solana: 'Solana',
  payload: 'Website',
}

/** Resolve a (possibly granular) tool id to its provider, or null if unknown. */
export function resolveToolProvider(toolId: string): string | null {
  for (const { provider, prefixes } of PROVIDER_PREFIXES) {
    if (prefixes.some((p) => toolId.startsWith(p))) return provider
  }
  for (const provider in PROVIDER_ACTIONS) {
    if (PROVIDER_ACTIONS[provider].has(toolId)) return provider
  }
  return null
}

/**
 * Friendly tool names a user still needs to enable for a skill — deduped and
 * mapped to provider labels (e.g. "Google", "Bluesky") instead of raw action
 * ids. Falls back to the raw tool id when the provider is unknown. Use this to
 * drive the "enable X" warning shown on blocked skills.
 */
export function getMissingSkillProviders(
  skillTools: string[],
  connectedToolNames: string[],
): string[] {
  const missing = getMissingSkillTools(skillTools, connectedToolNames)
  const labels = new Set<string>()
  for (const tool of missing) {
    const provider = resolveToolProvider(tool)
    labels.add(provider ? PROVIDER_LABELS[provider] ?? provider : tool)
  }
  return Array.from(labels)
}

/**
 * Returns the Empower tool names still missing for a skill.
 *
 * A requirement is satisfied when the exact tool id is connected (provider-level
 * ids, or legacy exact matches) OR when the granular action's resolved provider
 * account is connected. Unknown tool ids fall back to exact matching so we never
 * over-unlock a skill whose provider we can't identify.
 */
export function getMissingSkillTools(
  skillTools: string[],
  connectedToolNames: string[],
): string[] {
  return skillTools.filter((tool) => {
    if (INTERNAL_SKILL_TOOLS.has(tool)) return false
    // Exact match: provider-level ids or legacy exact names.
    if (connectedToolNames.includes(tool)) return false
    // Granular action: satisfied when its provider account is connected.
    const provider = resolveToolProvider(tool)
    if (provider && connectedToolNames.includes(provider)) return false
    return true
  })
}