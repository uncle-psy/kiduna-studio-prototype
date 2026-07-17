/**
 * Kinship — Predefined Skill Templates
 * Static definitions only. No API calls.
 */

export type TriggerType = 'event' | 'time' | 'condition' | 'command'

export interface SkillTemplate {
  id: string
  name: string
  description: string
  category: string
  trigger_type: TriggerType
  when_text: string
  then_text: string
  tools: string[]
  requires_approval: boolean
}

// ─────────────────────────────────────────────────────────────────────────────

export const SKILL_TEMPLATES: SkillTemplate[] = [

  // ── Email to Meeting Setup ───────────────────────────────────────────────────
  {
    id: 'tpl_email_to_meeting',
    name: 'Email to Meeting Setup',
    description: 'Reads a meeting request email, creates a calendar event, and sends a confirmation back with the event link',
    category: 'Email',
    trigger_type: 'event',
    when_text: 'A new unread email arrives requesting a meeting, call, or discussion',
    then_text:
      'Read the email and extract the sender, proposed time, and purpose. Create a calendar event with the extracted details and title. Extract the calendar event link from the created event response. Send a confirmation email back to the sender that includes the calendar event link, the meeting time, and the purpose.',
    tools: ['google_gmail_tool', 'google_calendar_tool'],
    requires_approval: false,
  },

  // ── Incoming Token Notification ─────────────────────────────────────────────
  {
    id: 'tpl_token_notification',
    name: 'Incoming Token Notification',
    description: 'Detects incoming SOL or token transfers and sends a friendly email notification to your connected Gmail',
    category: 'Payments',
    trigger_type: 'event',
    when_text: 'A new SOL or token transaction is received in my wallet',
    then_text:
      "Read the transaction details. Send an email to my own connected Gmail address with a clear subject line like 'You received [amount] [token]'. The email body should be friendly and easy to read, including: a greeting, the amount received, the token type, who sent it (sender wallet address), the transaction signature, and the date. Do not use any placeholder or example email addresses.",
    tools: ['solana', 'google_gmail_tool'],
    requires_approval: false,
  },

  // ── Bluesky Auto Reply ────────────────────────────────────────────────────
  {
    id: 'tpl_bluesky_auto_reply',
    name: 'Bluesky Auto Reply',
    description: 'Automatically replies to mentions and replies on your connected Bluesky account',
    category: 'Social',
    trigger_type: 'event',
    when_text: 'Someone mentions or replies to me on Bluesky',
    then_text:
      'Read the mention or reply. Understand what the person is asking or saying. Reply to their post on Bluesky with a friendly, helpful, and relevant response. Use the replyUri and replyCid from the event data to reply to the correct post.',
    tools: ['bluesky'],
    requires_approval: false,
  },

  // ── Website: Customise with AI ────────────────────────────────────────────
  {
    id: 'tpl_payload_customise',
    name: 'Customise My Website',
    description: 'Change anything on your site — content, images, fonts, colours, navigation — using plain English',
    category: 'Website',
    trigger_type: 'command',
    when_text: 'When I describe a change I want on my website',
    then_text: `
You are an AI website builder managing a Payload CMS site.

AVAILABLE PAYLOAD TOOLS (via MCP):
- find_pages / create_page / update_page / delete_page
- find_posts / create_post / update_post / delete_post
- find_categories / create_category
- find_media / create_media
- find_global_header / update_global_header
- find_global_footer  / update_global_footer
- find_global_settings / update_global_settings

WHAT YOU CAN CHANGE:
1. CONTENT: Update any page hero (headline, subtext, hero image), body text, layout blocks
2. NAVIGATION: update_global_header → navItems array (label + url) and cta button
3. BRANDING: update_global_settings → colors.primary, colors.background, colors.text
4. FONTS: update_global_settings → typography.bodyFont, typography.headingFont (Google Fonts names)
5. LOGO: create_media (upload the image), then update_global_settings → logo field
6. BLOG POSTS: create_post or update_post with title, slug, content (Lexical richText), featuredImage, categories, publishedAt
7. PAGES: create_page or update_page with hero, layout blocks (content / callToAction / mediaBlock)
8. FOOTER: update_global_footer → columns (heading + links), copyright, socials

ALWAYS scope queries to the correct tenant using the tenant field.
ALWAYS confirm what you changed in a brief summary to the user.
For images: first create_media (provide url or base64), then reference the returned ID.
For colours: use valid hex values only (e.g. "#6366f1").
For fonts: use exact Google Fonts names (e.g. "Inter", "Playfair Display", "Roboto").
    `.trim(),
    tools: ['payload'],
    requires_approval: false,
  },

  // ── Website: Publish Blog Post ───────────────────────────────────────────
  {
    id: 'tpl_payload_publish_post',
    name: 'Write & Publish Blog Post',
    description: 'AI writes a complete blog post and publishes it immediately to your site',
    category: 'Website',
    trigger_type: 'command',
    when_text: 'When I give a blog topic, title, or outline',
    then_text: `
Write a well-structured, engaging blog post based on the given topic. Use the following structure:
1. A compelling, SEO-friendly title
2. A 1–2 sentence excerpt/meta description
3. An introduction (1 paragraph)
4. 3–5 sections each with an H2 heading and 2–3 paragraphs
5. A conclusion paragraph
6. Set publishedAt to today's ISO date

Then create the post in Payload using create_post with:
- title: the title you wrote
- slug: url-safe version of the title
- excerpt: the meta description
- content: richText with all sections
- _status: "published"
- publishedAt: today's date

Always scope to the correct tenant. Confirm the post URL after publishing.
    `.trim(),
    tools: ['payload'],
    requires_approval: false,
  },

  // ── Website: Draft & Review ──────────────────────────────────────────────
  {
    id: 'tpl_payload_draft_review',
    name: 'Draft Content for Review',
    description: 'AI creates a draft and sends you a preview link — publish only when you approve',
    category: 'Website',
    trigger_type: 'command',
    when_text: 'When I request new website content that needs my approval before going live',
    then_text: `
Create the requested content (post or page) in Payload with _status: "draft".
Then create an approval request with:
- A clear summary of what was created
- preview_url: kiduna.studio/sites/[slug]/preview/[docId]
- payload_doc_id: the created document ID
- payload_collection: "posts" or "pages"
- payload_site_slug: the site slug

The user will review the content at the preview URL and approve/reject in Kiduna Studio.
When approved, the content will automatically be published.

NEVER publish directly — always set _status: "draft" for this skill.
    `.trim(),
    tools: ['payload'],
    requires_approval: true,
  },

  // ── Website: Update Branding ──────────────────────────────────────────────
  {
    id: 'tpl_payload_update_branding',
    name: 'Update Site Branding',
    description: 'Change fonts, colours, logo, or site name via a natural language request',
    category: 'Website',
    trigger_type: 'command',
    when_text: 'When I want to update the look and feel of my website',
    then_text: `
Update the site's visual identity using update_global_settings.

BRANDING FIELDS:
- siteName: the site name shown in the header and browser tab
- typography.bodyFont: Google Fonts family name for body text (e.g. "Inter", "Lato", "Open Sans")
- typography.headingFont: Google Fonts family name for headings (e.g. "Playfair Display", "Raleway", "Montserrat")
- typography.baseFontSize: "14" | "16" | "18"
- colors.primary: hex colour for buttons, links, accents
- colors.background: hex colour for page background
- colors.text: hex colour for body text
- logo: first create_media to upload the logo image, then reference its ID here
- favicon: same as logo — upload then reference

For colour suggestions: match the mood the user describes.
For font suggestions: serif fonts feel elegant/editorial; sans-serif fonts feel modern/clean.
After updating, confirm the changes with a brief before/after summary.
    `.trim(),
    tools: ['payload'],
    requires_approval: false,
  },

  // ── Website: Add Page ──────────────────────────────────────────────────────
  {
    id: 'tpl_payload_add_page',
    name: 'Add a New Page',
    description: 'AI creates a fully structured new page and adds it to the navigation',
    category: 'Website',
    trigger_type: 'command',
    when_text: 'When I want to add a new page to my website',
    then_text: `
Create a new page on the site using create_page.

STEPS:
1. Ask what page the user wants (if not already specified) — e.g. "Pricing", "Team", "Case Studies"
2. Create the page with:
   - title: the page name
   - slug: url-safe slug (e.g. "pricing")
   - hero: appropriate type (lowImpact or mediumImpact) with richText h1 heading
   - layout: relevant blocks based on the page type:
     * Pricing → content blocks with pricing tiers
     * Team → content blocks with team member descriptions
     * Services → callToAction blocks per service
   - _status: "published"
3. Add the page to navigation: update_global_header → append to navItems array
4. Optionally add to footer links: update_global_footer

Always scope to the correct tenant. Report the new page URL to the user.
    `.trim(),
    tools: ['payload'],
    requires_approval: false,
  },

]

// ─────────────────────────────────────────────────────────────────────────────

/** All unique categories */
export const TEMPLATE_CATEGORIES = Array.from(
  new Set(SKILL_TEMPLATES.map((t) => t.category))
)

/** Fast ID → template lookup */
export const TEMPLATES_BY_ID: Record<string, SkillTemplate> = Object.fromEntries(
  SKILL_TEMPLATES.map((t) => [t.id, t])
)