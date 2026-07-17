/**
 * Lightweight instruction builders for proposal types that only need
 * @solana/spl-token and @solana/web3.js — NO futarchy dependency.
 *
 * These are safe for static import in "use client" pages because they
 * don't pull in @metadaoproject/futarchy (which transitively requires
 * Node-only modules like `fs` via bundlr/avsc).
 *
 * Types that need FutarchyClient (param, liquidity, perf) must use
 * dynamic import of proposal-phases.ts inside async callbacks instead.
 */
import {
  PublicKey,
  TransactionInstruction,
  type Connection,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

async function getTokenProgramForMint(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  const mintAccount = await connection.getAccountInfo(mint);
  if (!mintAccount) {
    throw new Error(`Mint account not found: ${mint.toBase58()}`);
  }
  return mintAccount.owner;
}

// ── Spend transfer ──────────────────────────────────────────────

export async function buildSpendInstruction(args: {
  connection: Connection;
  treasuryVault: PublicKey;
  recipientPubkey: PublicKey;
  mint: PublicKey;
  rawAmount: bigint;
}): Promise<TransactionInstruction> {
  const tokenProgram = await getTokenProgramForMint(
    args.connection,
    args.mint,
  );

  const treasuryAta = getAssociatedTokenAddressSync(
    args.mint,
    args.treasuryVault,
    true,
    tokenProgram,
  );

  const recipientAta = getAssociatedTokenAddressSync(
    args.mint,
    args.recipientPubkey,
    true,  // allowOwnerOffCurve — PDA recipients (vaults, escrows) need this
    tokenProgram,
  );

  return createTransferInstruction(
    treasuryAta,
    recipientAta,
    args.treasuryVault,
    args.rawAmount,
    [],
    tokenProgram,
  );
}

// ── MintTo ──────────────────────────────────────────────────────

export async function buildMintInstruction(args: {
  connection: Connection;
  treasuryVault: PublicKey;
  mint: PublicKey;
  recipientPubkey: PublicKey;
  rawAmount: bigint;
}): Promise<TransactionInstruction> {
  const tokenProgram = await getTokenProgramForMint(
    args.connection,
    args.mint,
  );

  const recipientAta = getAssociatedTokenAddressSync(
    args.mint,
    args.recipientPubkey,
    true,  // allowOwnerOffCurve — PDA recipients (vaults, escrows) need this
    tokenProgram,
  );

  return createMintToInstruction(
    args.mint,
    recipientAta,
    args.treasuryVault,
    args.rawAmount,
    [],
    tokenProgram,
  );
}

// ── Ensure recipient ATA ────────────────────────────────────────

export async function ensureRecipientAta(args: {
  connection: Connection;
  payer: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
}): Promise<{
  ata: PublicKey;
  createIx: TransactionInstruction | null;
}> {
  const { connection, payer, mint, owner } = args;

  const tokenProgram = await getTokenProgramForMint(connection, mint);

  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    true,  // allowOwnerOffCurve — PDA recipients (vaults, escrows) need this
    tokenProgram,
  );

  const account = await connection.getAccountInfo(ata);
  if (account) {
    return { ata, createIx: null };
  }

  return {
    ata,
    createIx: createAssociatedTokenAccountInstruction(
      payer,
      ata,
      owner,
      mint,
      tokenProgram,
    ),
  };
}