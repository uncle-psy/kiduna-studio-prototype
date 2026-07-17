/**
 * Multi-phase proposal lifecycle for all 6 v1 proposal types.
 *
 * Phase 1 wraps a type-specific instruction inside a Squads vault transaction
 * and registers it as a multisig proposal. Phase 2 initializes the futarchy
 * proposal pointing at that Squads proposal. Phase 3 sponsors and launches.
 *
 * Phase 2 + Phase 3 are identical across all 6 types. Phase 1's wrapped
 * instruction differs.
 *
 * Source of truth: kinship-market-e2e/scripts/proposals/spend-tokens.ts.
 */ 

import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  FutarchyClient,
  InstructionUtils,
  PERMISSIONLESS_ACCOUNT,
  getProposalAddr,
  PriceBasedPerformancePackageClient,
} from "@metadaoproject/futarchy/v0.6";
// Inline sha256 — avoids @noble/hashes version conflicts across bundlers.
// Uses the same synchronous Uint8Array→Uint8Array signature as @noble/hashes.
function sha256(data: Uint8Array): Uint8Array {
  // In Node.js / SSR, use the built-in crypto module.
  if (typeof globalThis.crypto?.subtle === "undefined" || typeof require !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHash } = require("crypto");
    return new Uint8Array(createHash("sha256").update(data).digest());
  }
  // Fallback: should not be reached for this code path (runs client-side
  // only inside wallet-signing flows where crypto is available), but
  // kept for safety.
  throw new Error("Synchronous sha256 not available in this environment");
}
import * as multisig from "@sqds/multisig";
import BN from "bn.js";
import type { Keypair } from "@solana/web3.js";
import { getPriorityFeeForIxs } from "@/lib/priority-fee";

// Metaplex Token Metadata program ID (mainnet + devnet).
export const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

// Performance Package program IDs (v0.6 and v0.7 deployments).
export const PERF_PACKAGE_V06_PROGRAM_ID = new PublicKey(
  "pbPPQH7jyKoSLu8QYs3rSY3YkDRXEBojKbTgnUg7NDS",
);
export const PERF_PACKAGE_V07_PROGRAM_ID = new PublicKey(
  "pPV2pfrxnmstSb9j7kEeCLny5BGj6SNwCWGd6xbGGzz",
);
/**
 * The version every new performance-package proposal uses. Bump this
 * (and only this) when a newer program is deployed — the create flow
 * and downstream phases read it from here.
 */
export const LATEST_PERF_PACKAGE_PROGRAM_ID = PERF_PACKAGE_V07_PROGRAM_ID;

// ════════════════════════════════════════════════════════════════════════
// Compute Budget Defaults
// ════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════
// Token Program Detection
// ════════════════════════════════════════════════════════════════════════

/**
 * Detects whether a mint uses Token-2022 or the legacy Token program
 * by inspecting the account's owner field on-chain.
 *
 * This is required because `getAssociatedTokenAddressSync`,
 * `createAssociatedTokenAccountInstruction`, `createTransferInstruction`,
 * and `createMintToInstruction` all default to the legacy TOKEN_PROGRAM_ID.
 * Passing the wrong program ID causes simulation to fail with
 * "incorrect program id for instruction".
 */
export async function getTokenProgramForMint(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID;
}

// ════════════════════════════════════════════════════════════════════════
// Shared helper: build, sign, send, confirm — ONE wallet popup
// ════════════════════════════════════════════════════════════════════════

/**
 * Builds a single Transaction from the provided instructions, refreshes the
 * blockhash immediately before signing, calls signTransaction exactly ONCE,
 * then sends and confirms.
 *
 * Use this everywhere a phase needs a single wallet approval.
 */
async function sendSignedTransactionOnce(
  connection: Connection,
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  /** Extra partial signers (e.g. PERMISSIONLESS_ACCOUNT) that must sign before the wallet. */
  partialSigners?: Array<{ publicKey: PublicKey; secretKey: Uint8Array }>,
): Promise<string> {
  const tx = new Transaction();
  for (const ix of instructions) tx.add(ix);

  tx.feePayer = payer;

  // Fetch blockhash as late as possible — right before signing.
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  // Apply any required partial signers (e.g. PERMISSIONLESS_ACCOUNT).
  if (partialSigners) {
    for (const signer of partialSigners) {
      tx.partialSign(signer as unknown as Keypair);
    }
  }

  // ONE wallet popup.
  const signed = await signTransaction(tx);

  return confirmWithRebroadcast(
    connection,
    signed.serialize(),
    lastValidBlockHeight,
  );
}

/**
 * Sends a signed, serialized transaction and confirms it robustly.
 *
 * Why this exists: a single `sendRawTransaction` + `confirmTransaction`
 * frequently fails with "block height exceeded" under congestion — the leader
 * drops the tx and nothing re-broadcasts it, or the confirmation websocket
 * notification is missed. This helper:
 *   1. re-broadcasts the SAME signed bytes every few seconds (cheap, idempotent),
 *   2. polls `getSignatureStatus` instead of relying solely on the websocket,
 *   3. on blockheight expiry, does ONE final history-aware status check before
 *      giving up — so a tx that actually landed is never reported as failed.
 *
 * The caller's signature and return type are unchanged: it still returns the
 * confirmed transaction signature (or throws).
 */
async function confirmWithRebroadcast(
  connection: Connection,
  rawTx: Buffer | Uint8Array,
  lastValidBlockHeight: number,
  opts: { rebroadcastIntervalMs?: number; pollIntervalMs?: number } = {},
): Promise<string> {
  const rebroadcastIntervalMs = opts.rebroadcastIntervalMs ?? 2_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 2_000;

  // First send runs preflight once to surface genuinely bad instructions early.
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    maxRetries: 0, // we manage rebroadcast ourselves
  });

  let lastRebroadcast = Date.now();

  // Loop on block height (not wall-clock) so expiry tracks the network exactly.
  for (;;) {
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: false,
    });
    if (status.value) {
      if (status.value.err) {
        throw new Error(
          `Transaction ${signature} failed on-chain: ${JSON.stringify(status.value.err)}`,
        );
      }
      const cs = status.value.confirmationStatus;
      if (cs === "confirmed" || cs === "finalized") return signature;
    }

    const currentHeight = await connection.getBlockHeight("confirmed");
    if (currentHeight > lastValidBlockHeight) {
      // Final reconciliation: the tx may have landed right at the edge of the
      // validity window. Check history before declaring it expired.
      const finalStatus = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });
      const fc = finalStatus.value?.confirmationStatus;
      if (
        finalStatus.value &&
        !finalStatus.value.err &&
        (fc === "confirmed" || fc === "finalized")
      ) {
        return signature;
      }
      throw new Error(
        `Transaction ${signature} expired: block height exceeded ` +
          `(not confirmed within the blockhash validity window).`,
      );
    }

    // Re-broadcast the same signed bytes periodically to survive leader drops.
    if (Date.now() - lastRebroadcast >= rebroadcastIntervalMs) {
      try {
        await connection.sendRawTransaction(rawTx, {
          skipPreflight: true, // preflight already ran on the first send
          maxRetries: 0,
        });
      } catch {
        // Expected/benign here ("already processed", transient RPC errors).
        // The status poll above is the source of truth.
      }
      lastRebroadcast = Date.now();
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
}

// ════════════════════════════════════════════════════════════════════════
// Phase 1 — Build wrapped Squads vault transaction
// ════════════════════════════════════════════════════════════════════════

export interface Phase1Args {
  connection: Connection;
  futarchy: FutarchyClient;
  sponsorPubkey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  dao: PublicKey;
  multisigPda: PublicKey;
  /** Instructions inside the vault tx (pre-flight ATA creates, then the action). */
  wrappedInstructions: TransactionInstruction[];
  /**
   * Optional pre-flight instructions (e.g. recipient ATA creation).
   *
   * WALLET POPUP REDUCTION: These are now prepended to the SAME transaction
   * as the Squads bundle instead of being sent in a separate transaction.
   * This eliminates the first Phantom popup, leaving Phase 1 as a single
   * wallet approval.
   *
   * Constraint: the merged transaction must stay under the 1232-byte
   * transaction size limit and the compute budget. ATA creation instructions
   * are small (~100 bytes) so this is safe in practice.
   */
  preflightInstructions?: TransactionInstruction[];
  /**
   * Resume idempotency: the Squads vault transaction index to use. When a
   * proposal already has a persisted index (from a prior Phase-1 attempt),
   * pass it so the SAME transaction PDA is re-derived instead of reading
   * multisig.transactionIndex+1 again — which would create a second, orphaned
   * vault transaction at the next index. When omitted, the next index is
   * computed from the multisig.
   */
  transactionIndex?: bigint;
}

export interface Phase1Result {
  squadsProposalAddress: PublicKey;
  squadsTransactionIndex: bigint;
  signature: string;
  /** Always undefined — preflightInstructions are merged into the main tx. */
  preflightSignature?: string;
}

export async function runPhase1(args: Phase1Args): Promise<Phase1Result> {
  const {
    connection,
    futarchy,
    sponsorPubkey,
    signTransaction,
    dao,
    multisigPda,
    wrappedInstructions,
    preflightInstructions,
  } = args;

  // Read multisig to determine the next transactionIndex.
  const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda,
  );
  const currentIndex = BigInt(multisigAccount.transactionIndex.toString());
  // Reuse a persisted index on resume (idempotent PDA); else take the next one.
  const nextIndex = args.transactionIndex ?? currentIndex + BigInt(1);

  const { tx: squadsBundleTx, squadsProposal } =
    futarchy.squadsProposalCreateTx({
      dao,
      instructions: wrappedInstructions,
      transactionIndex: nextIndex,
      payer: sponsorPubkey,
    });

  // Collect all instructions in order:
  //   1. Compute budget
  //   2. preflightInstructions (ATA creation, etc.) — merged here instead of
  //      a separate transaction so there is only ONE wallet popup.
  //   3. The Squads bundle instructions
  const allInstructions: TransactionInstruction[] = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([...(preflightInstructions ?? []), ...squadsBundleTx.instructions], "High") }),
    ...(preflightInstructions ?? []),
    ...squadsBundleTx.instructions,
  ];

  // sendSignedTransactionOnce handles feePayer, blockhash refresh, and the
  // single signTransaction call. PERMISSIONLESS_ACCOUNT partial-signs before
  // the wallet popup.
  const signature = await sendSignedTransactionOnce(
    connection,
    signTransaction,
    sponsorPubkey,
    allInstructions,
    [
      PERMISSIONLESS_ACCOUNT as unknown as {
        publicKey: PublicKey;
        secretKey: Uint8Array;
      },
    ],
  );

  return {
    squadsProposalAddress: squadsProposal,
    squadsTransactionIndex: nextIndex,
    signature,
    // preflightSignature intentionally omitted — merged into main tx.
  };
}

// ════════════════════════════════════════════════════════════════════════
// Phase 2 — Initialize futarchy proposal (identical for all types)
// ════════════════════════════════════════════════════════════════════════

export interface Phase2Args {
  futarchy: FutarchyClient;
  dao: PublicKey;
  squadsProposalAddress: PublicKey;
  multisigPda: PublicKey;
  connection: Connection;
  sponsorPubkey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
}

export interface Phase2SetupResult {
  futarchyProposalAddress: PublicKey;
  question: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  signature: string;
}

export interface Phase2Result {
  futarchyProposalAddress: PublicKey;
  signature: string;
}

/**
 * Phase 2a — Initialize the conditional question and both vaults.
 *
 * This is intentionally split from initializeProposal because putting all
 * Phase 2 instructions into one legacy transaction exceeds Solana's 1232-byte
 * transaction size limit. This keeps Phase 2 at two wallet popups instead of
 * the old three.
 */
export async function runPhase2Setup(
  args: Phase2Args,
): Promise<Phase2SetupResult> {
  const {
    futarchy,
    dao,
    squadsProposalAddress,
    connection,
    sponsorPubkey,
    signTransaction,
  } = args;

  const storedDao = await futarchy.getDao(dao);

  const [futarchyProposalAddress] = getProposalAddr(
    futarchy.futarchy.programId,
    squadsProposalAddress,
  );

  const questionHash = sha256(
    new TextEncoder().encode(`Will ${futarchyProposalAddress.toBase58()} pass?/FAIL/PASS`),
  );

  const { question } = futarchy.getProposalPdas(
    futarchyProposalAddress,
    storedDao.baseMint,
    storedDao.quoteMint,
    dao,
  );

  const initQuestionIxs = await InstructionUtils.getInstructions(
    futarchy.vaultClient.initializeQuestionIx(
      questionHash,
      futarchyProposalAddress,
      2,
    ),
  );

  const initVaultBaseIxs = await InstructionUtils.getInstructions(
    futarchy.vaultClient.initializeVaultIx(question, storedDao.baseMint, 2),
  );

  const initVaultQuoteIxs = await InstructionUtils.getInstructions(
    futarchy.vaultClient.initializeVaultIx(question, storedDao.quoteMint, 2),
  );

  const signature = await sendSignedTransactionOnce(
    connection,
    signTransaction,
    sponsorPubkey,
    [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([...initQuestionIxs, ...initVaultBaseIxs, ...initVaultQuoteIxs], "High") }),
      ...initQuestionIxs,
      ...initVaultBaseIxs,
      ...initVaultQuoteIxs,
    ],
  );

  return {
    futarchyProposalAddress,
    question,
    baseMint: storedDao.baseMint,
    quoteMint: storedDao.quoteMint,
    signature,
  };
}

/**
 * Phase 2b — Initialize the futarchy proposal account.
 */
export async function runPhase2Initialize(
  args: Phase2Args & {
    futarchyProposalAddress: PublicKey;
    question: PublicKey;
    baseMint: PublicKey;
    quoteMint: PublicKey;
  },
): Promise<Phase2Result> {
  const {
    futarchy,
    dao,
    squadsProposalAddress,
    multisigPda,
    connection,
    sponsorPubkey,
    signTransaction,
    futarchyProposalAddress,
    question,
    baseMint,
    quoteMint,
  } = args;

  const initProposalIxs = await InstructionUtils.getInstructions(
    futarchy
      .initializeProposalIx(
        squadsProposalAddress,
        dao,
        baseMint,
        quoteMint,
        question,
      )
      .accounts({
        squadsMultisig: multisigPda,
      }),
  );

  const signature = await sendSignedTransactionOnce(
    connection,
    signTransaction,
    sponsorPubkey,
    [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([...initProposalIxs], "High") }),
      ...initProposalIxs,
    ],
  );

  return { futarchyProposalAddress, signature };
}

/**
 * Backward-compatible helper for non-UI callers. It still performs two
 * transactions internally because Phase 2 is too large for one legacy tx.
 */
export async function runPhase2(args: Phase2Args): Promise<Phase2Result> {
  const setup = await runPhase2Setup(args);
  return await runPhase2Initialize({
    ...args,
    futarchyProposalAddress: setup.futarchyProposalAddress,
    question: setup.question,
    baseMint: setup.baseMint,
    quoteMint: setup.quoteMint,
  });
}

// ════════════════════════════════════════════════════════════════════════
// Phase 3 — Sponsor + Launch (identical for all types)
// ════════════════════════════════════════════════════════════════════════

export interface Phase3Args {
  futarchy: FutarchyClient;
  sponsorPubkey: PublicKey;
  dao: PublicKey;
  futarchyProposalAddress: PublicKey;
  squadsProposalAddress: PublicKey;
  /** Required to send the merged transaction in one wallet popup. */
  connection: Connection;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  /** @deprecated Resolved automatically from the DAO record. Kept for call-site compatibility. */
  multisigPda?: PublicKey;
}

export interface Phase3Result {
  signatures: { sponsor?: string; launch: string };
}

export async function runPhase3(args: Phase3Args): Promise<Phase3Result> {
  const {
    futarchy,
    sponsorPubkey,
    dao,
    futarchyProposalAddress,
    squadsProposalAddress,
    connection,
    signTransaction,
  } = args;

  const storedDao = await futarchy.getDao(dao);

  // Read squadsMultisig directly from the DAO record — this is what the
  // hasOne constraint checks against. Using a different value can cause
  // ConstraintHasOne (Error 2001).
  const multisigPda = (storedDao as unknown as { squadsMultisig: PublicKey })
    .squadsMultisig;

  console.debug("[Phase4] dao            :", dao.toBase58());
  console.debug("[Phase4] baseMint       :", storedDao.baseMint.toBase58());
  console.debug("[Phase4] quoteMint      :", storedDao.quoteMint.toBase58());
  console.debug("[Phase4] multisigPda    :", multisigPda.toBase58());
  console.debug(
    "[Phase4] proposal       :",
    futarchyProposalAddress.toBase58(),
  );
  console.debug("[Phase4] squadsProposal :", squadsProposalAddress.toBase58());

  const proposalNow = await futarchy.fetchProposal(futarchyProposalAddress);
  const maybeState = proposalNow as any;

  // Defensive retry handling: if the proposal is already launched/open, do
  // not submit another launch transaction.
  if (
    maybeState?.state?.pending ||
    maybeState?.pending ||
    maybeState?.status === "pending" ||
    maybeState?.launched === true
  ) {
    console.warn(
      "[Phase4] Proposal already launched. Skipping duplicate launch.",
    );
    return {
      signatures: {
        sponsor: undefined,
        launch: "already-launched",
      },
    };
  }

  const alreadySponsored = proposalNow?.isTeamSponsored ?? false;
  const rawInstructions: TransactionInstruction[] = [];
  let includesSponsor = false;

  if (!alreadySponsored) {
    const sponsorIxs = await InstructionUtils.getInstructions(
      futarchy.sponsorProposalIx({
        proposal: futarchyProposalAddress,
        dao,
        teamAddress: sponsorPubkey,
      }),
    );
    rawInstructions.push(...sponsorIxs);
    includesSponsor = true;
  }

  const launchIxs = await InstructionUtils.getInstructions(
    futarchy
      .launchProposalIx({
        proposal: futarchyProposalAddress,
        dao,
        baseMint: storedDao.baseMint,
        quoteMint: storedDao.quoteMint,
      })
      .accounts({
        squadsMultisig: multisigPda,
        squadsProposal: squadsProposalAddress,
      }),
  );
  rawInstructions.push(...launchIxs);

  // Some Anchor/SDK builders may include their own ComputeBudget instructions.
  // If we merge sponsor + launch and leave those duplicates in place, localnet
  // can fail with: "Transaction contains a duplicate instruction that is not
  // allowed." Strip SDK-provided ComputeBudget instructions and add one clean
  // ComputeBudget instruction at the front.
  const nonComputeBudgetInstructions = rawInstructions.filter(
    (ix) => !ix.programId.equals(ComputeBudgetProgram.programId),
  );

  const signature = await sendSignedTransactionOnce(
    connection,
    signTransaction,
    sponsorPubkey,
    [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([...nonComputeBudgetInstructions], "High") }),
      ...nonComputeBudgetInstructions,
    ],
  );

  return {
    signatures: {
      sponsor: includesSponsor ? signature : undefined,
      launch: signature,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════
// Combined Phase 2b + Phase 3 — single wallet popup
// ════════════════════════════════════════════════════════════════════════

/**
 * Combines initializeProposal (Phase 2b) with sponsor + launch (Phase 3)
 * into a single transaction. Reduces wallet popups from 4 to 3.
 *
 * Compute budget: ~900K CU (300K proposal init + 600K sponsor/launch).
 * Matches the e2e test harness which uses 3 phases total.
 */
export async function runPhase2bAndPhase3(args: Phase2Args & {
  futarchyProposalAddress: PublicKey;
  question: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
}): Promise<Phase2Result & Phase3Result> {
  const {
    futarchy, dao, squadsProposalAddress, multisigPda,
    connection, sponsorPubkey, signTransaction,
    futarchyProposalAddress, question, baseMint, quoteMint,
  } = args;

  const storedDao = await futarchy.getDao(dao);
  const daoMultisigPda = (storedDao as unknown as { squadsMultisig: PublicKey }).squadsMultisig;

  // ── initializeProposal instructions (Phase 2b) ──────────────
  const initProposalIxs = await InstructionUtils.getInstructions(
    futarchy
      .initializeProposalIx(squadsProposalAddress, dao, baseMint, quoteMint, question)
      .accounts({ squadsMultisig: multisigPda }),
  );

  // ── sponsor + launch instructions (Phase 3) ─────────────────
  const sponsorIxs = await InstructionUtils.getInstructions(
    futarchy.sponsorProposalIx({
      proposal: futarchyProposalAddress,
      dao,
      teamAddress: sponsorPubkey,
    }),
  );

  const launchIxs = await InstructionUtils.getInstructions(
    futarchy
      .launchProposalIx({
        proposal: futarchyProposalAddress,
        dao,
        baseMint: storedDao.baseMint,
        quoteMint: storedDao.quoteMint,
      })
      .accounts({
        squadsMultisig: daoMultisigPda,
        squadsProposal: squadsProposalAddress,
      }),
  );

  // Combine all, strip duplicate ComputeBudget instructions from SDK
  const allInstructions = [...initProposalIxs, ...sponsorIxs, ...launchIxs];
  const nonComputeBudget = allInstructions.filter(
    (ix) => !ix.programId.equals(ComputeBudgetProgram.programId),
  );

  const signature = await sendSignedTransactionOnce(
    connection,
    signTransaction,
    sponsorPubkey,
    [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 900_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([...nonComputeBudget], "High") }),
      ...nonComputeBudget,
    ],
  );

  return {
    futarchyProposalAddress,
    signature,
    signatures: { sponsor: signature, launch: signature },
  };
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

/**
 * Returns the recipient ATA address + a CreateAssociatedTokenAccount IX if
 * it doesn't exist yet. The IX should be added to preflightInstructions in
 * Phase 1 so the ATA exists when the Squads vault tx eventually executes.
 *
 * FIX: Automatically detects Token vs Token-2022 by inspecting the mint's
 * on-chain owner. Passing the wrong program ID causes simulation to fail
 * with "incorrect program id for instruction" (IncorrectProgramId).
 */
export async function ensureRecipientAta(args: {
  connection: Connection;
  payer: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  /** Optional: pass if already resolved to avoid a redundant RPC call. */
  tokenProgram?: PublicKey;
}): Promise<{
  ata: PublicKey;
  createIx: TransactionInstruction | null;
  tokenProgram: PublicKey;
}> {
  const { connection, payer, mint, owner } = args;

  // Detect the correct token program for this mint (Token vs Token-2022).
  const tokenProgram =
    args.tokenProgram ?? (await getTokenProgramForMint(connection, mint));

  // allowOwnerOffCurve=true so PDAs (e.g. treasury vault) are valid owners.
  const ata = getAssociatedTokenAddressSync(mint, owner, true, tokenProgram);

  const account = await connection.getAccountInfo(ata);
  if (account) return { ata, createIx: null, tokenProgram };

  return {
    ata,
    tokenProgram,
    createIx: createAssociatedTokenAccountInstruction(
      payer,
      ata,
      owner,
      mint,
      tokenProgram,
    ),
  };
}

/** Find the Metaplex metadata PDA for a given mint. */
export function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METAPLEX_METADATA_PROGRAM_ID,
  );
  return pda;
}

// ════════════════════════════════════════════════════════════════════════
// Per-type Phase 1 instruction builders
// ════════════════════════════════════════════════════════════════════════

/**
 * SPEND TOKENS — SPL token transfer from treasury vault to recipient.
 * Verified end-to-end in harness.
 *
 * FIX: Accepts explicit `tokenProgram` so callers can pass the result of
 * `getTokenProgramForMint`. Defaults to legacy TOKEN_PROGRAM_ID for
 * backwards compatibility, but Token-2022 mints MUST pass TOKEN_2022_PROGRAM_ID
 * or simulation will fail with "incorrect program id for instruction".
 */
export function buildSpendInstruction(args: {
  treasuryVault: PublicKey;
  recipientPubkey: PublicKey;
  mint: PublicKey;
  rawAmount: bigint;
  /** Pass result of getTokenProgramForMint(connection, mint). */
  tokenProgram?: PublicKey;
}): TransactionInstruction {
  const tokenProgram = args.tokenProgram ?? TOKEN_PROGRAM_ID;

  const treasuryAta = getAssociatedTokenAddressSync(
    args.mint,
    args.treasuryVault,
    true, // allowOwnerOffCurve — treasury vault is a PDA
    tokenProgram,
  );
  const recipientAta = getAssociatedTokenAddressSync(
    args.mint,
    args.recipientPubkey,
    false,
    tokenProgram,
  );

  return createTransferInstruction(
    treasuryAta,
    recipientAta,
    args.treasuryVault,
    args.rawAmount,
    [], // multiSigners
    tokenProgram,
  );
}

/**
 * UPDATE PARAM — futarchy update_dao instruction.
 * Wraps the SDK builder. The squads multisig vault is the signer that
 * authorizes the param change at execution time.
 */
export async function buildParamUpdateInstruction(args: {
  futarchy: FutarchyClient;
  dao: PublicKey;
  params: {
    passThresholdBps?: number;
    secondsPerProposal?: BN;
    twapStartDelaySeconds?: BN;
    twapInitialObservation?: BN;
    twapMaxObservationChangePerUpdate?: BN;
    minQuoteFutarchicLiquidity?: BN;
    minBaseFutarchicLiquidity?: BN;
  };
}): Promise<TransactionInstruction> {
  const builder = args.futarchy.updateDaoIx({
    dao: args.dao,
    params: args.params as never,
  });
  return await builder.instruction();
}

/**
 * MINT TOKENS — SPL mintTo. Treasury vault is the mint authority.
 * Prerequisite: mint authority must already be the treasury vault PDA.
 *
 * FIX: Accepts explicit `tokenProgram` so callers can pass the result of
 * `getTokenProgramForMint`. Defaults to legacy TOKEN_PROGRAM_ID for
 * backwards compatibility, but Token-2022 mints MUST pass TOKEN_2022_PROGRAM_ID
 * or simulation will fail with "incorrect program id for instruction".
 */
export function buildMintInstruction(args: {
  treasuryVault: PublicKey;
  mint: PublicKey;
  recipientPubkey: PublicKey;
  rawAmount: bigint;
  /** Pass result of getTokenProgramForMint(connection, mint). */
  tokenProgram?: PublicKey;
}): TransactionInstruction {
  const tokenProgram = args.tokenProgram ?? TOKEN_PROGRAM_ID;

  const recipientAta = getAssociatedTokenAddressSync(
    args.mint,
    args.recipientPubkey,
    false,
    tokenProgram,
  );

  return createMintToInstruction(
    args.mint,
    recipientAta,
    args.treasuryVault,
    args.rawAmount,
    [], // multiSigners
    tokenProgram,
  );
}

/**
 * UPDATE METADATA — Metaplex update_metadata_accounts_v2.
 *
 * Hand-rolled to avoid the Umi-based mpl-token-metadata SDK (which expects
 * Umi context, not raw web3.js objects). Discriminator is 15 (variant index
 * in the program's instruction enum).
 *
 * Wire format per metaplex IDL:
 *   discriminator: u8 = 15
 *   data: Option<DataV2> { 0=None, 1=Some + DataV2 }
 *   newUpdateAuthority: Option<Pubkey>
 *   primarySaleHappened: Option<bool>
 *   isMutable: Option<bool>
 *
 * DataV2 layout:
 *   name: string (4-byte len LE + utf8 bytes, padded to 32)
 *   symbol: string (padded to 10)
 *   uri: string (padded to 200)
 *   sellerFeeBasisPoints: u16
 *   creators: Option<Vec<Creator>>
 *   collection: Option<Collection>
 *   uses: Option<Uses>
 *
 * For metadata updates we always pass full DataV2 (read existing values
 * before calling and merge with sponsor's overrides). Treasury vault is
 * the update authority signer.
 *
 * NOTE: Metaplex metadata is token-program-agnostic — it operates on the
 * mint pubkey directly and does not route through SPL token programs.
 * No tokenProgram fix is needed here.
 */
export function buildMetadataUpdateInstruction(args: {
  treasuryVault: PublicKey;
  metadataPda: PublicKey;
  /** Full DataV2 to write (caller must read existing & merge if partial update). */
  data: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
  };
  newUpdateAuthority?: PublicKey;
  primarySaleHappened?: boolean;
  isMutable?: boolean;
}): TransactionInstruction {
  const buf: number[] = [];

  // Discriminator: variant 15 = UpdateMetadataAccountV2
  buf.push(15);

  // data: Option<DataV2> = Some(DataV2 { ... })
  buf.push(1); // Some

  // name: string (4-byte len LE + bytes)
  const nameBytes = Buffer.from(args.data.name, "utf-8");
  buf.push(...lenLE(nameBytes.length), ...nameBytes);

  // symbol: string
  const symbolBytes = Buffer.from(args.data.symbol, "utf-8");
  buf.push(...lenLE(symbolBytes.length), ...symbolBytes);

  // uri: string
  const uriBytes = Buffer.from(args.data.uri, "utf-8");
  buf.push(...lenLE(uriBytes.length), ...uriBytes);

  // sellerFeeBasisPoints: u16 LE
  buf.push(
    args.data.sellerFeeBasisPoints & 0xff,
    (args.data.sellerFeeBasisPoints >> 8) & 0xff,
  );

  // creators: Option<Vec<Creator>> = None
  buf.push(0);
  // collection: Option<Collection> = None
  buf.push(0);
  // uses: Option<Uses> = None
  buf.push(0);

  // newUpdateAuthority: Option<Pubkey>
  if (args.newUpdateAuthority) {
    buf.push(1);
    buf.push(...args.newUpdateAuthority.toBytes());
  } else {
    buf.push(0);
  }

  // primarySaleHappened: Option<bool>
  if (args.primarySaleHappened !== undefined) {
    buf.push(1, args.primarySaleHappened ? 1 : 0);
  } else {
    buf.push(0);
  }

  // isMutable: Option<bool>
  if (args.isMutable !== undefined) {
    buf.push(1, args.isMutable ? 1 : 0);
  } else {
    buf.push(0);
  }

  return new TransactionInstruction({
    keys: [
      { pubkey: args.metadataPda, isSigner: false, isWritable: true },
      { pubkey: args.treasuryVault, isSigner: true, isWritable: false },
    ],
    programId: METAPLEX_METADATA_PROGRAM_ID,
    data: Buffer.from(buf),
  });
}

function lenLE(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}

/**
 * ADJUST LIQUIDITY — provide_liquidity OR withdraw_liquidity to/from the
 * DAO's spot AMM. The squads multisig vault is the position authority.
 *
 * For "provide" we use the SDK's provideLiquidityIx. For "remove" we hit
 * the program's withdrawLiquidity instruction directly via the underlying
 * Anchor program (SDK doesn't expose a wrapper).
 *
 * NOTE: Liquidity positions operate on the futarchy AMM vaults (PDAs owned
 * by the futarchy program), not on SPL token accounts directly. The token
 * program is resolved from the DAO's base/quote mints for the provider's
 * ATAs. If your DAO uses Token-2022 mints, ensure the futarchy SDK's
 * provideLiquidityIx / withdrawLiquidity accounts reference TOKEN_2022_PROGRAM_ID.
 */
export async function buildLiquidityAdjustInstruction(args: {
  futarchy: FutarchyClient;
  dao: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  treasuryVault: PublicKey;
  /** For provide: quote token amount in. For remove: liquidity units to burn. */
  quoteAmount: BN;
  /** For provide: max base token amount. For remove: ignored. */
  maxBaseAmount: BN;
  direction: "provide" | "remove";
  connection: Connection;
}): Promise<TransactionInstruction> {
  if (args.direction === "provide") {
    const builder = args.futarchy.provideLiquidityIx({
      dao: args.dao,
      baseMint: args.baseMint,
      quoteMint: args.quoteMint,
      quoteAmount: args.quoteAmount,
      maxBaseAmount: args.maxBaseAmount,
      liquidityProvider: args.treasuryVault,
      positionAuthority: args.treasuryVault,
    });
    return await builder.instruction();
  }

  // Remove: build withdrawLiquidity manually. The futarchy program exposes
  // it but the SDK has no convenience wrapper. Account list mirrors the IDL.
  const program = args.futarchy.futarchy;

  // FIX: Detect token programs for base and quote mints independently.
  const baseTokenProgram = await getTokenProgramForMint(args.connection, args.baseMint);
  const quoteTokenProgram = await getTokenProgramForMint(args.connection, args.quoteMint);

  // ATAs for the position authority (treasury vault) — use correct program per mint.
  const liquidityProviderBaseAccount = getAssociatedTokenAddressSync(
    args.baseMint,
    args.treasuryVault,
    true,
    baseTokenProgram,
  );
  const liquidityProviderQuoteAccount = getAssociatedTokenAddressSync(
    args.quoteMint,
    args.treasuryVault,
    true,
    quoteTokenProgram,
  );

  // AMM vaults + position PDA — derive from DAO.
  const storedDao = await args.futarchy.getDao(args.dao);
  // The DAO's spot pool oracle stores its config; we derive amm_position via
  // the futarchy program's PDA seeds.
  const [ammPosition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("amm_position"),
      args.dao.toBuffer(),
      args.treasuryVault.toBuffer(),
    ],
    program.programId,
  );

  // AMM vaults are derived from DAO + mints.
  const [ammBaseVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_vault"), args.dao.toBuffer(), args.baseMint.toBuffer()],
    program.programId,
  );
  const [ammQuoteVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_vault"), args.dao.toBuffer(), args.quoteMint.toBuffer()],
    program.programId,
  );

  // withdrawLiquidity uses storedDao for base/quote mint validation;
  // treasury_vault signs as positionAuthority.
  void storedDao;

  // Use program.methods to build the IX.
  const builder = (program.methods as unknown as {
      withdrawLiquidity: (params: { liquidity: BN }) => {
        accounts: (a: Record<string, PublicKey>) => {
          instruction: () => Promise<TransactionInstruction>;
        };
      };
  })
    .withdrawLiquidity({ liquidity: args.quoteAmount })
    .accounts({
      dao: args.dao,
      positionAuthority: args.treasuryVault,
      liquidityProviderBaseAccount,
      liquidityProviderQuoteAccount,
      ammBaseVault,
      ammQuoteVault,
      ammPosition,
      tokenProgram: TOKEN_PROGRAM_ID,
    });

  return await builder.instruction();
}

/**
 * PERFORMANCE GRANT — calls initializePerformancePackage on the v0.6 or v0.7
 * deployment of the perf-package program.
 *
 * The SDK exposes PriceBasedPerformancePackageClient for v0.6. v0.7 uses the
 * same client signature with a different program ID.
 *
 * The grantor (signer) is the treasury vault. The grantor's token account
 * holds the reward tokens being escrowed.
 *
 * FIX: Accepts explicit `tokenProgram` so callers can pass the result of
 * `getTokenProgramForMint(connection, rewardMint)`. Defaults to legacy
 * TOKEN_PROGRAM_ID. Token-2022 reward mints MUST pass TOKEN_2022_PROGRAM_ID.
 */
/**
 * PERFORMANCE GRANT — builds the initializePerformancePackage instruction
 * matching the v0.6/v0.7 IDL exactly.
 *
 * IDL params: { tranches, minUnlockTimestamp, oracleConfig, twapLengthSeconds,
 *               grantee, performancePackageAuthority }
 *
 * oracleConfig is a struct { oracleAccount: PublicKey, byteOffset: u32 }
 * — NOT an enum. Points to the on-chain TWAP aggregator account.
 *
 * Each tranche has { priceThreshold: u128, tokenAmount: u64 }.
 */
export async function buildPerformanceGrantInstruction(args: {
  provider: { publicKey: PublicKey; connection: Connection } & Record<string, any>;
  treasuryVault: PublicKey;
  rewardMint: PublicKey;
  createKey: PublicKey;
  /** Price tranches: [{priceThreshold (USDC), tokenAmount (raw)}] */
  tranches: Array<{ priceThreshold: BN; tokenAmount: BN }>;
  /** Unix timestamp — earliest any unlock can occur. */
  minUnlockTimestamp: BN;
  /** On-chain TWAP oracle account address. */
  oracleAccount: PublicKey;
  /** Byte offset into the oracle account for TWAP data. Default 0. */
  oracleByteOffset?: number;
  /** TWAP window in seconds. Default 86400 (24h). */
  twapLengthSeconds?: number;
  /** Recipient wallet (grantee). */
  grantee: PublicKey;
  /** Pass result of getTokenProgramForMint(connection, rewardMint). */
  tokenProgram?: PublicKey;
  /** "v0.6" or "v0.7". Defaults to LATEST. */
  programVersion?: "v0.6" | "v0.7";
}): Promise<TransactionInstruction> {
  const tokenProgram = args.tokenProgram ?? TOKEN_PROGRAM_ID;

  const programId = args.programVersion === "v0.6"
    ? PERF_PACKAGE_V06_PROGRAM_ID
    : LATEST_PERF_PACKAGE_PROGRAM_ID;
  const ppClient = new PriceBasedPerformancePackageClient(
    args.provider as any,
    programId,
  );

  const grantorTokenAccount = getAssociatedTokenAddressSync(
    args.rewardMint,
    args.treasuryVault,
    true,
    tokenProgram,
  );

  // Params matching the IDL's InitializePerformancePackageParams exactly.
  const params = {
    tranches: args.tranches.map((t) => ({
      priceThreshold: t.priceThreshold,
      tokenAmount: t.tokenAmount,
    })),
    minUnlockTimestamp: args.minUnlockTimestamp,
    oracleConfig: {
      oracleAccount: args.oracleAccount,
      byteOffset: args.oracleByteOffset ?? 0,
    },
    twapLengthSeconds: args.twapLengthSeconds ?? 86400,
    grantee: args.grantee,
    performancePackageAuthority: args.treasuryVault,
  };

  const builder = ppClient.initializePerformancePackageIx({
    params: params as never,
    createKey: args.createKey,
    tokenMint: args.rewardMint,
    grantor: args.treasuryVault,
    grantorTokenAccount,
  });

  return await builder.instruction();
}

/** Re-exports so other modules don't import directly from the SDK. */
export {
  PriceBasedPerformancePackageClient,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SystemProgram,
};