#!/usr/bin/env node
/**
 * verify-settle.ts
 *
 * Verifies that completeLaunch created all expected on-chain artifacts.
 *
 * Usage:
 *   npx ts-node scripts/verify-settle.ts <launch_pda>
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { Connection, PublicKey } = require("@solana/web3.js");
const { getAssociatedTokenAddressSync } = require("@solana/spl-token");
const { getDaoAddr } = require("@metadaoproject/futarchy/v0.6");
const multisig = require("@sqds/multisig");
const BN = require("bn.js");

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "http://127.0.0.1:8899";
const FUTARCHY = new PublicKey("FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq");
const SQUADS = new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf");
const METEORA = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");
const LAUNCHPAD = new PublicKey("moontUzsdepotRGe5xsfip7vLPTJnVuafqdUWexVnPM");
const BID_WALL = new PublicKey("WALL8ucBuUyL46QYxwYJjidaFYhdvxUFrgvBxPshERx");

let passed = 0;
let failed = 0;

function ok(label, detail = "") {
  passed++;
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  failed++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
}

/**
 * Parse the Launch account data manually.
 * The vec<pubkey> for monthlySpendingLimitMembers makes offsets dynamic,
 * so we read the vec length first, then skip past it.
 *
 * Layout after 8-byte discriminator:
 *   [0]  pdaBump: u8
 *   [1]  minimumRaiseAmount: u64
 *   [9]  monthlySpendingLimitAmount: u64
 *   [17] monthlySpendingLimitMembers: vec<pubkey> = 4 bytes len + N*32
 *   ... then fixed fields follow
 */
function parseLaunch(/** @type {Buffer} */ data) {
  let offset = 8; // skip discriminator

  const pdaBump = data.readUInt8(offset); offset += 1;
  const minimumRaiseAmount = data.readBigUInt64LE(offset); offset += 8;
  const monthlySpendingLimitAmount = data.readBigUInt64LE(offset); offset += 8;

  // vec<pubkey>
  const vecLen = data.readUInt32LE(offset); offset += 4;
  const members = [];
  for (let i = 0; i < vecLen; i++) {
    members.push(new PublicKey(data.subarray(offset, offset + 32)));
    offset += 32;
  }

  const launchAuthority = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const launchSigner = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const launchSignerPdaBump = data.readUInt8(offset); offset += 1;
  const launchQuoteVault = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const launchBaseVault = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const baseMint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const quoteMint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;

  // unixTimestampStarted: Option<i64> = 1 byte tag + 8 bytes
  const hasStarted = data.readUInt8(offset); offset += 1;
  if (hasStarted) offset += 8;

  // unixTimestampClosed: Option<i64>
  const hasClosed = data.readUInt8(offset); offset += 1;
  if (hasClosed) offset += 8;

  const totalCommittedAmount = data.readBigUInt64LE(offset); offset += 8;

  // state: enum (1 byte for variant index)
  const stateIndex = data.readUInt8(offset); offset += 1;
  const stateNames = ["Initialized", "Live", "Closed", "Complete", "Refunding"];
  const state = stateNames[stateIndex] || `Unknown(${stateIndex})`;

  return {
    pdaBump, minimumRaiseAmount, monthlySpendingLimitAmount,
    launchAuthority, launchSigner, launchQuoteVault, launchBaseVault,
    baseMint, quoteMint, totalCommittedAmount, state,
  };
}

async function main() {
  const launchPdaStr = process.argv[2];
  if (!launchPdaStr) {
    console.log("Usage: npx ts-node scripts/verify-settle.ts <launch_pda>");
    process.exit(1);
  }

  const connection = new Connection(RPC, "confirmed");
  const launchPda = new PublicKey(launchPdaStr);

  console.log(`\n🔍 Verifying completeLaunch for: ${launchPda.toBase58()}`);
  console.log(`   RPC: ${RPC}\n`);

  // ── 1. LAUNCH ACCOUNT ──
  console.log("── 1. Launch Account ──");
  const launchInfo = await connection.getAccountInfo(launchPda);
  if (!launchInfo) { fail("Launch account", "NOT FOUND"); return; }
  ok("Launch account exists", `${launchInfo.data.length} bytes, owner=${launchInfo.owner.toBase58().slice(0, 8)}…`);

  let launch;
  try {
    launch = parseLaunch(launchInfo.data);
    ok("Launch parsed", `state=${launch.state}`);
  } catch (e) {
    fail("Launch parse", String(e));
    return;
  }

  const { baseMint, quoteMint, launchSigner } = launch;
  console.log(`   baseMint:     ${baseMint.toBase58()}`);
  console.log(`   quoteMint:    ${quoteMint.toBase58()}`);
  console.log(`   launchSigner: ${launchSigner.toBase58()}`);
  console.log(`   committed:    ${Number(launch.totalCommittedAmount) / 1e6} USDC`);

  if (launch.state === "Complete") {
    ok("Launch state = Complete");
  } else {
    fail("Launch state", `Expected Complete, got ${launch.state}`);
  }

  // ── 2. DAO ACCOUNT ──
  console.log("\n── 2. DAO Account ──");
  const [dao] = getDaoAddr({ nonce: new BN(0), daoCreator: launchSigner });
  console.log(`   DAO PDA: ${dao.toBase58()}`);

  const daoInfo = await connection.getAccountInfo(dao);
  if (daoInfo && daoInfo.owner.equals(FUTARCHY)) {
    ok("DAO account exists", `owner=Futarchy, ${daoInfo.data.length} bytes`);
  } else if (daoInfo) {
    fail("DAO account owner", `Expected Futarchy, got ${daoInfo.owner.toBase58()}`);
  } else {
    fail("DAO account", "NOT FOUND");
  }

  // ── 3. SQUADS MULTISIG (TREASURY) ──
  console.log("\n── 3. Squads Multisig (Treasury) ──");
  const [squadsMultisigPda] = multisig.getMultisigPda({ createKey: dao });
  const [squadsVault] = multisig.getVaultPda({ multisigPda: squadsMultisigPda, index: 0 });
  console.log(`   Multisig PDA: ${squadsMultisigPda.toBase58()}`);
  console.log(`   Vault PDA:    ${squadsVault.toBase58()}`);

  const msigInfo = await connection.getAccountInfo(squadsMultisigPda);
  if (msigInfo && msigInfo.owner.equals(SQUADS)) {
    ok("Squads multisig exists", `owner=Squads, ${msigInfo.data.length} bytes`);
  } else {
    fail("Squads multisig", msigInfo ? `Wrong owner: ${msigInfo.owner.toBase58()}` : "NOT FOUND");
  }

  const treasuryUsdcAta = getAssociatedTokenAddressSync(quoteMint, squadsVault, true);
  try {
    const bal = await connection.getTokenAccountBalance(treasuryUsdcAta);
    ok("Treasury USDC balance", `${bal.value.uiAmountString} USDC`);
  } catch {
    fail("Treasury USDC account", "Not found or empty");
  }

  // ── 4. FUTARCHY AMM ──
  console.log("\n── 4. Futarchy AMM ──");
  const futarchyBaseVault = getAssociatedTokenAddressSync(baseMint, dao, true);
  const futarchyQuoteVault = getAssociatedTokenAddressSync(quoteMint, dao, true);

  try {
    const bal = await connection.getTokenAccountBalance(futarchyBaseVault);
    ok("Futarchy base vault", `${bal.value.uiAmountString} tokens`);
  } catch { fail("Futarchy base vault", "Not found"); }

  try {
    const bal = await connection.getTokenAccountBalance(futarchyQuoteVault);
    ok("Futarchy quote vault", `${bal.value.uiAmountString} USDC`);
  } catch { fail("Futarchy quote vault", "Not found"); }

  // ── 5. METEORA POOL ──
  console.log("\n── 5. Meteora Pool ──");
  const meteoraConfig = new PublicKey("FaA6RM9enPh1tU9Y8LiGCq715JubLc49WGcYTdNvDfsc");
  const maxKey = baseMint.toBuffer().compare(quoteMint.toBuffer()) > 0 ? baseMint : quoteMint;
  const minKey = baseMint.toBuffer().compare(quoteMint.toBuffer()) > 0 ? quoteMint : baseMint;
  const [pool] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), meteoraConfig.toBuffer(), maxKey.toBuffer(), minKey.toBuffer()],
    METEORA,
  );
  console.log(`   Pool PDA: ${pool.toBase58()}`);

  const poolInfo = await connection.getAccountInfo(pool);
  if (poolInfo && poolInfo.owner.equals(METEORA)) {
    ok("Meteora pool exists", `owner=Meteora, ${poolInfo.data.length} bytes`);
  } else {
    fail("Meteora pool", poolInfo ? `Wrong owner` : "NOT FOUND");
  }

  // ── 6. TOKEN SUPPLY ──
  console.log("\n── 6. Token Supply ──");
  try {
    const mintInfo = await connection.getTokenSupply(baseMint);
    const supply = Number(mintInfo.value.uiAmount);
    ok("Base token supply", `${mintInfo.value.uiAmountString}`);
    if (supply >= 12_900_000) {
      ok("Supply ≥ 12.9M (10M + 2M + 0.9M)");
    } else {
      fail("Supply check", `Expected ≥ 12.9M, got ${supply.toLocaleString()}`);
    }
  } catch { fail("Base token mint", "Could not read supply"); }

  // ── 7. BID WALL ──
  console.log("\n── 7. Bid Wall ──");
  const [bidWall] = PublicKey.findProgramAddressSync(
    [Buffer.from("bid_wall"), baseMint.toBuffer(), launchSigner.toBuffer(), new BN(0).toArrayLike(Buffer, "le", 8)],
    BID_WALL,
  );
  const bidWallInfo = await connection.getAccountInfo(bidWall);
  if (bidWallInfo) {
    ok("Bid wall account exists", `${bidWallInfo.data.length} bytes`);
  } else {
    console.log("  ⚠️  Bid wall not found (may not be enabled)");
  }

  // ── SUMMARY ──
  console.log("\n══════════════════════════════════════");
  console.log(`  ✅ Passed: ${passed}`);
  if (failed > 0) console.log(`  ❌ Failed: ${failed}`);
  else console.log("  🎉 All checks passed!");
  console.log("══════════════════════════════════════\n");

  console.log("📋 Key Addresses:");
  console.log(`   Launch:     ${launchPda.toBase58()}`);
  console.log(`   DAO:        ${dao.toBase58()}`);
  console.log(`   Multisig:   ${squadsMultisigPda.toBase58()}`);
  console.log(`   Vault:      ${squadsVault.toBase58()}`);
  console.log(`   Pool:       ${pool.toBase58()}`);
  console.log(`   Base Mint:  ${baseMint.toBase58()}`);
  console.log(`   Quote Mint: ${quoteMint.toBase58()}`);
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("Fatal:", String(e)); process.exit(1); });