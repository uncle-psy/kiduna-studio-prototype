/**
 * Draft preview page for Payload CMS content.
 * URL: kiduna.studio/sites/[slug]/preview/[docId]
 *
 * Uses Payload local API to fetch draft documents directly (no HTTP).
 * This URL is linked from the /approve page for reviewer sign-off.
 */

import Link from 'next/link'
import { getTenantBySlug, getDraftById } from '@/lib/payload-client'

interface PreviewParams {
  slug: string
  docId: string
}

export default async function PreviewPage({ params }: { params: Promise<PreviewParams> }) {
  const { slug, docId } = await params

  let doc: any = null
  let docType: 'post' | 'page' | null = null

  try {
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      const tenantId = String(tenant.id)
      const post = await getDraftById('posts', docId, tenantId)
      if (post) { doc = post; docType = 'post' }
      if (!doc) {
        const page = await getDraftById('pages', docId, tenantId)
        if (page) { doc = page; docType = 'page' }
      }
    }
  } catch {
    // not found
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Draft Preview Banner */}
      <div style={{
        background: '#6366f1', color: '#fff', padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Draft Preview — {slug}
          {doc?.title && <span style={{ marginLeft: 8, opacity: 0.8 }}>· {doc.title}</span>}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ opacity: 0.7, fontSize: 12 }}>Not published yet</span>
          <Link href="/approve" style={{
            color: '#fff', textDecoration: 'none', padding: '4px 12px',
            borderRadius: 4, background: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: 700,
          }}>
            ← Back to Actions
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
        {doc ? (
          <article>
            {doc.title && (
              <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 24, lineHeight: 1.2, color: '#111' }}>
                {doc.title}
              </h1>
            )}
            {doc._status && (
              <div style={{ marginBottom: 24 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '4px 10px', borderRadius: 4,
                  background: doc._status === 'published' ? '#dcfce7' : '#fef9c3',
                  color: doc._status === 'published' ? '#166534' : '#854d0e',
                }}>
                  {doc._status}
                </span>
              </div>
            )}
            {doc.excerpt && (
              <p style={{ fontSize: 18, color: '#4b5563', marginBottom: 32, fontStyle: 'italic', lineHeight: 1.6 }}>
                {doc.excerpt}
              </p>
            )}
            {(doc.content || doc.hero?.richText) && (
              <div style={{ fontSize: 16, lineHeight: 1.8, color: '#374151' }}>
                <RichTextRenderer content={doc.content || doc.hero?.richText} />
              </div>
            )}
            {!doc.content && !doc.hero?.richText && docType === 'page' && doc.layout && doc.layout.map((block: any, i: number) => (
              <div key={i} style={{ marginBottom: 32 }}>
                {block.richText && <RichTextRenderer content={block.richText} />}
              </div>
            ))}
            {!doc.content && !doc.hero?.richText && !doc.layout?.length && (
              <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No content found in this draft.</p>
            )}
          </article>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>
            <p style={{ fontSize: 20, marginBottom: 8 }}>Draft not found</p>
            <p>Document ID <code style={{ fontFamily: 'monospace', fontSize: 13 }}>{docId}</code> does not exist in site <strong>{slug}</strong>.</p>
            <Link href="/approve" style={{ marginTop: 16, display: 'inline-block', color: '#6366f1', textDecoration: 'underline' }}>
              Back to Actions
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function RichTextRenderer({ content }: { content: any }) {
  if (!content?.root?.children) return null
  return (
    <>
      {content.root.children.map((node: any, i: number) => {
        if (node.type === 'heading') {
          const Tag = node.tag || 'h2'
          const sizes: Record<string, string> = { h1: '2rem', h2: '1.5rem', h3: '1.25rem', h4: '1.1rem' }
          return <Tag key={i} style={{ fontSize: sizes[Tag] || '1.25rem', fontWeight: 700, marginBottom: 16, marginTop: 32, color: '#111', lineHeight: 1.3 }}>{extractText(node)}</Tag>
        }
        if (node.type === 'paragraph') {
          const text = extractText(node)
          if (!text.trim()) return <br key={i} />
          return <p key={i} style={{ marginBottom: 20 }}>{text}</p>
        }
        if (node.type === 'list') {
          const ListTag = node.listType === 'number' ? 'ol' : 'ul'
          return (
            <ListTag key={i} style={{ paddingLeft: 24, marginBottom: 20 }}>
              {(node.children || []).map((item: any, j: number) => (
                <li key={j} style={{ marginBottom: 8 }}>{extractText(item)}</li>
              ))}
            </ListTag>
          )
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
