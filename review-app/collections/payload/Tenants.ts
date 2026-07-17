import type { CollectionConfig } from 'payload'
import { seedWebsiteTemplate } from '../../payload-hooks/seedWebsiteTemplate'
import { ensureMcpUserForTenant } from '../../payload-mcp/tenantAuth'

const RESERVED_SLUGS = ['www','api','admin','app','studio','mail','smtp',
  'kiduna','static','cdn','assets','preview','staging','sites',
  'help','support','status','blog','docs']

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'slug',
    description: 'One tenant per user website — accessible at /sites/{slug}',
  },
  access: {
    // Provisioning comes from kinship-backend using x-internal-provision header
    create: ({ req }) => {
      const isProvision = req.headers.get?.('x-internal-provision') === process.env.PAYLOAD_PROVISION_SECRET
      const isAdmin = Boolean((req.user as any)?.roles?.includes?.('super-admin'))
      return isProvision || isAdmin
    },
    read: () => true,
    update: ({ req }) => {
      const isProvision = req.headers.get?.('x-internal-provision') === process.env.PAYLOAD_PROVISION_SECRET
      const isAdmin = Boolean((req.user as any)?.roles?.includes?.('super-admin'))
      return isProvision || isAdmin
    },
    delete: ({ req }) => Boolean((req.user as any)?.roles?.includes?.('super-admin')),
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'URL-safe identifier — becomes /sites/{slug}' },
      validate: (val: string | null | undefined) => {
        if (!val) return 'Slug is required'
        if (!/^[a-z0-9-]{3,30}$/.test(val)) return 'Slug must be 3–30 lowercase letters, numbers, or hyphens'
        if (RESERVED_SLUGS.includes(val)) return `"${val}" is a reserved name`
        return true
      },
    },
    {
      name: 'ownerWallet',
      type: 'text',
      required: true,
      admin: { description: 'Solana wallet address of the site owner' },
    },
    {
      name: 'template',
      type: 'select',
      required: true,
      defaultValue: 'website',
      options: [
        { label: 'Business Website',    value: 'website'   },
        { label: 'Creative Portfolio',  value: 'portfolio' },
        { label: 'Blog / Publication',  value: 'blog'      },
        { label: 'Product Landing Page',value: 'landing'   },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'provisioning',
      options: [
        { label: 'Provisioning', value: 'provisioning' },
        { label: 'Active',       value: 'active'       },
        { label: 'Suspended',    value: 'suspended'    },
      ],
    },
    {
      name: 'mcpApiKey',
      type: 'text',
      admin: { readOnly: true, description: 'Auto-generated MCP API key — returned once to kinship-backend' },
    },
    {
      name: 'globalToolAccountId',
      type: 'text',
      admin: { readOnly: true, description: 'GlobalToolAccount ID in kinship-agent-be' },
    },
    {
      name: 'siteUrl',
      type: 'text',
      admin: { readOnly: true },
    },
  ],

  hooks: {
    afterChange: [
      async ({ doc, operation, req, previousDoc }) => {
        if (operation === 'create') {
          // Only seed pages — status/mcpApiKey are set by kinship-backend via PATCH
          // after this hook completes and the transaction commits (avoids NotFound
          // error that occurs when updating the same record within its own afterChange).
          try {
            await seedWebsiteTemplate(doc.id, doc.slug, req.payload, doc.template || 'website', req)
            req.payload.logger.info({ tenant: doc.slug }, '[Tenants] seed complete')
          } catch (err) {
            req.payload.logger.error({ err, tenant: doc.slug }, '[Tenants] seed failed')
          }
          return doc
        }

        const becameActive =
          doc.status === 'active' &&
          doc.mcpApiKey &&
          (previousDoc?.status !== 'active' || !previousDoc?.mcpApiKey)

        if (becameActive) {
          try {
            await ensureMcpUserForTenant(req.payload, doc)
            req.payload.logger.info({ tenant: doc.slug }, '[Tenants] MCP user ready')
          } catch (err) {
            req.payload.logger.error({ err, tenant: doc.slug }, '[Tenants] MCP user setup failed')
          }
        }

        return doc
      },
    ],
  },
}
