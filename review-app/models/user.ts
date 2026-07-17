import { z } from "zod";

/**
 * User shape returned by the backend.
 *
 * The backend frequently returns nullable strings and numbers; we model
 * those explicitly with .nullable() rather than .optional() so we don't
 * silently drop fields when the upstream API explicitly sends `null`.
 *
 * Unknown extra fields from the backend are preserved via `.passthrough()`
 * — we don't want a single new field on the server to start failing logins.
 */
export const UserSchema = z
  .object({
    id: z.string(),
    uuid: z.string(),
    email: z.string().email(),

    name: z.string().nullable(),
    displayName: z.string().nullable(),
    lastName: z.string().nullable(),
    username: z.string().nullable(),

    picture: z.string().url().nullable(),
    banner: z.string().url().nullable(),

    websites: z.unknown().nullable(),
    challenges: z.unknown().nullable(),
    bio: z.string().nullable(),
    telegram: z.string().nullable(),
    sessions: z.unknown().nullable(),
    bluesky: z.string().nullable(),

    subscription: z.string().nullable(),
    wallet: z.string().nullable(),
    referredBy: z.string().nullable(),
    onboardingStep: z.number().int().nullable(),

    createdAt: z.string().nullable(),
    lastLogin: z.string().nullable(),

    profilenft: z.unknown().nullable(),
    role: z.string().nullable(),
    fromBot: z.string().nullable(),
    phone: z.string().nullable(),
    deactivated: z.unknown().nullable(),
    seniority: z.unknown().nullable(),
    symbol: z.string().nullable(),
    link: z.string().nullable(),

    following: z.number().int().nullable(),
    follower: z.number().int().nullable(),

    connectionNft: z.unknown().nullable(),
    connectionBadge: z.unknown().nullable(),
    connection: z.unknown().nullable(),
    isPrivate: z.boolean().nullable(),
    request: z.unknown().nullable(),
    lastActivity: z.string().nullable(),
  })
  .passthrough();

export type User = z.infer<typeof UserSchema>;
