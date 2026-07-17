/**
 * Home page for a user-created website at kiduna.studio/sites/[slug].
 * Renders hero images, layout blocks, and respects custom brand colours/fonts.
 */

import Link from 'next/link'
import Image from 'next/image'
import { getTenantBySlug, getPageBySlug, listPosts, getSettings } from '@/lib/payload-client'

export default async function SiteHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let page: any   = null
  let posts: any[] = []
  let settings: any = null

  try {
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      const id = String(tenant.id)
      ;[page, settings] = await Promise.all([
        getPageBySlug(id, 'home'),
        getSettings(id),
      ])
      const postsResult = await listPosts(id, { limit: 3 })
      posts = postsResult.docs ?? []
    }
  } catch {
    // CMS initialising — show fallback
  }

  const colorPrimary = settings?.colors?.primary  || '#111111'
  const colorText    = settings?.colors?.text      || '#111111'
  const colorBg      = settings?.colors?.background|| '#ffffff'

  if (!page) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Welcome to {slug}</h1>
        <p style={{ fontSize: 16, color: `${colorText}80` }}>
          Your website is being set up. Ask your Kiduna Studio agent to add content.
        </p>
      </div>
    )
  }

  // AI-generated HTML takes priority over the block layout
  if (page.htmlContent) {
    return <div dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
  }

  return (
    <div>
      <HeroSection hero={page.hero} colorPrimary={colorPrimary} colorText={colorText} colorBg={colorBg} />

      {page.layout && page.layout.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
          {page.layout.map((block: any, i: number) => (
            <BlockRenderer key={i} block={block} colorPrimary={colorPrimary} colorText={colorText} colorBg={colorBg} />
          ))}
        </div>
      )}

      {/* Latest posts section */}
      {posts.length > 0 && (
        <section style={{ background: `${colorText}05`, padding: '64px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, color: colorText }}>Latest Posts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 28 }}>
              {posts.map((post: any) => (
                <PostCard key={post.id} post={post} slug={slug} colorPrimary={colorPrimary} colorText={colorText} colorBg={colorBg} />
              ))}
            </div>
            <div style={{ marginTop: 36, textAlign: 'center' }}>
              <Link href={`/sites/${slug}/blog`} style={{
                display: 'inline-block', padding: '10px 28px', borderRadius: 6,
                border: `1.5px solid ${colorPrimary}`, color: colorPrimary,
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}>
                View all posts →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection({ hero, colorPrimary, colorText, colorBg }: any) {
  if (!hero || hero.type === 'none') return null

  const isHigh = hero.type === 'highImpact'
  const bg     = isHigh ? colorText : `${colorText}08`
  const fg     = isHigh ? colorBg  : colorText

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background image */}
      {hero.media?.url && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src={hero.media.url}
            alt={hero.media.alt || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isHigh ? 0.35 : 0.15 }}
          />
        </div>
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        padding: isHigh ? '120px 24px' : '72px 24px',
        background: hero.media?.url ? (isHigh ? colorText : 'transparent') : bg,
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', color: fg }}>
          <RichTextRenderer content={hero.richText} colorText={fg} colorPrimary={colorPrimary} />
        </div>
      </div>
    </div>
  )
}

// ─── Layout blocks ────────────────────────────────────────────────────────────

function BlockRenderer({ block, colorPrimary, colorText, colorBg }: any) {
  if (block.blockType === 'content') {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto 56px' }}>
        <RichTextRenderer content={block.richText} colorText={colorText} colorPrimary={colorPrimary} />
      </div>
    )
  }

  if (block.blockType === 'callToAction') {
    return (
      <div style={{
        background: colorText, color: colorBg, borderRadius: 16,
        padding: '56px 48px', textAlign: 'center', marginBottom: 56,
      }}>
        <RichTextRenderer content={block.richText} colorText={colorBg} colorPrimary={colorPrimary} inverted />
        {block.links?.length > 0 && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            {block.links.map((l: any, i: number) => (
              <Link key={i} href={l.link?.url || '#'} style={{
                padding: '11px 28px', borderRadius: 6, fontWeight: 700,
                textDecoration: 'none', fontSize: 14,
                background: l.link?.type === 'secondary' ? 'transparent' : colorPrimary,
                color: l.link?.type === 'secondary' ? colorBg : '#fff',
                border: l.link?.type === 'secondary' ? `1.5px solid ${colorBg}40` : 'none',
              }}>
                {l.link?.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (block.blockType === 'mediaBlock' && block.media?.url) {
    return (
      <div style={{ marginBottom: 56, borderRadius: 12, overflow: 'hidden' }}>
        <img
          src={block.media.url}
          alt={block.media.alt || ''}
          style={{ width: '100%', maxHeight: 600, objectFit: 'cover', display: 'block' }}
        />
        {block.caption && (
          <p style={{ fontSize: 13, color: `${colorText}60`, marginTop: 10, textAlign: 'center' }}>
            {block.caption}
          </p>
        )}
      </div>
    )
  }

  return null
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post, slug, colorPrimary, colorText, colorBg }: any) {
  return (
    <Link href={`/sites/${slug}/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: colorBg, borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${colorText}12`,
        transition: 'box-shadow 0.2s',
        height: '100%', display: 'flex', flexDirection: 'column',
      }}>
        {post.featuredImage?.url ? (
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ height: 180, background: `${colorPrimary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 40 }}>✍️</span>
          </div>
        )}
        <div style={{ padding: '20px 20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: colorText, marginBottom: 8, lineHeight: 1.3 }}>
            {post.title}
          </h3>
          {post.excerpt && (
            <p style={{ fontSize: 13, color: `${colorText}70`, lineHeight: 1.6, flex: 1, marginBottom: 16 }}>
              {post.excerpt}
            </p>
          )}
          {post.publishedAt && (
            <p style={{ fontSize: 11, color: `${colorText}50` }}>
              {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Rich text renderer ───────────────────────────────────────────────────────

function RichTextRenderer({ content, colorText, colorPrimary, inverted }: any) {
  if (!content?.root?.children) return null
  return (
    <div>
      {content.root.children.map((node: any, i: number) => {
        if (node.type === 'heading') {
          const Tag = node.tag || 'h2'
          const sizes: Record<string, string> = { h1: '2.75rem', h2: '2rem', h3: '1.5rem', h4: '1.25rem', h5: '1.1rem', h6: '1rem' }
          return (
            <Tag key={i} style={{ fontSize: sizes[Tag] || '1.5rem', fontWeight: 800, marginBottom: '0.6em', marginTop: i > 0 ? '1.4em' : 0, color: colorText, lineHeight: 1.15 }}>
              {renderInlineNodes(node.children, colorPrimary)}
            </Tag>
          )
        }
        if (node.type === 'paragraph') {
          const children = renderInlineNodes(node.children, colorPrimary)
          if (!children) return <br key={i} />
          return <p key={i} style={{ fontSize: '1em', lineHeight: 1.75, marginBottom: '1em', color: colorText }}>{children}</p>
        }
        if (node.type === 'list') {
          const Tag = node.listType === 'number' ? 'ol' : 'ul'
          return (
            <Tag key={i} style={{ paddingLeft: 24, marginBottom: '1em', color: colorText }}>
              {(node.children || []).map((item: any, j: number) => (
                <li key={j} style={{ marginBottom: 6, lineHeight: 1.7 }}>{renderInlineNodes(item.children, colorPrimary)}</li>
              ))}
            </Tag>
          )
        }
        if (node.type === 'upload' && node.value?.url) {
          return (
            <div key={i} style={{ margin: '1.5em 0', borderRadius: 8, overflow: 'hidden' }}>
              <img src={node.value.url} alt={node.value.alt || ''} style={{ width: '100%', maxHeight: 500, objectFit: 'cover', display: 'block' }} />
              {node.value.caption && <p style={{ fontSize: 12, color: `${colorText}60`, marginTop: 6, textAlign: 'center' }}>{node.value.caption}</p>}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

function renderInlineNodes(nodes: any[], colorPrimary: string): React.ReactNode {
  if (!nodes?.length) return null
  return nodes.map((n: any, i: number) => {
    if (n.type === 'text') {
      let el: React.ReactNode = n.text
      if (n.format & 1)  el = <strong key={i}>{el}</strong>
      if (n.format & 2)  el = <em key={i}>{el}</em>
      if (n.format & 8)  el = <u key={i}>{el}</u>
      if (n.format & 16) el = <code key={i} style={{ fontFamily: 'monospace', fontSize: '0.9em', background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3 }}>{el}</code>
      return <span key={i}>{el}</span>
    }
    if (n.type === 'link') {
      return <a key={i} href={n.fields?.url || '#'} style={{ color: colorPrimary, textDecoration: 'underline' }} target={n.fields?.newTab ? '_blank' : undefined} rel="noopener noreferrer">{renderInlineNodes(n.children, colorPrimary)}</a>
    }
    return null
  })
}
