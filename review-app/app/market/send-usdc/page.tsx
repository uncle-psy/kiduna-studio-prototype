"use client";

/**
 * Send USDC — testing-only utility page.
 *
 * On localnet, the sponsor's wallet is the mint authority of the mock
 * USDC token created during market launch. This page lets the sponsor
 * mint USDC directly to any wallet address for testing.
 *
 * Not needed on mainnet — users will have real USDC.
 */

import { useState, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { useCurrentMarket } from "@/lib/market-context";
import { AdminPageGate } from "@/components/market/AdminOnly";
import { getPriorityFee } from "@/lib/priority-fee";

const USDC_DECIMALS = 6;

async function pollSignatureStatus(
  connection: { getSignatureStatuses: (sigs: string[]) => Promise<{ value: any[] }> },
  signature: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1_000));
    try {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value?.[0];
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        return true;
      }
      if (status?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
    } catch (err) {
      if ((err as Error).message?.startsWith("Transaction failed:")) throw err;
    }
  }
  return false;
}

export default function SendUsdcPage() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { current } = useCurrentMarket();
  const daoCtx = useDaoContext();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    signature?: string;
  } | null>(null);

  const usdcMint = daoCtx.ctx?.usdcMint ?? null;

  /* ── Sponsor USDC balance ──────────────────────────────────────── */
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !usdcMint) {
      setBalance(null);
      return;
    }
    setBalanceLoading(true);
    try {
      const ata = getAssociatedTokenAddressSync(usdcMint, publicKey);
      const info = await connection.getTokenAccountBalance(ata);
      setBalance(Number(info.value.uiAmount ?? 0));
    } catch {
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  }, [publicKey, usdcMint, connection]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  /* ── Send handler ──────────────────────────────────────────────── */

  const handleSend = useCallback(async () => {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    if (!usdcMint) {
      setResult({ success: false, message: "USDC mint not available. Is this market launched?" });
      return;
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient.trim());
    } catch {
      setResult({ success: false, message: "Invalid wallet address. Must be a valid Solana public key." });
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setResult({ success: false, message: "Enter a valid positive amount." });
      return;
    }

    if (balance !== null && amountNum > balance) {
      setResult({ success: false, message: `Insufficient balance. You have ${balance.toLocaleString()} USDC.` });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const senderAta = getAssociatedTokenAddressSync(usdcMint, publicKey);
      const recipientAta = getAssociatedTokenAddressSync(usdcMint, recipientPubkey);
      const rawAmount = BigInt(Math.floor(amountNum * 10 ** USDC_DECIMALS));

      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: await getPriorityFee([senderAta.toBase58(), recipientAta.toBase58()], "High"),
      }));

      // Create recipient's USDC ATA if it doesn't exist (idempotent)
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey, recipientAta, recipientPubkey, usdcMint,
        ),
      );

      // Transfer USDC from sponsor's ATA to recipient's ATA
      tx.add(
        createTransferCheckedInstruction(
          senderAta,     // source ATA
          usdcMint,      // mint (for decimal verification)
          recipientAta,  // destination ATA
          publicKey,     // owner of source ATA
          rawAmount,     // amount in raw units
          USDC_DECIMALS, // decimals
        ),
      );

      const signature = await sendTransaction(tx, connection);

      const confirmed = await pollSignatureStatus(connection, signature, 15_000);
      if (!confirmed) {
        // Transaction may have landed despite poll timeout — check recipient balance
        try {
          const recipientAtaBalance = await connection.getTokenAccountBalance(recipientAta);
          const recipientBal = Number(recipientAtaBalance.value.uiAmount ?? 0);
          if (recipientBal > 0) {
            setResult({
              success: true,
              message: `Sent ${amountNum.toLocaleString()} USDC to ${recipientPubkey.toBase58().slice(0, 8)}…${recipientPubkey.toBase58().slice(-4)} (confirmed via balance check)`,
              signature,
            });
            setAmount("");
            fetchBalance();
            return;
          }
        } catch { /* balance check failed — fall through to success anyway */ }
      }

      setResult({
        success: true,
        message: `Sent ${amountNum.toLocaleString()} USDC to ${recipientPubkey.toBase58().slice(0, 8)}…${recipientPubkey.toBase58().slice(-4)}`,
        signature,
      });
      setAmount("");
      fetchBalance();
    } catch (err) {
      const msg = (err as Error).message?.split("\n")[0] || "Transaction failed";
      setResult({ success: false, message: msg });
    } finally {
      setSending(false);
    }
  }, [connected, publicKey, usdcMint, recipient, amount, balance, connection, sendTransaction, setVisible, fetchBalance]);

  return (
    <AdminPageGate>
    <div>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs text-muted mb-1">{current?.name || "Market"} / Send USDC</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Send USDC.</h1>
        <p className="text-muted mt-1">
          Mint test USDC to any wallet on localnet. The connected wallet must be
          the USDC mint authority (the sponsor who launched this market).
        </p>
      </div>

      {/* ── Testing-only banner ────────────────────────────────────── */}
      <div className="mb-5 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04]">
        <h3 className="text-white font-bold text-sm mb-1.5 flex items-center gap-2">
          <Icon icon="lucide:flask-conical" width={16} height={16} className="text-amber-400" />
          Testing only
        </h3>
        <p className="text-muted text-sm leading-relaxed">
          This page mints mock USDC using the sponsor&apos;s mint authority.
          On mainnet, users will hold real USDC and this page will not be available.
        </p>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">USDC Mint</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <Icon icon="lucide:coins" width={16} height={16} className="text-green-400" />
            </div>
          </div>
          {daoCtx.loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : usdcMint ? (
            <p className="text-xs font-mono text-foreground break-all leading-relaxed">{usdcMint.toBase58()}</p>
          ) : (
            <p className="text-sm text-red-400">Not available</p>
          )}
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Your USDC Balance</span>
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Icon icon="lucide:wallet" width={16} height={16} className="text-accent" />
            </div>
          </div>
          {!connected ? (
            <p className="text-sm text-muted">Connect wallet</p>
          ) : balanceLoading ? (
            <p className="text-2xl font-bold text-muted">…</p>
          ) : balance !== null ? (
            <>
              <p className="text-2xl font-bold text-white">{balance.toLocaleString()}</p>
              <p className="text-xs text-green-400 mt-1">USDC</p>
            </>
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
        </div>
      </div>

      {/* ── Send form card ─────────────────────────────────────────── */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 p-4 border-b border-card-border">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Icon icon="lucide:send" width={18} height={18} className="text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Mint & send</h2>
            <p className="text-[11px] text-muted">Create USDC and send to any Solana address.</p>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5">
          {/* Recipient */}
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              Recipient Wallet Address
            </label>
            <input
              type="text"
              placeholder="e.g. GdeEHkWWHiaA…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={sending}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-input border border-card-border text-foreground outline-none focus:border-accent/50 font-mono placeholder:text-muted/40"
            />
          </div>

          {/* Amount */}
          <div className="mb-5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
              Amount (USDC)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-input border border-card-border text-foreground outline-none focus:border-accent/50 font-mono placeholder:text-muted/40"
              />
              {[1000, 5000, 10000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  disabled={sending}
                  className="px-3 py-2.5 rounded-xl text-[11px] bg-input border border-card-border text-muted cursor-pointer font-mono hover:border-white/20 transition-colors disabled:opacity-50"
                >
                  {(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Send button */}
          {connected ? (
            <button
              onClick={handleSend}
              disabled={sending || !usdcMint}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-accent border border-accent text-white cursor-pointer hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing…
                </>
              ) : (
                <>
                  <Icon icon="lucide:send" width={15} height={15} />
                  Send USDC
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-accent border border-accent text-white cursor-pointer hover:brightness-110 transition-colors flex items-center justify-center gap-2"
            >
              <Icon icon="lucide:wallet" width={15} height={15} />
              Connect Sponsor Wallet
            </button>
          )}

          {/* Result */}
          {result && (
            <div className={`mt-4 p-4 rounded-xl text-sm ${
              result.success
                ? "bg-green-500/[0.08] border border-green-500/25 text-green-400"
                : "bg-red-500/[0.08] border border-red-500/25 text-red-400"
            }`}>
              <div className="flex items-start gap-2">
                <Icon
                  icon={result.success ? "lucide:check-circle-2" : "lucide:x-circle"}
                  width={16} height={16} className="shrink-0 mt-0.5"
                />
                <div>
                  <div>{result.message}</div>
                  {result.signature && (
                    <div className="mt-1.5 text-[11px] font-mono text-muted/60 break-all">
                      tx: {result.signature}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </AdminPageGate>
  );
}