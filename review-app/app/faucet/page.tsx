"use client";

/**
 * /faucet — Devnet/localnet faucet page.
 *
 * Two independent actions: SOL airdrop and USDC mint.
 * User can connect their wallet or paste any address.
 * No auth required — accessible to anyone on local/devnet.
 */

import { useState, useCallback, useEffect } from "react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

/* ── Constants ─────────────────────────────────────────────────────────── */

const USDC_DECIMALS = 6;

/** The USDC mint address we expect on the local validator (cloned mainnet). */
const USDC_MINT_STR = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface OpResult {
  success: boolean;
  signature?: string;
  balance?: number;
  error?: string;
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function FaucetPage() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  /* ── Wallet input ──────────────────────────────────────────────────── */
  const [useConnected, setUseConnected] = useState(true);
  const [pastedAddress, setPastedAddress] = useState("");

  const resolvedAddress = useConnected
    ? publicKey?.toBase58() ?? ""
    : pastedAddress.trim();

  const isValidAddress = (() => {
    if (!resolvedAddress) return false;
    try {
      new PublicKey(resolvedAddress);
      return true;
    } catch {
      return false;
    }
  })();

  /* ── Balances ──────────────────────────────────────────────────────── */
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [balLoading, setBalLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!isValidAddress) {
      setSolBalance(null);
      setUsdcBalance(null);
      return;
    }

    setBalLoading(true);
    const wallet = new PublicKey(resolvedAddress);

    try {
      const lamports = await connection.getBalance(wallet);
      setSolBalance(lamports / LAMPORTS_PER_SOL);
    } catch {
      setSolBalance(null);
    }

    try {
      const usdcMint = new PublicKey(USDC_MINT_STR);
      const ata = getAssociatedTokenAddressSync(usdcMint, wallet, true, TOKEN_PROGRAM_ID);
      const info = await connection.getTokenAccountBalance(ata);
      setUsdcBalance(Number(info.value.uiAmount ?? 0));
    } catch {
      setUsdcBalance(null);
    }

    setBalLoading(false);
  }, [resolvedAddress, isValidAddress, connection]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  /* ── SOL airdrop state ─────────────────────────────────────────────── */
  const [solAmount, setSolAmount] = useState("10");
  const [solLoading, setSolLoading] = useState(false);
  const [solResult, setSolResult] = useState<OpResult | null>(null);

  const handleAirdropSol = useCallback(async () => {
    if (!isValidAddress) return;

    const amt = parseFloat(solAmount);
    if (!amt || amt <= 0) {
      setSolResult({ success: false, error: "Enter a valid amount." });
      return;
    }

    setSolLoading(true);
    setSolResult(null);

    try {
      const res = await fetch("/api/v1/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: resolvedAddress,
          operation: "sol",
          amount: amt,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSolResult(data);
        fetchBalances();
      } else {
        setSolResult({
          success: false,
          error: data.error?.message || data.error || "Airdrop failed.",
        });
      }
    } catch (err) {
      setSolResult({
        success: false,
        error: (err as Error).message || "Network error.",
      });
    } finally {
      setSolLoading(false);
    }
  }, [resolvedAddress, isValidAddress, solAmount, fetchBalances]);

  /* ── USDC mint state ───────────────────────────────────────────────── */
  const [usdcAmount, setUsdcAmount] = useState("50000");
  const [usdcLoading, setUsdcLoading] = useState(false);
  const [usdcResult, setUsdcResult] = useState<OpResult | null>(null);

  const handleMintUsdc = useCallback(async () => {
    if (!isValidAddress) return;

    const amt = parseFloat(usdcAmount);
    if (!amt || amt <= 0) {
      setUsdcResult({ success: false, error: "Enter a valid amount." });
      return;
    }

    setUsdcLoading(true);
    setUsdcResult(null);

    try {
      const res = await fetch("/api/v1/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: resolvedAddress,
          operation: "usdc",
          amount: amt,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUsdcResult(data);
        fetchBalances();
      } else {
        setUsdcResult({
          success: false,
          error: data.error?.message || data.error || "Mint failed.",
        });
      }
    } catch (err) {
      setUsdcResult({
        success: false,
        error: (err as Error).message || "Network error.",
      });
    } finally {
      setUsdcLoading(false);
    }
  }, [resolvedAddress, isValidAddress, usdcAmount, fetchBalances]);

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#03011B" }}>
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted, #888)", marginBottom: 6 }}>
          Devnet / Localnet
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>
          Faucet
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted, #888)", marginTop: 6, lineHeight: 1.6 }}>
          Get test SOL and USDC for your wallet. Connect your wallet or paste any Solana address.
        </p>
      </div>

      {/* ── Wallet input ───────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={cardHeaderStyle}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Wallet</span>
        </div>
        <div style={{ padding: 16 }}>
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => setUseConnected(true)}
              style={{
                ...tabStyle,
                borderColor: useConnected ? "var(--accent, #eaaa00)" : "rgba(255,255,255,0.1)",
                background: useConnected ? "rgba(234,170,0,0.08)" : "transparent",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>Connected wallet</span>
            </button>
            <button
              onClick={() => setUseConnected(false)}
              style={{
                ...tabStyle,
                borderColor: !useConnected ? "var(--accent, #eaaa00)" : "rgba(255,255,255,0.1)",
                background: !useConnected ? "rgba(234,170,0,0.08)" : "transparent",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>Paste address</span>
            </button>
          </div>

          {useConnected ? (
            connected && publicKey ? (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#fff", wordBreak: "break-all" }}>
                  {publicKey.toBase58()}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setVisible(true)}
                style={connectBtnStyle}
              >
                Connect wallet
              </button>
            )
          ) : (
            <input
              type="text"
              placeholder="Solana wallet address (e.g. 3jhok…)"
              value={pastedAddress}
              onChange={(e) => setPastedAddress(e.target.value)}
              style={inputStyle}
            />
          )}

          {/* Balances */}
          {isValidAddress && (
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <div style={balPillStyle}>
                <span style={{ color: "var(--muted, #888)", fontSize: 11 }}>SOL</span>
                <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#fff" }}>
                  {balLoading ? "…" : solBalance !== null ? solBalance.toFixed(2) : "—"}
                </span>
              </div>
              <div style={balPillStyle}>
                <span style={{ color: "var(--muted, #888)", fontSize: 11 }}>USDC</span>
                <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#fff" }}>
                  {balLoading ? "…" : usdcBalance !== null ? usdcBalance.toLocaleString() : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SOL Airdrop card ───────────────────────────────────────────── */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={cardHeaderStyle}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>SOL Airdrop</span>
          <span style={{ fontSize: 11, color: "var(--muted, #888)" }}>Validator faucet</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Amount (SOL)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min="0.1"
                max="100"
                step="1"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                disabled={solLoading}
                style={{ ...inputStyle, flex: 1 }}
              />
              {[1, 5, 10].map((v) => (
                <button
                  key={v}
                  onClick={() => setSolAmount(String(v))}
                  disabled={solLoading}
                  style={presetBtnStyle}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAirdropSol}
            disabled={solLoading || !isValidAddress}
            style={{
              ...actionBtnStyle,
              opacity: solLoading || !isValidAddress ? 0.5 : 1,
              cursor: solLoading || !isValidAddress ? "not-allowed" : "pointer",
            }}
          >
            {solLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner /> Requesting…
              </span>
            ) : (
              "Airdrop SOL"
            )}
          </button>

          {solResult && <ResultBanner result={solResult} />}
        </div>
      </div>

      {/* ── USDC Mint card ─────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={cardHeaderStyle}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>USDC Mint</span>
          <span style={{ fontSize: 11, color: "var(--muted, #888)" }}>Test USDC</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Amount (USDC)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min="1"
                max="1000000"
                step="1000"
                value={usdcAmount}
                onChange={(e) => setUsdcAmount(e.target.value)}
                disabled={usdcLoading}
                style={{ ...inputStyle, flex: 1 }}
              />
              {[1000, 10000, 50000].map((v) => (
                <button
                  key={v}
                  onClick={() => setUsdcAmount(String(v))}
                  disabled={usdcLoading}
                  style={presetBtnStyle}
                >
                  {v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleMintUsdc}
            disabled={usdcLoading || !isValidAddress}
            style={{
              ...actionBtnStyle,
              opacity: usdcLoading || !isValidAddress ? 0.5 : 1,
              cursor: usdcLoading || !isValidAddress ? "not-allowed" : "pointer",
            }}
          >
            {usdcLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Spinner /> Minting…
              </span>
            ) : (
              "Mint USDC"
            )}
          </button>

          {usdcResult && <ResultBanner result={usdcResult} />}
        </div>
      </div>

      {/* ── Info footer ────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(234,170,0,0.04)", border: "1px solid rgba(234,170,0,0.15)", fontSize: 12, color: "var(--muted, #888)", lineHeight: 1.6 }}>
        <span style={{ fontWeight: 600, color: "rgba(234,170,0,0.8)" }}>Testing only.</span>{" "}
        SOL comes from the validator&apos;s built-in airdrop. USDC is minted from the cloned mainnet USDC
        account ({USDC_MINT_STR.slice(0, 8)}…) using the faucet keypair as mint authority.
        Not available on mainnet.
      </div>
    </div>
    </div>
  );
}

/* ── Subcomponents ───────────────────────────────────────────────────── */

function ResultBanner({ result }: { result: OpResult }) {
  const isOk = result.success;
  return (
    <div
      style={{
        marginTop: 12,
        padding: "12px 14px",
        borderRadius: 10,
        fontSize: 13,
        background: isOk ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
        border: isOk ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
        color: isOk ? "#4ade80" : "#f87171",
      }}
    >
      <div>{isOk ? "✓ " : "✗ "}{result.error || (isOk && result.balance !== undefined ? `Balance: ${result.balance.toLocaleString()}` : "Done")}</div>
      {result.signature && (
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--muted, #888)", marginTop: 6, wordBreak: "break-all" }}>
          tx: {result.signature}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="animate-spin"
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid rgba(255,255,255,0.2)",
        borderTopColor: "#fff",
        borderRadius: "50%",
      }}
    />
  );
}

/* ── Styles ──────────────────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.02)",
  overflow: "hidden",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid",
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.15s",
  fontFamily: "inherit",
  background: "transparent",
  color: "#fff",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  fontSize: 13,
  fontFamily: "monospace",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted, #888)",
  marginBottom: 6,
};

const presetBtnStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "var(--muted, #888)",
  fontSize: 12,
  fontFamily: "monospace",
  cursor: "pointer",
  transition: "border-color 0.15s",
};

const actionBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "var(--accent, #eaaa00)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s",
  fontFamily: "inherit",
};

const connectBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const balPillStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
};
