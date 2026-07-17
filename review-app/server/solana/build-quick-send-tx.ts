/**
 * build-quick-send-tx.ts
 *
 * Builds Squads v4 spending-limit transactions:
 *   - createSpendingLimit: one-time setup (called during market launch)
 *   - useSpendingLimit:    per-transfer (called from the Quick Send UI)
 *
 * The spending limit is a Squads v4 feature that lets designated members
 * transfer tokens from the vault without full multisig approval, up to
 * a configured amount per time period.
 *
 * Place at: server/solana/build-quick-send-tx.ts
 */
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import * as multisig from "@sqds/multisig";
import BN from "bn.js";
import { getConnection, DECIMALS } from "./connection";
import { getRecentBlockhash } from "./transactions";
import { getPriorityFee, getPriorityFeeForIxs } from "./priority-fee";

/* ── Types ──────────────────────────────────────────────────────────── */

export interface CreateSpendingLimitResult {
  /** Base64-encoded unsigned transaction for browser signing. */
  serializedTransaction: string;
  /** The createKey pubkey — store this to derive the spending limit PDA later. */
  createKey: string;
  /** The spending limit PDA address. */
  spendingLimitAddress: string;
  /** Base64-encoded createKey secret — client needs this to co-sign. */
  generatedKeypairs: Record<string, string>;
  description: string;
}

export interface UseSpendingLimitResult {
  serializedTransaction: string;
  description: string;
}

/* ── PDA helper ─────────────────────────────────────────────────────── */

/**
 * Derive the spending limit PDA from the multisig and createKey.
 *
 * From MetaDAO futarchy source (initialize_dao.rs):
 *   createKey = dao.key() (the DAO address)
 *   seeds = [SEED_PREFIX, multisigPda, SEED_SPENDING_LIMIT, createKey]
 *   program = Squads v4
 */
export function getSpendingLimitPda(
  multisigPda: PublicKey,
  createKey: PublicKey,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("multisig"),
      multisigPda.toBuffer(),
      Buffer.from("spending_limit"),
      createKey.toBuffer(),
    ],
    new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf"),
  );
  return pda;
}

/* ── Create spending limit (one-time, during or after launch) ──────── */

/**
 * Build a config transaction that adds a spending limit to the multisig.
 *
 * This is a Squads config transaction, not a vault transaction.
 * It requires multisig approval (or config_authority override for
 * controlled multisigs).
 *
 * For Kinship markets, the multisig is created by the futarchy DAO
 * with the DAO as config_authority, so we use configTransactionCreate
 * which the sponsor signs.
 *
 * @param sponsorPubkey  Sponsor wallet (fee payer + proposer)
 * @param multisigPda    Squads multisig PDA
 * @param usdcMint       USDC SPL mint address
 * @param amountUsdc     Monthly limit in whole USDC (e.g. 8000)
 * @param members        Wallets authorized to use this limit
 */
export async function buildCreateSpendingLimit(
  sponsorPubkey: PublicKey,
  multisigPda: PublicKey,
  usdcMint: PublicKey,
  amountUsdc: number,
  members: PublicKey[],
): Promise<CreateSpendingLimitResult> {
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

  // Generate a createKey for the spending limit PDA derivation
  const createKeyKeypair = Keypair.generate();
  const spendingLimitPda = getSpendingLimitPda(multisigPda, createKeyKeypair.publicKey);

  // Read current multisig state to get the next transaction index
  const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda,
  );
  const currentIndex = BigInt(multisigAccount.transactionIndex.toString());
  const newTransactionIndex = currentIndex + BigInt(1);

  // Raw amount: whole USDC × 10^6 (Number is safe — max ~$9 trillion USDC)
  const rawAmount = amountUsdc * (10 ** DECIMALS.usdc);

  // Build the config transaction with AddSpendingLimit action
  const ix = multisig.instructions.configTransactionCreate({
    multisigPda,
    transactionIndex: newTransactionIndex,
    creator: sponsorPubkey,
    actions: [
      {
        __kind: "AddSpendingLimit",
        createKey: createKeyKeypair.publicKey,
        vaultIndex: 0,
        mint: usdcMint,
        amount: rawAmount,
        period: multisig.types.Period.Month,
        members,
        destinations: [], // empty = any destination allowed
      },
    ],
  });

  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: sponsorPubkey });
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([ix], "High") }));
  tx.add(ix);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  return {
    serializedTransaction: serialized.toString("base64"),
    createKey: createKeyKeypair.publicKey.toBase58(),
    spendingLimitAddress: spendingLimitPda.toBase58(),
    generatedKeypairs: {
      createKey: Buffer.from(createKeyKeypair.secretKey).toString("base64"),
    },
    description: `Creating spending limit: ${amountUsdc.toLocaleString()} USDC/month`,
  };
}

/* ── Use spending limit (per-transfer, Quick Send) ─────────────────── */

/**
 * Build a spendingLimitUse transaction — transfers USDC from the vault
 * to a recipient, consuming from the spending limit allowance.
 *
 * No proposal or multisig approval needed. The authorized member
 * signs directly.
 *
 * @param memberPubkey       Authorized wallet (must be in the limit's members[])
 * @param multisigPda        Squads multisig PDA
 * @param spendingLimitPda   Spending limit PDA (from createSpendingLimit)
 * @param usdcMint           USDC SPL mint
 * @param vaultIndex         Vault index (0 = main treasury)
 * @param recipientPubkey    Recipient wallet address
 * @param amountUsdc         Amount in whole USDC (e.g. 500)
 */
export async function buildUseSpendingLimit(
  memberPubkey: PublicKey,
  multisigPda: PublicKey,
  spendingLimitPda: PublicKey,
  usdcMint: PublicKey,
  vaultIndex: number,
  recipientPubkey: PublicKey,
  amountUsdc: number,
): Promise<UseSpendingLimitResult> {
  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

  const rawAmount = amountUsdc * (10 ** DECIMALS.usdc);

  // Derive the vault PDA (where USDC sits)
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: vaultIndex });

  // Derive USDC ATAs
  const vaultAta = getAssociatedTokenAddressSync(usdcMint, vaultPda, true);
  const recipientAta = getAssociatedTokenAddressSync(usdcMint, recipientPubkey, false);

  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: memberPubkey });
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: await getPriorityFee(
      [vaultPda.toBase58(), spendingLimitPda.toBase58(), vaultAta.toBase58(), recipientAta.toBase58()],
      "High",
    ),
  }));

  // Create recipient ATA if it doesn't exist (idempotent)
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      memberPubkey,
      recipientAta,
      recipientPubkey,
      usdcMint,
    ),
  );

  // Build the spendingLimitUse instruction
  // NOTE: The Squads SDK expects `destination` to be the WALLET address,
  // not the ATA. It derives the destination token account internally.
  const useIx = multisig.instructions.spendingLimitUse({
    multisigPda,
    member: memberPubkey,
    spendingLimit: spendingLimitPda,
    mint: usdcMint,
    vaultIndex,
    amount: rawAmount,
    decimals: DECIMALS.usdc,
    destination: recipientPubkey,
  });
  tx.add(useIx);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: `Quick send: ${amountUsdc.toLocaleString()} USDC → ${recipientPubkey.toBase58().slice(0, 8)}…`,
  };
}