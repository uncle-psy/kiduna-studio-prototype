"use client";

/**
 * Market Create Wizard — shared state context.
 *
 * Holds tokenConfig values across wizard steps (Step 1 → Step 4).
 * Data lives in React state during the session. The save() method
 * persists tokenConfig to the Market row via PATCH /v1/markets/{slug}.
 *
 * Follows the same pattern as ProposalDraftContext — in-memory state,
 * explicit save, reset on completion.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getToken, getSessionToken } from "@/lib/auth";

// ── Token Config Shape ──────────────────────────────────────────────

export interface VestingRecipient {
  id: string;
  wallet: string;
  pct: number;
}

export interface TokenConfig {
  // Card 1 — Token Identity
  mode: "new" | "existing";
  tokenName: string;
  ticker: string;
  decimals: number;
  totalSupply: number;
  description: string;
  metadataUri: string;
  existingMint: string;
  // Existing token on-chain data (populated by RPC validation)
  existingMintValidated: boolean;
  existingMintAuthorityHeld: boolean;
  existingMetadataAuthorityHeld: boolean;

  // Card 2 — Raise Target
  minRaise: number;
  maxRaise: number;
  launchPeriodDays: number;

  // Card 3 — Premine & Distribution (base token %)
  icoPct: number;
  teamAllocPct: number;
  poolPct: number;
  futarchyPct: number;

  // USDC Budget Split
  usdcPoolPct: number;
  usdcTreasuryPct: number;
  usdcFutarchyPct: number;

  // Card 4 — Spending Limit
  spendingLimitEnabled: boolean;
  monthlyLimitUsdc: number;
  authorizedSpenders: string[];

  // Card 5 — Vesting
  lockupMonths: number;
  vestingStyle: string;
  recipients: VestingRecipient[];

  // Card 7 — Bid Wall
  enableBidWall: boolean;
}

const INITIAL_TOKEN_CONFIG: TokenConfig = {
  // Card 1
  mode: "new",
  tokenName: "",
  ticker: "",
  decimals: 9,
  totalSupply: 0,
  description: "",
  metadataUri: "",
  existingMint: "",
  existingMintValidated: false,
  existingMintAuthorityHeld: false,
  existingMetadataAuthorityHeld: false,

  // Card 2
  minRaise: 0,
  maxRaise: 0,
  launchPeriodDays: 7,

  // Card 3
  icoPct: 60,
  teamAllocPct: 20,
  poolPct: 15,
  futarchyPct: 5,

  // USDC split
  usdcPoolPct: 15,
  usdcTreasuryPct: 77,
  usdcFutarchyPct: 8,

  // Card 4
  spendingLimitEnabled: false,
  monthlyLimitUsdc: 0,
  authorizedSpenders: [],

  // Card 5
  lockupMonths: 18,
  vestingStyle: "cliff_linear",
  recipients: [{ id: "r1", wallet: "", pct: 100 }],

  // Card 7
  enableBidWall: false,
};

// ── Context Shape ───────────────────────────────────────────────────

interface MarketCreateContextShape {
  tokenConfig: TokenConfig;
  updateTokenConfig: (partial: Partial<TokenConfig>) => void;
  resetTokenConfig: () => void;

  /**
   * Persist the current tokenConfig to the Market row in the database.
   * Requires the market slug — set when the market draft was created.
   */
  saveTokenConfig: (slug: string) => Promise<void>;

  /** True while saveTokenConfig is in-flight. */
  saving: boolean;

  /** Error from the last saveTokenConfig call, or null. */
  saveError: string | null;
}

const Ctx = createContext<MarketCreateContextShape | null>(null);

// ── Provider ────────────────────────────────────────────────────────

export function MarketCreateProvider({ children }: { children: ReactNode }) {
  const [tokenConfig, setTokenConfig] = useState<TokenConfig>(INITIAL_TOKEN_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateTokenConfig = useCallback((partial: Partial<TokenConfig>) => {
    setTokenConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetTokenConfig = useCallback(() => {
    setTokenConfig(INITIAL_TOKEN_CONFIG);
  }, []);

  const saveTokenConfig = useCallback(
    async (slug: string) => {
      setSaving(true);
      setSaveError(null);

      try {
        const token = getToken() || getSessionToken();
        if (!token) throw new Error("Authentication required");

        const res = await fetch(`/api/v1/markets/${slug}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tokenTicker: tokenConfig.ticker || undefined,
            tokenConfig: {
              mode: tokenConfig.mode,
              tokenName: tokenConfig.tokenName,
              ticker: tokenConfig.ticker,
              decimals: tokenConfig.decimals,
              totalSupply: tokenConfig.totalSupply,
              description: tokenConfig.description,
              metadataUri: tokenConfig.metadataUri || undefined,
              existingMint: tokenConfig.mode === "existing" ? tokenConfig.existingMint : undefined,
              minRaise: tokenConfig.minRaise,
              maxRaise: tokenConfig.maxRaise,
              launchPeriodDays: tokenConfig.launchPeriodDays,
              teamAllocPct: tokenConfig.teamAllocPct,
              treasuryReservePct: 0, // derived from remaining after other allocations
              poolPct: tokenConfig.poolPct,
              futarchyPct: tokenConfig.futarchyPct,
              usdcPoolPct: tokenConfig.usdcPoolPct,
              usdcTreasuryPct: tokenConfig.usdcTreasuryPct,
              usdcFutarchyPct: tokenConfig.usdcFutarchyPct,
              monthlyLimitUsdc: tokenConfig.monthlyLimitUsdc,
              cooldownHours: 24,
              lockupMonths: tokenConfig.lockupMonths,
              vestingStyle: tokenConfig.vestingStyle,
              recipients: tokenConfig.recipients,
              enableBidWall: tokenConfig.enableBidWall,
            },
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `Save failed (${res.status})`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save token config";
        setSaveError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [tokenConfig],
  );

  const value = useMemo<MarketCreateContextShape>(
    () => ({
      tokenConfig,
      updateTokenConfig,
      resetTokenConfig,
      saveTokenConfig,
      saving,
      saveError,
    }),
    [tokenConfig, updateTokenConfig, resetTokenConfig, saveTokenConfig, saving, saveError],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useMarketCreate(): MarketCreateContextShape {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useMarketCreate must be used inside <MarketCreateProvider>");
  }
  return v;
}