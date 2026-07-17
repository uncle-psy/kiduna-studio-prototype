import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenantBySlug, getPostBySlug, getSettings } from '@/lib/payload-client'

interface Params { slug: string; postSlug: string }

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug, postSlug } = await params
  let post: any = null
  let settings: any = null

  try {
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      const id = String(tenant.id)
      ;[post, settings] = await Promise.all([getPostBySlug(id, postSlug), getSettings(id)])
    }
  } catch { }

  if (!post) notFound()

  const colorPrimary = settings?.colors?.primary   || '#111111'
  const colorText    = settings?.colors?.text       || '#111111'
  const colorBg      = settings?.colors?.background || '#ffffff'

  return (
    <article style={{ maxWidth: 740, margin: '0 auto', padding: '64px 24px' }}>
      {/* Back link */}
      <Link href={`/sites/${slug}/blog`} style={{ fontSize: 13, color: colorPrimary, textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 40 }}>
        ← All posts
      </Link>

      {/* Categories */}
      {post.categories?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {post.categories.map((cat: any) => (
            <span key={cat.id} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${colorPrimary}15`, color: colorPrimary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cat.title}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, color: colorText, marginBottom: 16 }}>
        {post.title}
      </h1>

      {/* Date */}
      {post.publishedAt && (
        <p style={{ fontSize: 13, color: `${colorText}50`, marginBottom: 32 }}>
          {new Date(post.publishedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      )}

      {/* Featured image */}
      {post.featuredImage?.url && (
        <div style={{ marginBottom: 48, borderRadius: 12, overflow: 'hidden' }}>
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            style={{ width: '100%', maxHeight: 500, objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Excerpt */}
      {post.excerpt && (
        <p style={{ fontSize: 20, color: `${colorText}70`, lineHeight: 1.65, marginBottom: 40, fontStyle: 'italic', borderLeft: `3px solid ${colorPrimary}`, paddingLeft: 20 }}>
          {post.excerpt}
        </p>
      )}

      {/* Body */}
      <div style={{ fontSize: 17, lineHeight: 1.8, color: colorText }}>
        <RichTextRenderer content={post.content} colorText={colorText} colorPrimary={colorPrimary} />
      </div>
    </article>
  )
}

function RichTextRenderer({ content, colorText, colorPrimary }: any) {
  if (!content?.root?.children) return null
  return (
    <>
      {content.root.children.map((node: any, i: number) => {
        if (node.type === 'heading') {
          const Tag = node.tag || 'h2'
          const sizes: Record<string, string> = { h1: '2rem', h2: '1.6rem', h3: '1.3rem', h4: '1.15rem' }
          return <Tag key={i} style={{ fontSize: sizes[Tag] || '1.3rem', fontWeight: 800, marginTop: '1.8em', marginBottom: '0.5em', color: colorText, lineHeight: 1.2 }}>{extractText(node)}</Tag>
        }
        if (node.type === 'paragraph') {
          const text = extractText(node)
          if (!text.trim()) return <br key={i} />
          return <p key={i} style={{ marginBottom: '1.2em' }}>{text}</p>
        }
        if (node.type === 'list') {
          const Tag = node.listType === 'number' ? 'ol' : 'ul'
          return (
            <Tag key={i} style={{ paddingLeft: 24, marginBottom: '1.2em' }}>
              {(node.children || []).map((item: any, j: number) => (
                <li key={j} style={{ marginBottom: 8 }}>{extractText(item)}</li>
              ))}
            </Tag>
          )
        }
        if (node.type === 'upload' && node.value?.url) {
          return (
            <figure key={i} style={{ margin: '2em 0' }}>
              <img src={node.value.url} alt={node.value.alt || ''} style={{ width: '100%', borderRadius: 10, display: 'block' }} />
              {node.value.alt && <figcaption style={{ fontSize: 12, textAlign: 'center', marginTop: 8, color: `${colorText}50` }}>{node.value.alt}</figcaption>}
            </figure>
          )
        }
        if (node.type === 'horizontalrule') {
          return <hr key={i} style={{ border: 'none', borderTop: `1px solid ${colorText}20`, margin: '2em 0' }} />
        }
        return null
      })}
    </>
  )
}

function extractText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  if (node.children) return node.children.map(extractText).join('')
  return ''
}
