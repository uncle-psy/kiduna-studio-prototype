"use client";

import type { ReactNode } from "react";
import { SolanaWalletProvider } from "@/components/wallet/SolanaWalletProvider";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function FaucetLayout({ children }: { children: ReactNode }) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
