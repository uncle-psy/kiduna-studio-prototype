"use client";

import { useMemo } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import type { Wallet } from "@coral-xyz/anchor";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useAuth } from "@/lib/auth-context";
import { getToken, getSessionToken } from "@/lib/auth";
import { frostSignTransaction } from "@/lib/sign-with-login-wallet";

/**
 * Bridges the user's internal FROST (custodial) wallet + connection into an
 * Anchor provider that the futarchy SDK can use. Returns null while there is
 * no signed-in wallet — callers should gate any SDK call on a non-null
 * provider.
 *
 * All signing forwards to the auth backend's /sign endpoint via
 * `frostSignTransaction` — there is no Phantom / browser wallet involved.
 */
export function useAnchorProvider(): AnchorProvider | null {
  const { connection } = useConnection();
  const { user } = useAuth();
  const walletAddress = user?.wallet ?? null;

  return useMemo(() => {
    if (!walletAddress) return null;

    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch {
      return null;
    }

    // FROST signs one message at a time via the auth backend. The token is
    // read fresh on each call so a refreshed session is always honoured.
    const signOne = <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> =>
      frostSignTransaction(tx, walletAddress, getToken() || getSessionToken());

    const anchorWallet: Wallet = {
      publicKey,
      signTransaction: signOne,
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(
        txs: T[],
      ): Promise<T[]> => {
        const out: T[] = [];
        for (const tx of txs) out.push(await signOne(tx));
        return out;
      },
      payer: undefined as unknown as never, // Anchor accepts undefined payer when wallet provides signing
    };

    // commitment "confirmed" matches the harness — it's the right balance
    // between speed and finality for proposal authoring.
    return new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, walletAddress]);
}

/**
 * Convenience: returns the user's FROST wallet pubkey, or null.
 * Re-exported so callers don't need to import the auth context directly.
 */
export function useSponsorPubkey(): PublicKey | null {
  const { user } = useAuth();
  return useMemo(() => {
    if (!user?.wallet) return null;
    try {
      return new PublicKey(user.wallet);
    } catch {
      return null;
    }
  }, [user?.wallet]);
}

/**
 * A standalone FROST `signTransaction(tx)` function (Phantom-adapter shaped),
 * for callers that pass a signer into a lower-level lib instead of going
 * through the Anchor provider. Returns null while there is no signed-in wallet.
 */
export function useFrostSignTransaction():
  | (<T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>)
  | null {
  const { user } = useAuth();
  const walletAddress = user?.wallet ?? null;
  return useMemo(() => {
    if (!walletAddress) return null;
    return <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> =>
      frostSignTransaction(tx, walletAddress, getToken() || getSessionToken());
  }, [walletAddress]);
}
