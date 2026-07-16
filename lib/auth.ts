import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { sqlClient } from "@/db";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "kiduna_prototype_session";
const SESSION_DAYS = 30;

export type AccountPersona = { id: string; name: string; handle: string; initials: string; role: string; isDefault: boolean };
export type CurrentAccount = { id: string; name: string; handle: string; email: string; lineage: string[]; personas: AccountPersona[]; arrival: null | { inviterName: string; trustLevel: string; contextSummary: string; purpose: string } };

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, digest] = encoded.split(":");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createSession(userId: string) {
  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await sqlClient`insert into prototype_sessions (id, user_id, expires_at) values (${tokenHash(token)}, ${userId}, ${expiresAt.toISOString()}::timestamptz)`;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sqlClient`delete from prototype_sessions where id = ${tokenHash(token)}`;
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentAccount(): Promise<CurrentAccount | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [user] = await sqlClient<{ id: string; name: string; handle: string; email: string; lineage: string[] }[]>`
    select u.id, u.name, u.handle, u.email, u.lineage
    from prototype_sessions s join prototype_users u on u.id = s.user_id
    where s.id = ${tokenHash(token)} and s.expires_at > now()
      and u.status = 'active' and u.email_verified_at is not null
    limit 1
  `;
  if (!user) return null;
  const personas = await sqlClient<AccountPersona[]>`
    select id, name, handle, initials, role, is_default as "isDefault"
    from prototype_personas where user_id = ${user.id}
    order by is_default desc, created_at asc
  `;
  const [arrival] = await sqlClient<{ inviterName: string; trustLevel: string; contextSummary: string; purpose: string }[]>`
    select inviter.name as "inviterName", code.trust_level as "trustLevel", code.context_summary as "contextSummary", code.purpose
    from prototype_users member join prototype_kinship_codes code on code.id = member.invited_by_code_id
      join prototype_users inviter on inviter.id = code.issuer_user_id where member.id = ${user.id} limit 1
  `;
  return { ...user, lineage: user.lineage ?? [], personas, arrival: arrival ?? null };
}

export function initialsFor(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ME";
}

export function handleFor(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "member";
}
