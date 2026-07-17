/**
 * Keypair management for the 3-key model.
 *
 * Keypair 1 (Sponsor)  — lives in Phantom wallet, never touches server.
 * Keypair 2 (Agent)    — generated per-market, stored encrypted in DB.
 * Keypair 3 (System)   — platform-wide, loaded from environment.
 *
 * This module handles Keypair 2 and Keypair 3.
 */
import { Keypair, PublicKey } from "@solana/web3.js";
import crypto from "node:crypto";
import bs58 from "bs58";

/* ── Encryption config ──────────────────────────────────────────────── */

/**
 * Encryption key for agent secret keys stored in the database.
 * Must be exactly 32 bytes (64 hex characters).
 *
 * Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const ENCRYPTION_KEY_HEX = process.env.AGENT_ENCRYPTION_KEY ?? "";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    throw new Error(
      "AGENT_ENCRYPTION_KEY env var must be 64 hex characters (32 bytes). " +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(ENCRYPTION_KEY_HEX, "hex");
}

/* ── Keypair 2: Agent (per-market) ──────────────────────────────────── */

export interface AgentKeypairResult {
  /** Base58-encoded public key — safe to store and display. */
  publicKey: string;
  /** Encrypted secret key — store this in the database. */
  encryptedSecretKey: string;
}

/**
 * Generate a new Solana keypair for a market's agent.
 * Returns the public key (plain) and secret key (encrypted).
 */
export function generateAgentKeypair(): AgentKeypairResult {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    encryptedSecretKey: encryptSecretKey(keypair.secretKey),
  };
}

/**
 * Encrypt a Solana secret key (64 bytes) for database storage.
 * Format: hex(iv) + ":" + hex(authTag) + ":" + hex(ciphertext)
 */
function encryptSecretKey(secretKey: Uint8Array): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secretKey)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypt an agent's secret key from database storage.
 * Returns a Solana Keypair ready to sign transactions.
 */
export function decryptAgentKeypair(encryptedSecretKey: string): Keypair {
  const key = getEncryptionKey();
  const [ivHex, tagHex, cipherHex] = encryptedSecretKey.split(":");

  if (!ivHex || !tagHex || !cipherHex) {
    throw new Error("Invalid encrypted key format.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return Keypair.fromSecretKey(new Uint8Array(decrypted));
}

/* ── Keypair 3: System (platform-wide) ──────────────────────────────── */

let _systemKeypair: Keypair | null = null;

/**
 * Load the platform system keypair from environment.
 *
 * Accepts either:
 *   - SYSTEM_KEYPAIR: base58-encoded secret key string
 *   - SYSTEM_KEYPAIR: JSON array of bytes (e.g. "[1,2,3,...]")
 *
 * Caches after first load.
 */
export function loadSystemKeypair(): Keypair {
  if (_systemKeypair) return _systemKeypair;

  const raw = process.env.SYSTEM_KEYPAIR;
  if (!raw) {
    throw new Error(
      "SYSTEM_KEYPAIR env var is not set. " +
        "This is the platform co-signer keypair used as the third multisig member."
    );
  }

  try {
    if (raw.startsWith("[")) {
      // JSON array format: [1, 2, 3, ...]
      const bytes = JSON.parse(raw) as number[];
      _systemKeypair = Keypair.fromSecretKey(Uint8Array.from(bytes));
    } else {
      // Base58-encoded secret key
      const bytes = bs58.decode(raw);
      _systemKeypair = Keypair.fromSecretKey(bytes);
    }
  } catch (err) {
    throw new Error(
      `Failed to parse SYSTEM_KEYPAIR: ${(err as Error).message}. ` +
        "Must be a base58 string or JSON byte array."
    );
  }

  return _systemKeypair;
}

/**
 * Get the system public key without exposing the secret key.
 * Used during DAO creation to add the system key as a multisig member.
 */
export function getSystemPublicKey(): PublicKey {
  return loadSystemKeypair().publicKey;
}

/* ── Utilities ──────────────────────────────────────────────────────── */

/**
 * Validate that a string looks like a base58 Solana public key.
 */
export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
