#!/usr/bin/env node
/**
 * add-token-metadata.mjs
 *
 * Creates Metaplex metadata for an existing legacy SPL token.
 * Uses the same dependencies already in kinship-studio.
 *
 * Usage:
 *   node add-token-metadata.mjs <MINT_ADDRESS> --name "TecNeural" --symbol "TNRL"
 *   node add-token-metadata.mjs <MINT_ADDRESS> --name "My Token" --symbol "MTK" --uri "https://example.com/meta.json"
 *   node add-token-metadata.mjs <MINT_ADDRESS> --name "My Token" --symbol "MTK" --keypair ~/.config/solana/id.json
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";

// ── Config ──────────────────────────────────────────────────────────
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "http://127.0.0.1:8899";
const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

// ── Parse args ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
Usage: node add-token-metadata.mjs <MINT_ADDRESS> [OPTIONS]

Options:
  --name NAME        Token name (required)
  --symbol SYMBOL    Token symbol (required)
  --uri URI          Metadata JSON URI (default: "")
  --keypair PATH     Path to keypair JSON (default: ~/.config/solana/id.json)
  --rpc URL          Solana RPC URL (default: http://127.0.0.1:8899)

Example:
  node add-token-metadata.mjs 5szdvyZReeFY2SLawmz4Vor42h48YE4DQsJZ7sJr6nr2 \\
    --name "TecNeural" --symbol "TNRL"
`);
  process.exit(0);
}

const mintAddress = args[0];
let tokenName = "";
let tokenSymbol = "";
let tokenUri = "";
let keypairPath = path.join(process.env.HOME || "~", ".config/solana/id.json");
let rpcUrl = RPC_URL;

for (let i = 1; i < args.length; i += 2) {
  switch (args[i]) {
    case "--name":    tokenName   = args[i + 1]; break;
    case "--symbol":  tokenSymbol = args[i + 1]; break;
    case "--uri":     tokenUri    = args[i + 1]; break;
    case "--keypair": keypairPath = args[i + 1]; break;
    case "--rpc":     rpcUrl      = args[i + 1]; break;
    default:
      console.error(`Unknown option: ${args[i]}`);
      process.exit(1);
  }
}

if (!tokenName || !tokenSymbol) {
  console.error("Error: --name and --symbol are required.");
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────

function findMetadataPda(mint) {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METAPLEX_PROGRAM_ID,
  );
  return pda;
}

/**
 * Build CreateMetadataAccountV3 instruction.
 *
 * Instruction discriminator: 33 (CreateMetadataAccountV3)
 * Layout:
 *   - discriminator: u8 = 33
 *   - DataV2:
 *     - name:    string (4-byte len + utf8)
 *     - symbol:  string (4-byte len + utf8)
 *     - uri:     string (4-byte len + utf8)
 *     - sellerFeeBasisPoints: u16 = 0
 *     - creators: Option<Vec<Creator>> = None (0 byte)
 *     - collection: Option<Collection> = None (0 byte)
 *     - uses: Option<Uses> = None (0 byte)
 *   - isMutable: bool = true
 *   - collectionDetails: Option = None (0 byte)
 */
function buildCreateMetadataV3Ix({ metadata, mint, mintAuthority, payer, updateAuthority, name, symbol, uri }) {
  const nameBytes = Buffer.from(name, "utf8");
  const symbolBytes = Buffer.from(symbol, "utf8");
  const uriBytes = Buffer.from(uri, "utf8");

  // Calculate total size
  const size =
    1 +                    // discriminator
    4 + nameBytes.length + // name string
    4 + symbolBytes.length + // symbol string
    4 + uriBytes.length +  // uri string
    2 +                    // sellerFeeBasisPoints
    1 +                    // creators: None
    1 +                    // collection: None
    1 +                    // uses: None
    1 +                    // isMutable
    1;                     // collectionDetails: None

  const data = Buffer.alloc(size);
  let offset = 0;

  // Discriminator: 33 = CreateMetadataAccountV3
  data.writeUInt8(33, offset); offset += 1;

  // name
  data.writeUInt32LE(nameBytes.length, offset); offset += 4;
  nameBytes.copy(data, offset); offset += nameBytes.length;

  // symbol
  data.writeUInt32LE(symbolBytes.length, offset); offset += 4;
  symbolBytes.copy(data, offset); offset += symbolBytes.length;

  // uri
  data.writeUInt32LE(uriBytes.length, offset); offset += 4;
  uriBytes.copy(data, offset); offset += uriBytes.length;

  // sellerFeeBasisPoints
  data.writeUInt16LE(0, offset); offset += 2;

  // creators: None
  data.writeUInt8(0, offset); offset += 1;

  // collection: None
  data.writeUInt8(0, offset); offset += 1;

  // uses: None
  data.writeUInt8(0, offset); offset += 1;

  // isMutable: true
  data.writeUInt8(1, offset); offset += 1;

  // collectionDetails: None
  data.writeUInt8(0, offset); offset += 1;

  return new TransactionInstruction({
    programId: METAPLEX_PROGRAM_ID,
    keys: [
      { pubkey: metadata,        isSigner: false, isWritable: true  },
      { pubkey: mint,            isSigner: false, isWritable: false },
      { pubkey: mintAuthority,   isSigner: true,  isWritable: false },
      { pubkey: payer,           isSigner: true,  isWritable: true  },
      { pubkey: updateAuthority, isSigner: false, isWritable: false },
      { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false }, // system program
      // rent sysvar not needed for v3 but some versions expect it
    ],
    data,
  });
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔧 Add Metaplex Metadata\n");

  // Load keypair
  if (!fs.existsSync(keypairPath)) {
    console.error(`Keypair not found: ${keypairPath}`);
    process.exit(1);
  }
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
  const payer = Keypair.fromSecretKey(secretKey);
  console.log(`  Wallet:  ${payer.publicKey.toBase58()}`);

  const connection = new Connection(rpcUrl, "confirmed");
  const mintPubkey = new PublicKey(mintAddress);

  // Verify mint exists
  const mintInfo = await connection.getAccountInfo(mintPubkey);
  if (!mintInfo) {
    console.error(`Mint not found on-chain: ${mintAddress}`);
    process.exit(1);
  }
  console.log(`  Mint:    ${mintAddress}`);
  console.log(`  Program: ${mintInfo.owner.toBase58()}`);

  // Check if metadata already exists
  const metadataPda = findMetadataPda(mintPubkey);
  const existingMetadata = await connection.getAccountInfo(metadataPda);
  if (existingMetadata) {
    console.log(`\n⚠️  Metadata PDA already exists: ${metadataPda.toBase58()}`);
    console.log("   Use metaboss or UpdateMetadataV2 to update existing metadata.");
    process.exit(1);
  }

  console.log(`  Name:    ${tokenName}`);
  console.log(`  Symbol:  ${tokenSymbol}`);
  console.log(`  URI:     ${tokenUri || "(empty)"}`);
  console.log(`  PDA:     ${metadataPda.toBase58()}`);

  // Build transaction
  const ix = buildCreateMetadataV3Ix({
    metadata: metadataPda,
    mint: mintPubkey,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    updateAuthority: payer.publicKey,
    name: tokenName,
    symbol: tokenSymbol,
    uri: tokenUri,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;

  console.log("\n  Sending transaction...");

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: "confirmed",
    });
    console.log(`\n✅ Metadata created!`);
    console.log(`   Signature: ${sig}`);
    console.log(`   Explorer:  https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl)}`);
  } catch (err) {
    console.error(`\n❌ Transaction failed: ${err.message}`);
    if (err.logs) {
      console.error("\nProgram logs:");
      err.logs.forEach((l) => console.error(`  ${l}`));
    }
    process.exit(1);
  }

  // Verify
  console.log("\n  Verifying metadata on-chain...");
  const metaAccount = await connection.getAccountInfo(metadataPda);
  if (metaAccount) {
    console.log(`  ✓ Metadata account exists (${metaAccount.data.length} bytes)`);
  }

  console.log(`\n🎉 Done! Token ${tokenSymbol} now has on-chain metadata.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});