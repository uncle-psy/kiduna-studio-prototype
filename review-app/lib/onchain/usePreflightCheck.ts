"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { useFutarchy } from "./useFutarchy";
import { useSponsorPubkey } from "./useAnchorProvider";

export interface PreflightResult {
  loading: boolean;
  ok: boolean;
  checks: {
    walletConnected: boolean;
    daoExists: boolean;
    multisigExists: boolean;
    walletIsMember: boolean;
  };
  error?: string;
}

/**
 * Phase 0 pre-flight: verify the connected wallet can actually author a
 * proposal against the configured DAO. Specifically:
 *   - Wallet is connected
 *   - DAO account exists at the configured pubkey
 *   - Squads multisig exists and is alive
 *   - Connected wallet is a member of the multisig
 *
 * Runs on mount and any time the wallet/DAO changes. Used by every create
 * page to gate the form behind a pre-flight check.
 */
export function usePreflightCheck(args: {
  dao?: PublicKey;
  multisigPda?: PublicKey;
}): PreflightResult {
  const { connection } = useConnection();
  const publicKey = useSponsorPubkey();
  const futarchy = useFutarchy();

  const [result, setResult] = useState<PreflightResult>({
    loading: true,
    ok: false,
    checks: {
      walletConnected: false,
      daoExists: false,
      multisigExists: false,
      walletIsMember: false,
    },
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const walletConnected = !!publicKey;
      let daoExists = false;
      let multisigExists = false;
      let walletIsMember = false;
      let error: string | undefined;

      if (!walletConnected || !args.dao || !args.multisigPda) {
        if (!cancelled) {
          setResult({
            loading: false,
            ok: false,
            checks: { walletConnected, daoExists, multisigExists, walletIsMember },
          });
        }
        return;
      }

      try {
        // DAO exists?
        if (futarchy) {
          const daoAccount = await futarchy.getDao(args.dao).catch(() => null);
          daoExists = !!daoAccount;
        } else {
          const acc = await connection.getAccountInfo(args.dao);
          daoExists = !!acc;
        }

        // Multisig exists + wallet is a member?
        const ms = await multisig.accounts.Multisig.fromAccountAddress(
          connection,
          args.multisigPda,
        ).catch(() => null);
        if (ms) {
          multisigExists = true;
          walletIsMember = ms.members.some((m) =>
            m.key.toBase58() === publicKey!.toBase58(),
          );
        }
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      if (!cancelled) {
        const ok =
          walletConnected && daoExists && multisigExists && walletIsMember;
        setResult({
          loading: false,
          ok,
          checks: { walletConnected, daoExists, multisigExists, walletIsMember },
          error,
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, futarchy, args.dao, args.multisigPda]);

  return result;
}
