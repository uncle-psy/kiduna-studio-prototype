"use client";

import type { ReactNode } from "react";
import StudioHeader from "@/components/StudioHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { MarketProvider } from "@/lib/market-context";
import { MarketCreateProvider } from "@/lib/market-create-context";
import { ProposalDraftProvider } from "@/lib/proposal-draft/ProposalDraftContext";
import { SolanaWalletProvider } from "@/components/wallet/SolanaWalletProvider";
import { PrototypeProvider } from "@/lib/prototype-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlossaryButton } from "@/components/layout/GlossaryButton";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function MarketLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SolanaWalletProvider>
        <PrototypeProvider>
        <MarketProvider>
          <MarketCreateProvider>
          <ProposalDraftProvider>
            <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="bg-background">
              <StudioHeader /> 
              <GlossaryButton />
              <div className="flex flex-1 min-h-0" style={{ overflow: 'hidden', flex: 1, minHeight: 0 }}>
                <Sidebar />
                <main className="flex-1 ml-0 md:ml-16 lg:ml-[220px] px-3 py-4 pb-20 md:px-7 md:py-6 transition-[margin-left] duration-200 min-w-0" style={{ overflowY: 'auto', overflowX: 'hidden', height: '100%', minHeight: 0 }}>
                  {children}
                </main>
              </div>
            </div>
          </ProposalDraftProvider>
          </MarketCreateProvider>
        </MarketProvider>
        </PrototypeProvider>
      </SolanaWalletProvider>
    </AuthGuard>
  );
}