"use client";

/**
 * Solana wallet adapter setup.
 *
 * Wraps children in:
 *   - ConnectionProvider with the configured RPC endpoint
 *   - WalletProvider with the supported wallets list
 *   - WalletModalProvider so the default "select wallet" modal works
 *
 * The RPC endpoint is sourced from NEXT_PUBLIC_SOLANA_RPC_URL or falls back
 * to devnet's public endpoint. Override via .env.local for production.
 *
 * autoConnect={true} means a returning user with a previously approved
 * wallet stays connected across reloads.
 *
 * Note on the `as ComponentType` casts: the wallet adapter packages bundle
 * their own @types/react@18. React 19's type-checker isn't strictly
 * compatible — this is a real upstream issue, not a bug in our code. Casting
 * to a generic ComponentType keeps the runtime behavior correct.
 */

import { useMemo, type ComponentType, type ReactNode } from "react";
import {
  ConnectionProvider as ConnectionProviderImpl,
  WalletProvider as WalletProviderImpl,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider as WalletModalProviderImpl } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Default to devnet for development. Override in production via env.
const DEFAULT_RPC = clusterApiUrl("devnet");

// Cast around React 18/19 type mismatch in wallet-adapter packages.
const ConnectionProvider = ConnectionProviderImpl as unknown as ComponentType<{
  endpoint: string;
  children: ReactNode;
}>;
const WalletProvider = WalletProviderImpl as unknown as ComponentType<{
  wallets: ReturnType<typeof useMemo>;
  autoConnect: boolean;
  children: ReactNode;
}>;
const WalletModalProvider = WalletModalProviderImpl as unknown as ComponentType<{
  children: ReactNode;
}>;

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_RPC;

  // Memoize so we don't reinstantiate adapters on every render.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
