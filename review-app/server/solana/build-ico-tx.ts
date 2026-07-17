/**
 * build-ico-tx.ts
 *
 * Higher-level ICO transaction builders.
 * Reads market config, calls LaunchpadClient, returns serialized transactions.
 *
 * Place at: server/solana/build-ico-tx.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { getDaoAddr } from "@metadaoproject/futarchy/v0.6";
import * as multisig from "@sqds/multisig";
import { LaunchpadClient } from "./launchpad-client";
import {
  IcoWizardConfig,
  wizardToInitArgs,
  validateIcoConfig,
  findLaunchPda,
  findLaunchSignerPda,
  findFundingRecordPda,
  REQUIRED_TOKEN_DECIMALS,
  MAINNET_USDC_MINT,
  LAUNCHPAD_PROGRAM_ID,
  TOKENS_TO_PARTICIPANTS,
  TOKEN_SCALE,
} from "./launchpad-types";
import { getConnection, getUsdcMint } from "./connection";
import { getPriorityFee } from "./priority-fee";

/**
 * Resolve the USDC mint for the current environment.
 * Reads from USDC_MINT_ADDRESS env var (set in .env), falls back to
 * the per-environment default in connection.ts, and finally to mainnet USDC.
 */
function resolveUsdcMint(): PublicKey {
  const addr = getUsdcMint();
  if (addr) return new PublicKey(addr);
  return MAINNET_USDC_MINT;
}

// ── Types ───────────────────────────────────────────────────────────

export interface IcoStepResult {
  serializedTransaction: string;
  description: string;
  addresses: Record<string, string>;
  generatedKeypairs?: Record<string, string>;
}

// ── Step 0: Create Base Mint ────────────────────────────────────────
/**
 * Creates an empty SPL mint with decimals=6, supply=0.
 * Mint authority is set to the launch_signer PDA (derived from the mint).
 *
 * This MUST be done BEFORE initializeLaunch because the program
 * requires the mint to already exist with supply=0.
 */
export async function buildCreateBaseMint(
  sponsor: PublicKey,
): Promise<IcoStepResult> {
  const connection = getConnection();
  const mintKeypair = Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;

  // Derive launch PDA and launch_signer PDA from the mint
  const [launchPda] = findLaunchPda(mintPubkey);
  const [launchSignerPda] = findLaunchSignerPda(launchPda);

  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const tx = new Transaction();

  // Create mint account
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: sponsor,
      newAccountPubkey: mintPubkey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  // Initialize mint: decimals=6, authority=launch_signer PDA
  tx.add(
    createInitializeMint2Instruction(
      mintPubkey,
      REQUIRED_TOKEN_DECIMALS,
      launchSignerPda, // mint authority = launch_signer PDA (program requirement)
      null, // no freeze authority
      TOKEN_PROGRAM_ID,
    ),
  );

  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = sponsor;

  // DO NOT partialSign — client will sign with both sponsor + mintKeypair
  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: "Creating base token mint (6 decimals, supply=0)",
    addresses: {
      baseMint: mintPubkey.toBase58(),
      launchPda: launchPda.toBase58(),
      launchSignerPda: launchSignerPda.toBase58(),
    },
    // Client needs this keypair to sign the createAccount instruction
    generatedKeypairs: {
      baseMint: Buffer.from(mintKeypair.secretKey).toString("base64"),
    },
  };
}

// ── Step 1: Initialize Launch ───────────────────────────────────────
/**
 * Calls initializeLaunch on the launchpad program.
 * Creates launch account, mints tokens, sets up metadata.
 *
 * Pre-requisite: baseMint must exist (from Step 0).
 */
export async function buildInitializeLaunch(
  sponsor: PublicKey,
  baseMint: PublicKey,
  config: IcoWizardConfig,
  idlPath: string,
): Promise<IcoStepResult> {
  // Validate config
  const errors = validateIcoConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid ICO config:\n${errors.join("\n")}`);
  }

  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });

  const args = wizardToInitArgs(config);
  const launchAuthority = sponsor; // founder = launch authority

  const additionalRecipient = config.additionalTokensRecipient
    ? new PublicKey(config.additionalTokensRecipient)
    : undefined;

  const { transaction, launchPda, launchSignerPda } = await client.buildInitializeLaunch(
    args,
    sponsor,
    baseMint,
    launchAuthority,
    additionalRecipient,
  );

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: "Initializing ICO launch on MetaDAO",
    addresses: {
      launchPda,
      launchSignerPda,
      baseMint: baseMint.toBase58(),
    },
  };
}

// ── Step 2: Start Launch ────────────────────────────────────────────
/**
 * Opens the contribution window.
 */
export async function buildStartLaunch(
  sponsor: PublicKey,
  launchPda: PublicKey,
  idlPath: string,
): Promise<IcoStepResult> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });

  const tx = await client.buildStartLaunch(launchPda, sponsor);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: "Starting ICO — contribution window is now open",
    addresses: {},
  };
}

// ── Step 3: Fund (Contribute USDC) ──────────────────────────────────
/**
 * Contributor commits USDC to the ICO.
 *
 * @param funder - Contributor wallet
 * @param launchPda - Launch account address
 * @param amountUsdc - USDC amount in WHOLE units (e.g., 500 = 500 USDC)
 */
export async function buildFund(
  funder: PublicKey,
  launchPda: PublicKey,
  amountUsdc: number,
  idlPath: string,
): Promise<IcoStepResult> {
  if (amountUsdc <= 0) throw new Error("Amount must be > 0");

  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });

  // Convert whole USDC to raw (6 decimals)
  const rawAmount = new BN(amountUsdc).mul(new BN(1_000_000));

  const tx = await client.buildFund(launchPda, funder, rawAmount);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: `Contributing ${amountUsdc.toLocaleString()} USDC to ICO`,
    addresses: {},
  };
}

// ── Step 4: Close Launch ────────────────────────────────────────────
export async function buildCloseLaunch(
  payer: PublicKey,
  launchPda: PublicKey,
  idlPath: string,
): Promise<IcoStepResult> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });

  const tx = await client.buildCloseLaunch(launchPda, payer);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: "Closing ICO contribution window",
    addresses: {},
  };
}

// ── Step 5: Approve Funding Record ──────────────────────────────────
export async function buildApproveFunding(
  launchAuthority: PublicKey,
  launchPda: PublicKey,
  funderWallet: PublicKey,
  approvedAmountUsdc: number,
  idlPath: string,
): Promise<IcoStepResult> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });

  const [fundingRecord] = findFundingRecordPda(launchPda, funderWallet);
  const rawAmount = new BN(approvedAmountUsdc).mul(new BN(1_000_000));

  const tx = await client.buildSetApproval(
    launchPda,
    funderWallet,
    rawAmount,
    launchAuthority,
  );

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: `Approving ${approvedAmountUsdc.toLocaleString()} USDC for ${funderWallet.toBase58().slice(0, 8)}...`,
    addresses: {
      fundingRecord: fundingRecord.toBase58(),
    },
  };
}

// ── Step 6: Complete Launch (v0.7 SDK) ─────────────────────────────
// Uses the SDK's completeLaunchIx which handles all 47 accounts,
// PDA derivations, nested structs, and CPI setup internally.
//
export async function buildSettleLaunch(
  payer: PublicKey,
  launchPda: PublicKey,
  idlPath: string,
): Promise<IcoStepResult> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({
    connection,
    idlPath,
    usdcMint: resolveUsdcMint(),
  });

  // Step 1 only creates the ALT — the completeLaunch instruction
  // is built in step 2 (buildSettleWithAlt) after the ALT is on-chain.

  // Create ALT with static addresses
  const { AddressLookupTableProgram } = await import("@solana/web3.js");

  const recentSlot = await connection.getSlot("finalized");
  const [createAltIx, altAddress] = AddressLookupTableProgram.createLookupTable({
    authority: payer,
    payer: payer,
    recentSlot,
  });

  // Collect static addresses for ALT (programs + known PDAs)
  const FUTARCHY = new PublicKey("FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq");
  const SQUADS = new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf");
  const METEORA = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");
  const BID_WALL = new PublicKey("WALL8ucBuUyL46QYxwYJjidaFYhdvxUFrgvBxPshERx");
  const METAPLEX = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const TOKEN_PROGRAM_ADDR = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const ATA_PROGRAM_ADDR = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
  const METADAO_VAULT = new PublicKey("6awyHMshBGVjJ3ozdSJdyyDE1CTAXUwrpNMaRGMsb4sf");

  const [futarchyEventAuth] = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], FUTARCHY);
  const [bidWallEventAuth] = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], BID_WALL);
  const [meteoraEventAuth] = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], METEORA);
  const [launchpadEventAuth] = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], LAUNCHPAD_PROGRAM_ID);
  const [squadsProgramConfig] = PublicKey.findProgramAddressSync([Buffer.from("multisig"), Buffer.from("program_config")], SQUADS);
  const squadsProgramConfigTreasury = new PublicKey("5DH2e3cJmFpyi6mk65EGFediunm4ui6BiKNUNrhWtD1b");

  const staticAddresses = [
    LAUNCHPAD_PROGRAM_ID, FUTARCHY, SQUADS, METEORA, BID_WALL, METAPLEX,
    TOKEN_PROGRAM_ADDR, ATA_PROGRAM_ADDR, PublicKey.default, TOKEN_2022,
    METADAO_VAULT,
    futarchyEventAuth, bidWallEventAuth, meteoraEventAuth,
    launchpadEventAuth, squadsProgramConfig, squadsProgramConfigTreasury,
  ];

  const extendIx = AddressLookupTableProgram.extendLookupTable({
    payer: payer,
    authority: payer,
    lookupTable: altAddress,
    addresses: staticAddresses,
  });

  const altTx = new Transaction();
  // Priority fee (Helius network-aware, clamped) so the ALT-creation tx lands.
  const altPriorityFee = await getPriorityFee([payer.toBase58(), launchPda.toBase58()], "High");
  altTx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: altPriorityFee }));
  altTx.add(createAltIx, extendIx);
  const { blockhash: bh1, lastValidBlockHeight: lv1 } = await connection.getLatestBlockhash();
  altTx.recentBlockhash = bh1;
  altTx.lastValidBlockHeight = lv1;
  altTx.feePayer = payer;

  // Derive DAO address for the response
  const launchAccount = await client.program.account.launch.fetch(launchPda);
  const launchSigner = launchAccount.launchSigner as PublicKey;
  const [dao] = getDaoAddr({ nonce: new BN(0), daoCreator: launchSigner });
  const [squadsMultisig] = multisig.getMultisigPda({ createKey: dao });
  const [squadsMultisigVault] = multisig.getVaultPda({ multisigPda: squadsMultisig, index: 0 });

  return {
    serializedTransaction: altTx.serialize({ requireAllSignatures: false }).toString("base64"),
    description: "Step 1/2: Create Address Lookup Table for complete launch",
    addresses: {
      altAddress: altAddress.toBase58(),
      dao: dao.toBase58(),
      squadsMultisig: squadsMultisig.toBase58(),
      squadsMultisigVault: squadsMultisigVault.toBase58(),
    },
  };
}

// ── Step 6b: Build V0 completeLaunch with ALT ──────────────────────
export async function buildSettleWithAlt(
  payer: PublicKey,
  launchPda: PublicKey,
  altAddress: PublicKey,
  idlPath: string,
): Promise<IcoStepResult> {
  const { MessageV0, VersionedTransaction, AddressLookupTableAccount } = await import("@solana/web3.js");
  const connection = getConnection();

  // Fetch the ALT
  const altAccountInfo = await connection.getAccountInfo(altAddress);
  if (!altAccountInfo) throw new Error("ALT account not found. Submit the ALT creation tx first and wait a moment.");
  const alt = new AddressLookupTableAccount({
    key: altAddress,
    state: AddressLookupTableAccount.deserialize(altAccountInfo.data),
  });

  // Build the completeLaunch instruction via SDK
  const client = await LaunchpadClient.create({ connection, idlPath, usdcMint: resolveUsdcMint() });
  const { builder } = await client.getCompleteLaunchBuilder(launchPda, payer);

  // The SDK's completeLaunchIx builds the full 47-account instruction
  const completeLaunchIx = await builder.instruction();

  // Priority fee for the heaviest tx on the platform — use Helius's network-
  // aware estimate at VeryHigh (scoped to the writable accounts it touches),
  // clamped to [floor, cap]. This is what lets the 1.4M-CU settle land under
  // mainnet congestion instead of sitting unscheduled.
  const settleAccounts = completeLaunchIx.keys.filter((k) => k.isWritable).map((k) => k.pubkey.toBase58());
  const settlePriorityFee = await getPriorityFee(settleAccounts, "VeryHigh");

  // Build V0 message with ALT
  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = MessageV0.compile({
    payerKey: payer,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ComputeBudgetProgram.requestHeapFrame({ bytes: 255 * 1024 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: settlePriorityFee }),
      completeLaunchIx,
    ],
    recentBlockhash: blockhash,
    addressLookupTableAccounts: [alt],
  });

  const v0tx = new VersionedTransaction(messageV0);

  // Derive addresses for the response
  const launchAccount = await client.program.account.launch.fetch(launchPda);
  const baseMint = launchAccount.baseMint as PublicKey;
  const quoteMint = launchAccount.quoteMint as PublicKey;
  const launchSigner = launchAccount.launchSigner as PublicKey;
  const [dao] = getDaoAddr({ nonce: new BN(0), daoCreator: launchSigner });
  const [squadsMultisig] = multisig.getMultisigPda({ createKey: dao });
  const [squadsMultisigVault] = multisig.getVaultPda({ multisigPda: squadsMultisig, index: 0 });

  // Derive Meteora pool PDA
  const METEORA = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");
  const meteoraConfig = new PublicKey("FaA6RM9enPh1tU9Y8LiGCq715JubLc49WGcYTdNvDfsc");
  const maxKey = baseMint.toBuffer().compare(quoteMint.toBuffer()) > 0 ? baseMint : quoteMint;
  const minKey = baseMint.toBuffer().compare(quoteMint.toBuffer()) > 0 ? quoteMint : baseMint;
  const [pool] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), meteoraConfig.toBuffer(), maxKey.toBuffer(), minKey.toBuffer()],
    METEORA,
  );

  // Derive the spending limit PDA deterministically.
  // From the MetaDAO futarchy source (initialize_dao.rs), the spending limit
  // is created with createKey = dao.key(). The PDA seeds are:
  //   ["multisig", squadsMultisig, "spending_limit", daoAddress]
  // Program: Squads v4
  const SQUADS_PROGRAM = new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf");
  const [spendingLimitPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("multisig"),
      squadsMultisig.toBuffer(),
      Buffer.from("spending_limit"),
      dao.toBuffer(),
    ],
    SQUADS_PROGRAM,
  );

  return {
    serializedTransaction: Buffer.from(v0tx.serialize()).toString("base64"),
    description: "Step 2/2: Complete launch (V0 with ALT)",
    addresses: {
      dao: dao.toBase58(),
      squadsMultisig: squadsMultisig.toBase58(),
      squadsMultisigVault: squadsMultisigVault.toBase58(),
      pool: pool.toBase58(),
      spendingLimitAddress: spendingLimitPda.toBase58(),
    },
  };
}

// ── Step 7: Claim Tokens ────────────────────────────────────────────
export async function buildClaim(
  funder: PublicKey,
  launchPda: PublicKey,
  idlPath: string,
): Promise<IcoStepResult> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });

  const tx = await client.buildClaim(launchPda, funder);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: "Claiming ICO tokens",
    addresses: {},
  };
}

// ── Read on-chain launch state (for settle reconciliation) ──────────
/**
 * Reads the launch account's on-chain state. Used to reconcile the settle
 * step: the heavy completeLaunch tx can confirm AFTER our confirmation-poll
 * window times out, or already be complete on a retry. If the launch is
 * `Complete` on-chain, the settle succeeded regardless of what our poll saw.
 */
export async function getLaunchState(
  launchPda: PublicKey,
  idlPath: string,
): Promise<{ stateKind: string; isComplete: boolean }> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });
  const launch = await client.program.account.launch.fetch(launchPda);
  const stateKind = Object.keys((launch as any).state ?? {})[0] ?? "unknown";
  return { stateKind, isComplete: stateKind.toLowerCase() === "complete" };
}

// ── Read authoritative claimed token allocation (on-chain) ──────────
/**
 * Reads the EXACT base-token allocation a contributor receives on claim,
 * straight from the on-chain launch — mirroring the program's own math:
 *
 *   tokens_raw = floor(approvedAmount * TOKENS_TO_PARTICIPANTS / totalApprovedAmount)
 *
 * `approvedAmount` and `totalApprovedAmount` are read from the on-chain
 * FundingRecord / Launch accounts (NOT the mirror DB, whose approval values
 * are client-supplied), so the recorded figure always matches what the
 * program actually transferred. Uses BN integer floor division to match the
 * program exactly (no floating-point drift).
 *
 * Returns whole tokens (base-unit result / TOKEN_SCALE), or 0 when the funder
 * has no approval or the launch has no approved total.
 */
export async function readClaimedTokenAmount(
  funder: PublicKey,
  launchPda: PublicKey,
  idlPath: string,
): Promise<number> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });
  const [fundingRecordPda] = findFundingRecordPda(launchPda, funder);

  const [launchAccount, fundingRecord] = await Promise.all([
    client.program.account.launch.fetch(launchPda),
    client.program.account.fundingRecord.fetchNullable(fundingRecordPda),
  ]);

  const totalApproved = launchAccount.totalApprovedAmount as BN;
  const approved = (fundingRecord?.approvedAmount as BN | undefined) ?? new BN(0);

  if (!totalApproved || totalApproved.isZero() || approved.isZero()) return 0;

  // Integer floor division — identical to the on-chain distribution.
  const rawTokens = approved
    .mul(new BN(TOKENS_TO_PARTICIPANTS.toString()))
    .div(totalApproved);

  // rawTokens is in base units (REQUIRED_TOKEN_DECIMALS decimals); convert to
  // whole tokens for the human-facing DB record. Max value is
  // TOKENS_TO_PARTICIPANTS (1e13) which is within Number's safe integer range.
  return rawTokens.toNumber() / TOKEN_SCALE;
}

// ── Step 8: Refund ──────────────────────────────────────────────────
export async function buildRefund(
  funder: PublicKey,
  launchPda: PublicKey,
  idlPath: string,
): Promise<IcoStepResult> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });

  const tx = await client.buildRefund(launchPda, funder);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: "Claiming USDC refund",
    addresses: {},
  };
}

// ── Step 9: Extend Launch ───────────────────────────────────────────
export async function buildExtendLaunch(
  launchAuthority: PublicKey,
  launchPda: PublicKey,
  additionalDays: number,
  idlPath: string,
): Promise<IcoStepResult> {
  const connection = getConnection();
  const client = await LaunchpadClient.create({ connection, idlPath });

  const tx = await client.buildExtendLaunch(
    launchPda,
    additionalDays * 24 * 60 * 60,
    launchAuthority,
  );

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    serializedTransaction: serialized.toString("base64"),
    description: `Extending ICO by ${additionalDays} days`,
    addresses: {},
  };
}