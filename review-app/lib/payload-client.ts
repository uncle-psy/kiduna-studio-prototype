import 'server-only'

const richText = (heading: string, body: string) => ({
  root: {
    children: [
      { type: 'heading', tag: 'h1', children: [{ type: 'text', text: heading }] },
      { type: 'paragraph', children: [{ type: 'text', text: body }] },
    ],
  },
})

const posts: PayloadPost[] = [
  {
    id: 'review-post', title: 'Building a Field of Shared Agency', slug: 'sample-post',
    excerpt: 'How people and intelligent agents can organize around shared purpose and durable trust.',
    content: richText('Where kinship becomes capacity', 'A community becomes more capable when its knowledge, commitments, and relationships remain available to everyone who contributes.'),
    publishedAt: '2026-07-15T12:00:00.000Z', _status: 'published',
    categories: [{ id: 'community', title: 'Community' }], tenant: 'review-tenant',
  },
]

const page = (slug: string): PayloadPage => ({
  id: `review-${slug}`,
  title: slug === 'home' ? 'Welcome' : slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  slug,
  hero: {
    type: 'highImpact',
    richText: richText(slug === 'home' ? 'A place to belong and build.' : 'Made through kinship.', 'Persistent relationships, shared purpose, and the capacity to do real things together.'),
  },
  layout: [{
    blockType: 'content',
    richText: richText('Human direction. Agentic capacity.', 'This sample site content keeps the source presentation visible without connecting to a content database.'),
  }],
  _status: 'published',
  tenant: 'review-tenant',
})

export async function getTenantBySlug(slug: string) { return { id: 'review-tenant', slug } }
export async function getPageBySlug(_tenantId: string, slug: string) { return page(slug) }
export async function getPostBySlug(_tenantId: string, _slug: string) { return posts[0] }
export async function listPosts(_tenantId: string, opts?: { limit?: number; page?: number }) {
  return { docs: posts.slice(0, opts?.limit ?? posts.length), totalDocs: posts.length, page: opts?.page ?? 1 }
}
export async function getDraftById(collection: 'posts' | 'pages', docId: string, _tenantId: string) {
  return collection === 'posts' ? { ...posts[0], id: docId, _status: 'draft' } : { ...page('welcome'), id: docId, _status: 'draft' }
}
export async function getHeader(_tenantId: string): Promise<PayloadHeader> {
  return { navItems: [{ link: { label: 'About', url: '/about' } }, { link: { label: 'Blog', url: '/blog' } }], cta: { label: 'Join us', url: '/welcome' } }
}
export async function getFooter(_tenantId: string): Promise<PayloadFooter> {
  return { columns: [{ heading: 'Explore', links: [{ label: 'About', url: '/about' }, { label: 'Blog', url: '/blog' }] }], copyright: '© 2026 Sample Kiduna' }
}
export async function getSettings(_tenantId: string): Promise<PayloadSettings> {
  return {
    siteName: 'Sample Kiduna', siteDescription: 'A review-only generated site',
    typography: { bodyFont: 'Avenir', headingFont: 'Avenir', baseFontSize: '16' },
    colors: { primary: '#EAAA00', background: '#ffffff', text: '#111111' },
  }
}

export interface PayloadSettings {
  siteName: string
  siteDescription?: string
  logo?: { url: string; alt: string; width?: number; height?: number }
  favicon?: { url: string; alt: string }
  typography?: { bodyFont?: string; headingFont?: string; baseFontSize?: '14' | '16' | '18' }
  colors?: { primary?: string; background?: string; text?: string }
  analytics?: { googleAnalyticsId?: string }
}
export interface NavLink { link: { label: string; url: string } }
export interface PayloadHeader { navItems: NavLink[]; cta?: { label: string; url: string } }
export interface FooterColumn { heading?: string; links?: Array<{ label: string; url: string }> }
export interface PayloadFooter { columns?: FooterColumn[]; copyright?: string; socials?: Array<{ platform: string; url: string }> }
export interface PayloadPost {
  id: string; title: string; slug: string; excerpt?: string; content?: any; publishedAt?: string
  _status: 'draft' | 'published'; categories?: Array<{ id: string; title: string }>
  featuredImage?: { url: string; alt: string }; tenant?: string | { id: string }
}
export interface PayloadPage {
  id: string; title: string; slug: string
  hero?: { type: 'none' | 'lowImpact' | 'mediumImpact' | 'highImpact'; richText?: any; media?: { url: string; alt: string } }
  layout?: any[]; _status: 'draft' | 'published'; tenant?: string | { id: string }
}
