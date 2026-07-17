/**
 * Dynamic page route for user-created websites.
 * Handles /sites/[slug]/[pageSlug] — about, services, contact, work, etc.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantBySlug, getPageBySlug, getSettings } from '@/lib/payload-client'

export default async function SiteInnerPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>
}) {
  const { slug, pageSlug } = await params

  let page: any = null
  let settings: any = null

  try {
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      const id = String(tenant.id)
      ;[page, settings] = await Promise.all([
        getPageBySlug(id, pageSlug),
        getSettings(id),
      ])
    }
  } catch {
    // CMS initialising
  }

  if (!page) notFound()

  const colorPrimary = settings?.colors?.primary   || '#111111'
  const colorText    = settings?.colors?.text       || '#111111'
  const colorBg      = settings?.colors?.background || '#ffffff'

  // AI-generated HTML takes priority over the block layout
  if ((page as any).htmlContent) {
    return <div dangerouslySetInnerHTML={{ __html: (page as any).htmlContent }} />
  }

  return (
    <div>
      <HeroSection hero={page.hero} colorPrimary={colorPrimary} colorText={colorText} colorBg={colorBg} />

      {page.layout && page.layout.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
          {page.layout.map((block: any, i: number) => (
            <BlockRenderer key={i} block={block} colorPrimary={colorPrimary} colorText={colorText} colorBg={colorBg} slug={slug} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ hero, colorPrimary, colorText, colorBg }: any) {
  if (!hero || hero.type === 'none') return null

  const isHigh = hero.type === 'highImpact'
  const isMed  = hero.type === 'mediumImpact'
  const bg     = isHigh ? colorText : `${colorText}08`
  const fg     = isHigh ? colorBg  : colorText

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {hero.media?.url && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src={hero.media.url} alt={hero.media.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isHigh ? 0.35 : 0.15 }} />
        </div>
      )}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: isHigh ? '100px 24px' : isMed ? '80px 24px' : '56px 24px',
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

// ─── Blocks ───────────────────────────────────────────────────────────────────

function BlockRenderer({ block, colorPrimary, colorText, colorBg, slug }: any) {
  if (block.blockType === 'content') {
    return (
      <div style={{ maxWidth: 740, margin: '0 auto 56px' }}>
        <RichTextRenderer content={block.richText} colorText={colorText} colorPrimary={colorPrimary} />
      </div>
    )
  }

  if (block.blockType === 'callToAction') {
    return (
      <div style={{ background: colorText, color: colorBg, borderRadius: 16, padding: '56px 48px', textAlign: 'center', marginBottom: 56 }}>
        <RichTextRenderer content={block.richText} colorText={colorBg} colorPrimary={colorPrimary} inverted />
        {block.links?.length > 0 && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
            {block.links.map((l: any, i: number) => (
              <Link key={i} href={l.link?.url || '#'} style={{
                padding: '11px 28px', borderRadius: 6, fontWeight: 700,
                textDecoration: 'none', fontSize: 14,
                background: l.link?.type === 'secondary' ? 'transparent' : colorPrimary,
                color: '#fff',
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
        <img src={block.media.url} alt={block.media.alt || ''} style={{ width: '100%', maxHeight: 600, objectFit: 'cover', display: 'block' }} />
        {block.caption && <p style={{ fontSize: 13, color: `${colorText}60`, marginTop: 10, textAlign: 'center' }}>{block.caption}</p>}
      </div>
    )
  }

  return null
}

// ─── Rich text ────────────────────────────────────────────────────────────────

function RichTextRenderer({ content, colorText, colorPrimary, inverted }: any) {
  if (!content?.root?.children) return null
  return (
    <div>
      {content.root.children.map((node: any, i: number) => {
        if (node.type === 'heading') {
          const Tag = node.tag || 'h2'
          const sizes: Record<string, string> = { h1: '2.5rem', h2: '1.85rem', h3: '1.4rem', h4: '1.2rem', h5: '1.05rem', h6: '1rem' }
          return <Tag key={i} style={{ fontSize: sizes[Tag] || '1.5rem', fontWeight: 800, marginBottom: '0.6em', marginTop: i > 0 ? '1.4em' : 0, color: colorText, lineHeight: 1.15 }}>{renderInline(node.children, colorPrimary)}</Tag>
        }
        if (node.type === 'paragraph') {
          const children = renderInline(node.children, colorPrimary)
          if (!children) return <br key={i} />
          return <p key={i} style={{ fontSize: '1em', lineHeight: 1.75, marginBottom: '1em', color: colorText }}>{children}</p>
        }
        if (node.type === 'list') {
          const Tag = node.listType === 'number' ? 'ol' : 'ul'
          return <Tag key={i} style={{ paddingLeft: 24, marginBottom: '1em', color: colorText }}>{(node.children || []).map((item: any, j: number) => <li key={j} style={{ marginBottom: 6, lineHeight: 1.7 }}>{renderInline(item.children, colorPrimary)}</li>)}</Tag>
        }
        return null
      })}
    </div>
  )
}

function renderInline(nodes: any[], colorPrimary: string): React.ReactNode {
  if (!nodes?.length) return null
  return nodes.map((n: any, i: number) => {
    if (n.type === 'text') {
      let el: React.ReactNode = n.text
      if (n.format & 1)  el = <strong key={i}>{el}</strong>
      if (n.format & 2)  el = <em key={i}>{el}</em>
      if (n.format & 8)  el = <u key={i}>{el}</u>
      return <span key={i}>{el}</span>
    }
    if (n.type === 'link') {
      return <a key={i} href={n.fields?.url || '#'} style={{ color: colorPrimary, textDecoration: 'underline' }} target={n.fields?.newTab ? '_blank' : undefined} rel="noopener noreferrer">{renderInline(n.children, colorPrimary)}</a>
    }
    return null
  })
}
