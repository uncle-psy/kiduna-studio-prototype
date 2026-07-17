/**
 * Permission helpers.
 *
 * Tier hierarchy (higher = more access):
 *   guest(0) < member(1) < founder(2) < builder(3) < sponsor(4) < catalyst(5) < luminary(6)
 *
 * A user with a higher tier inherits all permissions of lower tiers.
 * e.g. a Catalyst can do everything a Sponsor can, plus more.
 *
 * Member status checks both tier-level access and the MarketMember table.
 */
import { ApiError } from "./errors";
import { prisma } from "./prisma";
import type { AuthContext } from "./auth";
import { hasMinTier } from "@/lib/tier-utils"; 

/**
 * True if the user's tier is at least "sponsor" (sponsor, catalyst, or luminary).
 */
export function isSponsor(auth: AuthContext): boolean {
  return hasMinTier(auth.subscriptionTier, "sponsor");
}

/**
 * True if the user's tier is at least "founder" (founder, builder, sponsor, catalyst, or luminary).
 */
export function isFounder(auth: AuthContext): boolean {
  return hasMinTier(auth.subscriptionTier, "founder");
}

/**
 * True if the user's tier is at least "builder" (builder, sponsor, catalyst, or luminary).
 */
export function isBuilder(auth: AuthContext): boolean {
  return hasMinTier(auth.subscriptionTier, "builder");
}

/**
 * True if the user is at least sponsor-tier OR has an active membership in the Market.
 */
export async function isMember(
  marketSlug: string,
  auth: AuthContext,
): Promise<boolean> {
  // Sponsors (and above) have access to all Markets.
  if (isSponsor(auth)) return true;

  const m = await prisma.market.findUnique({
    where: { slug: marketSlug },
    select: { id: true },
  });
  if (!m) return false;

  const member = await prisma.marketMember.findFirst({
    where: { marketId: m.id, wallet: auth.wallet, removedAt: null },
    select: { id: true },
  });
  return !!member;
}

/** Throw 403 if the caller's tier is below sponsor. */
export async function requireSponsor(
  _marketSlug: string,
  auth: AuthContext,
): Promise<void> {
  if (!isSponsor(auth)) {
    throw new ApiError("FORBIDDEN", "Sponsor tier or above required");
  }
}

/** Throw 403 if the caller's tier is below founder. */
export async function requireFounder(
  auth: AuthContext,
): Promise<void> {
  if (!isFounder(auth)) {
    throw new ApiError("FORBIDDEN", "Founder tier or above required");
  }
}

/** Throw 403 if the caller's tier is below builder. */
export async function requireBuilder(
  auth: AuthContext,
): Promise<void> {
  if (!isBuilder(auth)) {
    throw new ApiError("FORBIDDEN", "Builder tier or above required");
  }
}

/** Throw 403 if the caller isn't a member of this Market. */
export async function requireMember(
  marketSlug: string,
  auth: AuthContext,
): Promise<void> {
  if (!(await isMember(marketSlug, auth))) {
    throw new ApiError("FORBIDDEN", "Market membership required");
  }
}
