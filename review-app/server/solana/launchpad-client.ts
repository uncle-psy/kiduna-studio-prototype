/**
 * launchpad-client.ts
 *
 * Client wrapper for MetaDAO Launchpad v0.7 program.
 * Wraps the SDK's LaunchpadClient from @metadaoproject/futarchy/v0.7.
 *
 * Place at: server/solana/launchpad-client.ts
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  LaunchpadClient as SdkLaunchpadClient,
} from "@metadaoproject/futarchy/v0.7";
import {
  LAUNCHPAD_PROGRAM_ID,
  MAINNET_USDC_MINT,
  InitializeLaunchArgs,
  findLaunchPda,
  findLaunchSignerPda,
  findFundingRecordPda,
} from "./launchpad-types";
import { getUsdcMint } from "./connection";
import { getPriorityFee } from "./priority-fee";

// Metaplex Token Metadata program
const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/**
 * Compute-budget instructions (limit + priority fee) to prepend to a tx.
 *
 * The priority fee is Helius's network-aware getPriorityFeeEstimate (scoped to
 * the instruction's writable accounts), clamped to [floor, cap] — falling back
 * to the static floor on a non-Helius RPC. Without an adequate fee a tx can sit
 * unscheduled under mainnet congestion until its blockhash expires ("block
 * height exceeded"). Tune floor/cap via env (see priority-fee.ts).
 */
async function computeBudgetIxsFor(
  ix: TransactionInstruction,
  units: number,
  level: "Medium" | "High" | "VeryHigh" = "High",
) {
  const writable = ix.keys.filter((k) => k.isWritable).map((k) => k.pubkey.toBase58());
  const fee = await getPriorityFee(writable, level);
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fee }),
  ];
}

/** Resolve USDC mint from env, falling back to mainnet address. */
function resolveDefaultUsdcMint(): PublicKey {
  const addr = getUsdcMint();
  if (addr) return new PublicKey(addr);
  return MAINNET_USDC_MINT;
}

export interface LaunchpadClientConfig {
  connection: Connection;
  /** Path to launchpad IDL JSON file (not used in v0.7 — SDK has built-in IDL) */
  idlPath?: string;
  /** USDC mint address (default: from USDC_MINT_ADDRESS env var) */
  usdcMint?: PublicKey;
}

/**
 * Client for MetaDAO Launchpad v0.7 program.
 *
 * Wraps the SDK's LaunchpadClient and adds transaction-building helpers
 * that return unsigned Transaction objects for browser signing.
 */
export class LaunchpadClient {
  private sdk: SdkLaunchpadClient;
  private connection: Connection;
  private usdcMint: PublicKey;

  private constructor(
    sdk: SdkLaunchpadClient,
    connection: Connection,
    usdcMint: PublicKey,
  ) {
    this.sdk = sdk;
    this.connection = connection;
    this.usdcMint = usdcMint;
  }

  /**
   * Create a LaunchpadClient instance.
   */
  static async create(config: LaunchpadClientConfig): Promise<LaunchpadClient> {
    const { connection, usdcMint } = config;

    // Create a stub provider — we don't sign server-side
    const stubWallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: async <T>(tx: T) => tx,
      signAllTransactions: async <T>(txs: T[]) => txs,
    };
    const provider = new AnchorProvider(connection, stubWallet as any, {
      commitment: "confirmed",
    });

    const sdk = SdkLaunchpadClient.createClient({ provider });

    return new LaunchpadClient(
      sdk,
      connection,
      usdcMint ?? resolveDefaultUsdcMint(),
    );
  }

  /** Access the underlying Anchor program for account fetches */
  get program() {
    return this.sdk.launchpad;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Initialize Launch
  // ═══════════════════════════════════════════════════════════════════

  async buildInitializeLaunch(
    args: InitializeLaunchArgs,
    sponsor: PublicKey,
    baseMint: PublicKey,
    launchAuthority?: PublicKey,
    additionalTokensRecipient?: PublicKey,
  ): Promise<{
    transaction: Transaction;
    launchPda: string;
    launchSignerPda: string;
  }> {
    const [launchPda] = findLaunchPda(baseMint);
    const [launchSignerPda] = findLaunchSignerPda(launchPda);
    const authority = launchAuthority ?? sponsor;

    const builder = this.sdk.initializeLaunchIx({
      tokenName: args.tokenName,
      tokenSymbol: args.tokenSymbol,
      tokenUri: args.tokenUri,
      minimumRaiseAmount: args.minimumRaiseAmount,
      secondsForLaunch: args.secondsForLaunch,
      baseMint,
      quoteMint: this.usdcMint,
      monthlySpendingLimitAmount: args.monthlySpendingLimitAmount,
      monthlySpendingLimitMembers: args.monthlySpendingLimitMembers,
      performancePackageGrantee: args.performancePackageGrantee,
      performancePackageTokenAmount: args.performancePackageTokenAmount,
      monthsUntilInsidersCanUnlock: args.monthsUntilInsidersCanUnlock,
      teamAddress: args.teamAddress,
      launchAuthority: authority,
      payer: sponsor,
      additionalTokensRecipient: additionalTokensRecipient,
      additionalTokensAmount: args.additionalTokensAmount,
      accumulatorActivationDelaySeconds: args.accumulatorActivationDelaySeconds,
      hasBidWall: args.hasBidWall,
    });

    const ix = await builder.instruction();
    const tx = new Transaction();
    tx.add(...(await computeBudgetIxsFor(ix, 400_000)));
    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = sponsor;

    return {
      transaction: tx,
      launchPda: launchPda.toBase58(),
      launchSignerPda: launchSignerPda.toBase58(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Start Launch
  // ═══════════════════════════════════════════════════════════════════

  async buildStartLaunch(
    launchPda: PublicKey,
    sponsor: PublicKey,
  ): Promise<Transaction> {
    const builder = this.sdk.startLaunchIx({
      launch: launchPda,
      launchAuthority: sponsor,
    });

    const ix = await builder.instruction();
    const tx = new Transaction();
    tx.add(...(await computeBudgetIxsFor(ix, 400_000)));
    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = sponsor;

    return tx;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Fund (Contribute)
  // ═══════════════════════════════════════════════════════════════════

  async buildFund(
    launchPda: PublicKey,
    funder: PublicKey,
    rawAmount: BN | number,
  ): Promise<Transaction> {
    const builder = this.sdk.fundIx({
      launch: launchPda,
      amount: BN.isBN(rawAmount) ? rawAmount : new BN(rawAmount),
      funder,
      quoteMint: this.usdcMint,
    }).accounts({ payer: funder } as any);

    const ix = await builder.instruction();
    const tx = new Transaction();
    tx.add(...(await computeBudgetIxsFor(ix, 400_000)));
    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = funder;

    return tx;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Close Launch
  // ═══════════════════════════════════════════════════════════════════

  async buildCloseLaunch(
    launchPda: PublicKey,
    payer: PublicKey,
  ): Promise<Transaction> {
    const builder = this.sdk.closeLaunchIx({
      launch: launchPda,
    });

    const ix = await builder.instruction();
    const tx = new Transaction();
    tx.add(...(await computeBudgetIxsFor(ix, 400_000)));
    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = payer;

    return tx;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Set Funding Record Approval
  // ═══════════════════════════════════════════════════════════════════

  async buildSetApproval(
    launchPda: PublicKey,
    funderWallet: PublicKey,
    approvedAmount: BN | number,
    sponsor: PublicKey,
  ): Promise<Transaction> {
    const builder = this.sdk.setFundingRecordApprovalIx({
      launch: launchPda,
      funder: funderWallet,
      launchAuthority: sponsor,
      approvedAmount: BN.isBN(approvedAmount) ? approvedAmount : new BN(approvedAmount),
    });

    const ix = await builder.instruction();
    const tx = new Transaction();
    tx.add(...(await computeBudgetIxsFor(ix, 400_000)));
    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = sponsor;

    return tx;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Complete Launch (was "Settle" in v0.8)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Build the completeLaunch instruction using the SDK.
   * Returns the Anchor MethodsBuilder — caller extracts the instruction
   * and wraps it in a V0 transaction with ALT.
   */
  async getCompleteLaunchBuilder(
    launchPda: PublicKey,
    launchAuthority: PublicKey,
  ) {
    // Fetch launch account to get baseMint
    const launchAccount = await this.sdk.getLaunch(launchPda);
    const baseMint = launchAccount.baseMint;

    return {
      builder: this.sdk.completeLaunchIx({
        launch: launchPda,
        baseMint,
        quoteMint: this.usdcMint,
        launchAuthority,
      }).accounts({ payer: launchAuthority } as any),
      baseMint,
      quoteMint: this.usdcMint,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Claim Tokens
  // ═══════════════════════════════════════════════════════════════════

  async buildClaim(
    launchPda: PublicKey,
    funder: PublicKey,
  ): Promise<Transaction> {
    const launchAccount = await this.sdk.getLaunch(launchPda);
    const baseMint = launchAccount.baseMint;

    const builder = this.sdk.claimIx(launchPda, baseMint, funder);

    const ix = await builder.instruction();

    // Ensure funder's base token ATA exists
    const funderAta = getAssociatedTokenAddressSync(baseMint, funder, false);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      funder,
      funderAta,
      funder,
      baseMint,
    );

    const tx = new Transaction();
    tx.add(...(await computeBudgetIxsFor(ix, 400_000)));
    tx.add(createAtaIx);
    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = funder;

    return tx;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Refund USDC
  // ═══════════════════════════════════════════════════════════════════

  async buildRefund(
    launchPda: PublicKey,
    funder: PublicKey,
  ): Promise<Transaction> {
    const builder = this.sdk.refundIx({
      launch: launchPda,
      funder,
      quoteMint: this.usdcMint,
    });

    const ix = await builder.instruction();
    const tx = new Transaction();
    tx.add(...(await computeBudgetIxsFor(ix, 400_000)));
    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = funder;

    return tx;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Extend Launch
  // ═══════════════════════════════════════════════════════════════════

  async buildExtendLaunch(
    launchPda: PublicKey,
    durationSeconds: number,
    admin: PublicKey,
  ): Promise<Transaction> {
    const builder = this.sdk.extendLaunchIx({
      launch: launchPda,
      durationSeconds,
    });

    const ix = await builder.instruction();
    const tx = new Transaction();
    tx.add(...(await computeBudgetIxsFor(ix, 400_000)));
    tx.add(ix);

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = admin;

    return tx;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PDA Helpers (delegates to launchpad-types)
  // ═══════════════════════════════════════════════════════════════════

  getLaunchPda(baseMint: PublicKey): PublicKey {
    const [pda] = findLaunchPda(baseMint);
    return pda;
  }

  getLaunchSignerPda(launchPda: PublicKey): PublicKey {
    const [pda] = findLaunchSignerPda(launchPda);
    return pda;
  }

  getFundingRecordPda(launchPda: PublicKey, funder: PublicKey): PublicKey {
    const [pda] = findFundingRecordPda(launchPda, funder);
    return pda;
  }
}