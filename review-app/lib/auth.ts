/**
 * Session persistence: cookie (so middleware can read on the server)
 * and localStorage (so the client can hydrate quickly).
 *
 * Network logic lives in src/api/. This file is just plumbing.
 */
import { SessionSchema, type Session } from "@/models/auth";

const TOKEN_COOKIE = "kinship_token";
const SESSION_KEY = "kinship_session";

// --- cookie helpers (client-side) ---
function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1]);
}

// --- public API ---

export function persistSession(session: Session) {
  // Validate before persisting — we never want a bad session in storage.
  const parsed = SessionSchema.parse(session);
  setCookie(TOKEN_COOKIE, parsed.token);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
    } catch {
      // ignore quota errors
    }
  }
}

export function clearSession() {
  deleteCookie(TOKEN_COOKIE);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }
}

export function getToken(): string | null {
  return readCookie(TOKEN_COOKIE);
}

export function getSessionToken(): string | null {
  return localStorage.getItem("token");
}

/**
 * Read and validate the persisted session. Returns null if nothing is
 * stored or if the stored data is corrupt / fails validation.
 */
export function getStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = SessionSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    // Stored data is corrupt — wipe it so the user is prompted to log in fresh.
    clearSession();
    return null;
  } catch {
    clearSession();
    return null;
  }
}
