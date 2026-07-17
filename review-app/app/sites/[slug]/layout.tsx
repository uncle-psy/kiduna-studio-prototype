/**
 * Layout for user-created websites at kiduna.studio/sites/[slug].
 * Applies custom fonts (Google Fonts), brand colours, and logo from
 * the tenant's Payload Settings global.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getTenantBySlug,
  getHeader,
  getFooter,
  getSettings,
  type PayloadSettings,
  type PayloadHeader,
  type PayloadFooter,
} from '@/lib/payload-client'

// Always re-fetch settings so changes via chat apply immediately
export const dynamic = 'force-dynamic'

/** Prefix root-relative paths with /sites/{slug} (fixes legacy /about-us nav links). */
function resolveSiteHref(href: string, siteSlug: string): string {
  if (!href || href.startsWith('#')) return href
  if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) return href
  if (href.startsWith(`/sites/${siteSlug}`)) return href
  if (href === '/') return `/sites/${siteSlug}`
  if (href.startsWith('/')) return `/sites/${siteSlug}${href}`
  return href
}

// Build a Google Fonts URL for one or two font families
function googleFontsHref(body: string, heading: string): string {
  const families = [...new Set([body, heading])]
    .filter(Boolean)
    .map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const tenant = await getTenantBySlug(slug)
    if (!tenant) return { title: slug }
    const s = await getSettings(String(tenant.id))
    return {
      title: s?.siteName || slug,
      description: s?.siteDescription || `${slug} — built with Kiduna Studio`,
      icons: s?.favicon?.url ? { icon: s.favicon.url } : undefined,
    }
  } catch {
    return { title: slug }
  }
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let header: PayloadHeader | null = null
  let footer: PayloadFooter | null = null
  let settings: PayloadSettings | null = null

  try {
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      const id = String(tenant.id)
      ;[header, footer, settings] = await Promise.all([
        getHeader(id),
        getFooter(id),
        getSettings(id),
      ])
    }
  } catch {
    // graceful degradation
  }

  const siteName   = settings?.siteName || slug
  const bodyFont   = settings?.typography?.bodyFont    || 'Inter'
  const headingFont= settings?.typography?.headingFont || bodyFont
  const fontSize   = settings?.typography?.baseFontSize || '16'
  const colorBg    = settings?.colors?.background || '#ffffff'
  const colorText  = settings?.colors?.text       || '#111111'
  const colorPrimary = settings?.colors?.primary  || '#111111'
  const fontsUrl   = googleFontsHref(bodyFont, headingFont)

  return (
    <>
      {/* Tailwind CDN for AI-generated HTML content */}
      <script src="https://cdn.tailwindcss.com" />
      <script dangerouslySetInnerHTML={{ __html: `
        if (typeof tailwind !== 'undefined') {
          tailwind.config = { corePlugins: { preflight: false } }
        }
      `}} />

      {/* Google Fonts + CSS variables injected per-site */}
      <style>{`
        @import url('${fontsUrl}');

        :root {
          --site-font-body:    '${bodyFont}', system-ui, sans-serif;
          --site-font-heading: '${headingFont}', system-ui, sans-serif;
          --site-font-size:    ${fontSize}px;
          --site-color-bg:     ${colorBg};
          --site-color-text:   ${colorText};
          --site-color-primary:${colorPrimary};
        }

        /* Scoped reset so Kiduna Studio styles don't bleed in */
        .site-root * { box-sizing: border-box; }
        .site-root { font-family: var(--site-font-body); font-size: var(--site-font-size); color: var(--site-color-text); background: var(--site-color-bg); }
        .site-root h1, .site-root h2, .site-root h3, .site-root h4, .site-root h5, .site-root h6 { font-family: var(--site-font-heading); }
        .site-root a { color: var(--site-color-primary); }
      `}</style>

      {/* GA4 */}
      {settings?.analytics?.googleAnalyticsId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.analytics.googleAnalyticsId}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${settings.analytics.googleAnalyticsId}');` }} />
        </>
      )}

      <div className="site-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colorBg }}>
        {/* Navigation */}
        <header style={{ borderBottom: `1px solid ${colorText}15`, background: colorBg }}>
          <nav style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            {/* Logo or site name */}
            <Link href={`/sites/${slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              {settings?.logo?.url ? (
                <img
                  src={settings.logo.url}
                  alt={settings.logo.alt || siteName}
                  style={{ height: 36, width: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontFamily: `var(--site-font-heading)`, fontWeight: 800, fontSize: 20, color: colorText }}>
                  {siteName}
                </span>
              )}
            </Link>

            {/* Nav links */}
            {header?.navItems && header.navItems.length > 0 && (
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                {header.navItems.map((item, i) => (
                  <Link
                    key={i}
                    href={resolveSiteHref(item.link?.url || '#', slug)}
                    style={{ fontSize: 14, fontWeight: 500, color: colorText, textDecoration: 'none', opacity: 0.8 }}
                  >
                    {item.link?.label}
                  </Link>
                ))}
              </div>
            )}

            {/* CTA button */}
            {header?.cta?.label && header.cta.url && (
              <Link
                href={resolveSiteHref(header.cta.url, slug)}
                style={{
                  fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 6,
                  background: colorPrimary, color: colorBg === '#ffffff' ? '#fff' : colorBg,
                  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                  filter: colorPrimary === '#111111' ? 'none' : 'brightness(1)',
                }}
              >
                {header.cta.label}
              </Link>
            )}
          </nav>
        </header>

        {/* Page content */}
        <main style={{ flex: 1 }}>{children}</main>

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${colorText}15`, background: colorBg, padding: '48px 24px 32px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {footer?.columns && footer.columns.length > 0 && (
              <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', marginBottom: 32 }}>
                {footer.columns.map((col, i) => (
                  <div key={i}>
                    {col.heading && (
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: `${colorText}80`, marginBottom: 14 }}>
                        {col.heading}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(col.links || []).map((link, j) => (
                        <Link key={j} href={resolveSiteHref(link.url, slug)} style={{ fontSize: 13, color: `${colorText}90`, textDecoration: 'none' }}>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Socials */}
            {footer?.socials && footer.socials.length > 0 && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                {footer.socials.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: `${colorText}70`, textDecoration: 'none', textTransform: 'capitalize' }}>
                    {s.platform}
                  </a>
                ))}
              </div>
            )}

            <p style={{ fontSize: 12, color: `${colorText}50` }}>
              {footer?.copyright || `© ${new Date().getFullYear()} ${siteName}`}
              {' · '}
              <Link href="https://kiduna.studio" style={{ color: `${colorText}50` }}>Built on Kiduna Studio</Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
