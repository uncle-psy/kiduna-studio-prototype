"use client";

/**
 * Proposal lifecycle — Phases 5-7 (Finalize, Execute, Redeem).
 *
 * Phases 1-3 (create + launch) live in proposal-phases.ts.
 * Phase 4 (voting/trading) lives in proposal-trading.ts.
 * This file completes the lifecycle.
 *
 * All functions build a transaction, get Phantom signature, and send
 * to Solana. They return the tx signature on success and throw on
 * failure with a user-friendly message.
 *
 * Source of truth: kinship-market-e2e/scripts/proposals/
 *   - finalize-proposal.ts
 *   - execute-proposal.ts
 *   - redeem-tokens.ts
 */

import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import {
  FutarchyClient,
  PERMISSIONLESS_ACCOUNT,
} from "@metadaoproject/futarchy/v0.6";
import { AnchorProvider } from "@coral-xyz/anchor";
import * as multisig from "@sqds/multisig";
import BN from "bn.js";
import { sendAndConfirmRobust } from "./send-transaction";

// ════════════════════════════════════════════════════════════════════════
// Phase 5 — Finalize Proposal
// ════════════════════════════════════════════════════════════════════════

export interface FinalizeArgs {
  futarchy: FutarchyClient;
  dao: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  /** If null, read from the on-chain proposal account automatically. */
  squadsProposalAddress: PublicKey | null;
  futarchyProposalAddress: PublicKey;
}

export interface FinalizeResult {
  signature: string;
  outcome: "passed" | "failed";
}

/**
 * Finalize a proposal after its trading window has elapsed.
 *
 * Calls `finalizeProposalIxV2` which:
 *   - Evaluates the TWAP oracle (Pass TWAP vs Fail TWAP)
 *   - Sets the proposal state to `passed` or `failed`
 *   - Auto-approves or auto-rejects the underlying Squads proposal
 *
 * Permissionless — any wallet can call this. The connected wallet
 * pays the transaction fee (~0.000005 SOL).
 *
 * If squadsProposalAddress is null, it's read from the on-chain
 * proposal account automatically.
 */
export async function finalizeProposal(
  args: FinalizeArgs,
): Promise<FinalizeResult> {
  const {
    futarchy,
    dao,
    baseMint,
    quoteMint,
    futarchyProposalAddress,
  } = args;

  // Pre-check: read on-chain state to handle idempotency + get squadsProposal.
  const before = await futarchy.fetchProposal(futarchyProposalAddress);
  if (!before) {
    throw new Error("Proposal not found on-chain.");
  }

  const stateBefore = Object.keys(before.state)[0];

  // Already finalized — return outcome without sending a tx.
  if (stateBefore === "passed" || stateBefore === "failed") {
    return {
      signature: "",
      outcome: stateBefore as "passed" | "failed",
    };
  }

  if (stateBefore !== "pending") {
    throw new Error(
      `Proposal is in unexpected state "${stateBefore}". Cannot finalize.`,
    );
  }

  // Resolve squadsProposalAddress — from arg or from on-chain account.
  let squadsProposalAddress: PublicKey | null = args.squadsProposalAddress;
  if (!squadsProposalAddress) {
    // The on-chain proposal account stores the squads proposal reference.
    const acct = before as any;
    const onchainSquads = acct.proposer ?? acct.squadsProposal ?? acct.proposal;
    if (onchainSquads && typeof onchainSquads.toBase58 === "function") {
      squadsProposalAddress = onchainSquads as PublicKey;
      console.log("[Finalize] Read squadsProposal from on-chain:", squadsProposalAddress!.toBase58());
    } else {
      console.warn("[Finalize] Cannot find squadsProposal on-chain. Account fields:", Object.keys(acct));
      throw new Error(
        "Squads proposal address not found. Check the proposal's on-chain data.",
      );
    }
  }

  // At this point squadsProposalAddress is guaranteed non-null (or we threw above).
  const resolvedSquadsProposal: PublicKey = squadsProposalAddress!;

  // ── TWAP Crank ─────────────────────────────────────────────────────────
  // After a clock warp (local testing), the TWAP oracle has no observations
  // at the warped time. Fix: do tiny swaps via the futarchy program's own
  // conditionalSwapIx to create fresh observations. Each step is a separate
  // minimal transaction to stay under the 1232-byte limit.
  //
  // Step 1: Split 1 USDC → conditional pass-USDC + fail-USDC
  // Step 2: Swap pass-USDC → pass-base (cranks Pass TWAP)
  // Step 3: Swap fail-USDC → fail-base (cranks Fail TWAP)
  // ────────────────────────────────────────────────────────────────────────
  try {
    console.log("[Finalize] Cranking TWAP via futarchy conditionalSwap…");
    console.log("[Finalize] Proposal account fields:", Object.keys(before as any));

    const storedDao = await futarchy.getDao(dao);
    const { quoteVault, question } = futarchy.getProposalPdas(
      futarchyProposalAddress, storedDao.baseMint, storedDao.quoteMint, dao,
    );
    const wallet = futarchy.futarchy.provider.publicKey!;
    const crankAmount = new BN(1_000_000); // 1 USDC

    // Ensure conditional token ATAs exist.
    const acct = before as any;
    const condMints = [
      acct.passBaseMint, acct.passQuoteMint,
      acct.failBaseMint, acct.failQuoteMint,
    ].filter(Boolean) as PublicKey[];

    if (condMints.length > 0) {
      const ataTx = new Transaction();
      for (const mint of condMints) {
        const ata = getAssociatedTokenAddressSync(mint, wallet);
        ataTx.add(createAssociatedTokenAccountIdempotentInstruction(wallet, ata, wallet, mint));
      }
      const { blockhash: ataBh, lastValidBlockHeight: ataH } = await futarchy.futarchy.provider.connection.getLatestBlockhash("confirmed");
      ataTx.recentBlockhash = ataBh;
      ataTx.lastValidBlockHeight = ataH;
      ataTx.feePayer = wallet;
      await sendAndConfirmRobust(futarchy.futarchy.provider as AnchorProvider, futarchy.futarchy.provider.connection, ataTx);
      console.log("[Finalize] Conditional token ATAs ensured ✓");
    }

    // Step 1: Split USDC into conditional tokens.
    try {
      const splitIx = await futarchy.vaultClient
        .splitTokensIx(question, quoteVault, quoteMint, crankAmount, 2)
        .instruction();
      const splitTx = new Transaction();
      splitTx.add(splitIx);
      const { blockhash: sBh, lastValidBlockHeight: sH } = await futarchy.futarchy.provider.connection.getLatestBlockhash("confirmed");
      splitTx.recentBlockhash = sBh;
      splitTx.lastValidBlockHeight = sH;
      splitTx.feePayer = wallet;
      await sendAndConfirmRobust(futarchy.futarchy.provider as AnchorProvider, futarchy.futarchy.provider.connection, splitTx);
      console.log("[Finalize] Split 1 USDC ✓");
    } catch (splitErr) {
      console.warn("[Finalize] Split failed:", splitErr);
    }

    // Step 2: Swap on Pass market.
    try {
      const passSwapIx = await futarchy
        .conditionalSwapIx({
          dao, baseMint, quoteMint,
          proposal: futarchyProposalAddress,
          market: "pass",
          swapType: "buy",
          inputAmount: crankAmount,
          minOutputAmount: new BN(0),
        })
        .instruction();
      const passTx = new Transaction();
      passTx.add(passSwapIx);
      const { blockhash: pBh, lastValidBlockHeight: pH } = await futarchy.futarchy.provider.connection.getLatestBlockhash("confirmed");
      passTx.recentBlockhash = pBh;
      passTx.lastValidBlockHeight = pH;
      passTx.feePayer = wallet;
      await sendAndConfirmRobust(futarchy.futarchy.provider as AnchorProvider, futarchy.futarchy.provider.connection, passTx);
      console.log("[Finalize] Pass TWAP cranked ✓");
    } catch (passErr) {
      console.warn("[Finalize] Pass swap failed:", passErr);
    }

    // Step 3: Swap on Fail market.
    try {
      const failSwapIx = await futarchy
        .conditionalSwapIx({
          dao, baseMint, quoteMint,
          proposal: futarchyProposalAddress,
          market: "fail",
          swapType: "buy",
          inputAmount: crankAmount,
          minOutputAmount: new BN(0),
        })
        .instruction();
      const failTx = new Transaction();
      failTx.add(failSwapIx);
      const { blockhash: fBh, lastValidBlockHeight: fH } = await futarchy.futarchy.provider.connection.getLatestBlockhash("confirmed");
      failTx.recentBlockhash = fBh;
      failTx.lastValidBlockHeight = fH;
      failTx.feePayer = wallet;
      await sendAndConfirmRobust(futarchy.futarchy.provider as AnchorProvider, futarchy.futarchy.provider.connection, failTx);
      console.log("[Finalize] Fail TWAP cranked ✓");
    } catch (failErr) {
      console.warn("[Finalize] Fail swap failed:", failErr);
    }

    console.log("[Finalize] TWAP crank complete.");
  } catch (crankErr) {
    console.warn("[Finalize] TWAP crank error (may be okay):", crankErr);
  }

  // Send finalize transaction.
  let signature: string;
  try {
    signature = await futarchy
      .finalizeProposalIxV2({
        squadsProposal: resolvedSquadsProposal,
        dao,
        baseMint,
        quoteMint,
      })
      .rpc();
  } catch (err) {
    throw friendlyFinalizeError(err);
  }

  // Read on-chain state after finalize to confirm outcome.
  const after = await futarchy.fetchProposal(futarchyProposalAddress);
  if (!after) {
    throw new Error("Could not read proposal after finalize.");
  }

  const stateAfter = Object.keys(after.state)[0];
  if (stateAfter !== "passed" && stateAfter !== "failed") {
    throw new Error(
      `Unexpected state "${stateAfter}" after finalize. Expected passed or failed.`,
    );
  }

  return {
    signature,
    outcome: stateAfter as "passed" | "failed",
  };
}

function friendlyFinalizeError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("ProposalTooYoung") || msg.includes("0x177c")) {
    return new Error(
      "Trading window hasn't elapsed yet. Wait for the countdown to reach zero, then try again.",
    );
  }
  if (msg.includes("MarketsTooYoung") || msg.includes("6006")) {
    return new Error(
      "TWAP oracle needs more observations. The auto-crank failed. Try clicking Finalize again — each attempt cranks the oracle.",
    );
  }
  if (msg.includes("User rejected")) {
    return new Error("Transaction was rejected in your wallet.");
  }

  return new Error(msg);
}

// ════════════════════════════════════════════════════════════════════════
// Phase 6 — Execute Proposal (Pass only)
// ════════════════════════════════════════════════════════════════════════

export interface ExecuteArgs {
  connection: Connection;
  multisigPda: PublicKey;
  transactionIndex: bigint;
  futarchyProposalAddress: PublicKey;
  futarchy: FutarchyClient;
  sponsorPubkey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
}

export interface ExecuteResult {
  signature: string;
}

/**
 * Execute the wrapped Squads vault transaction after a proposal passes.
 *
 * Calls `multisig.instructions.vaultTransactionExecute` which runs
 * whatever instructions were wrapped in Phase 1 (e.g. SPL transfer
 * for spend proposals, mintTo for mint proposals).
 *
 * Uses PERMISSIONLESS_ACCOUNT as the multisig "member" — this is by
 * design in MetaDAO: once a proposal passes, anyone can trigger
 * execution. The connected wallet only pays the fee.
 *
 * Handles both legacy and V0 transactions (the Squads SDK may return
 * address lookup tables for complex vault transactions).
 */
export async function executeProposal(
  args: ExecuteArgs,
): Promise<ExecuteResult> {
  const {
    connection,
    multisigPda,
    transactionIndex,
    futarchyProposalAddress,
    futarchy,
    sponsorPubkey,
    signTransaction,
  } = args;

  // Pre-check: proposal must be in "passed" state.
  const proposalAccount = await futarchy.fetchProposal(futarchyProposalAddress);
  if (!proposalAccount) {
    throw new Error("Proposal not found on-chain.");
  }

  const stateKind = Object.keys(proposalAccount.state)[0];
  if (stateKind === "pending") {
    throw new Error(
      "Proposal is still pending. Finalize it first before executing.",
    );
  }
  if (stateKind === "failed") {
    throw new Error(
      "Proposal failed. Failed proposals cannot be executed.",
    );
  }
  if (stateKind !== "passed") {
    throw new Error(`Proposal is in unexpected state "${stateKind}".`);
  }

  // Build the vault transaction execute instruction.
  const { instruction, lookupTableAccounts } =
    await multisig.instructions.vaultTransactionExecute({
      connection,
      multisigPda,
      transactionIndex,
      member: PERMISSIONLESS_ACCOUNT.publicKey,
    });

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  let signature: string;

  try {
    if (lookupTableAccounts.length > 0) {
      // V0 transaction path — needed when vault tx has lookup tables.
      signature = await sendV0Transaction({
        connection,
        sponsorPubkey,
        signTransaction,
        instructions: [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
          instruction,
        ],
        lookupTableAccounts,
        blockhash,
        lastValidBlockHeight,
      });
    } else {
      // Legacy transaction path.
      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
      tx.add(instruction);
      tx.feePayer = sponsorPubkey;
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      // PERMISSIONLESS_ACCOUNT must partial-sign before the wallet.
      tx.partialSign(
        PERMISSIONLESS_ACCOUNT as unknown as {
          publicKey: PublicKey;
          secretKey: Uint8Array;
        },
      );

      const signed = await signTransaction(tx);
      signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
      );
    }
  } catch (err) {
    throw friendlyExecuteError(err);
  }

  return { signature };
}

/**
 * Send a V0 transaction with address lookup tables.
 * Mirrors the helper in the E2E harness (execute-proposal.ts).
 */
async function sendV0Transaction(args: {
  connection: Connection;
  sponsorPubkey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  instructions: import("@solana/web3.js").TransactionInstruction[];
  lookupTableAccounts: import("@solana/web3.js").AddressLookupTableAccount[];
  blockhash: string;
  lastValidBlockHeight: number;
}): Promise<string> {
  const {
    connection,
    sponsorPubkey,
    instructions,
    lookupTableAccounts,
    blockhash,
  } = args;

  const messageV0 = new TransactionMessage({
    payerKey: sponsorPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTableAccounts);

  const v0Tx = new VersionedTransaction(messageV0);

  // PERMISSIONLESS_ACCOUNT partial-signs the V0 tx.
  v0Tx.sign([
    PERMISSIONLESS_ACCOUNT as unknown as {
      publicKey: PublicKey;
      secretKey: Uint8Array;
    },
  ]);

  // Wallet adapter signTransaction works with VersionedTransaction too,
  // but the type signature expects Transaction. Cast through unknown.
  const signFn = args.signTransaction as unknown as (
    tx: VersionedTransaction,
  ) => Promise<VersionedTransaction>;
  const signed = await signFn(v0Tx);

  const signature = await connection.sendTransaction(signed);
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

function friendlyExecuteError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("User rejected")) {
    return new Error("Transaction was rejected in your wallet.");
  }
  if (msg.includes("InsufficientFunds") || msg.includes("0x1")) {
    return new Error(
      "Insufficient funds in treasury. The vault may not have enough tokens to execute this action.",
    );
  }
  if (msg.includes("already been executed") || msg.includes("AlreadyExecuted")) {
    return new Error("This proposal has already been executed.");
  }

  return new Error(msg);
}

// ════════════════════════════════════════════════════════════════════════
// Phase 7 — Redeem Conditional Tokens
// ════════════════════════════════════════════════════════════════════════

export interface RedeemArgs {
  futarchy: FutarchyClient;
  connection: Connection;
  dao: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  futarchyProposalAddress: PublicKey;
}

export interface ConditionalBalances {
  passBase: number;
  passQuote: number;
  failBase: number;
  failQuote: number;
  hasAny: boolean;
}

export interface RedeemResult {
  signature: string;
  /** true if there were no tokens to redeem (no-op) */
  noop: boolean;
}

/**
 * Read the connected wallet's conditional token balances for a proposal.
 *
 * Returns human-readable amounts (divided by decimals). Used by
 * RedeemCard to show actual positions instead of mock data.
 */
export async function readConditionalBalances(
  args: RedeemArgs & { walletPubkey: PublicKey },
): Promise<ConditionalBalances> {
  const {
    futarchy,
    connection,
    dao,
    baseMint,
    quoteMint,
    futarchyProposalAddress,
    walletPubkey,
  } = args;

  const {
    passBaseMint,
    passQuoteMint,
    failBaseMint,
    failQuoteMint,
  } = futarchy.getProposalPdas(
    futarchyProposalAddress,
    baseMint,
    quoteMint,
    dao,
  );

  const readBalance = async (mint: PublicKey): Promise<number> => {
    try {
      const ata = getAssociatedTokenAddressSync(mint, walletPubkey);
      const info = await connection.getTokenAccountBalance(ata);
      return Number(info.value.uiAmount ?? 0);
    } catch {
      return 0;
    }
  };

  const [passBase, passQuote, failBase, failQuote] = await Promise.all([
    readBalance(passBaseMint),
    readBalance(passQuoteMint),
    readBalance(failBaseMint),
    readBalance(failQuoteMint),
  ]);

  return {
    passBase,
    passQuote,
    failBase,
    failQuote,
    hasAny: passBase > 0 || passQuote > 0 || failBase > 0 || failQuote > 0,
  };
}

/**
 * Redeem conditional tokens for the connected wallet.
 *
 * Combines both vault redeems (base + quote) into a single transaction
 * so the user signs once. On the winning side, conditional tokens
 * convert to real underlying tokens. On the losing side, they become
 * zero — the program handles this, no error.
 *
 * Pre-condition: proposal must be in `passed` or `failed` state.
 * Idempotent: calling on already-redeemed (zero balance) tokens is a
 * no-op that succeeds without sending a transaction.
 */
export async function redeemConditionalTokens(
  args: RedeemArgs,
): Promise<RedeemResult> {
  const {
    futarchy,
    connection,
    dao,
    baseMint,
    quoteMint,
    futarchyProposalAddress,
  } = args;

  // Pre-check: proposal must be finalized.
  const proposalAccount = await futarchy.fetchProposal(futarchyProposalAddress);
  if (!proposalAccount) {
    throw new Error("Proposal not found on-chain.");
  }
  const stateKind = Object.keys(proposalAccount.state)[0];
  if (stateKind !== "passed" && stateKind !== "failed") {
    throw new Error(
      `Proposal is "${stateKind}". Redeem requires the proposal to be finalized first.`,
    );
  }

  const { quoteVault, baseVault, question } = futarchy.getProposalPdas(
    futarchyProposalAddress,
    baseMint,
    quoteMint,
    dao,
  );

  const wallet = futarchy.futarchy.provider.publicKey!;

  // Check if there's anything to redeem.
  const balances = await readConditionalBalances({
    ...args,
    walletPubkey: wallet,
  });

  if (!balances.hasAny) {
    return { signature: "", noop: true };
  }

  // Build both redeem instructions into a single transaction.
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));

  // Redeem quote (USDC) vault.
  if (balances.passQuote > 0 || balances.failQuote > 0) {
    const redeemQuoteIx = await futarchy.vaultClient
      .redeemTokensIx(question, quoteVault, quoteMint, 2)
      .instruction();
    tx.add(redeemQuoteIx);
  }

  // Redeem base vault.
  if (balances.passBase > 0 || balances.failBase > 0) {
    const redeemBaseIx = await futarchy.vaultClient
      .redeemTokensIx(question, baseVault, baseMint, 2)
      .instruction();
    tx.add(redeemBaseIx);
  }

  // If neither vault has tokens (shouldn't happen after hasAny check, but defensive).
  if (tx.instructions.length <= 1) {
    return { signature: "", noop: true };
  }

  let signature: string;
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = wallet;

    signature = await sendAndConfirmRobust(
      futarchy.futarchy.provider as AnchorProvider,
      connection,
      tx,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("User rejected")) {
      throw new Error("Transaction was rejected in your wallet.");
    }
    throw new Error(msg);
  }

  return { signature, noop: false };
}