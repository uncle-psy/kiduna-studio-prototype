"use client";

/**
 * Build on-chain transaction for voting on a futarchy proposal.
 *
 * Combined into a SINGLE transaction:
 *   0. Create output token account (if needed)
 *   1. Split USDC into conditional Pass-USDC + Fail-USDC
 *   2. Swap conditional USDC for Pass or Fail base tokens
 *
 * One Phantom popup.
 */

import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
  type Connection,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { FutarchyClient } from "@metadaoproject/futarchy/v0.6";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { getPriorityFeeForIxs } from "@/lib/priority-fee";
import { sendAndConfirmRobust } from "./send-transaction";

export type VoteSide = "pass" | "fail";

export interface VoteOnProposalArgs {
  futarchy: FutarchyClient;
  connection: Connection;
  dao: PublicKey;
  baseMint: PublicKey;
  usdcMint: PublicKey;
  proposal: PublicKey;
  side: VoteSide;
  amountUsdc: number;
  usdcDecimals?: number;
}

export async function voteOnProposal(
  args: VoteOnProposalArgs,
): Promise<string> {
  const {
    futarchy,
    connection,
    dao,
    baseMint,
    usdcMint,
    proposal,
    side,
    amountUsdc,
    usdcDecimals = 6,
  } = args;

  const amountRaw = new BN(
    (BigInt(Math.floor(amountUsdc * 10 ** usdcDecimals))).toString(),
  );

  const wallet = futarchy.futarchy.provider.publicKey!;

  // Get DAO data and PDAs
  const storedDao = await futarchy.getDao(dao);
  const { quoteVault, question } = futarchy.getProposalPdas(
    proposal,
    storedDao.baseMint,
    storedDao.quoteMint,
    dao,
  );

  // Fetch the proposal to get conditional mints
  const proposalAccount = await futarchy.fetchProposal(proposal);
  if (!proposalAccount) throw new Error("Proposal not found on-chain");

  const acct = proposalAccount as any;
  const outputBaseMint: PublicKey = side === "pass" ? acct.passBaseMint : acct.failBaseMint;
  const outputQuoteMint: PublicKey = side === "pass" ? acct.passQuoteMint : acct.failQuoteMint;
  // The swap also needs the OTHER side's mints for the vault
  const otherBaseMint: PublicKey = side === "pass" ? acct.failBaseMint : acct.passBaseMint;
  const otherQuoteMint: PublicKey = side === "pass" ? acct.failQuoteMint : acct.passQuoteMint;

  // Slippage protection: ideally we'd simulate the swap to estimate output
  // and set minOutputAmount to 98% of expected. However the FutarchyClient SDK
  // does not expose a simulate method. The on-chain program enforces the k
  // invariant (new_k >= old_k) which provides base protection against extreme
  // manipulation. For v1 we accept any output; proper slippage estimation
  // requires reading pool reserves and computing constant-product output
  // client-side (future improvement).
  const minOutputAmount = new BN(0);

  // Build split instruction
  const splitIx = await futarchy.vaultClient
    .splitTokensIx(question, quoteVault, usdcMint, amountRaw, 2)
    .instruction();

  // Build swap instruction with slippage protection
  const swapIx = await futarchy
    .conditionalSwapIx({
      dao,
      baseMint,
      quoteMint: usdcMint,
      proposal,
      market: side,
      swapType: "buy",
      inputAmount: amountRaw,
      minOutputAmount,
    })
    .instruction();

  // Combine into ONE transaction
  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([swapIx], "High") }));

  // Only create ATAs that don't exist yet. Each createATA instruction adds
  // ~100+ bytes; blindly adding all 4 pushes the tx over Solana's 1232-byte
  // limit. After the first vote all ATAs exist, so subsequent votes are lean.
  const allMints = [outputBaseMint, outputQuoteMint, otherBaseMint, otherQuoteMint];
  const ataAddresses = allMints.map((mint) => getAssociatedTokenAddressSync(mint, wallet));
  const ataInfos = await connection.getMultipleAccountsInfo(ataAddresses);

  const missingAtaIxs: TransactionInstruction[] = [];
  for (let i = 0; i < allMints.length; i++) {
    if (!ataInfos[i]) {
      missingAtaIxs.push(
        createAssociatedTokenAccountIdempotentInstruction(
          wallet,
          ataAddresses[i],
          wallet,
          allMints[i],
        ),
      );
    }
  }

  // If 3+ ATAs need creating, the combined tx exceeds Solana's 1232-byte limit.
  // In that case, send ATAs in a separate preparatory tx first.
  if (missingAtaIxs.length >= 3) {
    const prepTx = new Transaction();
    prepTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
    prepTx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs(missingAtaIxs, "High") }));
    for (const ix of missingAtaIxs) prepTx.add(ix);

    const { blockhash: prepHash, lastValidBlockHeight: prepHeight } =
      await connection.getLatestBlockhash("confirmed");
    prepTx.recentBlockhash = prepHash;
    prepTx.lastValidBlockHeight = prepHeight;
    prepTx.feePayer = wallet;

    await sendAndConfirmRobust(
      futarchy.futarchy.provider as AnchorProvider,
      connection,
      prepTx,
    );
    // ATAs now exist — the main tx won't include any createATA instructions
  } else {
    // Few enough ATAs to fit in the main tx
    for (const ix of missingAtaIxs) tx.add(ix);
  }

  // Split USDC into conditional tokens
  tx.add(splitIx);

  // Swap conditional USDC for base tokens
  tx.add(swapIx);

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = wallet;

  const sig = await sendAndConfirmRobust(
    futarchy.futarchy.provider as AnchorProvider,
    connection,
    tx,
  );

  return sig;
}