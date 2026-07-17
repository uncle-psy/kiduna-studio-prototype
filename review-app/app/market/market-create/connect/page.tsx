"use client";

/**
 * Step 1 — Connect.
 *
 * Two inputs the rest of the wizard depends on:
 *   1. The sponsor's Phantom (or any installed Solana wallet) —
 *      connected via @solana/wallet-adapter-react. Sets the sponsor's pubkey.
 *   2. The Operator agent that will run alongside this market.
 *
 * The DAO multisig is no longer pasted in by the sponsor. It's
 * auto-provisioned at launch with three members:
 *
 *   sponsor wallet  +  operator key  +  platform key
 *
 * The selected operator id is persisted to sessionStorage so it carries
 * through to step 4 (Configure) for downstream defaults. Session-scoped
 * because the wizard isn't a long-running flow.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Button,
  Card,
  CardSub,
  CardTitle,
  Explainer,
} from "@/components/ui/index";
import { OperatorPicker } from "@/components/pickers/OperatorPicker";

const OPERATOR_KEY = "kinship.market-create.operatorId";

export default function Page() {
  const router = useRouter();
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  const [operatorId, setOperatorId] = useState<string | null>(null);

  // Restore previously chosen operator, if any.
  useEffect(() => {
    const stored = sessionStorage.getItem(OPERATOR_KEY);
    if (stored) setOperatorId(stored);
  }, []);

  const handleConnect = () => setVisible(true);

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch {
      // wallet adapter throws if already disconnected
    }
  };

  const canContinue = connected && !!publicKey && !!operatorId;

  const handleContinue = () => {
    if (operatorId) sessionStorage.setItem(OPERATOR_KEY, operatorId);
    router.push("/market/market-create");
  };

  return (
    <>
      <div className="pageheader">
        <div>
          <div className="crumbs">Markets / Create</div>
          <div className="pagetitle">Connect your wallet.</div>
          <div className="pagedesc">
            Four steps. Connect your wallet and choose the Operator that will
            run this Market.
          </div>
        </div>
      </div>

      <div className="step-rail">
        <div className="step active"><span className="num">1</span>Connect</div>
        <div className="step"><span className="num">2</span>Basics</div>
        <div className="step"><span className="num">3</span>Configure</div>
        <div className="step"><span className="num">4</span>Review</div>
      </div>

      <div className="grid-2">
        <div>
          {/* ── Phantom connection ───────────────────────── */}
          <Card className="mb-[14px]">
            <CardTitle>1 · Connect Phantom</CardTitle>
            <CardSub>
              Your wallet is the sponsor identity for this Market. You&apos;ll
              sign launch transactions and approve any actions you author
              directly.
            </CardSub>

            <div className="mt-[14px]">
              {connected && publicKey ? (
                <div className="p-[12px] rounded-[10px] bg-[rgba(34,197,94,0.06)] border-[1px] border-[rgba(34,197,94,0.25)]">
                  <div className="flex items-start gap-[10px]">
                    <div className="text-[16px] text-pass mt-[1px]">✓</div>
                    <div className="flex-1">
                      <div className="font-mono text-[10px] text-pass tracking-[0.08em] uppercase">
                        Connected
                      </div>
                      <div className="font-mono text-[12px] text-subtle mt-[4px] break-all">
                        {publicKey.toBase58()}
                      </div>
                      {wallet?.adapter.name && (
                        <div className="text-[11px] text-muted mt-[4px]">
                          via {wallet.adapter.name}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="text-[11px] text-muted hover:text-fail underline cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-[16px] rounded-[10px] bg-[rgba(255,255,255,0.02)] border-[1px] border-dashed border-border text-center">
                  <div className="text-[12px] text-muted mb-[12px]">
                    No wallet connected.
                  </div>
                  <Button
                    variant="primary"
                    className="cursor-pointer"
                    onClick={handleConnect}
                  >
                    Connect wallet
                  </Button>
                  <div className="text-[11px] text-muted mt-[10px]">
                    Phantom or Solflare. Need one?{" "}
                    <a
                      href="https://phantom.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-2 underline"
                    >
                      Get Phantom →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* ── Operator picker ───────────────────────── */}
          <Card>
            <CardTitle>2 · Choose or create an Operator</CardTitle>
            <CardSub>
              The Operator is the agent that authors proposals on this Market.
              It also becomes one of the three signers on the Market&apos;s
              multisig — alongside your wallet and the Kinship platform key.
            </CardSub>

            <div className="mt-[14px]">
              <OperatorPicker
                value={operatorId ?? undefined}
                onChange={setOperatorId}
              />
            </div>
          </Card>
        </div>

        <div>
          <Explainer>
            <h4>How the multisig is set up</h4>
            <p>
              You don&apos;t need to bring a Squads multisig of your own. When
              you launch this Market in step 5, Kinship provisions one for you
              with three members:
            </p>
            <ul className="list-disc pl-[18px] my-[8px] text-[13px] leading-[1.7]">
              <li><b>Your wallet</b> — the sponsor identity you connected above.</li>
              <li><b>The Operator</b> — the agent you pick or create on the right.</li>
              <li><b>The Kinship platform key</b> — for recovery and protocol-level safety.</li>
            </ul>
            <p>
              The treasury sits in this multisig. Proposal-executed instructions
              sign with it. Two of three approvals are required, so no single
              party — including Kinship — can move funds alone.
            </p>
            <p>
              You can rotate any member later from Settings → Mechanism.
            </p>
          </Explainer>
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Link href="/market">
          <Button>← Cancel</Button>
        </Link>
        <Button
          variant="primary"
          className="cursor-pointer"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          Continue →
        </Button>
      </div>

      {!canContinue && (connected || operatorId) && (
        <div className="mt-[10px] text-[11px] text-muted">
          {!connected && "Connect a wallet to continue. "}
          {connected && !operatorId && "Pick or create an Operator to continue."}
        </div>
      )}
    </>
  );
}