/**
 * verify-multisig.ts
 *
 * Verifies a Squads v4 multisig on-chain:
 *   - Lists all members with permissions
 *   - Checks that the DAO address is a member
 *   - Checks that PERMISSIONLESS_ACCOUNT is a member
 *   - Verifies vault PDA derivation
 *
 * Usage:
 *   npx tsx verify-multisig.ts <multisig-address> <dao-address>
 *
 * Options:
 *   --rpc <url>   Solana RPC URL (default: http://127.0.0.1:8899)
 *
 * Examples:
 *   npx tsx verify-multisig.ts ChJ2h8wrs... G6Euw9Kue...
 *   npx tsx verify-multisig.ts ChJ2h8wrs... G6Euw9Kue... --rpc https://api.mainnet-beta.solana.com
 */

import { Connection, PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

// MetaDAO futarchy program hardcoded constant (from initialize_dao.rs line 69)
const PERMISSIONLESS_ACCOUNT = "EP3SoC2SvR3d4c2eXVBvhEMWSr2j3YtoCY3UMiQV7BPD";

// ── Parse CLI args ─────────────────────────────────────────────────

function parseArgs(): { multisigAddress: string; daoAddress: string; rpcUrl: string } {
  const args = process.argv.slice(2);

  // Extract --rpc flag
  let rpcUrl = "http://127.0.0.1:8899";
  const rpcIndex = args.indexOf("--rpc");
  if (rpcIndex !== -1 && args[rpcIndex + 1]) {
    rpcUrl = args[rpcIndex + 1];
    args.splice(rpcIndex, 2);
  }

  const [multisigAddress, daoAddress] = args;

  if (!multisigAddress || !daoAddress) {
    console.error("\nUsage: npx tsx verify-multisig.ts <multisig-address> <dao-address>");
    console.error("\nOptions:");
    console.error("  --rpc <url>   Solana RPC URL (default: http://127.0.0.1:8899)");
    console.error("\nExample:");
    console.error("  npx tsx verify-multisig.ts ChJ2h8wrsP7F1paRbi5LFgXj8sXwFrfv9UNRDuQEi6MR G6Euw9KueJaJBduVc5NEL4qa6wcQfE9x5L7iumSAEdkK\n");
    process.exit(1);
  }

  // Validate addresses
  try {
    new PublicKey(multisigAddress);
  } catch {
    console.error(`\n❌ Invalid multisig address: ${multisigAddress}\n`);
    process.exit(1);
  }
  try {
    new PublicKey(daoAddress);
  } catch {
    console.error(`\n❌ Invalid DAO address: ${daoAddress}\n`);
    process.exit(1);
  }

  return { multisigAddress, daoAddress, rpcUrl };
}

// ── Format permissions ─────────────────────────────────────────────

function formatPermissions(perms: { mask: number }): string {
  const bits: string[] = [];
  if (perms.mask & 1) bits.push("Initiate");
  if (perms.mask & 2) bits.push("Vote");
  if (perms.mask & 4) bits.push("Execute");
  return bits.length > 0 ? bits.join(" + ") : `unknown (mask=${perms.mask})`;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  const { multisigAddress, daoAddress, rpcUrl } = parseArgs();

  const connection = new Connection(rpcUrl, "confirmed");
  const multisigPda = new PublicKey(multisigAddress);
  const daoPubkey = new PublicKey(daoAddress);

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Squads Multisig Verification");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  RPC:            ${rpcUrl}`);
  console.log(`  Multisig:       ${multisigAddress}`);
  console.log(`  DAO Address:    ${daoAddress}`);
  console.log("───────────────────────────────────────────────────────────");

  // 1. Fetch multisig account
  let msAccount: any;
  try {
    msAccount = await multisig.accounts.Multisig.fromAccountAddress(
      connection, multisigPda,
    );
  } catch (err) {
    console.error(`\n  ❌ Failed to read multisig: ${(err as Error).message}`);
    console.error("     Is the validator running? Is the address correct?\n");
    process.exit(1);
  }

  // 2. Basic info
  console.log(`\n  Threshold:      ${msAccount.threshold}`);
  console.log(`  Tx index:       ${msAccount.transactionIndex}`);
  console.log(`  Members:        ${msAccount.members.length}`);

  // 3. List members
  console.log("");
  console.log("  MEMBERS");
  console.log("  ─────────────────────────────────────────────────────────");

  const memberKeys = new Set<string>();

  for (let i = 0; i < msAccount.members.length; i++) {
    const member = msAccount.members[i];
    const key = member.key.toBase58();
    memberKeys.add(key);

    let label = "";
    if (key === daoAddress) label = " ← DAO";
    else if (key === PERMISSIONLESS_ACCOUNT) label = " ← PERMISSIONLESS";

    console.log(`  [${i + 1}] ${key}${label}`);
    console.log(`      ${formatPermissions(member.permissions)}`);
  }

  // 4. Verification
  console.log("");
  console.log("  CHECKS");
  console.log("  ─────────────────────────────────────────────────────────");

  const hasDao = memberKeys.has(daoAddress);
  const hasPermissionless = memberKeys.has(PERMISSIONLESS_ACCOUNT);

  console.log(`  ${hasDao ? "✅" : "❌"} DAO is a member (Vote + Execute)`);
  console.log(`  ${hasPermissionless ? "✅" : "❌"} PERMISSIONLESS_ACCOUNT is a member (Initiate + Execute)`);
  console.log(`  ${msAccount.threshold === 1 ? "✅" : "⚠️ "} Threshold is ${msAccount.threshold}`);

  // 5. Vault PDA check
  const [derivedVault] = multisig.getVaultPda({ multisigPda, index: 0 });
  console.log("");
  console.log("  VAULT");
  console.log("  ─────────────────────────────────────────────────────────");
  console.log(`  Vault PDA:      ${derivedVault.toBase58()}`);

  // 6. Config authority check
  const configAuth = msAccount.configAuthority;
  const configIsDao = configAuth && configAuth.toBase58() === daoAddress;
  console.log("");
  console.log("  CONFIG AUTHORITY");
  console.log("  ─────────────────────────────────────────────────────────");
  console.log(`  ${configIsDao ? "✅" : "⚠️ "} Config authority: ${configAuth ? configAuth.toBase58() : "None"}${configIsDao ? " (DAO)" : ""}`);

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  // Exit with error if critical checks failed
  if (!hasDao || !hasPermissionless) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
