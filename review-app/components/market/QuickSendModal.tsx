"use client";

/**
 * QuickSendModal — direct treasury spend within the monthly spending limit.
 *
 * Uses Squads v4 spendingLimitUse instruction. No proposal needed.
 * The user's internal FROST wallet signs a single transaction.
 *
 * Flow: enter recipient + amount → build tx on server → sign with FROST → submit
 */

import { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { useSponsorPubkey, useFrostSignTransaction } from "@/lib/onchain/useAnchorProvider";
import { getToken, getSessionToken } from "@/lib/auth";

/* ── Types ──────────────────────────────────────────────────────────── */

interface QuickSendModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  monthlyBudgetUsdc: number | null;
  spendingLimitTotal: number | null;
  spendingLimitRemaining: number | null;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function getAuthHeaders(): Record<string, string> {
  const t = getToken() || getSessionToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
}

/* ════════════════════════════════════════════════════════════════════ */

export function QuickSendModal({ open, onClose, onSuccess, monthlyBudgetUsdc, spendingLimitTotal, spendingLimitRemaining }: QuickSendModalProps) {
  const { current } = useCurrentMarket();
  const { token } = useAuth();
  // Sign via the user's internal FROST wallet (no Phantom / browser wallet).
  const publicKey = useSponsorPubkey();
  const signTransaction = useFrostSignTransaction();
  const connected = !!publicKey;

  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"form" | "signing" | "confirming" | "done" | "error">("form");
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const slug = current?.slug;
  const amountNum = parseFloat(amount) || 0;

  // Warn / block when the amount is above what's actually available to send.
  const exceedsAvailable =
    spendingLimitRemaining != null && amountNum > spendingLimitRemaining;
  const exceedsMonthly =
    spendingLimitRemaining == null && monthlyBudgetUsdc != null && amountNum > monthlyBudgetUsdc;

  const canSend =
    connected &&
    publicKey &&
    slug &&
    recipient.trim().length >= 32 &&
    amountNum > 0 &&
    !exceedsAvailable &&
    !exceedsMonthly &&
    !sending;

  const handleSend = useCallback(async () => {
    if (!canSend || !signTransaction || !publicKey || !slug) return;

    setError(null);
    setSending(true);
    setStep("signing");

    try {
      // Validate address format
      if (!isValidSolanaAddress(recipient)) {
        throw new Error("Invalid Solana wallet address.");
      }

      // Build the transaction on the server
      const buildRes = await fetch(`/api/v1/markets/${slug}/treasury/quick-send/build`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sponsorPubkey: publicKey.toBase58(),
          recipientWallet: recipient.trim(),
          amountUsdc: amountNum,
          recipientName: recipientName.trim() || undefined,
        }),
      });

      if (!buildRes.ok) {
        const data = await buildRes.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Build failed (${buildRes.status})`);
      }

      const { serializedTransaction } = await buildRes.json();

      // Sign with the FROST wallet
      const tx = Transaction.from(Buffer.from(serializedTransaction, "base64"));
      const signed = await signTransaction(tx);

      setStep("confirming");

      // Submit signed transaction
      const submitRes = await fetch(`/api/v1/markets/${slug}/treasury/quick-send/submit`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          signedTransaction: Buffer.from(signed.serialize()).toString("base64"),
          recipientWallet: recipient.trim(),
          recipientName: recipientName.trim() || undefined,
          amountUsdc: amountNum,
        }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Submit failed (${submitRes.status})`);
      }

      const result = await submitRes.json();
      setTxSignature(result.txSignature);
      setStep("done");
    } catch (err: any) {
      if (err?.message?.includes("User rejected")) {
        setError("Transaction was rejected in your wallet.");
      } else {
        setError(err?.message || "Something went wrong.");
      }
      setStep("error");
    } finally {
      setSending(false);
    }
  }, [canSend, signTransaction, publicKey, slug, recipient, recipientName, amountNum]);

  const handleClose = () => {
    if (step === "done") {
      onSuccess();
    }
    setRecipient("");
    setRecipientName("");
    setAmount("");
    setStep("form");
    setError(null);
    setTxSignature(null);
    setSending(false);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(3,1,27,0.75)", backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", zIndex: 101,
          width: "min(480px, 92vw)",
          background: "#0C0A2A",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16, padding: 0,
          boxShadow: "0 24px 80px rgba(3,1,27,0.7)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(234,170,0,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon icon="lucide:send" width={16} height={16} style={{ color: "#EAAA00" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Quick Send</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                Within monthly allowance — no proposal needed
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.4)",
              cursor: "pointer", padding: 4,
            }}
          >
            <Icon icon="lucide:x" width={18} height={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>

          {step === "form" && (
            <>
              {/* Monthly budget info */}
              {(spendingLimitTotal || monthlyBudgetUsdc) && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 18,
                  background: "rgba(234,170,0,0.06)",
                  border: "1px solid rgba(234,170,0,0.15)",
                  fontSize: 12,
                }}>
                  {spendingLimitRemaining != null && spendingLimitTotal != null ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>Available this month</span>
                        <span style={{ color: "#22c55e", fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>
                          ${spendingLimitRemaining.toLocaleString()} USDC
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Monthly limit</span>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono, monospace)" }}>
                          ${spendingLimitTotal.toLocaleString()} USDC
                        </span>
                      </div>
                      {/* Usage bar */}
                      <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 4,
                          background: spendingLimitRemaining > 0 ? "#EAAA00" : "#ef4444",
                          width: `${Math.min(100, (spendingLimitRemaining / spendingLimitTotal) * 100)}%`,
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>Monthly limit</span>
                      <span style={{ color: "#EAAA00", fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>
                        ${(monthlyBudgetUsdc ?? 0).toLocaleString()} USDC
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Recipient */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                  Recipient wallet
                </label>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Solana wallet address"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#fff", fontSize: 13, fontFamily: "var(--font-mono, monospace)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Recipient name (optional) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                  Recipient name <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>optional</span>
                </label>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Vendor name, employee"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#fff", fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              {/* Amount */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#fff", fontSize: 18, fontWeight: 700,
                    fontFamily: "var(--font-mono, monospace)",
                    outline: "none",
                  }}
                />
                {exceedsAvailable && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>
                    Exceeds available balance (${spendingLimitRemaining!.toLocaleString()} USDC). Reduce the amount or use a governance proposal.
                  </div>
                )}
                {exceedsMonthly && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>
                    Exceeds monthly limit. Use a governance proposal instead.
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  fontSize: 12, color: "#ef4444",
                }}>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleClose}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 10,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{
                    flex: 2, padding: "12px", borderRadius: 10,
                    background: canSend ? "#EAAA00" : "rgba(255,255,255,0.06)",
                    border: "none",
                    color: canSend ? "#09073A" : "rgba(255,255,255,0.25)",
                    fontSize: 13, fontWeight: 700,
                    cursor: canSend ? "pointer" : "not-allowed",
                    transition: "background 0.15s",
                  }}
                >
                  Send via FROST wallet
                </button>
              </div>
            </>
          )}

          {(step === "signing" || step === "confirming") && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(234,170,0,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
                animation: "spin 1.5s linear infinite",
              }}>
                <Icon icon="lucide:loader-2" width={24} height={24} style={{ color: "#EAAA00" }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                {step === "signing" ? "Signing…" : "Confirming on Solana…"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                {step === "signing"
                  ? "Signing with your FROST wallet."
                  : "Transaction sent — waiting for cluster confirmation."}
              </div>
            </div>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(34,197,94,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Icon icon="lucide:check" width={24} height={24} style={{ color: "#22c55e" }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                Sent!
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                ${amountNum.toLocaleString()} USDC → {recipient.slice(0, 6)}…{recipient.slice(-4)}
              </div>
              {txSignature && (
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "rgba(255,255,255,0.35)" }}>
                  {txSignature.slice(0, 16)}…{txSignature.slice(-8)}
                </div>
              )}
              <button
                onClick={handleClose}
                style={{
                  marginTop: 20, padding: "10px 32px", borderRadius: 10,
                  background: "#EAAA00", border: "none",
                  color: "#09073A", fontSize: 13, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "rgba(239,68,68,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Icon icon="lucide:x" width={24} height={24} style={{ color: "#ef4444" }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                Transaction failed
              </div>
              <div style={{
                fontSize: 12, color: "#ef4444", marginBottom: 20,
                maxWidth: 360, margin: "0 auto 20px", lineHeight: 1.5,
              }}>
                {error}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button
                  onClick={handleClose}
                  style={{
                    padding: "10px 24px", borderRadius: 10,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => { setStep("form"); setError(null); }}
                  style={{
                    padding: "10px 24px", borderRadius: 10,
                    background: "#EAAA00", border: "none",
                    color: "#09073A", fontSize: 13, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}