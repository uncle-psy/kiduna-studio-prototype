/**
 * Kinship — Predefined Avatar Definitions
 * Static display metadata for predefined avatar cards.
 */

export interface PredefinedSkillItem {
  name: string
  description: string
}

export interface PredefinedCategory {
  icon: string
  name: string
  count: number
  skills: PredefinedSkillItem[]
}

export interface CredentialField {
  field: string
  label: string
  placeholder: string
  type: 'text' | 'password'
}

export interface CharacterPreset {
  id: string
  name: string
  icon: string
  description: string
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'professional',
    name: 'Professional',
    icon: '🎯',
    description: 'Formal, consistent, and on-brand. Perfect for businesses and organizations.',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    icon: '😊',
    description: 'Warm, conversational, and community-first. Feels like a real person.',
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '✏️',
    description: 'Describe your own personality in your own words.',
  },
]

export const DEFAULT_SYSTEM_PROMPT = `You are a Bluesky social media agent managing the account @{handle}.

## Personality
{character_personality}

## On-Demand Behavior
When the user asks you to do something (post, like, follow, search, etc.), delegate to your worker immediately. Don't ask unnecessary confirmation for routine actions.

## Autonomous Behavior
You have 7 active automations handling mentions, replies, follows, and DMs. When reporting on automated actions, be concise.

## Safety Boundaries
- Always disclose you are an AI agent when directly asked.
- Handle routine actions independently (likes, simple replies, follows).
- Ask for confirmation before: changing profile, blocking users, posting controversial opinions.
- Don't engage with trolls or toxic threads. Disengage silently.
- Don't repost content you haven't analyzed.
- Never post harmful, discriminatory, or misleading content.
- Don't share the user's private information.`

export const CHARACTER_PERSONALITIES: Record<string, string> = {
  professional: `You are professional, polished, and consistent. You represent a brand or organization with authority and credibility. Your tone is formal but approachable — measured, clear, and purposeful. You avoid slang and casual language. Every post and reply reflects positively on the account. You engage selectively and thoughtfully. Content is informative, on-message, and adds value to the conversation.`,
  friendly: `You are warm, conversational, and community-first. You feel like a real person — not a bot. You engage with everyone who reaches out, follow back generously, and make people feel welcomed and heard. Your tone is casual and genuine. You use natural language, occasionally light humor, and always make the other person feel valued. Building relationships matters more than growing numbers.`,
}

export const DEFAULT_KNOWLEDGE_BASE = `# Bluesky Platform Knowledge

## Post Rules
- Text posts have a 300-byte limit (approximately 300 ASCII characters, fewer for emoji/unicode).
- Posts exceeding 300 bytes should be split into threads using 🧵 markers.
- Rich text facets are used for @mentions, #hashtags, and links — they are byte-indexed.

## Content Types
- Text posts, image posts (up to 4 images), video posts, link cards, quote posts, threads.

## Threading
- Threads are created by replying to your own post in sequence.
- Use 🧵1 of N, 🧵2 of N markers for clarity.

## Engagement
- Like: acknowledges a post. Repost: shares to followers. Quote post: shares with commentary. Reply: responds in thread.

## Best Practices
- Post at consistent times for better engagement.
- Use hashtags sparingly — 1-3 per post maximum.
- Alt text on images is important for accessibility.
- Don't mass-follow or mass-like — it is considered spam.`

export type ApprovalState = 'auto' | 'approval'

export interface AutomationItem {
  id: string
  name: string
  defaultState: ApprovalState
}

export interface AutomationCategoryDef {
  id: string
  icon: string
  name: string
  automations: AutomationItem[]
}

export const AUTOMATION_CATEGORIES: AutomationCategoryDef[] = [
  {
    id: 'mentions',
    icon: '💬',
    name: 'Mentions & Replies',
    automations: [
      { id: 'reply_to_mentions', name: 'Reply to mentions', defaultState: 'approval' },
      { id: 'like_mentions', name: 'Like mentions', defaultState: 'auto' },
      { id: 'continue_reply_threads', name: 'Continue reply threads', defaultState: 'approval' },
      { id: 'like_replies', name: 'Like replies', defaultState: 'auto' },
    ],
  },
  {
    id: 'followers',
    icon: '👤',
    name: 'Follower Management',
    automations: [
      { id: 'follow_back', name: 'Follow back', defaultState: 'approval' },
      { id: 'welcome_dm', name: 'Welcome DM', defaultState: 'approval' },
    ],
  },
  {
    id: 'dms',
    icon: '📩',
    name: 'Direct Messages',
    automations: [
      { id: 'auto_respond_dms', name: 'Auto-respond to DMs', defaultState: 'approval' },
    ],
  },
]

export const EXEC_AUTOMATION_CATEGORIES = [
  {
    id: 'scheduling',
    name: 'Scheduling',
    icon: '📅',
    automations: [
      { id: 'meeting_scheduler', name: 'Meeting Scheduler', default: 'approval' as ApprovalState },
    ],
  },
  {
    id: 'briefing',
    name: 'Briefing',
    icon: '☀️',
    automations: [
      { id: 'daily_briefing', name: 'Daily Briefing', default: 'auto' as ApprovalState },
    ],
  },
  {
    id: 'email',
    name: 'Email Management',
    icon: '📧',
    automations: [
      { id: 'smart_inbox_labeler', name: 'Inbox Labeler', default: 'auto' as ApprovalState },
      { id: 'bill_tracker', name: 'Bill Tracker', default: 'auto' as ApprovalState },
    ],
  },
]

export function buildDefaultExecAutomationState(): Record<string, ApprovalState> {
  const state: Record<string, ApprovalState> = {}
  for (const cat of EXEC_AUTOMATION_CATEGORIES) {
    for (const auto of cat.automations) {
      state[auto.id] = auto.default
    }
  }
  return state
}

/** Build default automation state map from AUTOMATION_CATEGORIES */
export function buildDefaultAutomationState(): Record<string, ApprovalState> {
  const state: Record<string, ApprovalState> = {}
  AUTOMATION_CATEGORIES.forEach(cat => {
    cat.automations.forEach(a => { state[a.id] = a.defaultState })
  })
  return state
}

/** Generate approval rules text from automation state map */
export function generateApprovalRulesText(state: Record<string, ApprovalState>): string {
  const autoItems: string[] = []
  const approvalItems: string[] = []

  AUTOMATION_CATEGORIES.forEach(cat => {
    cat.automations.forEach(a => {
      if (state[a.id] === 'auto') autoItems.push(`- ${a.name}`)
      else approvalItems.push(`- ${a.name}`)
    })
  })

  return (
    'Run AUTOMATICALLY without asking:\n' +
    (autoItems.length > 0 ? autoItems.join('\n') : '- (none)') +
    '\n\nAsk ME FIRST before executing:\n' +
    (approvalItems.length > 0 ? approvalItems.join('\n') : '- (none)')
  )
}

export interface PredefinedAvatar {
  id: string
  name: string
  platform: string
  icon: string
  color: string
  description: string
  totalSkills: number
  totalTools: number
  categories: PredefinedCategory[]
  credentialFields: CredentialField[]
}

// ─────────────────────────────────────────────────────────────────────────────

export const PREDEFINED_AVATARS: PredefinedAvatar[] = [
  {
    id: 'bluesky',
    name: 'Bluesky Avatar',
    platform: 'bluesky',
    icon: 'simple-icons:bluesky',
    color: '#0085FF',
    description: 'Complete autonomous Bluesky agent',
    totalSkills: 7,
    totalTools: 95,
    categories: [
      {
        icon: '💬',
        name: 'Mentions & Replies',
        count: 4,
        skills: [
          { name: 'Reply to Mentions', description: 'Reply to mentions with context-aware responses' },
          { name: 'Like Mentions', description: 'Like posts that mention you' },
          { name: 'Continue Reply Threads', description: 'Continue conversations with thoughtful replies' },
          { name: 'Like Replies', description: 'Like replies to your posts' },
        ],
      },
      {
        icon: '👤',
        name: 'Follower Management',
        count: 2,
        skills: [
          { name: 'Follow Back', description: 'Follow back new followers after profile check' },
          { name: 'Welcome DM', description: 'Send a friendly welcome DM to new followers' },
        ],
      },
      {
        icon: '📩',
        name: 'Direct Messages',
        count: 1,
        skills: [
          { name: 'Auto-Respond', description: 'Read and respond to incoming DMs' },
        ],
      },
    ],
    credentialFields: [
      { field: 'name', label: 'Avatar Name', placeholder: 'My Bluesky Agent', type: 'text' },
      { field: 'blueskyHandle', label: 'Bluesky Handle', placeholder: 'yourname.bsky.social', type: 'text' },
      { field: 'blueskyAppPassword', label: 'App Password', placeholder: 'xxxx-xxxx-xxxx-xxxx', type: 'password' },
    ],
  },
  {
    id: 'executive-avatar',
    name: 'Executive Avatar',
    platform: 'google',
    icon: 'lucide:briefcase',
    color: '#4285F4',
    description: 'AI executive assistant for scheduling, email management, and daily briefings',
    totalSkills: 4,
    totalTools: 3,
    categories: [
      {
        icon: '📅',
        name: 'Scheduling',
        count: 1,
        skills: [
          { name: 'Meeting Scheduler', description: 'Detects meeting request emails, determines if you or they are hosting (interview vs your meeting), checks your calendar for conflicts, suggests 3 alternative time slots if busy, composes a professional reply, and waits for your approval before sending. Only creates calendar events with Google Meet links when you are the host — never when they invite you.' },
        ],
      },
      {
        icon: '☀️',
        name: 'Briefing',
        count: 1,
        skills: [
          { name: 'Daily Schedule Briefing', description: 'Every morning at 8:00 AM, sends you an email with today\'s full schedule — event times, titles, Google Meet links or locations — plus tomorrow\'s preview showing how many meetings are coming and when the first one starts. Uses your calendar owner name for a personalized greeting.' },
        ],
      },
      {
        icon: '📧',
        name: 'Email Management',
        count: 1,
        skills: [
          { name: 'Smart Inbox Labeler', description: 'Automatically reads every new incoming email and classifies it into one of 8 categories: MEETING (schedule requests), BILLS (invoices, payment reminders), WORK (projects, team updates), PERSONAL (friends, family), NEWSLETTER (marketing, promotions), RECEIPTS (orders, shipping), IMPORTANT (urgent, deadlines), or SPAM (phishing, scams). Creates Gmail labels automatically and applies exactly one per email. Skips self-sent messages.' },
        ],
      },
      {
        icon: '💰',
        name: 'Bill Tracking',
        count: 1,
        skills: [
          { name: 'Bill & Due Date Tracker', description: 'Detects invoices, payment reminders, and subscription renewals. Extracts due date, amount, and company name. Creates two calendar reminders: one on the due date and an early warning 2 days before. Includes payment links in the event description.' },
        ],
      },
    ],
    credentialFields: [
      { field: 'name', label: 'Assistant Name', placeholder: 'My Executive Assistant', type: 'text' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────

/** Fast ID → avatar lookup */
export const AVATARS_BY_ID: Record<string, PredefinedAvatar> = Object.fromEntries(
  PREDEFINED_AVATARS.map((a) => [a.id, a])
)