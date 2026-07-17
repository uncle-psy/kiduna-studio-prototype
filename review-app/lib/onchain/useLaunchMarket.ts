"use client";

/**
 * useLaunchMarket — React hook for the 6-step on-chain market launch.
 *
 * Orchestrates the Option A signing flow:
 *   1. Calls POST /launch/build to get an unsigned tx from the server
 *   2. Signs with Phantom via wallet adapter
 *   3. Calls POST /launch/submit to send the signed tx to Solana
 *   4. Repeats for all 6 steps
 *
 * Usage:
 *   const launch = useLaunchMarket("my-market-slug");
 *   launch.start();           // begins step 1
 *   launch.currentStep;       // 1-6
 *   launch.status;            // "idle" | "building" | "signing" | "submitting" | "complete" | "error"
 *   launch.completedSteps;    // ["create-mint", "distribute-supply", ...]
 */

import { useCallback, useRef, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

/* ── Step definitions ───────────────────────────────────────────────── */

export const LAUNCH_STEPS = [
  { step: 1, id: "create-tokens", label: "Create tokens" },
  { step: 2, id: "create-dao", label: "Create DAO on MetaDAO" },
  { step: 3, id: "create-pool", label: "Create trading pool" },
  { step: 4, id: "seed-and-fund", label: "Seed liquidity and fund treasury" },
] as const;

export const TOTAL_STEPS = LAUNCH_STEPS.length;

/* ── Types ──────────────────────────────────────────────────────────── */

export type LaunchStatus =
  | "idle"        // not started
  | "building"    // fetching unsigned tx from server
  | "signing"     // waiting for Phantom approval
  | "submitting"  // sending signed tx to server → Solana
  | "complete"    // all 6 steps done
  | "error";      // a step failed

export interface LaunchStepResult {
  step: number;
  id: string;
  txSignature: string;
  addresses: Record<string, string>;
}

export interface UseLaunchMarketReturn {
  /** Start the launch (or resume from where it left off). */
  start: () => Promise<void>;
  /** Retry the current failed step. */
  retry: () => Promise<void>;
  /** Current step number (1-6), null if not started. */
  currentStep: number | null;
  /** Current status. */
  status: LaunchStatus;
  /** Completed step results. */
  completedSteps: LaunchStepResult[];
  /** Error message if status is "error". */
  error: string | null;
  /** Whether the launch is in progress. */
  isRunning: boolean;
}

/* ── Hook ───────────────────────────────────────────────────────────── */

export function useLaunchMarket(slug: string): UseLaunchMarketReturn {
  const { publicKey, signTransaction } = useWallet();

  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [status, setStatus] = useState<LaunchStatus>("idle");
  const [completedSteps, setCompletedSteps] = useState<LaunchStepResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Prevent concurrent launches
  const runningRef = useRef(false);

  /**
   * Run a single step: build → sign → submit.
   */
  const runStep = useCallback(
    async (stepNumber: number): Promise<LaunchStepResult> => {
      if (!publicKey) throw new Error("Wallet not connected.");
      if (!signTransaction) throw new Error("Wallet does not support signing.");

      const stepDef = LAUNCH_STEPS[stepNumber - 1];
      if (!stepDef) throw new Error(`Invalid step: ${stepNumber}`);

      // 1. Build unsigned transaction (server-side)
      setStatus("building");
      const buildRes = await fetch(`/api/v1/markets/${slug}/launch/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: stepNumber,
          sponsorPubkey: publicKey.toBase58(),
        }),
      });

      if (!buildRes.ok) {
        const data = await buildRes.json().catch(() => ({}));
        throw new Error(data.error?.message || data.message || `Build failed (${buildRes.status})`);
      }

      const { serializedTransaction } = await buildRes.json();

      // 2. Deserialize and sign with Phantom
      setStatus("signing");
      const txBuffer = Buffer.from(serializedTransaction, "base64");
      const tx = Transaction.from(txBuffer);
      const signedTx = await signTransaction(tx);

      // 3. Submit signed transaction (server → Solana)
      setStatus("submitting");
      const submitRes = await fetch(`/api/v1/markets/${slug}/launch/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: stepNumber,
          signedTransaction: Buffer.from(
            signedTx.serialize({ requireAllSignatures: true })
          ).toString("base64"),
        }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}));
        throw new Error(data.error?.message || data.message || `Submit failed (${submitRes.status})`);
      }

      const result = await submitRes.json();

      return {
        step: stepNumber,
        id: stepDef.id,
        txSignature: result.txSignature,
        addresses: result.addresses ?? {},
      };
    },
    [publicKey, signTransaction, slug],
  );

  /**
   * Start the launch flow (or resume from last completed step).
   */
  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setError(null);

    try {
      // Check for resume: fetch current launch status
      const statusRes = await fetch(`/api/v1/markets/${slug}/launch-status`);
      let startFrom = 1;

      if (statusRes.ok) {
        const data = await statusRes.json();
        if (data.launchStatus === "live") {
          setStatus("complete");
          return;
        }
        if (data.completedStep && data.completedStep < TOTAL_STEPS) {
          startFrom = data.completedStep + 1;
        }
      }

      // Run each remaining step sequentially
      for (let step = startFrom; step <= TOTAL_STEPS; step++) {
        setCurrentStep(step);
        const result = await runStep(step);
        setCompletedSteps((prev) => [...prev, result]);
      }

      setStatus("complete");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Launch failed.");
    } finally {
      runningRef.current = false;
    }
  }, [slug, runStep]);

  /**
   * Retry the current failed step.
   */
  const retry = useCallback(async () => {
    if (runningRef.current || !currentStep) return;
    runningRef.current = true;
    setError(null);

    try {
      // Retry from current step through remaining steps
      for (let step = currentStep; step <= TOTAL_STEPS; step++) {
        setCurrentStep(step);
        const result = await runStep(step);
        setCompletedSteps((prev) => [...prev, result]);
      }

      setStatus("complete");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      runningRef.current = false;
    }
  }, [currentStep, runStep]);

  return {
    start,
    retry,
    currentStep,
    status,
    completedSteps,
    error,
    isRunning: status === "building" || status === "signing" || status === "submitting",
  };
}