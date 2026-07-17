/**
 * Solana connection and Anchor provider helpers.
 *
 * Used by the market launch service to build transactions.
 * Mirrors the pattern from market-e2e/src/connection.ts.
 */
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";

/* ── Simple wallet adapter for Anchor provider (server-side) ────────── */

interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

class NodeWallet implements AnchorWallet {
  constructor(readonly payer: Keypair) {}

  get publicKey() {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.payer);
    } else {
      tx.sign([this.payer]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    for (const tx of txs) {
      await this.signTransaction(tx);
    }
    return txs;
  }
}

/* ── Environment ────────────────────────────────────────────────────── */

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "http://127.0.0.1:8899";

const SOLANA_ENVIRONMENT =
  (process.env.SOLANA_ENVIRONMENT as "local" | "devnet" | "mainnet") ?? "local";

/** USDC mint address per environment. */
const USDC_MINTS: Record<string, string> = {
  // Mainnet USDC (Circle)
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  // Devnet USDC (Circle faucet: https://faucet.circle.com/)
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  // Local validator — we create a mock mint during launch.
  local: "",
};

/* ── Exports ────────────────────────────────────────────────────────── */

/**
 * The current Solana environment.
 */
export function getEnvironment(): "local" | "devnet" | "mainnet" {
  return SOLANA_ENVIRONMENT;
}

/**
 * True if we are running against a local validator.
 */
export function isLocal(): boolean {
  return (
    SOLANA_ENVIRONMENT === "local" ||
    RPC_ENDPOINT.includes("127.0.0.1") ||
    RPC_ENDPOINT.includes("localhost")
  );
}

/**
 * Create a Solana Connection with confirmed commitment.
 */
export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}

/**
 * Get the USDC mint address for the current environment.
 * Returns the override from USDC_MINT_ADDRESS env var if set,
 * otherwise falls back to the per-environment default.
 *
 * Returns null if no USDC mint is configured (local/devnet before
 * a mock mint is created during launch Step 1).
 */
export function getUsdcMint(): string | null {
  const override = process.env.USDC_MINT_ADDRESS;
  if (override) return override;
  return USDC_MINTS[SOLANA_ENVIRONMENT] || null;
}

/**
 * Build an Anchor provider from a keypair.
 * Used server-side when we need to build transactions that reference
 * Anchor program accounts (MetaDAO futarchy, etc.).
 */
export function makeAnchorProvider(signer: Keypair): AnchorProvider {
  const connection = getConnection();
  const wallet = new NodeWallet(signer);
  return new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

/**
 * Build an Anchor provider that uses a specific public key as the "wallet".
 * Used when building unsigned transactions server-side — the SDK needs a
 * wallet public key to set as payer/creator in instructions, but we don't
 * have the private key (it's in the user's Phantom wallet).
 *
 * The wallet stubs out signTransaction since signing happens client-side.
 */
export function makeSponsorProvider(sponsorPubkey: PublicKey): AnchorProvider {
  const connection = getConnection();
  const stubWallet: AnchorWallet = {
    publicKey: sponsorPubkey,
    async signTransaction<T extends Transaction | VersionedTransaction>(tx: T) { return tx; },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]) { return txs; },
  };
  return new AnchorProvider(connection, stubWallet as any, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

/**
 * Build a read-only Anchor provider (no signing capability).
 * Used when we only need to fetch on-chain account data.
 */
export function makeReadOnlyProvider(): AnchorProvider {
  const connection = getConnection();
  const wallet = new NodeWallet(Keypair.generate());
  return new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
}

/** Token decimals — matches the market-e2e convention. */
export const DECIMALS = {
  base: 9,
  usdc: 6,
} as const;

/* ── Treasury balance helper ────────────────────────────────────── */

/**
 * Fetch the USDC balance of a Squads vault on-chain.
 * Returns the balance as a USD number (USDC is 1:1 with USD),
 * or null if the vault/mint is not configured or the account doesn't exist.
 */
export async function getVaultUsdcBalance(
  squadsVault: string | null,
  quoteMint: string | null,
): Promise<number | null> {
  if (!squadsVault) {
    console.log("[treasury] squadsVault is null — market not launched on-chain");
    return null;
  }
  if (!quoteMint) {
    console.log("[treasury] quoteMint is null — USDC mint not configured");
    return null;
  }

  try {
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    const connection = getConnection();

    const vaultPubkey = new PublicKey(squadsVault);
    const mintPubkey = new PublicKey(quoteMint);

    // Derive the vault's USDC ATA (allowOwnerOffCurve for PDA vaults)
    const ata = getAssociatedTokenAddressSync(mintPubkey, vaultPubkey, true);
    console.log(`[treasury] Fetching balance for ATA ${ata.toBase58()} (vault=${squadsVault}, mint=${quoteMint})`);

    const balance = await connection.getTokenAccountBalance(ata);
    console.log(`[treasury] Balance: ${balance.value.uiAmount}`);
    return balance.value.uiAmount ?? 0;
  } catch (err) {
    console.error(`[treasury] Failed to fetch balance:`, (err as Error).message);
    return null;
  }
}

/**
 * Fetch the SOL balance of a Squads vault on-chain.
 * The vault needs SOL for transaction fees when executing proposals.
 * Returns SOL as a number, or null if the vault is not configured.
 */
export async function getVaultSolBalance(
  squadsVault: string | null,
): Promise<number | null> {
  if (!squadsVault) return null;

  try {
    const connection = getConnection();
    const vaultPubkey = new PublicKey(squadsVault);
    const lamports = await connection.getBalance(vaultPubkey);
    return lamports / 1_000_000_000; // LAMPORTS_PER_SOL
  } catch (err) {
    console.error(`[treasury] Failed to fetch SOL balance:`, (err as Error).message);
    return null;
  }
}