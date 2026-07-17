"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";
import { FutarchyClient } from "@metadaoproject/futarchy/v0.6";
import { useDaoContext } from "./useDaoContext";
import { useSponsorPubkey } from "./useAnchorProvider";
import { readDaoAmmState, type DaoAmmState } from "./read-dao-amm";

export interface PricePoint {
  time: number;
  passPrice: number;
  failPrice: number;
  /** Normalized pass TWAP (0–1). Present in live snapshots. */
  passTwap?: number;
  /** Normalized fail TWAP (0–1). Present in live snapshots. */
  failTwap?: number;
}

export interface OnchainProposalState {
  found: boolean;
  status: string;
  secondsRemaining: number;
  passPrice: number;
  failPrice: number;
  usdcBalance: number;
  loading: boolean;
  error: string | null;
  openedAt: string | null;
  closesAt: string | null;
  durationHours: number;
  priceHistory: PricePoint[];
  /** Non-null when proposal has been finalized (passed or failed). */
  outcome: "passed" | "failed" | null;
  /** True when the on-chain state is "passed" or "failed". */
  isFinalized: boolean;
  /** True when "passed" — Squads vault transaction can be executed. */
  isExecutable: boolean;
  /** True when trading window has closed but proposal isn't finalized yet. */
  needsFinalize: boolean;
  /** Normalized pass TWAP (0–1 probability). null if TWAP not yet valid. */
  passTwap: number | null;
  /** Normalized fail TWAP (0–1 probability). null if TWAP not yet valid. */
  failTwap: number | null;
  /** Pass threshold from DAO config (basis points). */
  passThresholdBps: number;
  /** Team-sponsored threshold (basis points, can be negative). */
  teamSponsoredPassThresholdBps: number;
  /** Whether the current proposal is team-sponsored. */
  isTeamSponsored: boolean;
  /** Predicted finalize outcome based on TWAP comparison. "unknown" if TWAP not valid. */
  twapPrediction: "pass" | "fail" | "unknown";
}

const INITIAL_STATE: OnchainProposalState = {
  found: false,
  status: "unknown",
  secondsRemaining: 0,
  passPrice: 0.5,
  failPrice: 0.5,
  usdcBalance: 0,
  loading: true,
  error: null,
  openedAt: null,
  closesAt: null,
  durationHours: 24,
  priceHistory: [],
  outcome: null,
  isFinalized: false,
  isExecutable: false,
  needsFinalize: false,
  passTwap: null,
  failTwap: null,
  passThresholdBps: 300,
  teamSponsoredPassThresholdBps: -300,
  isTeamSponsored: false,
  twapPrediction: "unknown",
};

/** Read-only dummy wallet for proposal reading. */
const DUMMY_KEYPAIR = Keypair.generate();
const DUMMY_WALLET = {
  publicKey: DUMMY_KEYPAIR.publicKey,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any) => txs,
};

export interface InitialPrices {
  passPrice?: number;
  failPrice?: number;
  passTwap?: number | null;
  failTwap?: number | null;
}

export function useOnchainProposalState(
  futarchyProposalAddress: string | null | undefined,
  usdcMintAddress: string | null | undefined,
  proposalId?: string,
  initialPrices?: InitialPrices,
  /** Optional DAO address override. When provided, bypasses useDaoContext for the AMM read. */
  daoAddressOverride?: string | null,
): OnchainProposalState & { refresh: () => void } {
  const { connection } = useConnection();
  // Use the FROST custodial wallet (the identity that actually holds the
  // user's USDC), NOT the browser wallet adapter — this app signs via FROST,
  // so useWallet().publicKey is empty/null and the USDC balance read 0.
  const publicKey = useSponsorPubkey();
  const daoCtx = useDaoContext();

  // Resolve effective DAO address: override wins, then context
  const effectiveDaoAddress = daoAddressOverride
    || (daoCtx.ok && daoCtx.ctx ? daoCtx.ctx.dao.toBase58() : null);
  const effectiveDaoLoading = !daoAddressOverride && daoCtx.loading;
  const effectiveDaoOk = !!effectiveDaoAddress;

  const [state, setState] = useState<OnchainProposalState>(() => {
    if (!initialPrices) return INITIAL_STATE;
    const pp = initialPrices.passPrice ?? 0.5;
    const fp = initialPrices.failPrice ?? 0.5;
    return {
      ...INITIAL_STATE,
      passPrice: pp,
      failPrice: fp,
      passTwap: initialPrices.passTwap ?? null,
      failTwap: initialPrices.failTwap ?? null,
    };
  });

  const fetchState = useCallback(async () => {
    // 1. Read USDC balance (needs real wallet)
    let usdcBalance = 0;
    if (publicKey && usdcMintAddress) {
      try {
        const usdcMint = new PublicKey(usdcMintAddress);
        const ata = getAssociatedTokenAddressSync(usdcMint, publicKey);
        const info = await connection.getTokenAccountBalance(ata);
        usdcBalance = Number(info.value.uiAmount ?? 0);
      } catch { usdcBalance = 0; }
    }

    if (!futarchyProposalAddress) {
      console.log("[Proposal] No futarchyProposalAddress — skipping on-chain read");
      setState({ ...INITIAL_STATE, usdcBalance, loading: false, error: "Proposal not submitted on-chain yet" });
      return;
    }

    try {
      console.log("[Proposal] Reading on-chain state for:", futarchyProposalAddress);
      // Read-only provider for proposal data
      const readOnlyProvider = new AnchorProvider(connection, DUMMY_WALLET as any, { commitment: "confirmed" });
      const proposalPk = new PublicKey(futarchyProposalAddress);
      const readOnlyFutarchy = FutarchyClient.createClient({ provider: readOnlyProvider });
      console.log("[Proposal] FutarchyClient created, fetching proposal…");
      const proposalAccount = await readOnlyFutarchy.fetchProposal(proposalPk);

      if (!proposalAccount) {
        console.warn("[Proposal] fetchProposal returned null — proposal not found on-chain");
        setState({ ...INITIAL_STATE, usdcBalance, loading: false, found: false, error: "Proposal not found on-chain" });
        return;
      }
      console.log("[Proposal] Proposal found on-chain. State:", Object.keys(proposalAccount.state)[0]);

      const stateKind = Object.keys(proposalAccount.state)[0] ?? "unknown";
      const durationSec = Number(proposalAccount.durationInSeconds ?? 0);
      const durationHours = Math.round(durationSec / 3600);

      // On-chain timing — raw validator timestamps (for reference/logging)
      const enqueuedTs = Number(proposalAccount.timestampEnqueued ?? 0);
      const rawOpenedAt = enqueuedTs > 0 ? new Date(enqueuedTs * 1000).toISOString() : null;
      const rawClosesAt = enqueuedTs > 0 && durationSec > 0
        ? new Date((enqueuedTs + durationSec) * 1000).toISOString()
        : null;

      let secondsRemaining = 0;
      if (stateKind === "pending" && durationSec > 0 && enqueuedTs > 0) {
        const slot = await connection.getSlot("confirmed");
        const blockTime = await connection.getBlockTime(slot);
        const chainNow = blockTime ?? Math.floor(Date.now() / 1000);
        const elapsed = chainNow - enqueuedTs;
        secondsRemaining = Math.max(0, durationSec - elapsed);
      }

      // Browser-aligned timestamps: on local test validators the block clock
      // can diverge from the browser's system clock. Components like Countdown,
      // MarketTimeline, and TwapCard all use Date.now() to position the "now"
      // marker or compute remaining time. If we feed them raw validator
      // timestamps, they'll show wrong countdowns.
      //
      // Fix: ALWAYS derive openedAt/closesAt relative to the BROWSER clock
      // using the validator-computed secondsRemaining as the bridge.
      // When secondsRemaining=0: closesAt=now (shows "Closed")
      // When secondsRemaining>0: closesAt=now+remaining (correct countdown)
      let openedAt = rawOpenedAt;
      let closesAt = rawClosesAt;
      if (durationSec > 0 && enqueuedTs > 0) {
        const browserClosesMs = Date.now() + secondsRemaining * 1000;
        const browserOpenedMs = browserClosesMs - durationSec * 1000;
        closesAt = new Date(browserClosesMs).toISOString();
        openedAt = new Date(browserOpenedMs).toISOString();
      }

      // 2. Read prices from the DAO's embedded AMM (not separate pool accounts)
      let passPrice = 0.5;
      let failPrice = 0.5;
      let passTwap: number | null = null;
      let failTwap: number | null = null;
      let passThresholdBps = 300;
      let teamSponsoredPassThresholdBps = -300;
      let isTeamSponsored = false;
      let twapPrediction: "pass" | "fail" | "unknown" = "unknown";
      let dbHistory: PricePoint[] = [];

      // Read isTeamSponsored from the proposal account
      const acct = proposalAccount as any;
      if (acct.isTeamSponsored !== undefined) {
        isTeamSponsored = !!acct.isTeamSponsored;
      }

      // Try reading on-chain AMM prices from the DAO account's embedded AMM
      let ammReadSucceeded = false;
      if (effectiveDaoOk && effectiveDaoAddress) {
        try {
          const ammState = await readDaoAmmState(
            connection,
            new PublicKey(effectiveDaoAddress),
            isTeamSponsored,
          );

          if (ammState && ammState.isFutarchy) {
            passPrice = ammState.passPrice;
            failPrice = ammState.failPrice;
            passTwap = ammState.passTwapNorm;
            failTwap = ammState.failTwapNorm;
            passThresholdBps = ammState.passThresholdBps;
            teamSponsoredPassThresholdBps = ammState.teamSponsoredPassThresholdBps;
            twapPrediction = ammState.twapPrediction;
            ammReadSucceeded = true;
          } else if (ammState && !ammState.isFutarchy) {
            // Spot mode — no active proposal. Show spot price only.
            passPrice = 0.5;
            failPrice = 0.5;
            ammReadSucceeded = true;
          }
        } catch (err) {
          console.warn("[Proposal] DAO AMM read failed:", err);
        }
      }

      // On-chain AMM is the only source of truth.
      // No DB fallback — if on-chain read didn't produce results,
      // prices stay at 0.5/0.5 until the next poll succeeds.

      // If AMM read didn't succeed: either DAO context isn't ready yet,
      // or DAO addresses are missing. Don't set loading=false with stale
      // 0.5/0.5 — keep the loader visible until we have real data.
      if (!ammReadSucceeded) {
        // DAO context is still loading — wait for it
        if (effectiveDaoLoading) return;
        // DAO context loaded but addresses are missing — no AMM possible.
        // Only then show the default state (proposal found but no prices).
        if (!effectiveDaoOk) {
          setState({
            found: true, status: stateKind, secondsRemaining,
            passPrice: 0.5, failPrice: 0.5, usdcBalance, loading: false,
            error: "DAO not configured — no AMM prices available",
            openedAt, closesAt, durationHours,
            priceHistory: [],
            outcome: stateKind === "passed" || stateKind === "failed" ? (stateKind as "passed" | "failed") : null,
            isFinalized: stateKind === "passed" || stateKind === "failed",
            isExecutable: stateKind === "passed",
            needsFinalize: stateKind === "pending" && secondsRemaining <= 0 && durationSec > 0 && enqueuedTs > 0,
            passTwap: null, failTwap: null,
            passThresholdBps, teamSponsoredPassThresholdBps,
            isTeamSponsored, twapPrediction: "unknown",
          });
          return;
        }
        // DAO context is ok but AMM read failed — retry on next poll
        return;
      }

      const isFinalized = stateKind === "passed" || stateKind === "failed";
      const outcome: "passed" | "failed" | null = isFinalized
        ? (stateKind as "passed" | "failed")
        : null;
      const isExecutable = stateKind === "passed";
      const needsFinalize =
        stateKind === "pending" && secondsRemaining <= 0 && durationSec > 0 && enqueuedTs > 0;

      setState({
        found: true, status: stateKind, secondsRemaining,
        passPrice, failPrice, usdcBalance, loading: false, error: null,
        openedAt, closesAt, durationHours,
        priceHistory: dbHistory,
        outcome, isFinalized, isExecutable, needsFinalize,
        passTwap, failTwap,
        passThresholdBps, teamSponsoredPassThresholdBps,
        isTeamSponsored, twapPrediction,
      });
    } catch (err) {
      console.error("[Proposal] ❌ On-chain state read FAILED:", err);
      console.error("[Proposal] Error message:", (err as Error).message);
      console.error("[Proposal] futarchyProposalAddress was:", futarchyProposalAddress);
      setState({ ...INITIAL_STATE, usdcBalance, loading: false, error: (err as Error).message });
    }
  }, [futarchyProposalAddress, usdcMintAddress, proposalId, connection, publicKey, effectiveDaoAddress, effectiveDaoLoading, effectiveDaoOk]);

  // ── TWAP snapshot accumulation ───────────────────────────────────
  // Accumulate TWAP/price snapshots from each poll/subscription callback.
  // These build the live chart data that supplements the DB history.
  const twapSnapshotsRef = useRef<PricePoint[]>([]);

  useEffect(() => {
    // After each state update with valid prices, record a snapshot
    if (
      state.found &&
      !state.loading &&
      state.passPrice !== 0.5 &&
      state.status === "pending"
    ) {
      const now = Date.now();
      const lastSnapshot = twapSnapshotsRef.current[twapSnapshotsRef.current.length - 1];
      // Dedupe: only add if at least 5 seconds since last snapshot
      if (!lastSnapshot || now - lastSnapshot.time > 5_000) {
        twapSnapshotsRef.current.push({
          time: now,
          passPrice: state.passPrice,
          failPrice: state.failPrice,
          passTwap: state.passTwap ?? undefined,
          failTwap: state.failTwap ?? undefined,
        });
        // Keep max 500 snapshots to avoid unbounded growth
        if (twapSnapshotsRef.current.length > 500) {
          twapSnapshotsRef.current = twapSnapshotsRef.current.slice(-400);
        }
      }
    }
  }, [state.found, state.loading, state.passPrice, state.failPrice, state.status]);

  // Merge DB history + live snapshots for the chart
  const mergedHistory = useMemo(() => {
    const db = state.priceHistory;
    const live = twapSnapshotsRef.current;
    if (live.length === 0) return db;
    if (db.length === 0) return [...live];
    // Only append live snapshots that are newer than the last DB point
    const lastDbTime = db[db.length - 1].time;
    const newLive = live.filter((p) => p.time > lastDbTime);
    return [...db, ...newLive];
  }, [state.priceHistory, state.passPrice]); // re-merge when prices change

  // Stop polling when proposal trading window is closed
  const isClosed = state.status === "pending" && state.secondsRemaining <= 0 && !state.loading && state.found;

  // ── Solana account subscription + fallback polling ──────────────
  useEffect(() => {
    // Initial fetch
    fetchState();

    if (isClosed) return;

    // Try subscribing to the DAO account for real-time updates.
    // On each account change, trigger a full fetchState().
    let subscriptionId: number | null = null;
    const daoAddress = effectiveDaoAddress ? new PublicKey(effectiveDaoAddress) : null;

    if (daoAddress) {
      try {
        subscriptionId = connection.onAccountChange(
          daoAddress,
          () => {
            // DAO account changed (swap happened, TWAP updated, etc.)
            // Trigger a full re-read via the existing fetchState logic.
            fetchState();
          },
          "confirmed",
        );
      } catch {
        // Subscription not supported (e.g., some RPC providers)
        subscriptionId = null;
      }
    }

    // Fallback polling: 15 seconds if no subscription, 30 seconds if subscription active.
    // The subscription handles most updates; polling catches anything missed.
    const pollInterval = subscriptionId !== null ? 30_000 : 15_000;
    const interval = setInterval(fetchState, pollInterval);

    return () => {
      clearInterval(interval);
      if (subscriptionId !== null) {
        connection.removeAccountChangeListener(subscriptionId).catch(() => {});
      }
    };
  }, [fetchState, isClosed, connection, effectiveDaoAddress]);

  return {
    ...state,
    priceHistory: mergedHistory,
    refresh: fetchState,
  };
}