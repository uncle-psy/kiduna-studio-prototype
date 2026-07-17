"use client";

/**
 * Step 1 — Operator.
 *
 * Choose or create the Operator agent that will run alongside this Market.
 *
 * The DAO multisig is auto-provisioned at launch with three members:
 *   sponsor wallet (from header)  +  operator key  +  platform key
 *
 * The selected operator id is persisted to sessionStorage so it carries
 * through to step 4 (Configure).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OperatorPicker } from "@/components/pickers/OperatorPicker";
import { useAuth } from "@/lib/auth-context";
import { WizardHeader, StepRail, clearWizardState, loadWizardDraft, saveWizardDraft } from "./_shared";

const OPERATOR_KEY = "kinship.market-create.operatorId";

export default function CreateStep1() {
  const router = useRouter();
  const { user } = useAuth();

  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sponsor signer is the user's internal FROST (custodial) wallet — no
  // Phantom / browser wallet connection required.
  const address = user?.wallet ?? "";

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // On mount: if entering fresh (via "New Market" button → ?new=1),
  // clear all previous wizard state. Otherwise restore the operator.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("new")) {
      clearWizardState();
      // Remove ?new from URL without reload so Back from Step 2 won't re-clear
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    const stored = sessionStorage.getItem(OPERATOR_KEY);
    if (stored) {
      setOperatorId(stored);
      return;
    }
    // No local wizard state (fresh tab / after logout) — try to restore a
    // server-side draft for this wallet before starting over.
    loadWizardDraft().then((restored) => {
      if (restored) {
        const op = sessionStorage.getItem(OPERATOR_KEY);
        if (op) setOperatorId(op);
      }
    });
  }, []);

  // Validation
  const operatorMissing = !operatorId;
  const canContinue = !operatorMissing;
  const showOperatorError = attempted && operatorMissing;

  const handleContinue = () => {
    setAttempted(true);
    if (!canContinue) return;

    sessionStorage.setItem(OPERATOR_KEY, operatorId!);
    // Mirror progress to the server draft so it survives logout / new tab.
    saveWizardDraft();
    router.push("/markets/create/basics");
  };

  return (
    <div className="market-wizard">
      <WizardHeader
        stepLabel="Step 1 · Operator"
        title="Choose your Operator."
        description="Four steps. Select or create the Operator agent that will run this Market."
      />
      <StepRail activeIndex={0} />

      <div className="grid-2">
        <div>
          {/* ── Sponsor wallet (FROST) ──────────────────── */}
          <div
            className="card"
            style={{
              marginBottom: 18,
              borderColor: address ? "rgba(34,197,94,0.3)" : undefined,
              transition: "border-color 0.15s",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 12,
            }}>
              <div style={{
                display: "flex", alignItems: "center",
                gap: 10, minWidth: 0,
              }}>
                {/* Green status dot */}
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: address ? "var(--pass)" : "var(--muted)", flexShrink: 0,
                }} />

                <div style={{ minWidth: 0 }}>
                  {/* Label row */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: 8, flexWrap: "wrap",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                      color: "var(--muted)",
                    }}>
                      Sponsor Wallet
                    </span>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase" as const,
                      padding: "2px 7px",
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                    }}>
                      FROST
                    </span>
                  </div>

                  {/* Address — clickable to copy */}
                  {address ? (
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      title="Copy full address"
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        marginTop: 3,
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--fg)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {address.slice(0, 4)}&hellip;{address.slice(-4)}
                      {copied ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--pass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <div style={{ marginTop: 3, fontSize: 13, color: "var(--muted)" }}>
                      Sign in to load your wallet
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="card-sub" style={{ marginTop: 12, marginBottom: 0 }}>
              Your FROST wallet becomes the sponsor signer on the Market&apos;s
              multisig and signs launch transactions automatically.
            </div>
          </div>

          {/* ── Operator picker ───────────────────────── */}
          <div
            className="card"
            style={{
              borderColor: showOperatorError ? "var(--fail)" : undefined,
              transition: "border-color 0.15s",
            }}
          >
            <div className="card-title">Choose or create an Operator</div>
            <div className="card-sub">
              The Operator is the agent that authors proposals on this Market.
              It also becomes one of the three signers on the Market&apos;s
              multisig — alongside your wallet and the Kinship platform key.
            </div>

            <div style={{ marginTop: 14 }}>
              <OperatorPicker
                wallet={user?.wallet}
                value={operatorId ?? undefined}
                onChange={(id) => { setOperatorId(id); }}
              />
            </div>

            {/* Validation error */}
            {showOperatorError && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--fail)",
                }}
              >
                <span style={{ fontSize: 14 }}>⚠</span>
                Select an Operator to continue.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="explainer">
            <h4>How the multisig is set up</h4>
            <p>
              You don&apos;t need to bring a Squads multisig of your own. When
              you launch this Market in step 5, Kinship provisions one for you
              with three members:
            </p>
            <ul className="list-disc pl-[18px] my-[8px] text-[13px] leading-[1.7]">
              <li><b>Your wallet</b> — your internal FROST sponsor wallet.</li>
              <li><b>The Operator</b> — the agent you pick or create here.</li>
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
          </div>
        </div>
      </div>

      {/* ── Action bar ───────────────────────── */}
      <div className="flex items-center gap-3 mt-6">
        <Link href="/markets" className="no-underline">
          <button className="px-5 py-2.5 text-sm font-medium text-muted border border-card-border rounded-full hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors cursor-pointer">
            ← Cancel
          </button>
        </Link>
        <button
          className="bg-accent hover:bg-accent-dark text-on-accent font-semibold px-6 py-2.5 text-sm rounded-full transition-colors cursor-pointer"
          onClick={handleContinue}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}