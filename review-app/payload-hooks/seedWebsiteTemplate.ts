import type { Payload } from 'payload'
import { getTemplate } from '../lib/site-templates'

// ─── Lexical helpers ──────────────────────────────────────────────────────────

function richText(children: any[]) {
  return {
    root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
  }
}
function h1(text: string)  { return { type: 'heading', tag: 'h1', children: [{ type: 'text', text }] } }
function h2(text: string)  { return { type: 'heading', tag: 'h2', children: [{ type: 'text', text }] } }
function p(text: string)   { return { type: 'paragraph', children: [{ type: 'text', text }] } }

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function seedWebsiteTemplate(
  tenantId: string,
  slug: string,
  payload: Payload,
  templateId = 'website',
  req?: any,
): Promise<void> {
  const tpl = getTemplate(templateId)
  payload.logger.info({ tenant: slug, template: templateId }, '[Seed] Starting template seed')

  // Shared options — pass req so seed operations join the same DB transaction
  // (without this, page inserts violate the pages_tenant_id FK because the
  //  tenant row isn't visible on a fresh connection until commit)
  const opts = req ? { req } : {}

  try {
    switch (tpl.id) {
      case 'portfolio': await seedPortfolio(tenantId, slug, payload, opts); break
      case 'blog':      await seedBlog(tenantId, slug, payload, opts);      break
      case 'landing':   await seedLanding(tenantId, slug, payload, opts);   break
      default:          await seedWebsite(tenantId, slug, payload, opts);    break
    }

    // ── Shared: Header, Footer, Settings (best-effort — globals may not have tenant field) ──
    await payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: tpl.nav.map(item => ({
          link: { label: item.label, url: `/sites/${slug}${item.path}` },
        })),
        cta: tpl.id === 'landing'   ? { label: 'Get started', url: `#cta`              }
           : tpl.id === 'portfolio' ? { label: 'Hire me',     url: `/sites/${slug}/contact` }
           : { label: 'Get in touch', url: `/sites/${slug}/contact` },
      } as any,
      ...opts,
    }).catch((e: any) => payload.logger.warn({ err: e, tenant: slug }, '[Seed] header global update skipped'))

    await payload.updateGlobal({
      slug: 'footer',
      data: {
        columns: [
          {
            heading: 'Pages',
            links: tpl.pages
              .filter(p => p !== 'home')
              .map(p => ({
                label: p.charAt(0).toUpperCase() + p.slice(1),
                url: `/sites/${slug}/${p}`,
              })),
          },
        ],
        copyright: `© ${new Date().getFullYear()} ${slug}. Powered by Kiduna Studio.`,
      } as any,
      ...opts,
    }).catch((e: any) => payload.logger.warn({ err: e, tenant: slug }, '[Seed] footer global update skipped'))

    await payload.updateGlobal({
      slug: 'settings',
      data: {
        siteName:        slug,
        siteDescription: `${slug} — ${tpl.tagline}`,
        typography: {
          bodyFont:      tpl.defaults.bodyFont,
          headingFont:   tpl.defaults.headingFont,
          baseFontSize:  '16',
        },
        colors: {
          primary:    tpl.defaults.primaryColor,
          background: tpl.defaults.backgroundColor,
          text:       tpl.defaults.textColor,
        },
      } as any,
      ...opts,
    }).catch((e: any) => payload.logger.warn({ err: e, tenant: slug }, '[Seed] settings global update skipped'))

    payload.logger.info({ tenant: slug, template: templateId }, '[Seed] Template seeded successfully')
  } catch (err) {
    payload.logger.error({ err, tenant: slug, template: templateId }, '[Seed] seedWebsiteTemplate failed')
    throw err
  }
}

// ─── Business Website ─────────────────────────────────────────────────────────

async function seedWebsite(tenantId: string, slug: string, payload: Payload, opts: object) {
  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'Home', slug: 'home', _status: 'published',
    hero: { type: 'highImpact', richText: richText([
      h1(`Welcome to ${slug}`),
      p('We help businesses grow with modern solutions. Tell your AI agent what you need and watch your website come to life.'),
    ]) },
    layout: [],
  } as any, ...opts })

  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'About', slug: 'about', _status: 'published',
    hero: { type: 'lowImpact', richText: richText([h1('About us')]) },
    layout: [{ blockType: 'content', richText: richText([h2('Our story'), p('This is your About page. Ask your AI agent to write your company story, team bios, and values here.')]) }],
  } as any, ...opts })

  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'Services', slug: 'services', _status: 'published',
    hero: { type: 'lowImpact', richText: richText([h1('Our Services')]) },
    layout: [{ blockType: 'callToAction', richText: richText([h2('What we do'), p('Ask your agent to list your services here with descriptions and pricing.')]), links: [{ link: { label: 'Get in touch', url: `/sites/${slug}/contact`, type: 'primary' } }] }],
  } as any, ...opts })

  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'Contact', slug: 'contact', _status: 'published',
    hero: { type: 'lowImpact', richText: richText([h1('Contact us')]) },
    layout: [{ blockType: 'content', richText: richText([p("Reach out and we'll get back to you. Ask your agent to add contact details here.")]) }],
  } as any, ...opts })

  await payload.create({ collection: 'posts', data: {
    tenant: tenantId, title: 'Welcome to our blog', slug: 'welcome',
    _status: 'draft', excerpt: 'This is the first post on the blog. Ask your AI agent to write more.',
    content: richText([p('Your blog starts here. Ask your agent to write posts about your business, industry news, tips, and more.')]),
  } as any, ...opts })
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

async function seedPortfolio(tenantId: string, slug: string, payload: Payload, opts: object) {
  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'Home', slug: 'home', _status: 'published',
    hero: { type: 'highImpact', richText: richText([h1(slug), p('Designer · Developer · Creator'), p('I craft beautiful digital experiences. Ask your agent to personalise this with your name, role, and a short bio.')]) },
    layout: [],
  } as any, ...opts })

  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'Work', slug: 'work', _status: 'published',
    hero: { type: 'lowImpact', richText: richText([h1('Selected work')]) },
    layout: [{ blockType: 'content', richText: richText([p('Ask your agent to add project pages here. Each project becomes a page with a hero image, description, and outcome.')]) }],
  } as any, ...opts })

  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'About', slug: 'about', _status: 'published',
    hero: { type: 'mediumImpact', richText: richText([h1('About me')]) },
    layout: [{ blockType: 'content', richText: richText([h2('Background'), p('Ask your agent to write your bio, skills, experience, and what makes your work unique.')]) }],
  } as any, ...opts })

  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'Contact', slug: 'contact', _status: 'published',
    hero: { type: 'lowImpact', richText: richText([h1("Let's work together")]) },
    layout: [{ blockType: 'content', richText: richText([p('Interested in working together? Ask your agent to add your email and social links here.')]) }],
  } as any, ...opts })

  await payload.create({ collection: 'posts', data: {
    tenant: tenantId, title: 'Brand identity — Acme Corp', slug: 'brand-acme',
    _status: 'draft', excerpt: 'A complete rebrand for a growing startup. Ask your agent to replace this with real project case studies.',
    content: richText([h2('The brief'), p('Client wanted a fresh visual identity. Ask your agent to document your real projects here.')]),
  } as any, ...opts })
}

// ─── Blog / Publication ───────────────────────────────────────────────────────

async function seedBlog(tenantId: string, slug: string, payload: Payload, opts: object) {
  const techCat = await payload.create({
    collection: 'categories',
    data: { tenant: tenantId, title: 'Technology', slug: 'technology' } as any,
    ...opts,
  })

  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'Home', slug: 'home', _status: 'published',
    hero: { type: 'lowImpact', richText: richText([h1(slug), p('Thoughts, ideas, and writing. Ask your agent to customise the tagline.')]) },
    layout: [],
  } as any, ...opts })

  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'About', slug: 'about', _status: 'published',
    hero: { type: 'lowImpact', richText: richText([h1('About this publication')]) },
    layout: [{ blockType: 'content', richText: richText([p('Ask your agent to write about who you are, what you write about, and why.')]) }],
  } as any, ...opts })

  await payload.create({ collection: 'posts', data: {
    tenant: tenantId, title: 'Getting started with AI content creation', slug: 'getting-started-ai',
    _status: 'published', publishedAt: new Date().toISOString(),
    categories: [techCat.id],
    excerpt: 'Learn how to use AI to write, edit, and publish content faster than ever before.',
    content: richText([h2('Why AI for content?'), p('Ask your agent to replace this placeholder with a real article.'), h2('Getting started'), p('Tell your Kiduna Studio agent: "Write a blog post about [topic]" and it will draft, review, and publish with your approval.')]),
  } as any, ...opts })

  await payload.create({ collection: 'posts', data: {
    tenant: tenantId, title: 'How to build a personal brand in 2026', slug: 'personal-brand-2026',
    _status: 'draft', categories: [techCat.id],
    excerpt: 'A step-by-step guide to establishing your online presence.',
    content: richText([p('Draft post — ask your agent to finish this article.')]),
  } as any, ...opts })
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

async function seedLanding(tenantId: string, slug: string, payload: Payload, opts: object) {
  await payload.create({ collection: 'pages', data: {
    tenant: tenantId, title: 'Home', slug: 'home', _status: 'published',
    hero: { type: 'highImpact', richText: richText([
      h1(`${slug} — The smarter way to [do X]`),
      p("Replace this headline with your product's core value proposition. Ask your agent: \"Update my hero headline to [your headline]\""),
    ]) },
    layout: [
      { blockType: 'content', richText: richText([h2('✦ Features'), p('Ask your agent to list 3-5 features here with descriptions.')]) },
      { blockType: 'callToAction', richText: richText([h2('Ready to get started?'), p('Join thousands of users who trust ' + slug + '.')]), links: [{ link: { label: 'Get started free', url: '#signup', type: 'primary' } }, { link: { label: 'Learn more', url: '#features', type: 'secondary' } }] },
      { blockType: 'content', richText: richText([h2('💬 What customers say'), p('"This product changed everything for us." — Ask your agent to add real testimonials.')]) },
      { blockType: 'content', richText: richText([h2('💰 Pricing'), p('Ask your agent to add your pricing tiers here.')]) },
    ],
  } as any, ...opts })
}
