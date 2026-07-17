import Link from 'next/link'
import { getTenantBySlug, listPosts, getSettings } from '@/lib/payload-client'

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let posts: any[] = []
  let settings: any = null

  try {
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      const id = String(tenant.id)
      const [result, s] = await Promise.all([listPosts(id, { limit: 20 }), getSettings(id)])
      posts    = result.docs ?? []
      settings = s
    }
  } catch { }

  const colorPrimary = settings?.colors?.primary   || '#111111'
  const colorText    = settings?.colors?.text       || '#111111'
  const colorBg      = settings?.colors?.background || '#ffffff'

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, color: colorText }}>Blog</h1>
      <p style={{ fontSize: 15, color: `${colorText}60`, marginBottom: 48 }}>Latest articles and updates</p>

      {posts.length === 0 ? (
        <p style={{ color: `${colorText}50`, fontStyle: 'italic' }}>No posts yet — ask your AI agent to write the first one!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {posts.map((post: any) => (
            <article key={post.id} style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
              {post.featuredImage?.url && (
                <Link href={`/sites/${slug}/blog/${post.slug}`} style={{ flexShrink: 0 }}>
                  <img
                    src={post.featuredImage.url}
                    alt={post.featuredImage.alt || post.title}
                    style={{ width: 200, height: 130, objectFit: 'cover', borderRadius: 10, display: 'block' }}
                  />
                </Link>
              )}
              <div>
                <Link href={`/sites/${slug}/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: colorText, marginBottom: 8, lineHeight: 1.3 }}>
                    {post.title}
                  </h2>
                </Link>
                {post.excerpt && (
                  <p style={{ fontSize: 14, color: `${colorText}70`, lineHeight: 1.65, marginBottom: 12 }}>
                    {post.excerpt}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  {post.publishedAt && (
                    <span style={{ fontSize: 12, color: `${colorText}50` }}>
                      {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  )}
                  {post.categories?.length > 0 && post.categories.map((cat: any) => (
                    <span key={cat.id} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: `${colorPrimary}15`, color: colorPrimary }}>
                      {cat.title}
                    </span>
                  ))}
                  <Link href={`/sites/${slug}/blog/${post.slug}`} style={{ fontSize: 13, color: colorPrimary, textDecoration: 'none', fontWeight: 600 }}>
                    Read more →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
