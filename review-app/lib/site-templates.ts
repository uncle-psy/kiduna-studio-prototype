/**
 * Kiduna Studio — Website Template Definitions
 *
 * Each template defines:
 *  - id / name / description shown in the /empower modal
 *  - starter pages, navigation structure, and default settings
 *  - a short "agent guide" injected into the performer system prompt
 *    so the AI knows the intent and shape of the site.
 */

export interface SiteTemplate {
  id: string
  name: string
  tagline: string
  description: string
  emoji: string
  color: string
  /** Pages seeded on provisioning */
  pages: string[]
  /** Default nav items */
  nav: Array<{ label: string; path: string }>
  /** Default Settings values */
  defaults: {
    headingFont: string
    bodyFont: string
    primaryColor: string
    backgroundColor: string
    textColor: string
  }
  /**
   * Natural-language guide for the AI agent.
   * Injected into the Payload skill system prompt so the agent
   * knows the structure and intent of this template.
   */
  agentGuide: string
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  // ─── Business Website ──────────────────────────────────────────────────────
  {
    id: 'website',
    name: 'Business Website',
    tagline: 'Professional presence for any business',
    description: 'Home, About, Services, Blog, and Contact pages. Great for agencies, consultants, and small businesses.',
    emoji: '🏢',
    color: '#6366f1',
    pages: ['home', 'about', 'services', 'blog', 'contact'],
    nav: [
      { label: 'About',    path: '/about'    },
      { label: 'Services', path: '/services' },
      { label: 'Blog',     path: '/blog'     },
      { label: 'Contact',  path: '/contact'  },
    ],
    defaults: {
      headingFont:     'Inter',
      bodyFont:        'Inter',
      primaryColor:    '#6366f1',
      backgroundColor: '#ffffff',
      textColor:       '#111111',
    },
    agentGuide: `
This is a BUSINESS WEBSITE. The site has these pages: Home, About, Services, Blog, Contact.

STRUCTURE:
- Home page: has a highImpact hero (headline + subtext + CTA button) and optional layout blocks
- About page: company story, team, values — use content blocks
- Services page: list of offerings — use callToAction blocks
- Blog: posts collection — each post has title, slug, excerpt, content, featuredImage, categories
- Contact: contact info and a message to fill out

CUSTOMIZATION GUIDE:
1. Branding: update Settings global → siteName, typography.bodyFont, typography.headingFont, colors.primary, colors.background, colors.text
2. Navigation: update Header global → navItems (label + url), cta (label + url for the top-right CTA button)
3. Logo: update Settings global → logo (upload an image to Media first, then set logo field)
4. Hero text: update Home page → hero.richText with h1 heading + paragraph + optional CTA
5. Hero background image: upload to Media, then set home page → hero.media
6. Services: update Services page → layout with callToAction blocks
7. Blog posts: create posts with title, slug, excerpt, content (Lexical richText), featuredImage, categories, publishedAt
8. Footer: update Footer global → columns (heading + links), copyright, socials
9. Settings: update Settings → analytics.googleAnalyticsId for tracking

IMPORTANT:
- Always include tenant field = tenant ID when creating/updating content
- Slugs must be unique per collection per tenant
- For images: create a Media document first (upload), then reference its ID
- publishedAt format: ISO 8601, e.g. "2026-06-23T12:00:00.000Z"
- _status: "published" to make content live, "draft" for require-approval mode
`.trim(),
  },

  // ─── Portfolio ─────────────────────────────────────────────────────────────
  {
    id: 'portfolio',
    name: 'Creative Portfolio',
    tagline: 'Showcase your work beautifully',
    description: 'Projects grid, skills section, bio, and contact. Perfect for designers, developers, and creators.',
    emoji: '🎨',
    color: '#f59e0b',
    pages: ['home', 'work', 'about', 'contact'],
    nav: [
      { label: 'Work',    path: '/work'    },
      { label: 'About',   path: '/about'   },
      { label: 'Contact', path: '/contact' },
    ],
    defaults: {
      headingFont:     'Raleway',
      bodyFont:        'DM Sans',
      primaryColor:    '#f59e0b',
      backgroundColor: '#0f0f0f',
      textColor:       '#f5f5f5',
    },
    agentGuide: `
This is a CREATIVE PORTFOLIO site. Pages: Home, Work (projects), About, Contact.

STRUCTURE:
- Home page: striking hero with name/title, then recent projects preview
- Work page: grid of project cards — each project is a Page with slug, hero image, layout blocks describing the project
- About page: bio, skills, experience — rich text content
- Contact page: email/social links

CUSTOMIZATION GUIDE:
1. Branding: dark background (#0f0f0f), accent color (e.g. #f59e0b amber), heading font (Raleway or Playfair Display)
2. Hero: Home page hero → h1 with creator name, h2 with role/title, paragraph with one-line bio
3. Projects: Each project is a Page with a descriptive slug (e.g. "brand-identity-acme"), a hero image, and content blocks describing the project
4. Navigation: minimal — Work, About, Contact + CTA "Hire Me"
5. Skills: add a content block on the About page with a list of skills
6. Footer: minimal — copyright + social links (twitter, github, linkedin, dribbble)
7. Featured image: every project page MUST have a hero.media image — upload to Media first

IMPORTANT: This is a dark-themed site. Background is #0f0f0f. Text is #f5f5f5. Primary accent is amber/gold.
`.trim(),
  },

  // ─── Blog / Publication ────────────────────────────────────────────────────
  {
    id: 'blog',
    name: 'Blog / Publication',
    tagline: 'Write and publish with style',
    description: 'Clean reading experience with categories, author bio, and newsletter signup.',
    emoji: '✍️',
    color: '#10b981',
    pages: ['home', 'blog', 'about'],
    nav: [
      { label: 'Articles', path: '/blog'  },
      { label: 'About',    path: '/about' },
    ],
    defaults: {
      headingFont:     'Playfair Display',
      bodyFont:        'Source Serif 4',
      primaryColor:    '#10b981',
      backgroundColor: '#fafafa',
      textColor:       '#1a1a1a',
    },
    agentGuide: `
This is a BLOG / PUBLICATION site. Pages: Home (latest posts), Blog (full listing), About.

STRUCTURE:
- Home page: hero with publication name + tagline, then latest 3 posts
- Blog page (/blog): full post listing with featured images and excerpts
- Individual posts (/blog/[slug]): full article — title, featured image, categories, rich content
- About page: author bio, writing topics, contact

CUSTOMIZATION GUIDE:
1. Typography: serif fonts for a newspaper feel — Playfair Display for headings, Source Serif 4 for body
2. Post creation: title, slug (url-safe), excerpt (1-2 sentences), content (richText with headings, paragraphs, images), featuredImage, categories, publishedAt
3. Categories: create Category documents first (e.g. "Technology", "Design", "Business")
4. Featured images: ALWAYS add a featuredImage to posts — it shows as the card thumbnail on the blog listing
5. Author info: put it in the About page → content block
6. Navigation: Articles, About, + optional Newsletter CTA
7. Footer: publication name, links to categories, social links
8. Content tone: professional, informative — well-structured with H2/H3 subheadings

KEY: A great blog post has: a punchy title, a 2-sentence excerpt, a featured image, clear H2 sections, and a concluding paragraph.
`.trim(),
  },

  // ─── Landing Page ──────────────────────────────────────────────────────────
  {
    id: 'landing',
    name: 'Product Landing Page',
    tagline: 'Launch your product or service',
    description: 'High-conversion single page with hero, features, pricing, testimonials, and CTA.',
    emoji: '🚀',
    color: '#ec4899',
    pages: ['home'],
    nav: [
      { label: 'Features',     path: '#features'     },
      { label: 'Pricing',      path: '#pricing'      },
      { label: 'Testimonials', path: '#testimonials' },
    ],
    defaults: {
      headingFont:     'Sora',
      bodyFont:        'Inter',
      primaryColor:    '#ec4899',
      backgroundColor: '#06030f',
      textColor:       '#f1f0ff',
    },
    agentGuide: `
This is a PRODUCT LANDING PAGE — a single page designed to convert visitors.

STRUCTURE (all on the Home page using layout blocks):
1. Hero block: bold headline, subheadline, primary CTA button ("Get started free")
2. Features section: callToAction block or content block listing 3-5 key features with icons/descriptions  
3. Social proof: testimonials or logos as a content block
4. Pricing: a content block with pricing tiers
5. FAQ: content block with common questions
6. Bottom CTA: callToAction block with strong call to action

CUSTOMIZATION GUIDE:
1. Hero (home page hero): h1 = product name / tagline, paragraph = benefit statement, hero.type = "highImpact"
2. Features: update Home page layout → add content blocks for each feature section
3. CTA buttons: add callToAction blocks with primary + secondary link options
4. Background image: upload a product screenshot or hero image to Media, set as home page hero.media
5. Branding: dark background (#06030f), vibrant primary color (pink/purple/blue), Sora or Space Grotesk heading font
6. Navigation: anchor links only (#features, #pricing) — no separate pages needed

KEY: Keep it focused. One page. One message. One CTA. Every section should push toward the signup/purchase action.
`.trim(),
  },
]

export function getTemplate(id: string): SiteTemplate {
  return SITE_TEMPLATES.find(t => t.id === id) ?? SITE_TEMPLATES[0]
}
