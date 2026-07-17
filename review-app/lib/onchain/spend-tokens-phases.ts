"use client";

/**
 * Spend Tokens proposal — Phases 1, 2, 3 mirroring the e2e harness.
 *
 * Source of truth: kinship-market-e2e/scripts/proposals/spend-tokens.ts
 * If the harness changes, change these too. They MUST stay in sync because
 * the harness is the only thing we've actually run end-to-end.
 *
 * Functions are async, return signatures + addresses, throw on error. The
 * UI wraps each call in a try/catch and routes the result through the
 * proposal-draft context.
 */

import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
  FutarchyClient,
  InstructionUtils,
  PERMISSIONLESS_ACCOUNT,
  getProposalAddr,
} from "@metadaoproject/futarchy/v0.6";
// Inline sha256 — avoids @noble/hashes version conflicts across bundlers.
function sha256(data: Uint8Array): Uint8Array {
  if (typeof globalThis.crypto?.subtle === "undefined" || typeof require !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHash } = require("crypto");
    return new Uint8Array(createHash("sha256").update(data).digest());
  }
  throw new Error("Synchronous sha256 not available in this environment");
}
import * as multisig from "@sqds/multisig";
import type { Keypair } from "@solana/web3.js";

export interface SpendPhase1Args {
  connection: Connection;
  futarchy: FutarchyClient;
  /**
   * The connected sponsor's signing function. We can't pass a Keypair from
   * the wallet adapter — we have to pass through the wallet's signTransaction.
   */
  sponsorPubkey: PublicKey;
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>;
  /** spl-token's getOrCreateATA needs a payer Keypair — for browser flow, this comes from a temp keypair OR we precompute the ATA + assume it exists. See ensureRecipientAta below. */
  recipientPubkey: PublicKey;
  dao: PublicKey;
  usdcMint: PublicKey;
  multisigPda: PublicKey;
  treasuryVault: PublicKey;
  rawAmount: bigint;
}

export interface SpendPhase1Result {
  squadsProposalAddress: PublicKey;
  squadsTransactionIndex: bigint;
  signature: string;
}

/**
 * Phase 1 — Build Squads vault transaction wrapping the USDC transfer +
 * register it as a Squads proposal. Mirrors `runPhase1` in the harness.
 *
 * Browser caveat: the harness uses `getOrCreateAssociatedTokenAccount` which
 * needs a Keypair for the payer. From a wallet adapter we can't get a raw
 * Keypair. We work around this by pre-computing the ATA address and only
 * sending a `createAssociatedTokenAccount` instruction inside the wrapped
 * transaction if it doesn't exist. For the v1 demo, we assume the ATA is
 * already created (it is, because the harness setup creates it). When
 * shipping for real, add an ensure-ATA step here.
 */
export async function runSpendPhase1(
  args: SpendPhase1Args,
): Promise<SpendPhase1Result> {
  const {
    connection,
    futarchy,
    sponsorPubkey,
    signTransaction,
    recipientPubkey,
    dao,
    usdcMint,
    multisigPda,
    treasuryVault,
    rawAmount,
  } = args;

  // ATA addresses — these are deterministic.
  const treasuryUsdcAta = getAssociatedTokenAddressSync(
    usdcMint,
    treasuryVault,
    true, // allowOwnerOffCurve — treasury vault is a PDA, off-curve
  );
  const recipientUsdcAta = getAssociatedTokenAddressSync(
    usdcMint,
    recipientPubkey,
    false,
  );

  // Wrapped instruction: SPL token transfer from treasury ATA → recipient ATA.
  // The treasury vault PDA is the authority — Squads will sign as that PDA
  // when the proposal eventually executes.
  const wrappedTransferIx: TransactionInstruction = createTransferInstruction(
    treasuryUsdcAta,
    recipientUsdcAta,
    treasuryVault,
    rawAmount,
  );

  // Read multisig to determine the next transactionIndex.
  const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda,
  );
  const currentIndex = BigInt(multisigAccount.transactionIndex.toString());
  const nextIndex = currentIndex + BigInt(1);

  // Build the bundled Squads tx (vaultTransactionCreate + proposalCreate).
  // The SDK assembles both instructions together.
  const { tx: squadsBundleTx, squadsProposal } = futarchy.squadsProposalCreateTx({
    dao,
    instructions: [wrappedTransferIx],
    transactionIndex: nextIndex,
    payer: sponsorPubkey,
  });

  // Add compute budget — the harness empirically needs 400k for this bundle.
  squadsBundleTx.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  );

  // Set blockhash + fee payer.
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(
    "confirmed",
  );
  squadsBundleTx.feePayer = sponsorPubkey;
  squadsBundleTx.recentBlockhash = blockhash;
  squadsBundleTx.lastValidBlockHeight = lastValidBlockHeight;

  // The harness signs with [sponsor, PERMISSIONLESS_ACCOUNT]. The wallet
  // adapter signs as the sponsor; we partial-sign with PERMISSIONLESS_ACCOUNT
  // first, then hand the partially-signed tx to the wallet for the sponsor sig.
  squadsBundleTx.partialSign(PERMISSIONLESS_ACCOUNT as unknown as Keypair);
  const signed = await signTransaction(squadsBundleTx);

  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
  });
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  return {
    squadsProposalAddress: squadsProposal,
    squadsTransactionIndex: nextIndex,
    signature,
  };
}

export interface SpendPhase2Args {
  futarchy: FutarchyClient;
  dao: PublicKey;
  squadsProposalAddress: PublicKey;
  multisigPda: PublicKey;
}

export interface SpendPhase2Result {
  futarchyProposalAddress: PublicKey;
  /**
   * Signature of the final initializeProposal call. The intermediate
   * question + vault inits don't return signatures from the SDK methods
   * we use, but the final RPC does.
   */
  signature: string;
}

/**
 * Phase 2 — Initialize the futarchy proposal. Three sub-transactions:
 * question init, vault init (base+quote atomic), proposal init with
 * squadsMultisig override. Mirrors `runPhase2` in the harness.
 */
export async function runSpendPhase2(
  args: SpendPhase2Args,
): Promise<SpendPhase2Result> {
  const { futarchy, dao, squadsProposalAddress, multisigPda } = args;

  const storedDao = await futarchy.getDao(dao);
  const [futarchyProposalAddress] = getProposalAddr(
    futarchy.futarchy.programId,
    squadsProposalAddress,
  );
  const questionHash = sha256(
    new TextEncoder().encode(`Will ${futarchyProposalAddress.toBase58()} pass?/FAIL/PASS`),
  );

  // Step 1/3 — initializeQuestion. Returns the question PDA, not a signature.
  await futarchy.vaultClient.initializeQuestion(
    questionHash,
    futarchyProposalAddress,
    2,
  );

  const { question } = futarchy.getProposalPdas(
    futarchyProposalAddress,
    storedDao.baseMint,
    storedDao.quoteMint,
    dao,
  );

  // Step 2/3 — initializeVault for base + quote, atomic via postInstructions.
  await futarchy.vaultClient
    .initializeVaultIx(question, storedDao.baseMint, 2)
    .postInstructions(
      await InstructionUtils.getInstructions(
        futarchy.vaultClient.initializeVaultIx(question, storedDao.quoteMint, 2),
      ),
    )
    .rpc();

  // Step 3/3 — initializeProposal. SDK omits squadsMultisig from the IDL
  // accounts, so we override it manually. This is the harness's hard-won
  // discovery — leaving it out fails validation.
  const signature = await futarchy
    .initializeProposalIx(
      squadsProposalAddress,
      dao,
      storedDao.baseMint,
      storedDao.quoteMint,
      question,
    )
    .accounts({
      squadsMultisig: multisigPda,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ])
    .rpc();

  return {
    futarchyProposalAddress,
    signature,
  };
}

export interface SpendPhase3Args {
  futarchy: FutarchyClient;
  sponsorPubkey: PublicKey;
  dao: PublicKey;
  futarchyProposalAddress: PublicKey;
  squadsProposalAddress: PublicKey;
  multisigPda: PublicKey;
}

export interface SpendPhase3Result {
  signatures: { sponsor?: string; launch: string };
}

/**
 * Phase 3 — Sponsor + Launch. Marks the proposal team-sponsored, then halves
 * the spot pool reserves into Pass/Fail conditional AMMs and opens trading.
 *
 * Idempotent: if already team-sponsored, skips that step. Lets you re-run
 * after fixes without wasting state.
 *
 * Note from harness: launchProposalIx adds setComputeUnitLimit(300_000)
 * internally. Don't add another or Solana rejects duplicate compute budget
 * instructions.
 */
export async function runSpendPhase3(
  args: SpendPhase3Args,
): Promise<SpendPhase3Result> {
  const {
    futarchy,
    sponsorPubkey,
    dao,
    futarchyProposalAddress,
    squadsProposalAddress,
    multisigPda,
  } = args;

  const storedDao = await futarchy.getDao(dao);

  // Check team-sponsored state for idempotency.
  const proposalNow = await futarchy.fetchProposal(futarchyProposalAddress);
  const alreadySponsored = proposalNow?.isTeamSponsored ?? false;

  let sigSponsor: string | undefined;
  if (!alreadySponsored) {
    sigSponsor = await futarchy
      .sponsorProposalIx({
        proposal: futarchyProposalAddress,
        dao,
        teamAddress: sponsorPubkey,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ])
      .rpc();
  }

  const sigLaunch = await futarchy
    .launchProposalIx({
      proposal: futarchyProposalAddress,
      dao,
      baseMint: storedDao.baseMint,
      quoteMint: storedDao.quoteMint,
    })
    .accounts({
      squadsMultisig: multisigPda,
      squadsProposal: squadsProposalAddress,
    })
    .rpc();

  return {
    signatures: { sponsor: sigSponsor, launch: sigLaunch },
  };
}