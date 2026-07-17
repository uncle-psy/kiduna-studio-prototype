import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import path from 'path'
import { fileURLToPath } from 'url'

// Collections
import { Tenants }    from './collections/payload/Tenants'
import { CmsUsers }   from './collections/payload/CmsUsers'
import { Posts }      from './collections/payload/Posts'
import { Pages }      from './collections/payload/Pages'
import { Categories } from './collections/payload/Categories'
import { Media }      from './collections/payload/Media'

// Globals
import { Header }   from './globals/payload/Header'
import { Footer }   from './globals/payload/Footer'
import { Settings } from './globals/payload/Settings'
import { resolveTenantMcpAuth } from './payload-mcp/tenantAuth'

const filename = fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)

export default buildConfig({
  admin: {
    user:        CmsUsers.slug,
    importMap:   { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: '— Kiduna Studio CMS',
    },
  },

  collections: [
    Tenants,
    CmsUsers,
    Posts,
    Pages,
    Categories,
    Media,
  ],

  globals: [
    Header,
    Footer,
    Settings,
  ],

  editor: lexicalEditor(),

  db: postgresAdapter({
    pool: {
      connectionString: process.env.PAYLOAD_DATABASE_URI ||
        process.env.DATABASE_URI ||
        'postgresql://postgres:postgres@localhost:5432/kiduna_payload',
    },
    // In development push schema changes directly (no migration files needed)
    push: process.env.NODE_ENV !== 'production',
  }),

  secret: process.env.PAYLOAD_SECRET || 'change-me-payload-secret-32-chars',

  serverURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  plugins: [
    multiTenantPlugin({
      tenantsCollectionSlug: 'tenants',
      tenantField: { name: 'tenant' },
      collections: {
        posts:      { isGlobal: false },
        pages:      { isGlobal: false },
        categories: { isGlobal: false },
        media:      { isGlobal: false },
      },
      globals: {
        header:   { isGlobal: true },
        footer:   { isGlobal: true },
        settings: { isGlobal: true },
      },
      useTenantsCollectionAccess: true,
      usersCollectionSlug: CmsUsers.slug,
    } as any),

    mcpPlugin({
      collections: {
        posts:      { enabled: true },
        pages:      { enabled: true },
        categories: { enabled: true },
        media:      { enabled: false },
      },
      globals: {
        header:   { enabled: true },
        footer:   { enabled: true },
        settings: { enabled: true },
      },
      // Site provisioning stores MCP keys on tenants.mcpApiKey — bridge them here
      overrideAuth: resolveTenantMcpAuth,
      mcp: {
        handlerOptions: {
          verboseLogs: process.env.NODE_ENV !== 'production',
        },
      },
    } as any),
  ],
})
