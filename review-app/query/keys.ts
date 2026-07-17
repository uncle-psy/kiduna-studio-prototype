/**
 * Centralised TanStack Query keys. Keeping them in one place makes
 * cache invalidation predictable and refactor-safe.
 */
export const queryKeys = {
  session: ["session"] as const,
  currentUser: ["session", "user"] as const,
} as const;
