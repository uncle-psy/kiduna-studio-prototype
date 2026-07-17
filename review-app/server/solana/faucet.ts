/**
 * Faucet helpers — SOL airdrop + USDC minting for local/devnet testing.
 *
 * The faucet keypair must be the USDC mint authority on the local validator.
 * This is the e2e sponsor keypair set by `prepare-usdc` in kinship-market-e2e.
 *
 * Loaded from FAUCET_KEYPAIR env var (JSON byte array or base58).
 * Falls back to SYSTEM_KEYPAIR if FAUCET_KEYPAIR is not set.
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { getConnection, getEnvironment, getUsdcMint, DECIMALS } from "./connection";
import { MAINNET_USDC_MINT } from "./launchpad-types";

// ── Keypair loading ─────────────────────────────────────────────────────

let _faucetKeypair: Keypair | null = null;

/**
 * Load the faucet keypair from FAUCET_KEYPAIR env var.
 * Falls back to SYSTEM_KEYPAIR if not set.
 * Accepts JSON byte array [1,2,3,...] or base58 secret key.
 */
export function loadFaucetKeypair(): Keypair {
  if (_faucetKeypair) return _faucetKeypair;

  const raw = process.env.FAUCET_KEYPAIR || process.env.SYSTEM_KEYPAIR;
  if (!raw) {
    throw new Error(
      "Neither FAUCET_KEYPAIR nor SYSTEM_KEYPAIR env var is set. " +
        "The faucet needs the USDC mint authority keypair. " +
        "Copy from ~/kinship-market-e2e/keypairs/sponsor.json"
    );
  }

  try {
    if (raw.startsWith("[")) {
      const bytes = JSON.parse(raw) as number[];
      _faucetKeypair = Keypair.fromSecretKey(Uint8Array.from(bytes));
    } else {
      // base58 — dynamic import to avoid hard dep on bs58
      const { default: bs58 } = require("bs58") as { default: { decode: (s: string) => Uint8Array } };
      _faucetKeypair = Keypair.fromSecretKey(bs58.decode(raw));
    }
  } catch (err) {
    throw new Error(
      `Failed to parse faucet keypair: ${(err as Error).message}. ` +
        "Must be a JSON byte array or base58 string."
    );
  }

  return _faucetKeypair;
}

// ── USDC mint resolution ────────────────────────────────────────────────

/**
 * Resolve the USDC mint address for faucet operations.
 * Priority: USDC_MINT_ADDRESS env → mainnet USDC address (EPjFWdd5…).
 *
 * On local validators with `prepare-usdc`, the mainnet USDC address is
 * cloned with sponsor/faucet as mint authority. This function returns
 * that same address so `mintTo` targets the correct mint.
 */
export function resolveFaucetUsdcMint(): PublicKey {
  const fromEnv = getUsdcMint();
  if (fromEnv) return new PublicKey(fromEnv);
  return MAINNET_USDC_MINT;
}

// ── Environment gate ────────────────────────────────────────────────────

/**
 * Returns true if the faucet should be operational.
 * Rejects on mainnet — no airdrop faucet and USDC mint authority
 * belongs to Circle, not us.
 */
export function isFaucetAllowed(): boolean {
  const env = getEnvironment();
  if (env === "mainnet") return false;

  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "";
  if (rpc.includes("mainnet-beta") || rpc.includes("mainnet.")) return false;

  return true;
}

// ── SOL airdrop ─────────────────────────────────────────────────────────

export interface AirdropResult {
  success: boolean;
  signature?: string;
  balance?: number;
  error?: string;
}

/**
 * Airdrop SOL to a wallet. Only works on local/devnet validators.
 *
 * Uses polling-based confirmation (getSignatureStatuses) instead of the
 * deprecated confirmTransaction(sig, commitment) which relies on blockhash
 * expiry and times out on local validators with fast slot advancement.
 */
export async function airdropSol(
  wallet: PublicKey,
  solAmount: number,
): Promise<AirdropResult> {
  const connection = getConnection();
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  try {
    const signature = await connection.requestAirdrop(wallet, lamports);

    // Poll for confirmation — the airdrop tx lands quickly on local validators
    // but confirmTransaction's blockhash-based wait often times out because
    // the blockhash ages out before the websocket notification arrives.
    const confirmed = await pollSignatureStatus(connection, signature, 15_000);
    if (!confirmed) {
      // The airdrop likely landed — check balance directly before reporting failure.
      const balanceLamports = await connection.getBalance(wallet);
      const balance = balanceLamports / LAMPORTS_PER_SOL;
      return { success: true, signature, balance };
    }

    const balanceLamports = await connection.getBalance(wallet);
    const balance = balanceLamports / LAMPORTS_PER_SOL;

    return { success: true, signature, balance };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message?.split("\n")[0] || "Airdrop failed",
    };
  }
}

/**
 * Poll getSignatureStatuses until confirmed or timeout.
 * Returns true if confirmed, false if timed out (tx may still land).
 */
async function pollSignatureStatus(
  connection: Connection,
  signature: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1_000));
    try {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value?.[0];
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        return true;
      }
      if (status?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
    } catch (err) {
      // If it's our own thrown error, re-throw
      if ((err as Error).message?.startsWith("Transaction failed:")) throw err;
      // Otherwise RPC hiccup — keep polling
    }
  }
  return false;
}

// ── USDC mint ───────────────────────────────────────────────────────────

export interface MintUsdcResult {
  success: boolean;
  signature?: string;
  balance?: number;
  error?: string;
}

/**
 * Mint USDC to a wallet using the faucet keypair as mint authority.
 * Creates the recipient's ATA if it doesn't exist.
 */
export async function mintUsdc(
  wallet: PublicKey,
  usdcAmount: number,
): Promise<MintUsdcResult> {
  const connection = getConnection();

  let faucetKeypair: Keypair;
  try {
    faucetKeypair = loadFaucetKeypair();
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }

  const usdcMint = resolveFaucetUsdcMint();
  const rawAmount = BigInt(usdcAmount) * BigInt(10) ** BigInt(DECIMALS.usdc);

  try {
    // Detect the token program for this mint (Token vs Token-2022)
    const mintInfo = await connection.getAccountInfo(usdcMint);
    if (!mintInfo) {
      return {
        success: false,
        error: `USDC mint not found on-chain: ${usdcMint.toBase58()}. Is the validator running with prepare-usdc?`,
      };
    }
    const tokenProgram = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    // ── Pre-flight: verify faucet keypair is the mint authority ──────
    // This prevents a confusing "Simulation failed" error when the
    // FAUCET_KEYPAIR doesn't match the keypair used in prepare-usdc.
    const parsedMint = await connection.getParsedAccountInfo(usdcMint);
    const mintData = (parsedMint.value?.data as any)?.parsed?.info;
    if (mintData) {
      const onChainAuthority = mintData.mintAuthority ?? null;
      const faucetPubkey = faucetKeypair.publicKey.toBase58();
      if (onChainAuthority && onChainAuthority !== faucetPubkey) {
        return {
          success: false,
          error:
            `Faucet keypair (${faucetPubkey.slice(0, 8)}…) is not the USDC mint authority. ` +
            `On-chain authority: ${onChainAuthority.slice(0, 8)}… — ` +
            `Set FAUCET_KEYPAIR in .env to the e2e sponsor keypair from kinship-market-e2e/keypairs/sponsor.json`,
        };
      }
    }

    // Derive recipient ATA
    const recipientAta = getAssociatedTokenAddressSync(
      usdcMint,
      wallet,
      true, // allowOwnerOffCurve — supports PDAs
      tokenProgram,
    );

    // Build transaction: create ATA (idempotent) + mintTo
    const tx = new Transaction();

    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        faucetKeypair.publicKey, // payer for ATA rent
        recipientAta,
        wallet,
        usdcMint,
        tokenProgram,
      ),
    );

    tx.add(
      createMintToInstruction(
        usdcMint,
        recipientAta,
        faucetKeypair.publicKey, // mint authority
        rawAmount,
        [],
        tokenProgram,
      ),
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = faucetKeypair.publicKey;

    // Sign manually and send raw — avoids sendAndConfirmTransaction's
    // blockhash-based confirmation which times out on local validators.
    tx.sign(faucetKeypair);
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    // Poll for confirmation
    await pollSignatureStatus(connection, signature, 15_000);

    // Read new balance
    const balanceInfo = await connection.getTokenAccountBalance(recipientAta);
    const balance = Number(balanceInfo.value.uiAmount ?? 0);

    return { success: true, signature, balance };
  } catch (err) {
    const msg = (err as Error).message ?? String(err);

    // Detect simulation failure — usually means wrong mint authority or
    // the faucet keypair doesn't have enough SOL for fees.
    if (msg.includes("Simulation failed") || msg.includes("simulation failed")) {
      return {
        success: false,
        error:
          "Transaction simulation failed. Most likely the FAUCET_KEYPAIR is not the USDC mint authority, " +
          "or it has no SOL for transaction fees. " +
          "Set FAUCET_KEYPAIR in .env to the keypair from kinship-market-e2e/keypairs/sponsor.json " +
          "and ensure it has SOL (airdrop first).",
      };
    }

    // Detect common failure: not the mint authority
    if (msg.includes("owner does not match") || msg.includes("mint authority")) {
      return {
        success: false,
        error:
          "Faucet keypair is not the USDC mint authority. " +
          "Set FAUCET_KEYPAIR in .env to the keypair from kinship-market-e2e/keypairs/sponsor.json",
      };
    }

    return {
      success: false,
      error: msg.split("\n")[0] || "USDC mint failed",
    };
  }
}