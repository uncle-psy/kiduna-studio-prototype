"use client";

/**
 * StakingPanel — displays staking progress for non-team-sponsored proposals.
 *
 * The futarchy program requires `base_to_stake` tokens to be staked before
 * a non-team-sponsored proposal can launch. This component:
 *   - Shows current staked amount vs required threshold
 *   - Allows connected users to stake base tokens
 *   - Calls futarchy.stakeToProposalIx()
 *
 * Currently all v1 proposals are team-sponsored (staking is skipped).
 * This component activates when community-authored proposals are enabled.
 *
 * Place at: components/proposal-detail/StakingPanel.tsx
 */

import { useState, useEffect, useCallback } from "react";
import { PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { Icon } from "@iconify/react";
import { useFutarchy } from "@/lib/onchain/useFutarchy";
import { useSponsorPubkey } from "@/lib/onchain/useAnchorProvider";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { getPriorityFeeForIxs } from "@/lib/priority-fee";
import BN from "bn.js";

interface StakingPanelProps {
  /** The futarchy proposal address (on-chain). */
  futarchyProposalAddress: string | null;
  /** Whether the proposal is team-sponsored (hides this panel). */
  isTeamSponsored: boolean;
  /** Current proposal on-chain status. */
  proposalStatus: string;
  /** Callback when staking reaches threshold — enables launch. */
  onThresholdReached?: () => void;
}

export function StakingPanel({
  futarchyProposalAddress,
  isTeamSponsored,
  proposalStatus,
  onThresholdReached,
}: StakingPanelProps) {
  const { connection } = useConnection();
  const publicKey = useSponsorPubkey();
  const connected = !!publicKey;
  const futarchy = useFutarchy();
  const daoCtx = useDaoContext();

  const [amountStaked, setAmountStaked] = useState<number>(0);
  const [baseToStake, setBaseToStake] = useState<number>(0);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [stakeAmount, setStakeAmount] = useState("");
  const [staking, setStaking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Don't show for team-sponsored proposals or non-draft states
  const shouldShow =
    !isTeamSponsored &&
    proposalStatus === "draft" &&
    futarchyProposalAddress;

  // ── Load staking data ──────────────────────────────────────────
  useEffect(() => {
    if (!shouldShow || !futarchy || !daoCtx.ok || !daoCtx.ctx) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        // Read DAO config for base_to_stake threshold
        const dao = await futarchy.getDao(daoCtx.ctx!.dao);
        if (cancelled) return;
        const threshold = typeof dao.baseToStake === "number"
          ? dao.baseToStake
          : new BN(dao.baseToStake?.toString() ?? "0").toNumber();
        setBaseToStake(threshold);

        // Read proposal account for current staked amount
        const proposal = await futarchy.fetchProposal(new PublicKey(futarchyProposalAddress!));
        if (cancelled) return;
        if (proposal) {
          const state = proposal.state as any;
          if (state.draft && typeof state.draft.amountStaked !== "undefined") {
            const staked = typeof state.draft.amountStaked === "number"
              ? state.draft.amountStaked
              : new BN(state.draft.amountStaked?.toString() ?? "0").toNumber();
            setAmountStaked(staked);
          }
        }

        // Read user's base token balance
        if (publicKey && daoCtx.ctx!.baseMint) {
          try {
            const ata = getAssociatedTokenAddressSync(daoCtx.ctx!.baseMint, publicKey);
            const info = await connection.getTokenAccountBalance(ata);
            setUserBalance(Number(info.value.amount ?? "0"));
          } catch { setUserBalance(0); }
        }
      } catch (err) {
        console.warn("[StakingPanel] Failed to load staking data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [shouldShow, futarchy, daoCtx, futarchyProposalAddress, connection, publicKey]);

  // ── Stake handler ──────────────────────────────────────────────
  const handleStake = useCallback(async () => {
    if (!connected || !publicKey) { setResult({ success: false, message: "Please sign in to stake." }); return; }
    if (!futarchy || !daoCtx.ok || !daoCtx.ctx || !futarchyProposalAddress) return;

    const raw = parseInt(stakeAmount, 10);
    if (!raw || raw <= 0) {
      setResult({ success: false, message: "Enter a valid amount to stake." });
      return;
    }

    setStaking(true);
    setResult(null);

    try {
      const proposalPk = new PublicKey(futarchyProposalAddress);
      const ix = await futarchy
        .stakeToProposalIx({
          proposal: proposalPk,
          dao: daoCtx.ctx.dao,
          baseMint: daoCtx.ctx.baseMint!,
          amount: new BN(raw),
        })
        .instruction();

      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([ix], "High") }));
      tx.add(ix);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = publicKey;

      const sig = await futarchy.futarchy.provider.sendAndConfirm!(tx, [], {
        commitment: "confirmed",
      });

      const newStaked = amountStaked + raw;
      setAmountStaked(newStaked);
      setStakeAmount("");
      setResult({ success: true, message: `Staked ${raw} tokens. (tx: ${sig.slice(0, 8)}…)` });

      if (newStaked >= baseToStake && onThresholdReached) {
        onThresholdReached();
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Staking failed",
      });
    } finally {
      setStaking(false);
    }
  }, [
    connected, publicKey, futarchy, daoCtx,
    futarchyProposalAddress, stakeAmount, amountStaked,
    baseToStake, connection, onThresholdReached,
  ]);

  if (!shouldShow) return null;

  const progress = baseToStake > 0 ? Math.min(1, amountStaked / baseToStake) : 0;
  const thresholdReached = amountStaked >= baseToStake;

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon icon="lucide:lock" width={18} height={18} className="text-amber-400" />
        <h3 className="text-white font-bold text-sm">Staking required to launch</h3>
      </div>

      <p className="text-xs text-muted mb-4">
        This proposal needs community backing before it can launch. Stake base tokens to show support.
        Once the threshold is reached, the proposal can be launched.
      </p>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-mono text-muted mb-1">
          <span>{amountStaked.toLocaleString()} staked</span>
          <span>{baseToStake.toLocaleString()} required</span>
        </div>
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress * 100}%`,
              background: thresholdReached
                ? "var(--pass, #10b981)"
                : "var(--accent, #6366f1)",
            }}
          />
        </div>
        <div className="text-right text-[10px] font-mono text-muted mt-0.5">
          {(progress * 100).toFixed(1)}%
        </div>
      </div>

      {/* Threshold reached */}
      {thresholdReached && (
        <div className="p-3 rounded-xl bg-green-500/[0.06] border border-green-500/20 mb-3 text-center">
          <span className="text-sm font-semibold text-green-400">Threshold reached — ready to launch</span>
        </div>
      )}

      {/* Stake input */}
      {!thresholdReached && !loading && (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="1"
            placeholder="Amount to stake"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            disabled={staking}
            className="flex-1 px-3 py-2 rounded-xl text-sm bg-input border border-card-border text-foreground outline-none focus:border-accent/50 font-mono"
          />
          <button
            onClick={handleStake}
            disabled={staking || !connected}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer
              bg-accent/12 border-accent/35 text-accent
              ${staking ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/20"}`}
          >
            {staking ? "Staking…" : "Stake"}
          </button>
        </div>
      )}

      {/* User balance */}
      {!thresholdReached && connected && userBalance > 0 && (
        <div className="mt-2 text-[11px] text-muted/60 font-mono">
          Your balance: {userBalance.toLocaleString()} tokens
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`mt-3 p-3 rounded-xl text-xs ${
          result.success
            ? "bg-green-500/[0.08] border border-green-500/25 text-green-400"
            : "bg-red-500/[0.08] border border-red-500/25 text-red-400"
        }`}>
          {result.success ? "✓ " : "✗ "}{result.message}
        </div>
      )}
    </div>
  );
}
