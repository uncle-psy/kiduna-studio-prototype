/**
 * Market role-based permission helpers.
 *
 * Role comes from the invitation code:
 *   - Code with role "admin" → MarketMember.role = "admin" → full access
 *   - Code with role "member" → MarketMember.role = "member" → vote only
 *   - Market.sponsorWallet → always full access (no code needed)
 */
import { prisma } from "@/server/prisma";
import { ApiError } from "@/server/errors";

interface MarketAccess {
  marketId: string;
  wallet: string;
  role: "sponsor" | "admin" | "member";
}

/**
 * Verify the wallet has admin-level access to the market.
 * Passes for: original sponsor OR MarketMember with role="admin".
 * Rejects: MarketMember with role="member" or non-members.
 */
export async function requireMarketAdmin(
  slug: string,
  wallet: string,
): Promise<MarketAccess> {
  const market = await prisma.market.findUnique({
    where: { slug, deactivatedAt: null },
    select: { id: true, sponsorWallet: true },
  });

  if (!market) throw new ApiError("NOT_FOUND", "Market not found");

  // Original sponsor always has full access
  if (market.sponsorWallet === wallet) {
    return { marketId: market.id, wallet, role: "sponsor" };
  }

  // Check MarketMember.role (set during code redemption)
  const member = await prisma.marketMember.findFirst({
    where: { marketId: market.id, wallet, removedAt: null },
    select: { role: true },
  });

  if (!member) {
    throw new ApiError("FORBIDDEN", "You are not a member of this market");
  }

  if (member.role === "admin") {
    return { marketId: market.id, wallet, role: "admin" };
  }

  throw new ApiError(
    "FORBIDDEN",
    "Admin access required. Members can only vote on proposals.",
  );
}