"use client";

/**
 * Step 4 — Configure.
 *
 * For token-backed markets: full token launch configuration with
 * state management and sessionStorage persistence.
 *
 * For simple markets: just Objective + Operator.
 *
 * Reads: kinship.market-create.operatorId (Step 1),
 *        kinship.market-create.type (Step 3)
 * Persists: kinship.market-create.objectiveId,
 *           kinship.market-create.tokenConfig (JSON)
 */

import Link from "next/link";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ObjectivePicker } from "@/components/pickers/ObjectivePicker";
import { getAgent } from "@/lib/agents-api";
import type { Presence } from "@/lib/agent-types";
import { useAuth } from "@/lib/auth-context";
import { WizardHeader, StepRail, saveWizardDraft } from "../_shared";

/* ── On-chain mint verification (via server-side API) ───────────────── */
interface MintInfo {
  exists: boolean;
  decimals: number;
  supply: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  name: string;
  symbol: string;
  isSponsorMintAuthority: boolean;
  unsupportedReason: string | null;
}

async function verifyMintOnChain(mintAddress: string, sponsorWallet: string): Promise<MintInfo> {
  const params = new URLSearchParams({ address: mintAddress });
  if (sponsorWallet) params.set("sponsor", sponsorWallet);

  const res = await fetch(`/api/v1/mint-info?${params.toString()}`);
  const data = await res.json();

  if (!res.ok) {
    return {
      exists: false, decimals: 0, supply: 0,
      mintAuthority: null, freezeAuthority: null,
      name: "", symbol: "", isSponsorMintAuthority: false,
      unsupportedReason: null,
    };
  }

  return {
    exists: true,
    decimals: data.decimals,
    supply: data.supply,
    mintAuthority: data.mintAuthority,
    freezeAuthority: data.freezeAuthority,
    name: data.tokenName || "",
    symbol: data.tokenSymbol || "",
    isSponsorMintAuthority: data.mintAuthorityHeld,
    unsupportedReason: data.unsupportedReason || null,
  };
}

/* ── sessionStorage ─────────────────────────────────────────────────── */
function ssGet(key: string) { try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; } }
function ssSet(key: string, v: string) { try { sessionStorage.setItem(key, v); } catch {} }

const SK = {
  operator: "kinship.market-create.operatorId",
  objective: "kinship.market-create.objectiveId",
  tokenConfig: "kinship.market-create.tokenConfig",
};

/* ── Token config shape ─────────────────────────────────────────────── */
type TokenConfig = {
  mode: "new" | "existing";
  tokenName: string;
  ticker: string;
  decimals: number;
  totalSupply: number;
  metadataUri: string;
  existingMint: string;
  minRaise: number;
  maxRaise: number;
  launchPeriodDays: number;
  startingPrice: number;
  teamAllocPct: number;
  treasuryReservePct: number;
  poolPct: number;
  futarchyPct: number;
  usdcPoolPct: number;
  usdcTreasuryPct: number;
  usdcFutarchyPct: number;
  secondsPerProposal: number;
  monthlyLimitUsdc: number;
  cooldownHours: number;
  lockupMonths: number;
  vestingStyle: string;
  recipients: { id: string; wallet: string; pct: number }[];
  enableBidWall: boolean;
  // ── ICO Launchpad fields (new token mode) ──
  icoDurationDays: number;
  monthlyBudgetUsdc: number;
  perfPackageTokens: number;
  perfPackageGrantee: string;
  perfMinUnlockMonths: number;
  additionalTokensAmount: number;
  additionalTokensRecipient: string;
  hasBidWall: boolean;
};

const defaultTokenConfig: TokenConfig = {
  mode: "new",
  tokenName: "",
  ticker: "",
  decimals: 6,
  totalSupply: 1_000_000_000,
  metadataUri: "",
  existingMint: "",
  minRaise: 50000,
  maxRaise: 500000,
  launchPeriodDays: 7,
  startingPrice: 0,
  teamAllocPct: 20,
  treasuryReservePct: 10,
  poolPct: 1,
  futarchyPct: 0.5,
  usdcPoolPct: 15,
  usdcTreasuryPct: 77,
  usdcFutarchyPct: 8,
  secondsPerProposal: 86400,
  monthlyLimitUsdc: 10000,
  cooldownHours: 0,
  lockupMonths: 24,
  vestingStyle: "cliff-linear",
  recipients: [{ id: "r1", wallet: "", pct: 100 }],
  enableBidWall: false,
  // ICO defaults
  icoDurationDays: 4,
  monthlyBudgetUsdc: 8000,
  perfPackageTokens: 10,
  perfPackageGrantee: "",
  perfMinUnlockMonths: 12,
  additionalTokensAmount: 0,
  additionalTokensRecipient: "",
  // Bid wall is not available yet (Coming soon) — always launch with it OFF.
  hasBidWall: false,
};

/**
 * Performance Package section is hidden in the UI (product decision). The
 * underlying config still flows through with defaults (grantee auto-defaulted
 * to the sponsor wallet), so the on-chain launch is unchanged. Set to true to
 * show the section again.
 */
const SHOW_PERFORMANCE_PACKAGE = false;

/* ════════════════════════════════════════════════════════════════════ */

/**
 * Numeric input that keeps the raw typed text in local state so in-progress
 * values like "0", "0." and "0.1" survive (a number-backed value would coerce
 * "0" to 0 and wipe it). Leading zeros are stripped ("000.1" → "0.1", "01" →
 * "1") while a lone "0" or "0." is preserved so decimals can be typed. The
 * parsed number is pushed up via onChange; the text re-syncs if the numeric
 * value is changed from outside (e.g. a draft loaded from sessionStorage).
 */
function NumberField({
  value,
  onChange,
  ...rest
}: { value: number; onChange: (n: number) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>) {
  const [text, setText] = useState(value === 0 ? "" : String(value));

  // Re-sync when the external numeric value diverges from what's typed.
  useEffect(() => {
    const parsed = text === "" || text === "." ? 0 : Number(text);
    if (parsed !== value) setText(value === 0 ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      {...rest}
      type="number"
      value={text}
      onChange={(e) => {
        // Strip leading zeros but keep "0"/"0." so decimals can be typed.
        const raw = e.target.value.replace(/^0+(?=\d)/, "");
        setText(raw);
        const n = raw === "" || raw === "." ? 0 : Number(raw);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
}

function PageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  /* ── State ─────────────────────────────────────────────────────────── */
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [operator, setOperator] = useState<Presence | null>(null);
  const [operatorLoading, setOperatorLoading] = useState(true);
  const [objectiveId, setObjectiveId] = useState<string>("");
  const [tc, setTc] = useState<TokenConfig>(defaultTokenConfig);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [mintVerifying, setMintVerifying] = useState(false);
  const [mintVerified, setMintVerified] = useState<MintInfo | null>(null);
  const [mintVerifyError, setMintVerifyError] = useState<string | null>(null);

  const updateTc = useCallback(<K extends keyof TokenConfig>(key: K, val: TokenConfig[K]) => {
    setTc((prev) => ({ ...prev, [key]: val }));
  }, []);

  /* ── Verify existing mint on-chain ─────────────────────────────────── */
  const handleVerifyMint = useCallback(async (mintAddr: string) => {
    if (!mintAddr.trim() || mintAddr.length < 32 || mintAddr.length > 44) {
      setMintVerified(null);
      setMintVerifyError(null);
      return;
    }
    // Sponsor wallet is the user's internal FROST (custodial) wallet.
    const sponsorWallet = user?.wallet ?? "";

    setMintVerifying(true);
    setMintVerifyError(null);
    setMintVerified(null);
    try {
      const info = await verifyMintOnChain(mintAddr.trim(), sponsorWallet);
      if (!info.exists) {
        setMintVerifyError("Token mint not found on-chain. Check the address.");
        return;
      }
      if (info.unsupportedReason) {
        setMintVerifyError(info.unsupportedReason);
        return;
      }
      if (!info.isSponsorMintAuthority) {
        setMintVerifyError(`You are not the mint authority. Current authority: ${info.mintAuthority || "none"}. You must be the mint authority to create a market.`);
        return;
      }
      setMintVerified(info);
      // Auto-fill token config from on-chain data
      setTc((prev) => ({
        ...prev,
        tokenName: info.name || prev.tokenName,
        ticker: info.symbol || prev.ticker,
        decimals: info.decimals,
        totalSupply: info.supply,
      }));
    } catch (err: any) {
      setMintVerifyError("Failed to verify mint on-chain. Check RPC connection.");
    } finally {
      setMintVerifying(false);
    }
  }, [user?.wallet]);

  /* ── Load on mount ─────────────────────────────────────────────────── */
  useEffect(() => {
    const storedOp = ssGet(SK.operator);
    const storedObj = ssGet(SK.objective);
    const storedTc = ssGet(SK.tokenConfig);
    if (storedObj) setObjectiveId(storedObj);
    if (storedTc) {
      try {
        // "Use existing token" and the bid wall are not implemented yet —
        // force mode back to "new" and bid wall OFF so a stale draft can't
        // land in a disabled flow or re-enable the bid wall.
        setTc({ ...defaultTokenConfig, ...JSON.parse(storedTc), mode: "new", hasBidWall: false });
      } catch {}
    }

    if (!storedOp) { setOperatorLoading(false); return; }
    setOperatorId(storedOp);
    getAgent(storedOp)
      .then((a) => setOperator(a))
      .catch(() => {})
      .finally(() => setOperatorLoading(false));
  }, []);

  /* ── Default the performance-package grantee to the sponsor's FROST wallet ──
     Runs when the user's wallet becomes available. Only fills when the field is
     still empty, so a manually-entered value or a loaded draft is never
     overwritten. Depends on user.wallet only (not tc), so clearing the field by
     hand keeps it cleared. */
  useEffect(() => {
    const w = user?.wallet;
    if (!w) return;
    setTc((prev) => (prev.perfPackageGrantee.trim() ? prev : { ...prev, perfPackageGrantee: w }));
  }, [user?.wallet]);

  /* ── Persist ───────────────────────────────────────────────────────── */
  function persistAll() {
    ssSet(SK.objective, objectiveId);
    ssSet(SK.tokenConfig, JSON.stringify(tc));
    // Mirror to the per-wallet server draft (survives logout / new tab).
    saveWizardDraft();
  }

  /* ── Token validation ──────────────────────────────────────────────── */
  const tokenErrors: string[] = [];
  if (tc.mode === "new") {
      if (!tc.tokenName.trim()) tokenErrors.push("Token name is required.");
      if (tc.tokenName.length > 32) tokenErrors.push("Token name must be 32 characters or fewer.");
      if (!tc.ticker.trim()) tokenErrors.push("Ticker is required.");
      if (tc.ticker.length > 10) tokenErrors.push("Ticker must be 10 characters or fewer.");
      if (tc.totalSupply <= 0) tokenErrors.push("Total supply must be positive.");
    } else {
      if (!tc.existingMint.trim()) tokenErrors.push("Mint address is required.");
      if (tc.existingMint.length < 32 || tc.existingMint.length > 44) tokenErrors.push("Mint address must be 32-44 characters.");
      if (!mintVerified) tokenErrors.push("Mint must be verified on-chain before proceeding.");
      if (mintVerified && !mintVerified.isSponsorMintAuthority) tokenErrors.push("You must be the mint authority of this token.");
    }
    if (tc.minRaise <= 0) tokenErrors.push("Minimum raise must be positive.");
    if (tc.maxRaise < tc.minRaise) tokenErrors.push("Maximum raise must be >= minimum.");
    // ICO (new-token) launches mint a token and open a fundraise. The on-chain
    // launchpad program requires monthly budget >= 1 (0 is rejected) AND
    // minRaise >= monthly budget × 6. Validate both here so the wizard blocks
    // early instead of failing later at ICO initialize.
    if (tc.mode === "new") {
      if (tc.monthlyBudgetUsdc < 1) {
        tokenErrors.push("Monthly team budget must be at least 1 USDC — the on-chain ICO program does not allow 0.");
      } else if (tc.monthlyBudgetUsdc * 6 > tc.minRaise) {
        tokenErrors.push(`Monthly budget × 6 (${(tc.monthlyBudgetUsdc * 6).toLocaleString()}) exceeds minimum raise (${tc.minRaise.toLocaleString()}). Max allowed: ${Math.floor(tc.minRaise / 6).toLocaleString()} USDC.`);
      }
    }
    if (tc.startingPrice < 0) tokenErrors.push("Starting price cannot be negative.");
    const tokenAllocTotal = tc.teamAllocPct + tc.treasuryReservePct + tc.poolPct + tc.futarchyPct;
    if (tokenAllocTotal > 100) tokenErrors.push(`Token allocation sums to ${tokenAllocTotal}%, must be ≤ 100%.`);
    if (tc.poolPct <= 0) tokenErrors.push("Pool allocation must be positive.");
    if (tc.futarchyPct <= 0) tokenErrors.push("Futarchy allocation must be positive.");
    if (tc.perfPackageTokens > 0 && !tc.perfPackageGrantee.trim()) tokenErrors.push("Grantee wallet is required when performance package amount is set.");
    if (tc.perfPackageGrantee.trim() && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tc.perfPackageGrantee.trim())) tokenErrors.push("Grantee wallet must be a valid Solana address (32–44 base58 characters).");
    const usdcAllocTotal = tc.usdcPoolPct + tc.usdcTreasuryPct + tc.usdcFutarchyPct;
    if (Math.abs(usdcAllocTotal - 100) > 0.1) tokenErrors.push(`USDC allocation sums to ${usdcAllocTotal}%, must be 100%.`);
    const recipientTotal = tc.recipients.reduce((s, r) => s + r.pct, 0);
    if (recipientTotal !== 100) tokenErrors.push(`Recipient allocation sums to ${recipientTotal}%, must be 100%.`);

  // ICO monthly-budget rule (0 not allowed; minRaise >= budget × 6). Reused by
  // the field styling, inline banner, and the Continue button.
  const icoBudgetInvalid = tc.mode === "new" && (tc.monthlyBudgetUsdc < 1 || tc.monthlyBudgetUsdc * 6 > tc.minRaise);

  const operatorMissing = !operatorId;
  const objectiveMissing = !objectiveId;
  const hasErrors = operatorMissing || objectiveMissing || tokenErrors.length > 0;

  function handleContinue() {
    setAttempted(true);
    if (hasErrors) {
      requestAnimationFrame(() => {
        const err = document.querySelector('[data-form-error]')
        if (err) err.scrollIntoView({ behavior: 'smooth', block: 'center' })
        else document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
      })
      return;
    }
    setNavigating(true);
    persistAll();
    router.push(`/markets/create/review`);
  }

  function handleSaveDraft() { persistAll(); setSaving(true); setTimeout(() => setSaving(false), 1200); }

  /* ── Recipient helpers ─────────────────────────────────────────────── */
  function updateRecipient(id: string, key: "wallet" | "pct", val: string | number) {
    updateTc("recipients", tc.recipients.map((r) =>
      r.id === id ? { ...r, [key]: key === "pct" ? Math.max(0, Math.min(100, Number(val) || 0)) : val } : r
    ));
  }
  function addRecipient() {
    updateTc("recipients", [...tc.recipients, { id: `r${Date.now()}`, wallet: "", pct: 0 }]);
  }
  function removeRecipient(id: string) {
    if (tc.recipients.length <= 1) return;
    updateTc("recipients", tc.recipients.filter((r) => r.id !== id));
  }

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="market-wizard">
      <WizardHeader
        stepLabel="Step 3 - Configure"
        title="Launch your token and configure your Market."
        description="Configure how your token launches, then pick the Objective this Market organizes around."
      />
      <StepRail activeIndex={2} />

      <div className="grid-2">
        <div>

          {/* ════════════ TOKEN SETUP ════════════ */}
          <>
              {/* ─── 1 Token identity ─────────────────────────── */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">1 - Token identity</div>
                <div className="card-sub">Mint a new token, or point this Market at one you already have.</div>

                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <button type="button" onClick={() => updateTc("mode", "new")}
                    style={{
                      ...S.tabBtn,
                      borderColor: tc.mode === "new" ? "var(--accent)" : "var(--border)",
                      background: tc.mode === "new" ? "rgba(234,170,0,0.08)" : "transparent",
                    }}>
                    <span style={S.tabLabel}>Mint new token</span>
                    <span style={S.tabHint}>Launchpad creates everything</span>
                  </button>
                  <button type="button" disabled aria-disabled="true"
                    title="Coming soon"
                    style={{
                      ...S.tabBtn,
                      borderColor: "var(--border)",
                      background: "transparent",
                      cursor: "not-allowed",
                      opacity: 0.5,
                    }}>
                    <span style={{ ...S.tabLabel, display: "flex", alignItems: "center", gap: 6 }}>
                      Use existing token
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", padding: "1px 6px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--muted)" }}>Coming soon</span>
                    </span>
                    <span style={S.tabHint}>Paste a mint address</span>
                  </button>
                </div>

                {tc.mode === "existing" ? (
                  <>
                  <div className="field">
                    <label>Token mint address</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={tc.existingMint} onChange={(e) => { updateTc("existingMint", e.target.value); setMintVerified(null); setMintVerifyError(null); }}
                          placeholder="Paste Solana mint address (32-44 chars)" style={{ flex: 1 }} />
                        <button type="button" onClick={() => handleVerifyMint(tc.existingMint)} disabled={mintVerifying || tc.existingMint.length < 32}
                          style={{ ...S.tabBtn, padding: "8px 16px", flex: "none", cursor: mintVerifying || tc.existingMint.length < 32 ? "not-allowed" : "pointer", opacity: mintVerifying || tc.existingMint.length < 32 ? 0.5 : 1, borderColor: mintVerified ? "var(--pass)" : "var(--accent)" }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{mintVerifying ? "Verifying..." : mintVerified ? "✓ Verified" : "Verify"}</span>
                        </button>
                      </div>
                      <div className="hint">Paste a mint address and click Verify to check it on-chain.</div>
                    </div>

                    {/* Verify error */}
                    {mintVerifyError && (
                      <div style={{ padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: "var(--fail)" }}>{mintVerifyError}</div>
                      </div>
                    )}

                    {/* Verified mint info */}
                    {mintVerified && (
                      <div style={{ padding: 14, borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.25)", marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pass)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>✓ Token verified on-chain</div>
                        <div className="row-2" style={{ gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Name</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{mintVerified.name || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Symbol</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{mintVerified.symbol || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Decimals</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{mintVerified.decimals}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Supply</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{mintVerified.supply.toLocaleString()}</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: "var(--pass)", display: "flex", alignItems: "center", gap: 4 }}>
                          ✓ You are the mint authority — authority will transfer to DAO on launch
                        </div>
                  </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="row-2">
                      <div className="field"><label>Token name <span style={{ color: "var(--accent)" }}>*</span></label>
                        <div style={{ position: "relative" }}>
                          <input value={tc.tokenName} onChange={(e) => updateTc("tokenName", e.target.value.slice(0, 32))} placeholder="e.g. Acme Governance" maxLength={32} />
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontFamily: "var(--font-mono)", color: tc.tokenName.length >= 32 ? "var(--fail)" : "var(--muted)", pointerEvents: "none" }}>{tc.tokenName.length}/32</span>
                        </div>
                      </div>
                      <div className="field"><label>Ticker <span style={{ color: "var(--accent)" }}>*</span></label>
                        <div style={{ position: "relative" }}>
                          <input value={tc.ticker} onChange={(e) => updateTc("ticker", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 25))} placeholder="e.g. ACME" maxLength={25} style={{ textTransform: "uppercase" }} />
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontFamily: "var(--font-mono)", color: tc.ticker.length >= 25? "var(--fail)" : "var(--muted)", pointerEvents: "none" }}>{tc.ticker.length}/25</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, fontSize: 12, background: "rgba(234,170,0,0.06)", border: "1px solid rgba(234,170,0,0.2)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--fg)" }}>MetaDAO Protocol Token Supply</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", color: "var(--muted)" }}>
                        <span>Decimals:</span><span style={{ fontWeight: 600, color: "var(--fg)" }}>6 (fixed)</span>
                        <span>ICO contributors:</span><span style={{ fontWeight: 600, color: "var(--fg)" }}>10,000,000</span>
                        <span>Futarchy AMM:</span><span style={{ fontWeight: 600, color: "var(--fg)" }}>2,000,000</span>
                        <span>Meteora LP:</span><span style={{ fontWeight: 600, color: "var(--fg)" }}>900,000</span>
                        <span>Base total:</span><span style={{ fontWeight: 600, color: "var(--accent)" }}>12,900,000</span>
                      </div>
                    </div>
                    {showAdvanced && (
                      <div className="field" style={{ marginTop: 8 }}>
                        <label>Metadata URI</label>
                        <input value={tc.metadataUri} onChange={(e) => updateTc("metadataUri", e.target.value)} placeholder="https://arweave.net/..." />
                        <div className="hint">Metaplex-compatible JSON. Leave blank to auto-generate.</div>
                      </div>
                    )}
                    <button type="button" style={S.ghostBtn} onClick={() => setShowAdvanced(!showAdvanced)}>
                      {showAdvanced ? "Hide advanced" : "Show advanced"}
                    </button>
                  </>
                )}
              </div>

              {/* ── Token validation errors (shown near the relevant fields) ── */}
              {attempted && tokenErrors.length > 0 && (
                <div data-form-error style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  {tokenErrors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--fail)", marginBottom: i < tokenErrors.length - 1 ? 4 : 0 }}>{e}</div>
                  ))}
                </div>
              )}

              {/* ─── 2 Raise target ────────────────────────────── */}
              {tc.mode === "new" ? (
                <>
                  {/* ═══ ICO MODE CARDS ═══ */}
                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-title">2 - ICO Configuration</div>
                    <div className="card-sub">Configure your crowdfunded token launch. Contributors commit USDC and receive tokens pro-rata.</div>
                    <div className="row-2">
                      <div className="field"><label>Minimum raise (USDC)</label>
                        <NumberField min={0} placeholder="0" value={tc.minRaise} onChange={(n) => updateTc("minRaise", n)} />
                        <div className="hint">Below this → ICO fails, all USDC refunded</div>
                      </div>
                      <div className="field"><label>ICO duration</label>
                        <select value={tc.icoDurationDays} onChange={(e) => updateTc("icoDurationDays", Number(e.target.value))}>
                          <option value={0.002083}>3 min (dev test)</option>
                          <option value={0.003472}>5 min (dev test)</option>
                          <option value={0.010417}>15 min (dev test)</option>
                          <option value={0.041667}>1 hour (dev test)</option>
                          <option value={1}>1 day</option>
                          <option value={2}>2 days</option>
                          <option value={3}>3 days</option>
                          <option value={4}>4 days (recommended)</option>
                          <option value={7}>7 days</option>
                          <option value={14}>14 days (max)</option>
                        </select>
                      </div>
                    </div>
                    <div className="row-2">
                      <div className="field"><label>Monthly team budget (USDC)</label>
                        <NumberField min={1} placeholder="1" value={tc.monthlyBudgetUsdc} onChange={(n) => updateTc("monthlyBudgetUsdc", n)} style={{ borderColor: icoBudgetInvalid ? "var(--fail)" : undefined }} />
                        <div className="hint">Max: {Math.floor(tc.minRaise / 6).toLocaleString()} USDC (on-chain rule: min raise ÷ 6)</div>
                      </div>
                      <div className="field"><label>Proposal voting period</label>
                        <input type="text" value="3 days" disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
                        <div className="hint">Fixed by launchpad program — changeable after launch via governance proposal</div>
                      </div>
                    </div>
                    {icoBudgetInvalid && (
                      <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, fontSize: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--fail)" }}>
                        {tc.monthlyBudgetUsdc < 1
                          ? "Monthly team budget must be at least 1 USDC — the on-chain ICO program does not allow 0."
                          : `Monthly budget × 6 (${(tc.monthlyBudgetUsdc * 6).toLocaleString()}) exceeds minimum raise (${tc.minRaise.toLocaleString()}). The on-chain program will reject this.`}
                      </div>
                    )}
                  </div>

                  {/* ─── 3 Fund allocation (read-only) ───────────── */}
                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-title">3 - Fund allocation <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 4 }}>protocol fixed</span></div>
                    <div className="card-sub">How the raised USDC is split after ICO. Fixed by the MetaDAO protocol.</div>
                    <div style={{ marginTop: 12, height: 24, borderRadius: 6, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: "80%", background: "var(--accent)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>Treasury 80%</div>
                      <div style={{ width: "20%", background: "rgba(34,197,94,0.7)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>LP 20%</div>
                    </div>
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Treasury (80%)</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.floor(tc.minRaise * 0.8).toLocaleString()} USDC</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Squads multisig vault</div>
                      </div>
                      <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Liquidity (20%)</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.floor(tc.minRaise * 0.2).toLocaleString()} USDC</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Futarchy AMM + Meteora LP</div>
                      </div>
                    </div>
                  </div>

                  {/* ─── 4 Performance package ────────────────────── */}
                  {/* Hidden in the UI per product decision. The config is
                      UNCHANGED under the hood — perfPackageTokens /
                      perfMinUnlockMonths keep their defaults and the grantee is
                      auto-defaulted to the sponsor's wallet (see the useEffect),
                      so the on-chain launch behaviour is identical. Flip
                      SHOW_PERFORMANCE_PACKAGE to true to bring the section back. */}
                  {SHOW_PERFORMANCE_PACKAGE && (
                  <div className="card" style={{ marginBottom: 14 }}>
                    <div className="card-title">4 - Performance package</div>
                    <div className="card-sub">Price-based vesting for team. 5 tranches unlock at 2×, 4×, 8×, 16×, 32× ICO price.</div>
                    <div className="row-2">
                      <div className="field"><label>Token amount (min 10)</label>
                        <input type="number" value={tc.perfPackageTokens} onChange={(e) => updateTc("perfPackageTokens", Number(e.target.value) || 0)} />
                      </div>
                      <div className="field"><label>Min unlock period</label>
                        <select value={tc.perfMinUnlockMonths} onChange={(e) => updateTc("perfMinUnlockMonths", Number(e.target.value))}>
                          <option value={12}>12 months (min)</option>
                          <option value={18}>18 months</option>
                          <option value={24}>24 months</option>
                          <option value={36}>36 months</option>
                          <option value={48}>48 months</option>
                        </select>
                      </div>
                    </div>
                    <div className="field"><label>Grantee wallet</label>
                      <input value={tc.perfPackageGrantee} onChange={(e) => updateTc("perfPackageGrantee", e.target.value.replace(/[^1-9A-HJ-NP-Za-km-z]/g, "").slice(0, 44))} maxLength={44} placeholder="Solana wallet address" style={{ borderColor: tc.perfPackageGrantee.trim() && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tc.perfPackageGrantee.trim()) ? "var(--fail)" : undefined, fontFamily: "var(--font-mono)", fontSize: 13 }} />
                      <div className="hint">{tc.perfPackageGrantee.trim() ? `${tc.perfPackageGrantee.trim().length}/44 characters` : "Who receives the performance package tokens — defaults to your wallet"}</div>
                    </div>
                  </div>
                  )}

                  {/* ─── 5 Additional tokens (optional) ──────────── */}
                  {showAdvanced && (
                    <div className="card" style={{ marginBottom: 14 }}>
                      <div className="card-title">5 - Additional tokens <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 4 }}>optional</span></div>
                      <div className="card-sub">Mint extra tokens beyond the base 12.9M supply.</div>
                      <div className="row-2">
                        <div className="field"><label>Extra token amount</label>
                          <input type="number" value={tc.additionalTokensAmount} onChange={(e) => updateTc("additionalTokensAmount", Number(e.target.value) || 0)} />
                          <div className="hint">0 = no extra tokens</div>
                        </div>
                        <div className="field"><label>Recipient wallet</label>
                          <input value={tc.additionalTokensRecipient} onChange={(e) => updateTc("additionalTokensRecipient", e.target.value)} placeholder="Solana wallet address" disabled={tc.additionalTokensAmount <= 0} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── 6 Bid wall (Coming soon — disabled) ─────── */}
                  <div className="card" style={{ marginBottom: 14, opacity: 0.6 }}>
                    <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      6 - Bid wall
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", padding: "1px 6px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--muted)" }}>Coming soon</span>
                    </div>
                    <div className="card-sub">Automatic buyback at ICO price floor. Funded from excess USDC above minimum raise.</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "not-allowed", marginTop: 8 }} title="Coming soon">
                      <input type="checkbox" checked={false} disabled aria-disabled="true" style={{ cursor: "not-allowed" }} />
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>Enable bid wall</span>
                    </label>
                  </div>

                  <button type="button" style={S.ghostBtn} onClick={() => setShowAdvanced(!showAdvanced)}>
                    {showAdvanced ? "Hide advanced options" : "Show advanced options"}
                  </button>
                </>
              ) : (
                <>
                  {/* ═══ EXISTING TOKEN MODE CARDS (unchanged) ═══ */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">2 - Raise target (USDC budget)</div>
                <div className="card-sub">How much USDC you will contribute to launch this market. This is split across the pool, treasury, and futarchy.</div>
                <div className="row-2">
                  <div className="field"><label>Minimum raise (USDC)</label>
                    <input type="number" value={tc.minRaise} onChange={(e) => updateTc("minRaise", Number(e.target.value) || 0)} />
                  </div>
                  <div className="field"><label>Maximum raise (USDC)</label>
                    <input type="number" value={tc.maxRaise} onChange={(e) => updateTc("maxRaise", Number(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="field"><label>Launch period</label>
                  <select value={tc.launchPeriodDays} onChange={(e) => updateTc("launchPeriodDays", Number(e.target.value))}>
                    <option value={3}>3 days</option><option value={5}>5 days</option>
                    <option value={7}>7 days</option><option value={14}>14 days</option>
                  </select>
                </div>
              </div>

              {/* ─── 2b Token allocation ───────────────────────── */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">2b - Token supply allocation</div>
                <div className="card-sub">How the total token supply is split. Unallocated tokens can be distributed later via proposals.</div>
                <div className="row-2">
                  <div className="field"><label>AMM pool liquidity</label>
                    <select value={tc.poolPct} onChange={(e) => updateTc("poolPct", Number(e.target.value))}>
                      {[0.5, 1, 2, 3, 5].map((p) => <option key={p} value={p}>{p}%{p === 1 ? " (default)" : ""}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Futarchy voting</label>
                    <select value={tc.futarchyPct} onChange={(e) => updateTc("futarchyPct", Number(e.target.value))}>
                      {[0.25, 0.5, 1, 2].map((p) => <option key={p} value={p}>{p}%{p === 0.5 ? " (default)" : ""}</option>)}
                    </select>
                  </div>
                </div>
                {(() => {
                  const totalAlloc = tc.teamAllocPct + tc.treasuryReservePct + tc.poolPct + tc.futarchyPct;
                  const unallocated = 100 - totalAlloc;
                  return (
                    <div style={{
                      marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 12,
                      background: totalAlloc <= 100 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                      border: totalAlloc <= 100 ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg)", marginBottom: 4 }}>
                        <span>Team: <b>{tc.teamAllocPct}%</b></span>
                        <span>Treasury: <b>{tc.treasuryReservePct}%</b></span>
                        <span>Pool: <b>{tc.poolPct}%</b></span>
                        <span>Futarchy: <b>{tc.futarchyPct}%</b></span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: totalAlloc <= 100 ? "var(--pass)" : "var(--fail)" }}>
                        <span>Allocated: <b>{totalAlloc}%</b></span>
                        <span>Unallocated: <b>{unallocated > 0 ? `${unallocated}%` : "0%"}</b></span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ─── 2c USDC split ─────────────────────────────── */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">2c - USDC budget split</div>
                <div className="card-sub">How your USDC budget ({tc.maxRaise.toLocaleString()} USDC) is distributed. Must sum to 100%.</div>
                <div className="row-2">
                  <div className="field"><label>Pool liquidity (USDC %)</label>
                    <input type="number" min={1} max={100} value={tc.usdcPoolPct} onChange={(e) => updateTc("usdcPoolPct", Number(e.target.value) || 0)} />
                    <div className="hint">{Math.floor(tc.maxRaise * tc.usdcPoolPct / 100).toLocaleString()} USDC</div>
                  </div>
                  <div className="field"><label>Treasury (USDC %)</label>
                    <input type="number" min={1} max={100} value={tc.usdcTreasuryPct} onChange={(e) => updateTc("usdcTreasuryPct", Number(e.target.value) || 0)} />
                    <div className="hint">{Math.floor(tc.maxRaise * tc.usdcTreasuryPct / 100).toLocaleString()} USDC</div>
                  </div>
                </div>
                <div className="row-2">
                  <div className="field"><label>Futarchy (USDC %)</label>
                    <input type="number" min={1} max={100} value={tc.usdcFutarchyPct} onChange={(e) => updateTc("usdcFutarchyPct", Number(e.target.value) || 0)} />
                    <div className="hint">{Math.floor(tc.maxRaise * tc.usdcFutarchyPct / 100).toLocaleString()} USDC</div>
                  </div>
                  <div className="field"><label>Starting price (auto)</label>
                    <input type="text" readOnly value={(() => {
                      const poolTokens = Math.floor(tc.totalSupply * tc.poolPct / 100);
                      const poolUsdc = Math.floor(tc.maxRaise * tc.usdcPoolPct / 100);
                      return poolTokens > 0 ? `$${(poolUsdc / poolTokens).toFixed(6)}` : "$0";
                    })()} style={{ opacity: 0.6, cursor: "default" }} />
                    <div className="hint">= pool USDC ÷ pool tokens</div>
                  </div>
                </div>
                {(() => {
                  const usdcTotal = tc.usdcPoolPct + tc.usdcTreasuryPct + tc.usdcFutarchyPct;
                  return (
                    <div style={{
                      marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 12,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: Math.abs(usdcTotal - 100) < 0.1 ? "rgba(34,197,94,0.06)" : "rgba(234,170,0,0.08)",
                      border: Math.abs(usdcTotal - 100) < 0.1 ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(234,170,0,0.3)",
                      color: Math.abs(usdcTotal - 100) < 0.1 ? "var(--pass)" : "var(--accent)",
                    }}>
                      <span>USDC total: <b>{usdcTotal}%</b></span>
                      <span style={{ color: "var(--muted)" }}>{Math.abs(usdcTotal - 100) < 0.1 ? "Sums to 100%" : `Off by ${Math.abs(usdcTotal - 100).toFixed(1)}%`}</span>
                    </div>
                  );
                })()}
              </div>

              {/* ─── 3 Premine ─────────────────────────────────── */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">3 - Team allocation (premine)</div>
                <div className="card-sub">Tokens reserved for the founding team, advisors, and treasury. These are locked and vest over time.</div>
                <div className="row-2">
                  <div className="field"><label>Team allocation</label>
                    <select value={tc.teamAllocPct} onChange={(e) => updateTc("teamAllocPct", Number(e.target.value))}>
                      {[10, 15, 20, 25, 30].map((p) => <option key={p} value={p}>{p}%{p === 20 ? " (default)" : ""}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Treasury reserve</label>
                    <select value={tc.treasuryReservePct} onChange={(e) => updateTc("treasuryReservePct", Number(e.target.value))}>
                      {[5, 10, 15, 20].map((p) => <option key={p} value={p}>{p}%{p === 10 ? " (default)" : ""}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* ─── 4 Spending limit & governance ─────────────── */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">4 - Spending limit &amp; governance</div>
                <div className="card-sub">Controls for treasury spending and proposal voting.</div>
                <div className="row-2">
                  <div className="field"><label>Monthly limit (USDC)</label>
                    <input type="number" value={tc.monthlyLimitUsdc} onChange={(e) => updateTc("monthlyLimitUsdc", Number(e.target.value) || 0)} />
                  </div>
                  <div className="field"><label>Cooldown between spends</label>
                    <select value={tc.cooldownHours} onChange={(e) => updateTc("cooldownHours", Number(e.target.value))}>
                      <option value={0}>None</option><option value={24}>24 hours</option>
                      <option value={48}>48 hours</option><option value={168}>7 days</option>
                    </select>
                  </div>
                </div>
                <div className="field" style={{ marginTop: 8 }}>
                  <label>Proposal voting period</label>
                  <select value={tc.secondsPerProposal} onChange={(e) => updateTc("secondsPerProposal", Number(e.target.value))}>
                    <option value={86400}>1 day (default)</option>
                    <option value={259200}>3 days</option>
                    <option value={604800}>7 days (thorough)</option>
                  </select>
                  <div className="hint">How long people trade pass/fail tokens before the proposal is decided.</div>
                </div>
              </div>

              {/* ─── 5 Vesting ─────────────────────────────────── */}
              {/* <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">5 - Team lockup and vesting</div>
                <div className="card-sub">Where the team allocation unlocks. Add one or more recipient wallets.</div>
                <div className="row-2" style={{ marginTop: 12 }}>
                  <div className="field"><label>Lockup period</label>
                    <select value={tc.lockupMonths} onChange={(e) => updateTc("lockupMonths", Number(e.target.value))}>
                      <option value={18}>18 months (minimum)</option><option value={24}>24 months</option>
                      <option value={36}>36 months</option><option value={48}>48 months</option>
                    </select>
                  </div>
                  <div className="field"><label>Vesting style</label>
                    <select value={tc.vestingStyle} onChange={(e) => updateTc("vestingStyle", e.target.value)}>
                      <option value="cliff-linear">Cliff + linear (12mo cliff)</option>
                      <option value="linear">Linear from day 1</option>
                      <option value="cliff-only">Cliff only (all at end)</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Recipients</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {tc.recipients.map((r) => (
                      <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 28px", gap: 6, alignItems: "start" }}>
                        <input placeholder="Solana wallet address" value={r.wallet}
                          onChange={(e) => updateRecipient(r.id, "wallet", e.target.value)} />
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <input type="number" min={0} max={100} value={r.pct} style={{ textAlign: "right" }}
                            onChange={(e) => updateRecipient(r.id, "pct", e.target.value)} />
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>%</span>
                        </div>
                        {tc.recipients.length > 1
                          ? <button type="button" onClick={() => removeRecipient(r.id)} style={S.removeRecipientBtn}>x</button>
                          : <div />}
                      </div>
                    ))}
                  </div>
                  <button type="button" style={{ ...S.ghostBtn, marginTop: 8 }} onClick={addRecipient}>+ Add recipient</button>
                  <div style={{
                    marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 12,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: recipientTotal === 100 ? "rgba(34,197,94,0.06)" : "rgba(234,170,0,0.08)",
                    border: recipientTotal === 100 ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(234,170,0,0.3)",
                    color: recipientTotal === 100 ? "var(--pass)" : "var(--accent)",
                  }}>
                    <span>Total: <b>{recipientTotal}%</b></span>
                    <span style={{ color: "var(--muted)" }}>{recipientTotal === 100 ? "Sums to 100%" : `Off by ${Math.abs(recipientTotal - 100)}%`}</span>
                  </div>
                </div>
              </div> */}

              {/* ─── 5 Multisig info ───────────────────────────── */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">5 - DAO multisig <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginLeft: 4 }}>auto-created</span></div>
                <div className="card-sub">A 1-of-3 multisig holds the DAO treasury. Auto-created on launch.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  {[
                    { label: "S", title: "Sponsor (you)", desc: "Your FROST wallet." },
                    { label: "O", title: "Operator agent", desc: "Platform-managed signer for the Operator agent loop." },
                    { label: "P", title: "Platform co-signer", desc: "Platform key for emergency pause and operational signing." },
                  ].map((m) => (
                    <div key={m.label} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--muted)", flexShrink: 0 }}>{m.label}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

                </>
              )}
          </>
          {/* ════════════ OBJECTIVE ════════════ */}
          <div className="card" style={{ marginBottom: 14, borderColor: attempted && objectiveMissing ? "var(--fail)" : undefined, transition: "border-color 0.15s" }}>
            <div className="card-title">Objective <span style={{ color: "var(--accent)", fontSize: 14 }}>*</span></div>
            <div className="card-sub">The category of decisions this Market organizes around.</div>
            <div style={{ marginTop: 12 }}>
              <ObjectivePicker value={objectiveId} onChange={(id) => setObjectiveId(id ?? "")} />
            </div>
            {attempted && objectiveMissing && <div data-form-error style={S.err}>An Objective is required to continue.</div>}
          </div>

          {/* ════════════ OPERATOR SUMMARY ════════════ */}
          <div className="card" style={{ borderColor: attempted && operatorMissing ? "var(--fail)" : undefined, transition: "border-color 0.15s" }}>
            <div className="card-title">Operator</div>
            {operatorLoading ? (
              <div style={{ padding: 16, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }} className="animate-pulse">Loading operator...</div>
            ) : operator ? (
              <>
                <div className="card-sub">Chosen in step 1. This agent authors proposals and co-signs the multisig.</div>
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 12, overflow: "hidden" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{operator.name}</span>
                      {operator.handle && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", wordBreak: "break-all" }}>@{operator.handle}</span>}
                      {operator.tone && <span style={S.badge}>{operator.tone.toLowerCase()}</span>}
                    </div>
                    {(operator.description || operator.briefDescription) && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>{operator.description || operator.briefDescription}</div>
                    )}
                  </div>
                  <Link href="/markets/create" style={{ fontSize: 11, color: "var(--accent-2)", textDecoration: "underline", whiteSpace: "nowrap", flexShrink: 0 }}>Change</Link>
                </div>
              </>
            ) : (
              <>
                <div className="card-sub">No Operator selected yet. Go back to step 1 to pick or create one.</div>
                <Link href="/markets/create" className="no-underline"><button className="px-4 py-2 text-xs font-medium text-muted border border-card-border rounded-full hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer mt-2.5">Back to step 1</button></Link>
              </>
            )}
            {attempted && operatorMissing && <div style={{ ...S.err, marginTop: 10 }}>An Operator is required. Go back to step 1.</div>}
          </div>
        </div>

        {/* ═══════ RIGHT COLUMN EXPLAINERS ═══════ */}
        <div>
              <div className="explainer" style={{ marginBottom: 14 }}>
                <h4>What the launchpad does</h4>
                <p>When you click Launch, the MetaDAO launchpad runs atomically: mint token, open fundraise, configure vesting, set spending limit, create multisig.</p>
                <p>If the raise meets its minimum, the Market goes live. Otherwise contributors are refunded.</p>
              </div>
              <div className="annote" style={{ marginBottom: 14 }}>
                <b>One-time setup.</b> Once launched, most parameters can only change via proposals.
              </div>
          <div className="explainer" style={{ marginBottom: 14 }}>
            <h4>What is an Objective?</h4>
            <p>An Objective groups decisions that share priorities. A Growth proposal is judged on revenue and user love; a Strategy proposal might weight long-term vision higher.</p>
          </div>
          <div className="explainer" style={{ marginBottom: 14 }}>
            <h4>What is an Operator?</h4>
            <p>An Operator is your sponsor-side agent that authors proposals on a schedule. The Operator system prompt and tone shape how it writes; the Objective bounds what it can write about.</p>
          </div>
        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-6">
        <button className="px-5 py-2.5 text-sm font-medium text-muted border border-card-border rounded-full hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => router.push("/markets/create/basics")}>← Back</button>
        <button className="px-5 py-2.5 text-sm font-medium text-muted border border-card-border rounded-full hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors cursor-pointer" style={{ minWidth: 100 }} onClick={handleSaveDraft}>{saving ? "Saved" : "Save draft"}</button>
        <button className="bg-accent hover:bg-accent-dark text-on-accent font-semibold px-6 py-2.5 text-sm rounded-full transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-wait flex items-center gap-2" style={{ minWidth: 180 }} disabled={navigating || icoBudgetInvalid} onClick={handleContinue}>
          {navigating && <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          {navigating ? "Loading…" : "Review and launch →"}
        </button>
      </div>
    </div>
  );
}

export default function CreateStep4() {
  return <Suspense fallback={null}><PageInner /></Suspense>;
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  err: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--fail)", marginTop: 8 },
  badge: { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--muted)" },
  tabBtn: { flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid", cursor: "pointer", textAlign: "left", transition: "all 0.15s", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 2 },
  tabLabel: { fontSize: 13, fontWeight: 600 },
  tabHint: { fontSize: 11, color: "var(--muted)" },
  ghostBtn: { background: "none", border: "none", color: "var(--accent-2)", fontSize: 12, cursor: "pointer", padding: "4px 0" },
  removeRecipientBtn: { color: "var(--muted)", cursor: "pointer", fontSize: 14, alignSelf: "start", marginTop: 6, background: "none", border: "none" },
};