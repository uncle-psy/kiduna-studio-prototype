/**
 * Auth middleware.
 *
 * Every protected route extracts the JWT from `Authorization: Bearer <jwt>`,
 * calls the external login service at $LOGIN_SERVICE_URL/is-auth, and
 * resolves the canonical `wallet` from the response.
 *
 * /is-auth is called on every request, but cached for 30s in an in-process
 * LRU. The cache key is the bearer token itself — different tokens get
 * different cache slots, so revoking a token (issuing a new one) takes
 * effect within 30s without explicit invalidation.
 *
 * Usage in a route handler:
 *
 *   export async function GET(req: NextRequest) {
 *     const { wallet } = await requireAuth(req);
 *     // ... wallet is now safe to use
 *   }
 *
 * Or for optional auth (public endpoints that adapt for logged-in users):
 *
 *   const auth = await getAuth(req);   // returns null if no/invalid token
 */
import { LRUCache } from "lru-cache";
import { NextRequest } from "next/server";
import { ApiError } from "./errors";

const LOGIN_SERVICE_URL =
  process.env.LOGIN_SERVICE_URL ??
  process.env.NEXT_PUBLIC_AUTH_API_URL ??
  "http://localhost:6050";
const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 5_000;

export interface AuthContext {
  wallet: string;
  userId: string; // external user uuid
  email: string | null;
  role: string | null;
  subscriptionTier: string | null;
}

const cache = new LRUCache<string, AuthContext>({
  max: CACHE_MAX,
  ttl: CACHE_TTL_MS,
});

interface IsAuthResponse {
  data?: {
    is_auth?: boolean;
    user?: {
      uuid?: string;
      ID?: string;
      id?: string;
      wallet?: string;
      email?: string | null;
      role?: string | null;
      subscriptionTier?: string | null;
    };
  };
}

function extractToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function verifyToken(token: string): Promise<AuthContext | null> {
  const cached = cache.get(token);
  if (cached) return cached;

  let res: Response;
  try {
    res = await fetch(`${LOGIN_SERVICE_URL.replace(/\/$/, "")}/is-auth`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      // Short timeout; auth shouldn't hold up real requests.
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let payload: IsAuthResponse;
  try {
    payload = (await res.json()) as IsAuthResponse;
  } catch {
    return null;
  }

  const user = payload.data?.user;
  console.log("[verifyToken] LOGIN_SERVICE_URL:", LOGIN_SERVICE_URL);
  console.log("[verifyToken] full user:", JSON.stringify(user, null, 2));
  if (!payload.data?.is_auth || !user?.wallet) return null;

  const ctx: AuthContext = {
    wallet: user.wallet,
    userId: user.uuid ?? user.id ?? user.ID ?? user.wallet,
    email: user.email ?? null,
    role: user.role ?? null,
    subscriptionTier: user.subscriptionTier ?? null,
  };
  cache.set(token, ctx);
  return ctx;
}

/** Optional auth. Returns null if no token or token invalid. */
export async function getAuth(req: NextRequest): Promise<AuthContext | null> {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}

/** Required auth. Throws 401 if no token or token invalid. */
export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const ctx = await getAuth(req);
  if (!ctx) {
    throw new ApiError("UNAUTHORIZED", "Authentication required");
  }
  return ctx;
}
