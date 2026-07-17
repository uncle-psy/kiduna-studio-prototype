/**
 * Check on-chain proposal state.
 * Usage: npx ts-node check-proposal.ts <FUTARCHY_PROPOSAL_ADDRESS>
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { FutarchyClient } from "@metadaoproject/futarchy/v0.6";
import { Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const RPC = "http://127.0.0.1:8899";

async function main() {
  const addr = process.argv[2];
  if (!addr) {
    console.error("Usage: npx ts-node check-proposal.ts <FUTARCHY_PROPOSAL_ADDRESS>");
    process.exit(1);
  }

  const connection = new Connection(RPC, "confirmed");
  const proposalPk = new PublicKey(addr);

  // Create a read-only provider (no signing needed)
  const dummyWallet = new Wallet(Keypair.generate());
  const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" });
  const futarchy = FutarchyClient.createClient({ provider });

  console.log("\n═══ On-Chain Proposal State ═══");
  console.log(`  Address: ${proposalPk.toBase58()}`);

  // Check if account exists
  const accountInfo = await connection.getAccountInfo(proposalPk);
  if (!accountInfo) {
    console.log("  ❌ Account NOT FOUND on-chain");
    console.log("     The proposal may not have completed Phase 2/3.");
    return;
  }
  console.log(`  ✅ Account exists (${accountInfo.data.length} bytes)`);
  console.log(`  Owner: ${accountInfo.owner.toBase58()}`);

  // Fetch and decode the proposal
  try {
    const proposal = await futarchy.fetchProposal(proposalPk);
    if (!proposal) {
      console.log("  ⚠️ Account exists but couldn't decode as a Futarchy proposal");
      return;
    }

    const state = Object.keys(proposal.state)[0] ?? "unknown";
    console.log(`\n  ── Decoded Fields ──`);
    console.log(`  State:            ${state}`);
    console.log(`  Team Sponsored:   ${proposal.isTeamSponsored}`);
    console.log(`  Duration (sec):   ${proposal.durationInSeconds}`);
    console.log(`  Base Vault:       ${proposal.baseVault.toBase58()}`);
    console.log(`  Quote Vault:      ${proposal.quoteVault.toBase58()}`);
    console.log(`  Pass Base Mint:   ${proposal.passBaseMint.toBase58()}`);
    console.log(`  Pass Quote Mint:  ${proposal.passQuoteMint.toBase58()}`);
    console.log(`  Fail Base Mint:   ${proposal.failBaseMint.toBase58()}`);
    console.log(`  Fail Quote Mint:  ${proposal.failQuoteMint.toBase58()}`);

    // Timestamps
    const enqueuedTs = Number((proposal as any).timestampEnqueued ?? 0);
    const durationSec = Number(proposal.durationInSeconds ?? 0);
    if (enqueuedTs > 0) {
      const openedAt = new Date(enqueuedTs * 1000);
      const closesAt = new Date((enqueuedTs + durationSec) * 1000);
      console.log(`\n  ── Timeline ──`);
      console.log(`  Opened:   ${openedAt.toISOString()}`);
      console.log(`  Closes:   ${closesAt.toISOString()}`);
      console.log(`  Duration: ${(durationSec / 3600).toFixed(1)} hours`);
      const remaining = (enqueuedTs + durationSec) - (Date.now() / 1000);
      if (remaining > 0) {
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        console.log(`  Remaining: ${h}h ${m}m`);
      } else {
        console.log(`  Remaining: CLOSED (ended ${Math.abs(Math.round(remaining / 60))}m ago)`);
      }
    }

    // Trading status
    console.log(`\n  ── Status ──`);
    if (state === "pending") {
      console.log(`  ✅ Trading is OPEN — electors can vote Pass/Fail`);
    } else if (state === "draft") {
      console.log(`  ⏳ Draft — not yet launched (Phase 3 incomplete)`);
    } else if (state === "passed") {
      console.log(`  ✅ PASSED — the Squads vault tx can be executed`);
    } else if (state === "failed") {
      console.log(`  ❌ FAILED — the Squads vault tx will NOT execute`);
    } else {
      console.log(`  State: ${state}`);
    }

  } catch (e: any) {
    console.error(`  ❌ Failed to decode: ${e.message}`);
  }
}

main().catch(console.error);
