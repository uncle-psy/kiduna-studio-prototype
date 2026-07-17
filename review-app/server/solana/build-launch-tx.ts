/**
 * Market launch transaction builders — 4 steps.
 *
 * Step 1: Create tokens (mint + distribute base token + mock USDC)
 * Step 2: Create DAO on MetaDAO (futarchy + squads multisig)
 * Step 3: Create Meteora AMM trading pool
 * Step 4: Seed futarchy liquidity + fund treasury
 */
import {
  ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
} from "@solana/web3.js";
import {
  createInitializeMint2Instruction, createMintToInstruction, createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID, AuthorityType, createSetAuthorityInstruction,
} from "@solana/spl-token";
import { FutarchyClient, getDaoAddr } from "@metadaoproject/futarchy/v0.6";
import * as multisig from "@sqds/multisig";
import BN from "bn.js";
import { getConnection, getUsdcMint, isLocal, DECIMALS, makeSponsorProvider } from "./connection";
import { getSystemPublicKey } from "./keypairs";
import { getRecentBlockhash } from "./transactions";
import { getPriorityFeeForIxs } from "./priority-fee";

/* ── Metaplex Token Metadata ───────────────────────────────────────── */

const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METAPLEX_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_METADATA_PROGRAM_ID,
  );
  return pda;
}

/**
 * Build a Metaplex CreateMetadataAccountV3 instruction.
 */
function buildCreateMetadataV3Instruction(args: {
  metadata: PublicKey;
  mint: PublicKey;
  mintAuthority: PublicKey;
  payer: PublicKey;
  updateAuthority: PublicKey;
  name: string;
  symbol: string;
  uri: string;
}): TransactionInstruction {
  const nameBuf = Buffer.from(args.name);
  const symbolBuf = Buffer.from(args.symbol);
  const uriBuf = Buffer.from(args.uri);

  const size = 1 + (4 + nameBuf.length) + (4 + symbolBuf.length) + (4 + uriBuf.length)
    + 2 + 1 + 1 + 1 + 1 + 1;
  const data = Buffer.alloc(size);
  let offset = 0;

  data.writeUInt8(33, offset); offset += 1;
  data.writeUInt32LE(nameBuf.length, offset); offset += 4;
  nameBuf.copy(data, offset); offset += nameBuf.length;
  data.writeUInt32LE(symbolBuf.length, offset); offset += 4;
  symbolBuf.copy(data, offset); offset += symbolBuf.length;
  data.writeUInt32LE(uriBuf.length, offset); offset += 4;
  uriBuf.copy(data, offset); offset += uriBuf.length;
  data.writeUInt16LE(0, offset); offset += 2;
  data.writeUInt8(0, offset); offset += 1;
  data.writeUInt8(0, offset); offset += 1;
  data.writeUInt8(0, offset); offset += 1;
  data.writeUInt8(1, offset); offset += 1;
  data.writeUInt8(0, offset); offset += 1;

  return new TransactionInstruction({
    programId: METAPLEX_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: args.metadata, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: args.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.updateAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/* ── Types ──────────────────────────────────────────────────────────── */

export interface LaunchContext {
  sponsorPubkey: PublicKey;
  agentPubkey: PublicKey;
  tokenConfig: { tokenName: string; ticker: string; decimals: number; totalSupply: number; metadataUri?: string; mode?: "new" | "existing"; existingMint?: string };
  poolConfig: { initialBase: number; initialUsdc: number; treasuryUsdc: number; treasuryBase: number; futarchyLiquidityUsdc: number; futarchyLiquidityBase: number };
  daoConfig: { tradingWindowSeconds: number; passThresholdBps: number; monthlySpendingLimitUsdc: number | null };
}

export interface StepResult {
  serializedTransaction: string;
  addresses: Record<string, string>;
  generatedKeypairs?: Record<string, string>;
  description: string;
}

export interface PreviousStepAddresses {
  baseMint?: string; usdcMint?: string; daoAddress?: string; daoNonce?: string;
  poolAddress?: string; squadsMultisig?: string; squadsVault?: string;
}

export const TOTAL_STEPS = 4;

/* ── Helpers ────────────────────────────────────────────────────────── */

async function resolveTokenProgram(mint: PublicKey): Promise<PublicKey> {
  const connection = getConnection();
  const info = await connection.getAccountInfo(mint);
  if (!info) {
    throw new Error(
      `resolveTokenProgram: mint ${mint.toBase58()} not found on-chain. ` +
      `Has Step 1 completed successfully?`
    );
  }
  return info.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

async function replaceComputeBudget(tx: Transaction, units: number): Promise<void> {
  tx.instructions = tx.instructions.filter(
    (ix) => !ix.programId.equals(ComputeBudgetProgram.programId),
  );
  // Dynamic (Helius) priority fee scoped to the tx's writable accounts.
  const fee = await getPriorityFeeForIxs(tx.instructions, "High");
  tx.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fee }),
  );
}

/* ── Step router ────────────────────────────────────────────────────── */

export async function buildLaunchStep(
  step: number, ctx: LaunchContext, prev: PreviousStepAddresses,
): Promise<StepResult> {
  switch (step) {
    case 1: return buildStep1_CreateTokens(ctx);
    case 2: return buildStep2_CreateDao(ctx, prev);
    case 3: return buildStep3_CreatePool(ctx, prev);
    case 4: return buildStep4_SeedAndFund(ctx, prev);
    default: throw new Error(`Invalid launch step: ${step}`);
  }
}

/* ════════════════════════════════════════════════════════════════════
   Step 1: Create tokens (mint + distribute)
   ════════════════════════════════════════════════════════════════════ */

async function buildStep1_CreateTokens(ctx: LaunchContext): Promise<StepResult> {
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: ctx.sponsorPubkey });
  const addresses: Record<string, string> = {};
  const generatedKeypairs: Record<string, string> = {};

  const isExisting = ctx.tokenConfig.mode === "existing" && ctx.tokenConfig.existingMint;

  // Compute budget (with dynamic Helius priority fee) is set at the end via
  // replaceComputeBudget, once all instructions — and their accounts — exist.

  if (isExisting) {
    /* ── Existing token mode ─────────────────────────────────────────── */
    const existingMintPk = new PublicKey(ctx.tokenConfig.existingMint!);
    addresses.baseMint = existingMintPk.toBase58();

    // Verify mint exists on-chain
    const mintInfo = await connection.getAccountInfo(existingMintPk);
    if (!mintInfo) throw new Error("Existing mint not found on-chain.");

    // Detect token program (legacy SPL Token vs Token-2022)
    const tokenProgramForMint = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    // ── EARLY AUTHORITY CHECK (Problem 10 fix) ─────────────────────
    // Verify sponsor holds mint authority NOW, before Steps 2-3 waste gas.
    // Step 4 will transfer these authorities to the vault, so they must
    // be held by the sponsor at launch time.
    const parsedMint = await connection.getParsedAccountInfo(existingMintPk);
    const mintParsed = (parsedMint.value?.data as any)?.parsed?.info;
    if (mintParsed) {
      const currentMintAuthority = mintParsed.mintAuthority ?? null;
      if (currentMintAuthority !== ctx.sponsorPubkey.toBase58()) {
        throw new Error(
          `Mint authority is not held by your wallet. ` +
          `Current authority: ${currentMintAuthority || "none (revoked)"}. ` +
          `Transfer mint authority to ${ctx.sponsorPubkey.toBase58()} before launching.`
        );
      }
    }

    // Verify sponsor has a token account (ATA) — use detected token program
    const sponsorBaseAta = getAssociatedTokenAddressSync(
      existingMintPk, ctx.sponsorPubkey, false, tokenProgramForMint,
    );
    const ataInfo = await connection.getAccountInfo(sponsorBaseAta);
    if (!ataInfo) {
      // Create ATA if it doesn't exist
      tx.add(createAssociatedTokenAccountIdempotentInstruction(
        ctx.sponsorPubkey, sponsorBaseAta, ctx.sponsorPubkey, existingMintPk, tokenProgramForMint,
      ));
    }

    console.log(`[Step 1] Using existing token: ${existingMintPk.toBase58()} (program: ${tokenProgramForMint.toBase58()})`);
  } else {
    /* ── New token mode (original logic) ─────────────────────────────── */
    const mintKeypair = Keypair.generate();
    addresses.baseMint = mintKeypair.publicKey.toBase58();
    generatedKeypairs.baseMint = Buffer.from(mintKeypair.secretKey).toString("base64");

    // Base token mint — always legacy SPL Token
    tx.add(SystemProgram.createAccount({
      fromPubkey: ctx.sponsorPubkey, newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE, lamports, programId: TOKEN_PROGRAM_ID,
    }));
    tx.add(createInitializeMint2Instruction(
      mintKeypair.publicKey, ctx.tokenConfig.decimals, ctx.sponsorPubkey, ctx.sponsorPubkey, TOKEN_PROGRAM_ID,
    ));

    // Sponsor base ATA + mint supply
    const sponsorBaseAta = getAssociatedTokenAddressSync(
      mintKeypair.publicKey, ctx.sponsorPubkey, false, TOKEN_PROGRAM_ID,
    );
    tx.add(createAssociatedTokenAccountIdempotentInstruction(
      ctx.sponsorPubkey, sponsorBaseAta, ctx.sponsorPubkey, mintKeypair.publicKey, TOKEN_PROGRAM_ID,
    ));
    const rawSupply = new BN(ctx.tokenConfig.totalSupply).mul(new BN(10).pow(new BN(ctx.tokenConfig.decimals)));
    tx.add(createMintToInstruction(
      mintKeypair.publicKey, sponsorBaseAta, ctx.sponsorPubkey, BigInt(rawSupply.toString()), [], TOKEN_PROGRAM_ID,
    ));

    // ── Metaplex token metadata ──────────────────────────────────────
    const metadataPda = findMetadataPda(mintKeypair.publicKey);
    tx.add(buildCreateMetadataV3Instruction({
      metadata: metadataPda,
      mint: mintKeypair.publicKey,
      mintAuthority: ctx.sponsorPubkey,
      payer: ctx.sponsorPubkey,
      updateAuthority: ctx.sponsorPubkey,
      name: ctx.tokenConfig.tokenName,
      symbol: ctx.tokenConfig.ticker,
      uri: ctx.tokenConfig.metadataUri ?? "",
    }));

    // NOTE: DO NOT partialSign here — client will sign with all keypairs
  }

  // Mock USDC (local only) — always legacy SPL Token (for both modes)
  let usdcKeypair: Keypair | null = null;
  const existingUsdc = getUsdcMint();
  if (!existingUsdc && isLocal()) {
    usdcKeypair = Keypair.generate();
    tx.add(SystemProgram.createAccount({
      fromPubkey: ctx.sponsorPubkey, newAccountPubkey: usdcKeypair.publicKey,
      space: MINT_SIZE, lamports, programId: TOKEN_PROGRAM_ID,
    }));
    tx.add(createInitializeMint2Instruction(
      usdcKeypair.publicKey, DECIMALS.usdc, ctx.sponsorPubkey, null, TOKEN_PROGRAM_ID,
    ));
    const sponsorUsdcAta = getAssociatedTokenAddressSync(
      usdcKeypair.publicKey, ctx.sponsorPubkey, false, TOKEN_PROGRAM_ID,
    );
    tx.add(createAssociatedTokenAccountIdempotentInstruction(
      ctx.sponsorPubkey, sponsorUsdcAta, ctx.sponsorPubkey, usdcKeypair.publicKey, TOKEN_PROGRAM_ID,
    ));
    const totalUsdc = ctx.poolConfig.initialUsdc + ctx.poolConfig.treasuryUsdc + ctx.poolConfig.futarchyLiquidityUsdc + 10_000;
    tx.add(createMintToInstruction(
      usdcKeypair.publicKey, sponsorUsdcAta, ctx.sponsorPubkey,
      BigInt(new BN(totalUsdc).mul(new BN(10).pow(new BN(DECIMALS.usdc))).toString()),
      [], TOKEN_PROGRAM_ID,
    ));

    // ── Metaplex metadata for mock USDC ───────────────────────────
    const usdcMetadataPda = findMetadataPda(usdcKeypair.publicKey);
    tx.add(buildCreateMetadataV3Instruction({
      metadata: usdcMetadataPda,
      mint: usdcKeypair.publicKey,
      mintAuthority: ctx.sponsorPubkey,
      payer: ctx.sponsorPubkey,
      updateAuthority: ctx.sponsorPubkey,
      name: "USD Coin",
      symbol: "USDC",
      uri: "",
    }));

    addresses.usdcMint = usdcKeypair.publicKey.toBase58();
    generatedKeypairs.usdcMint = Buffer.from(usdcKeypair.secretKey).toString("base64");
  } else if (existingUsdc) {
    addresses.usdcMint = existingUsdc;
  }

  await replaceComputeBudget(tx, 400_000);

  // NOTE: DO NOT partialSign here — client will sign with all keypairs
  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  return {
    serializedTransaction: serialized.toString("base64"),
    addresses,
    generatedKeypairs,
    description: isExisting
      ? `Using existing token ${ctx.tokenConfig.ticker}${usdcKeypair ? " + mock USDC" : ""}`
      : `Creating ${ctx.tokenConfig.ticker} token with metadata${usdcKeypair ? " + mock USDC" : ""}, distributing supply`,
  };
}

/* ════════════════════════════════════════════════════════════════════
   Step 2: Create MetaDAO Futarchy DAO
   ════════════════════════════════════════════════════════════════════ */

async function buildStep2_CreateDao(ctx: LaunchContext, prev: PreviousStepAddresses): Promise<StepResult> {
  if (!prev.baseMint) throw new Error("Step 2 requires baseMint from Step 1.");
  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
  const baseMint = new PublicKey(prev.baseMint);
  const usdcMintStr = prev.usdcMint || getUsdcMint();
  if (!usdcMintStr) throw new Error("No USDC mint configured.");
  const quoteMint = new PublicKey(usdcMintStr);
  const nonce = new BN(Date.now());

  const provider = makeSponsorProvider(ctx.sponsorPubkey);
  const futarchy = FutarchyClient.createClient({ provider });

  // FIX: Use ctx.tokenConfig.decimals for base token instead of hardcoded DECIMALS.base
  const baseDecimals = ctx.tokenConfig.decimals;

  const params = {
    twapInitialObservation: new BN("1000000000000"),
    twapMaxObservationChangePerUpdate: new BN("100000000000"),
    twapStartDelaySeconds: 0,
    minQuoteFutarchicLiquidity: new BN(1000).mul(new BN(10).pow(new BN(DECIMALS.usdc))),
    minBaseFutarchicLiquidity: new BN(1000).mul(new BN(10).pow(new BN(baseDecimals))),
    baseToStake: new BN(0),
    passThresholdBps: ctx.daoConfig.passThresholdBps,
    teamSponsoredPassThresholdBps: ctx.daoConfig.passThresholdBps,
    teamAddress: ctx.sponsorPubkey,
    secondsPerProposal: ctx.daoConfig.tradingWindowSeconds,
    nonce,
    initialSpendingLimit: ctx.daoConfig.monthlySpendingLimitUsdc != null
      ? {
          amountPerMonth: new BN(ctx.daoConfig.monthlySpendingLimitUsdc).mul(new BN(10).pow(new BN(DECIMALS.usdc))),
          members: [ctx.sponsorPubkey],
        }
      : null,
  };

  const ix = await futarchy.initializeDaoIx({ baseMint, quoteMint, params, provideLiquidity: false }).instruction();
  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: ctx.sponsorPubkey });
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }));
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: await getPriorityFeeForIxs([ix], "High") }));
  tx.add(ix);

  const [daoAddr] = getDaoAddr({ nonce, daoCreator: ctx.sponsorPubkey });
  const [multisigPda] = multisig.getMultisigPda({ createKey: daoAddr });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  return {
    serializedTransaction: serialized.toString("base64"),
    addresses: {
      daoAddress: daoAddr.toBase58(),
      daoNonce: nonce.toString(),
      squadsMultisig: multisigPda.toBase58(),
      squadsVault: vaultPda.toBase58(),
      quoteMint: quoteMint.toBase58(),
    },
    description: "Creating MetaDAO Futarchy DAO with multisig treasury",
  };
}

/* ════════════════════════════════════════════════════════════════════
   Step 3: Create Meteora AMM pool
   FIX: Uses ctx.tokenConfig.decimals instead of hardcoded DECIMALS.base
   ════════════════════════════════════════════════════════════════════ */

async function buildStep3_CreatePool(ctx: LaunchContext, prev: PreviousStepAddresses): Promise<StepResult> {
  if (!prev.baseMint) throw new Error("Step 3 requires baseMint.");

  if (isLocal()) {
    console.warn(
      "[Step 3] Running on localnet. If this step fails with " +
      "'Failed to reallocate account data', your validator is missing " +
      "the devnet Token-2022 binary. Run:\n\n" +
      "  solana-test-validator --reset \\\n" +
      "    --url https://api.devnet.solana.com \\\n" +
      "    --clone TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\\n" +
      "    --clone cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG\n\n" +
      "Or use the provided scripts/start-validator.sh script.",
    );
  }

  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
  const connection = getConnection();
  const baseMint = new PublicKey(prev.baseMint);
  const quoteMint = new PublicKey(prev.usdcMint || getUsdcMint()!);

  // FIX: Use ctx.tokenConfig.decimals for base token instead of hardcoded DECIMALS.base
  const baseDecimals = ctx.tokenConfig.decimals;

  const {
    CpAmm, CollectFeeMode, ActivationType,
    MIN_SQRT_PRICE, MAX_SQRT_PRICE, BaseFeeMode, getBaseFeeParams,
  } = await import("@meteora-ag/cp-amm-sdk");
  const cpAmm = new CpAmm(connection);

  // FIX: Use baseDecimals (from user config) instead of DECIMALS.base (hardcoded)
  const tokenAAmount = new BN(ctx.poolConfig.initialBase).mul(new BN(10).pow(new BN(baseDecimals)));
  const tokenBAmount = new BN(ctx.poolConfig.initialUsdc).mul(new BN(10).pow(new BN(DECIMALS.usdc)));

  const prepared = cpAmm.preparePoolCreationParams({
    tokenAAmount,
    tokenBAmount,
    minSqrtPrice: MIN_SQRT_PRICE,
    maxSqrtPrice: MAX_SQRT_PRICE,
    collectFeeMode: CollectFeeMode.BothToken,
  });

  const positionNft = Keypair.generate();
  const baseFee = getBaseFeeParams(
    {
      baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
      feeTimeSchedulerParam: {
        startingFeeBps: 25,
        endingFeeBps: 25,
        numberOfPeriod: 0,
        totalDuration: 0,
      },
    },
    DECIMALS.usdc,
    ActivationType.Timestamp,
  );

  const { tx: poolTx, pool } = await cpAmm.createCustomPool({
    payer: ctx.sponsorPubkey,
    creator: ctx.sponsorPubkey,
    positionNft: positionNft.publicKey,
    tokenAMint: baseMint,
    tokenBMint: quoteMint,
    tokenAAmount,
    tokenBAmount,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    liquidityDelta: prepared.liquidityDelta,
    initSqrtPrice: prepared.initSqrtPrice,
    poolFees: { baseFee, compoundingFeeBps: 0, padding: 0, dynamicFee: null },
    hasAlphaVault: false,
    activationType: ActivationType.Timestamp,
    collectFeeMode: CollectFeeMode.BothToken,
    activationPoint: null,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
    isLockLiquidity: false,
  });

  await replaceComputeBudget(poolTx, 1_400_000);

  poolTx.recentBlockhash = blockhash;
  poolTx.lastValidBlockHeight = lastValidBlockHeight;
  poolTx.feePayer = ctx.sponsorPubkey;
  // NOTE: DO NOT partialSign here — client will sign with all keypairs

  const serialized = poolTx.serialize({ requireAllSignatures: false, verifySignatures: false });

  return {
    serializedTransaction: serialized.toString("base64"),
    addresses: { poolAddress: pool.toBase58() },
    generatedKeypairs: { positionNft: Buffer.from(positionNft.secretKey).toString("base64") },
    description: "Creating Meteora AMM trading pool",
  };
}

/* ════════════════════════════════════════════════════════════════════
   Step 4: Seed futarchy liquidity + fund treasury
   FIX: Uses ctx.tokenConfig.decimals instead of hardcoded DECIMALS.base
   ════════════════════════════════════════════════════════════════════ */

async function buildStep4_SeedAndFund(ctx: LaunchContext, prev: PreviousStepAddresses): Promise<StepResult> {
  if (!prev.daoAddress) throw new Error("Step 4 requires daoAddress from Step 2.");
  if (!prev.squadsVault) throw new Error("Step 4 requires squadsVault from Step 2.");
  if (!prev.baseMint) throw new Error("Step 4 requires baseMint.");

  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();
  const baseMint = new PublicKey(prev.baseMint);
  const quoteMint = new PublicKey(prev.usdcMint || getUsdcMint()!);
  const dao = new PublicKey(prev.daoAddress);
  const vaultPda = new PublicKey(prev.squadsVault);

  // FIX: Use ctx.tokenConfig.decimals for base token instead of hardcoded DECIMALS.base
  const baseDecimals = ctx.tokenConfig.decimals;

  // ── Resolve actual token programs from on-chain mint owners ─────
  const [tokenProgramBase, tokenProgramQuote] = await Promise.all([
    resolveTokenProgram(baseMint),
    resolveTokenProgram(quoteMint),
  ]);


  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: ctx.sponsorPubkey });
  // Compute budget (dynamic Helius priority fee) is set at the end via
  // replaceComputeBudget, once all instructions exist.

  // ── Part A: Seed futarchy liquidity ─────────────────────────────
  const provider = makeSponsorProvider(ctx.sponsorPubkey);
  const futarchy = FutarchyClient.createClient({ provider });

  const quoteAmount = new BN(ctx.poolConfig.futarchyLiquidityUsdc).mul(new BN(10).pow(new BN(DECIMALS.usdc)));
  // FIX: Use baseDecimals instead of DECIMALS.base
  const maxBaseAmount = new BN(ctx.poolConfig.futarchyLiquidityBase).mul(new BN(10).pow(new BN(baseDecimals)));

  const liquidityIx = await futarchy
    .provideLiquidityIx({ dao, baseMint, quoteMint, quoteAmount, maxBaseAmount })
    .instruction();
  tx.add(liquidityIx);

  // ── Part B: Fund treasury vault USDC ATA ────────────────────────
  const vaultUsdcAta = getAssociatedTokenAddressSync(
    quoteMint,
    vaultPda,
    true,
    tokenProgramQuote,
  );

  tx.add(createAssociatedTokenAccountIdempotentInstruction(
    ctx.sponsorPubkey,
    vaultUsdcAta,
    vaultPda,
    quoteMint,
    tokenProgramQuote,
  ));

  const rawTreasuryAmount = new BN(ctx.poolConfig.treasuryUsdc).mul(new BN(10).pow(new BN(DECIMALS.usdc)));
  tx.add(createMintToInstruction(
    quoteMint,
    vaultUsdcAta,
    ctx.sponsorPubkey,
    BigInt(rawTreasuryAmount.toString()),
    [],
    tokenProgramQuote,
  ));

  // ── Part C: Fund treasury vault with base tokens ────────────────
  if (ctx.poolConfig.treasuryBase > 0) {
    const vaultBaseAta = getAssociatedTokenAddressSync(
      baseMint,
      vaultPda,
      true,
      tokenProgramBase,
    );

    tx.add(createAssociatedTokenAccountIdempotentInstruction(
      ctx.sponsorPubkey,
      vaultBaseAta,
      vaultPda,
      baseMint,
      tokenProgramBase,
    ));

    const sponsorBaseAta = getAssociatedTokenAddressSync(
      baseMint,
      ctx.sponsorPubkey,
      false,
      tokenProgramBase,
    );

    // FIX: Use baseDecimals instead of DECIMALS.base
    const rawTreasuryBase = new BN(ctx.poolConfig.treasuryBase).mul(new BN(10).pow(new BN(baseDecimals)));
    tx.add(createTransferInstruction(
      sponsorBaseAta,
      vaultBaseAta,
      ctx.sponsorPubkey,
      BigInt(rawTreasuryBase.toString()),
      [],
      tokenProgramBase,
    ));
  }

  // ── Part D: Transfer mint + freeze authority to treasury vault ───
  // For existing tokens, verify sponsor is the mint authority before transferring.
  // This was validated in the configure page, but re-check as a safety measure.
  const mintAccountInfo = await connection.getParsedAccountInfo(baseMint);
  const mintParsed = (mintAccountInfo.value?.data as any)?.parsed?.info;
  const currentMintAuthority = mintParsed?.mintAuthority ?? null;
  const currentFreezeAuthority = mintParsed?.freezeAuthority ?? null;

  if (currentMintAuthority === ctx.sponsorPubkey.toBase58()) {
    tx.add(createSetAuthorityInstruction(
      baseMint,
      ctx.sponsorPubkey,
      AuthorityType.MintTokens,
      vaultPda,
      [],
      tokenProgramBase,
    ));
    console.log(`[Step 4] Transferring mint authority to vault`);
  } else {
    console.warn(`[Step 4] Sponsor is NOT mint authority (current: ${currentMintAuthority}). Skipping mint authority transfer.`);
    throw new Error(`Cannot transfer mint authority. Current authority is ${currentMintAuthority}, not your wallet.`);
  }

  if (currentFreezeAuthority === ctx.sponsorPubkey.toBase58()) {
    tx.add(createSetAuthorityInstruction(
      baseMint,
      ctx.sponsorPubkey,
      AuthorityType.FreezeAccount,
      vaultPda,
      [],
      tokenProgramBase,
    ));
    console.log(`[Step 4] Transferring freeze authority to vault`);
  } else if (currentFreezeAuthority) {
    console.warn(`[Step 4] Sponsor is NOT freeze authority (current: ${currentFreezeAuthority}). Skipping freeze authority transfer.`);
  }

  // ── Part E: Transfer Metaplex metadata update authority to vault ──
  const metadataPda = findMetadataPda(baseMint);
  const metadataAccountInfo = await connection.getAccountInfo(metadataPda);

  let currentMetadataAuthority: string | null = null;
  if (metadataAccountInfo && metadataAccountInfo.data.length >= 33) {
    const authorityBytes = metadataAccountInfo.data.subarray(1, 33);
    currentMetadataAuthority = new PublicKey(authorityBytes).toBase58();
  }

  if (currentMetadataAuthority === ctx.sponsorPubkey.toBase58()) {
    const updateAuthTransferData = Buffer.alloc(1 + 1 + 1 + 32 + 1 + 1);
    let off = 0;
    updateAuthTransferData.writeUInt8(15, off); off += 1;  // UpdateMetadataAccountV2
    updateAuthTransferData.writeUInt8(0, off); off += 1;   // no data update
    updateAuthTransferData.writeUInt8(1, off); off += 1;   // has new authority
    vaultPda.toBuffer().copy(updateAuthTransferData, off); off += 32;
    updateAuthTransferData.writeUInt8(0, off); off += 1;   // no primary sale flag
    updateAuthTransferData.writeUInt8(0, off); off += 1;   // no is_mutable flag

    tx.add(new TransactionInstruction({
      programId: METAPLEX_METADATA_PROGRAM_ID,
      keys: [
        { pubkey: metadataPda, isSigner: false, isWritable: true },
        { pubkey: ctx.sponsorPubkey, isSigner: true, isWritable: false },
      ],
      data: updateAuthTransferData,
    }));
    console.log(`[Step 4] Transferring metadata update authority to vault`);
  } else if (currentMetadataAuthority) {
    console.warn(`[Step 4] Sponsor is NOT metadata update authority (current: ${currentMetadataAuthority}). Skipping metadata authority transfer.`);
  } else {
    console.warn(`[Step 4] No metadata account found. Skipping metadata authority transfer.`);
  }

  await replaceComputeBudget(tx, 600_000);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

  return {
    serializedTransaction: serialized.toString("base64"),
    addresses: {},
    description: "Seeding futarchy liquidity, funding treasury, transferring all authorities",
  };
}