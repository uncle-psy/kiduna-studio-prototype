import crypto from 'crypto'
import type { Payload, PayloadRequest, TypedUser } from 'payload'
import { UnauthorizedError } from 'payload'

type TenantDoc = {
  id: number | string
  slug: string
  ownerWallet?: string | null
  mcpApiKey?: string | null
  status?: string | null
}

type McpAccessSettings = {
  user: TypedUser
  pages?: { find?: boolean; create?: boolean; update?: boolean; delete?: boolean }
  posts?: { find?: boolean; create?: boolean; update?: boolean; delete?: boolean }
  categories?: { find?: boolean; create?: boolean; update?: boolean; delete?: boolean }
  header?: { find?: boolean; update?: boolean }
  footer?: { find?: boolean; update?: boolean }
  settings?: { find?: boolean; update?: boolean }
}

const CMS_USERS = 'cms-users'
const TENANTS = 'tenants'

function mcpServiceEmail(slug: string) {
  return `mcp+${slug}@kiduna.internal`
}

function buildMcpAccessSettings(user: TypedUser): McpAccessSettings {
  return {
    user,
    pages: { find: true, create: true, update: true, delete: true },
    posts: { find: true, create: true, update: true, delete: true },
    categories: { find: true, create: true, update: true, delete: true },
    header: { find: true, update: true },
    footer: { find: true, update: true },
    settings: { find: true, update: true },
  }
}

function asMcpUser(user: Record<string, unknown>): TypedUser {
  return {
    ...user,
    collection: CMS_USERS,
    _strategy: 'mcp-api-key',
  } as unknown as TypedUser
}

function setTenantCookie(req: PayloadRequest, tenantId: number | string) {
  const tenantCookie = `payload-tenant=${tenantId}`
  const existing = req.headers.get?.('cookie') ?? ''

  if (existing.includes('payload-tenant=')) return

  const newCookie = existing ? `${existing}; ${tenantCookie}` : tenantCookie

  if (typeof req.headers.set === 'function') {
    req.headers.set('cookie', newCookie)
    return
  }

  ;(req.headers as unknown as Record<string, string>).cookie = newCookie
}

async function findTenantByMcpKey(payload: Payload, apiKey: string): Promise<TenantDoc | null> {
  const { docs } = await payload.find({
    collection: TENANTS,
    where: {
      and: [
        { mcpApiKey: { equals: apiKey } },
        { status: { equals: 'active' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  return (docs[0] as TenantDoc | undefined) ?? null
}

/**
 * Ensure a cms-user exists for MCP operations scoped to this tenant.
 * Called during site activation and lazily on first MCP request.
 */
export async function ensureMcpUserForTenant(
  payload: Payload,
  tenant: TenantDoc,
): Promise<TypedUser> {
  const email = mcpServiceEmail(tenant.slug)

  const existing = await payload.find({
    collection: CMS_USERS,
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    const user = existing.docs[0] as unknown as Record<string, unknown>
    const tenants = Array.isArray(user.tenants) ? user.tenants : []
    const hasTenant = tenants.some((row) => {
      const value = (row as { tenant?: number | string | { id?: number | string } }).tenant
      const id = typeof value === 'object' && value ? value.id : value
      return String(id) === String(tenant.id)
    })

    if (!hasTenant) {
      const updated = await payload.update({
        collection: CMS_USERS,
        id: user.id as number | string,
        data: {
          tenants: [...tenants, { tenant: Number(tenant.id) }],
        },
        overrideAccess: true,
      })
      return asMcpUser(updated as unknown as Record<string, unknown>)
    }

    return asMcpUser(user)
  }

  const created = await payload.create({
    collection: CMS_USERS,
    data: {
      email,
      password: crypto.randomBytes(32).toString('hex'),
      roles: ['site-manager'],
      tenants: [{ tenant: Number(tenant.id) }],
    },
    overrideAccess: true,
  })

  return asMcpUser(created as unknown as Record<string, unknown>)
}

/**
 * Authenticate MCP requests using per-tenant keys stored on the tenants collection.
 * Falls back to default Payload MCP API keys (payload-mcp-api-keys collection).
 */
export async function resolveTenantMcpAuth(
  req: PayloadRequest,
  getDefaultMcpAccessSettings: (overrideApiKey?: null | string) => Promise<McpAccessSettings>,
): Promise<McpAccessSettings> {
  const authHeader = req.headers.get?.('Authorization') ?? null
  const apiKey = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : null

  if (!apiKey) {
    throw new UnauthorizedError()
  }

  // Admin-created keys in payload-mcp-api-keys still work
  try {
    return await getDefaultMcpAccessSettings(apiKey)
  } catch {
    // Continue to tenant key lookup
  }

  const tenant = await findTenantByMcpKey(req.payload, apiKey)
  if (!tenant) {
    throw new UnauthorizedError()
  }

  const user = await ensureMcpUserForTenant(req.payload, tenant)
  req.user = user
  setTenantCookie(req, tenant.id)

  req.payload.logger.info(
    { tenant: tenant.slug },
    '[payload-mcp] Authenticated tenant MCP key',
  )

  return buildMcpAccessSettings(user)
}
