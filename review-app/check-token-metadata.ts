/**
 * Check SPL token metadata on-chain.
 * Usage: npx ts-node check-token-metadata.ts <MINT_ADDRESS>
 *
 * Place this file in the kinship-studio root and run:
 *   npx ts-node check-token-metadata.ts 9k16gzFrkCAM6eeXJQtkXZBB5c6V4MvADcQuLHbFb4fv
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const RPC = "http://127.0.0.1:8899";

function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM_ID,
  );
  return pda;
}

/** Decode a Borsh string (u32 length + utf8 bytes) from a buffer. */
function readBorshString(buf: Buffer, offset: number): { value: string; newOffset: number } {
  const len = buf.readUInt32LE(offset);
  const value = buf.slice(offset + 4, offset + 4 + len).toString("utf8").replace(/\0+$/, "");
  return { value, newOffset: offset + 4 + len };
}

async function main() {
  const mintAddr = process.argv[2];
  if (!mintAddr) {
    console.error("Usage: npx ts-node check-token-metadata.ts <MINT_ADDRESS>");
    process.exit(1);
  }

  const connection = new Connection(RPC, "confirmed");
  const mint = new PublicKey(mintAddr);

  // 1. SPL Token mint info
  console.log("\n═══ SPL Token Mint ═══");
  try {
    const mintInfo = await getMint(connection, mint);
    console.log(`  Address:          ${mint.toBase58()}`);
    console.log(`  Decimals:         ${mintInfo.decimals}`);
    console.log(`  Supply:           ${Number(mintInfo.supply) / 10 ** mintInfo.decimals}`);
    console.log(`  Mint Authority:   ${mintInfo.mintAuthority?.toBase58() ?? "None"}`);
    console.log(`  Freeze Authority: ${mintInfo.freezeAuthority?.toBase58() ?? "None"}`);
  } catch (e: any) {
    console.error(`  ❌ Failed to read mint: ${e.message}`);
    return;
  }

  // 2. Metaplex metadata
  const metadataPda = findMetadataPda(mint);
  console.log(`\n═══ Metaplex Metadata ═══`);
  console.log(`  PDA Address: ${metadataPda.toBase58()}`);

  const metadataAccount = await connection.getAccountInfo(metadataPda);
  if (!metadataAccount) {
    console.log("  ❌ NO METADATA ACCOUNT FOUND");
    console.log("     The token has no on-chain name or symbol.");
    console.log("     Wallets will show it as 'Unknown Token'.");
    return;
  }

  console.log(`  ✅ Metadata account exists (${metadataAccount.data.length} bytes)`);
  console.log(`  Owner: ${metadataAccount.owner.toBase58()}`);

  // Decode the metadata
  // Metaplex metadata layout:
  //   1 byte  - key (enum)
  //   32 bytes - update authority
  //   32 bytes - mint
  //   then DataV2: name (borsh string), symbol (borsh string), uri (borsh string), ...
  try {
    const data = metadataAccount.data;
    const key = data[0]; // 4 = MetadataV1
    const updateAuthority = new PublicKey(data.slice(1, 33));
    const mintKey = new PublicKey(data.slice(33, 65));

    let offset = 65;
    const name = readBorshString(data, offset);
    offset = name.newOffset;
    const symbol = readBorshString(data, offset);
    offset = symbol.newOffset;
    const uri = readBorshString(data, offset);

    console.log(`\n  ── Decoded Fields ──`);
    console.log(`  Name:             "${name.value}"`);
    console.log(`  Symbol:           "${symbol.value}"`);
    console.log(`  URI:              "${uri.value || "(empty)"}"`);
    console.log(`  Update Authority: ${updateAuthority.toBase58()}`);
    console.log(`  Mint:             ${mintKey.toBase58()}`);
    console.log(`  Metadata Key:     ${key} (4 = MetadataV1)`);
  } catch (e: any) {
    console.error(`  ⚠️ Failed to decode metadata: ${e.message}`);
    console.log(`  Raw (first 200 bytes): ${metadataAccount.data.slice(0, 200).toString("hex")}`);
  }
}

main().catch(console.error);
