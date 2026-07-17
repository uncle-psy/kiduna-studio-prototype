"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import {
  Annote,
  Button,
  Card,
  CardSub,
  CardTitle,
  Explainer,
  ImagePicker,
} from "@/components/ui/index";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { ObjectivePicker } from "@/components/pickers/ObjectivePicker";
import { findOperator } from "@/lib/operators";
import { useMarketCreate } from "@/lib/market-create-context";
import { useCurrentMarket } from "@/lib/market-context";

function PageInner() {
  const router = useRouter();

  // Operator was chosen in step 1 (Connect). We load it here and default
  // the Objective to whatever the Operator is bound to. The sponsor can
  // still change the Objective — doing so retargets the Operator.
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [objectiveId, setObjectiveId] = useState<string>("growth");

  useEffect(() => {
    const stored = sessionStorage.getItem("kinship.market-create.operatorId");
    if (!stored) return;
    setOperatorId(stored);
    const op = findOperator(stored);
    if (op?.objectiveId) setObjectiveId(op.objectiveId);
  }, []);

  const operator = operatorId ? findOperator(operatorId) : undefined;

  return (
    <>
      <div className="pageheader">
        <div>
          <div className="crumbs">
            Markets / Create /{" "}
            <span className="text-accent-2">Step 3 · Configure</span>
          </div>
          <div className="pagetitle">Launch your token &amp; configure your Market.</div>
          <div className="pagedesc">Configure how your token launches, then pick the Objective this Market organizes around.</div>
        </div>
      </div>

      <div className="step-rail">
        <Link href="/market/market-create/connect" className="step done">
          <span className="num">✓</span>Connect
        </Link>
        <Link href="/market/market-create" className="step done">
          <span className="num">✓</span>Basics
        </Link>
        <div className="step active">
          <span className="num">3</span>Configure
        </div>
        <div className="step">
          <span className="num">4</span>Review
        </div>
      </div>

      <div className="grid-2">
        <div>
          <TokenSetupCards />
          <ObjectiveCard
            objectiveId={objectiveId}
            onChange={(id) => setObjectiveId(id ?? "growth")}
          />
          <OperatorSummary operator={operator} />
        </div>

        <div>
          <LaunchpadExplainer />
          <ObjectiveExplainer />
          <OperatorExplainer />
          <CoSignerNote />
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Button
          className="cursor-pointer"
          onClick={() => router.push("/market/market-create")}
        >
          ← Back
        </Button>
        <SaveDraftButton />
        <ContinueButton />
      </div>
    </>
  );
}

/** Save draft — persists tokenConfig to the Market row without navigating. */
function SaveDraftButton() {
  const { current } = useCurrentMarket();
  const { saveTokenConfig, saving } = useMarketCreate();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!current?.slug) return;
    try {
      await saveTokenConfig(current.slug);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // saveError is already set in context
    }
  };

  return (
    <Button onClick={handleSave} disabled={saving || !current?.slug} className="cursor-pointer">
      {saving ? "Saving…" : saved ? "✓ Saved" : "Save draft"}
    </Button>
  );
}

/** Continue — saves tokenConfig then navigates to review page. */
function ContinueButton() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const { saveTokenConfig, saving, tokenConfig } = useMarketCreate();

  const handleContinue = async () => {
    if (current?.slug) {
      try {
        await saveTokenConfig(current.slug);
      } catch {
        // Allow navigation even if save fails — user can retry from review
      }
    }
    router.push("/market/market-create-5");
  };

  // Basic validation: new mode requires name + ticker + totalSupply
  const isNewValid = tokenConfig.mode === "new"
    && tokenConfig.tokenName.trim() !== ""
    && tokenConfig.ticker.trim() !== ""
    && tokenConfig.totalSupply > 0;

  // Existing mode requires validated mint
  const isExistingValid = tokenConfig.mode === "existing"
    && tokenConfig.existingMintValidated;

  const canContinue = isNewValid || isExistingValid;

  return (
    <Button
      variant="primary"
      className="cursor-pointer"
      onClick={handleContinue}
      disabled={saving || !canContinue}
    >
      {saving ? "Saving…" : "Review & launch →"}
    </Button>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Token setup cards (Token-backed only)
// ════════════════════════════════════════════════════════════════════════
function TokenSetupCards() {
  return (
    <>
      <TokenIdentityCard />
      <RaiseTargetCard />
      <PremineCard />
      <UsdcSplitCard />
      <SpendingLimitCard />
      <VestingCard />
      <MultisigInfoCard />
      <BidWallCard />

      <div className="my-[20px] border-t-[1px] border-border opacity-50" />
    </>
  );
}

// ─── 1 · Token identity (with use-existing toggle) ───────────────────────
function TokenIdentityCard() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();
  const mode = tokenConfig.mode;

  return (
    <Card className="mb-[14px]">
      <CardTitle>1 · Token identity</CardTitle>
      <CardSub>
        Mint a new token, or point this Market at one you already have.
      </CardSub>

      {/* Mode picker */}
      <div className="asset-tabs flex gap-[6px] m-[10px_0_14px] p-[4px] bg-[rgba(255,255,255,0.03)] border-[1px] border-border rounded-[10px]">
        <div
          className={`asset-tab p-[10px] rounded-[7px] text-center cursor-pointer flex-1 ${
            mode === "new"
              ? "active bg-at-mint text-[#fff]"
              : "text-subtle"
          }`}
          onClick={() => updateTokenConfig({ mode: "new" })}
        >
          <div className={`atag text-[10px] font-mono uppercase ${
            mode === "new" ? "opacity-70" : "text-muted"
          }`}>
            {mode === "new" ? "MINT NEW ✓" : "MINT NEW"}
          </div>
          <div className="font-semibold text-[13px]">Mint a new token</div>
          <div className={`text-[10px] ${mode === "new" ? "opacity-70" : "text-muted"}`}>
            Creates everything on-chain
          </div>
        </div>
        <div
          className={`asset-tab p-[10px] rounded-[7px] text-center cursor-pointer flex-1 ${
            mode === "existing"
              ? "active bg-at-mint text-[#fff]"
              : "text-subtle"
          }`}
          onClick={() => updateTokenConfig({ mode: "existing" })}
        >
          <div className={`atag text-[10px] font-mono uppercase ${
            mode === "existing" ? "opacity-70" : "text-muted"
          }`}>
            {mode === "existing" ? "USE EXISTING ✓" : "USE EXISTING"}
          </div>
          <div className="font-semibold text-[13px]">Use existing token</div>
          <div className={`text-[10px] ${mode === "existing" ? "opacity-70" : "text-muted"}`}>
            Paste a mint address
          </div>
        </div>
      </div>

      {mode === "existing" ? (
        <ExistingTokenForm />
      ) : (
        <NewTokenForm />
      )}
    </Card>
  );
}

function ExistingTokenForm() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();
  const { publicKey } = useWallet();
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const mint = tokenConfig.existingMint;

  const setMint = (value: string) => {
    updateTokenConfig({
      existingMint: value,
      existingMintValidated: false,
      existingMintAuthorityHeld: false,
      existingMetadataAuthorityHeld: false,
    });
    if (result) setResult(null);
  };

  const validate = async () => {
    setResult(null);
    setValidating(true);

    try {
      const params = new URLSearchParams({ address: mint.trim() });
      if (publicKey) params.set("sponsor", publicKey.toBase58());

      const res = await fetch(`/api/v1/mint-info?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Validation failed" });
        return;
      }

      // Update context with on-chain data
      updateTokenConfig({
        decimals: data.decimals,
        totalSupply: data.supply,
        existingMintValidated: true,
        existingMintAuthorityHeld: data.mintAuthorityHeld,
        existingMetadataAuthorityHeld: data.metadataAuthorityHeld,
        // Pre-fill name/ticker from Metaplex metadata if available
        ...(data.tokenName && !tokenConfig.tokenName ? { tokenName: data.tokenName } : {}),
        ...(data.tokenSymbol && !tokenConfig.ticker ? { ticker: data.tokenSymbol } : {}),
      });

      setResult({
        ok: true,
        message: "Mint validated on-chain.",
        details: {
          decimals: data.decimals,
          supply: data.supply.toLocaleString(),
          mintAuthorityHeld: data.mintAuthorityHeld,
          metadataAuthorityHeld: data.metadataAuthorityHeld,
          mintAuthority: data.mintAuthority,
          metadataUpdateAuthority: data.metadataUpdateAuthority,
          tokenName: data.tokenName,
          tokenSymbol: data.tokenSymbol,
        },
      });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Validation failed",
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <>
      <div className="field">
        <label>Token mint address</label>
        <div className="flex gap-[6px]">
          <input
            placeholder="e.g. 7xKXt...AbCD"
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            className="flex-1"
          />
          <button
            type="button"
            onClick={validate}
            disabled={validating || !mint.trim()}
            className="text-[12px] px-[12px] py-[6px] rounded-[6px] bg-[rgba(106,166,255,0.15)] border-[1px] border-accent-2 text-accent-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
          >
            {validating ? "Checking…" : "Validate ownership"}
          </button>
        </div>
        <div className="hint">
          The Solana SPL token mint you want this Market to govern. We verify
          the mint exists and check whether your connected wallet holds the
          mint and metadata authorities.
        </div>
      </div>

      {/* Validation result */}
      {result && (
        <div
          className={`mt-[10px] p-[12px] rounded-[8px] border-[1px] ${
            result.ok
              ? "bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.25)]"
              : "bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.3)]"
          }`}
        >
          <div className="flex items-start gap-[8px]">
            <div className={`text-[16px] ${result.ok ? "text-pass" : "text-fail"}`}>
              {result.ok ? "✓" : "✗"}
            </div>
            <div className="flex-1">
              <div className={`font-mono text-[10px] tracking-[0.08em] uppercase ${
                result.ok ? "text-pass" : "text-fail"
              }`}>
                {result.ok ? "Mint validated" : "Validation failed"}
              </div>
              <div className="text-[12px] text-subtle mt-[4px] leading-[1.6]">
                {result.message}
              </div>

              {result.ok && result.details && (
                <>
                  {/* Token name/symbol from metadata */}
                  {(result.details.tokenName || result.details.tokenSymbol) && (
                    <div className="mt-[8px] text-[12px] text-fg">
                      {result.details.tokenName}{result.details.tokenSymbol ? ` (${result.details.tokenSymbol})` : ""}
                    </div>
                  )}

                  <div className="mt-[10px] text-[11px] grid grid-cols-2 gap-[6px]">
                    <div className="p-[6px] bg-[rgba(255,255,255,0.03)] rounded-[4px]">
                      <div className="font-mono text-[9px] text-muted tracking-[0.08em] uppercase">
                        Decimals
                      </div>
                      <div className="text-subtle mt-[2px]">{result.details.decimals}</div>
                    </div>
                    <div className="p-[6px] bg-[rgba(255,255,255,0.03)] rounded-[4px]">
                      <div className="font-mono text-[9px] text-muted tracking-[0.08em] uppercase">
                        Supply
                      </div>
                      <div className="text-subtle mt-[2px]">{result.details.supply}</div>
                    </div>
                    <div className={`p-[6px] rounded-[4px] ${
                      result.details.mintAuthorityHeld
                        ? "bg-[rgba(34,197,94,0.06)]"
                        : "bg-[rgba(235,128,0,0.06)]"
                    }`}>
                      <div className="font-mono text-[9px] text-muted tracking-[0.08em] uppercase">
                        Mint authority
                      </div>
                      <div className={`mt-[2px] ${
                        result.details.mintAuthorityHeld ? "text-pass" : "text-at-param"
                      }`}>
                        {result.details.mintAuthorityHeld
                          ? "✓ Held by your wallet"
                          : "Not held — Mint Tokens proposals will fail"}
                      </div>
                    </div>
                    <div className={`p-[6px] rounded-[4px] ${
                      result.details.metadataAuthorityHeld
                        ? "bg-[rgba(34,197,94,0.06)]"
                        : "bg-[rgba(235,128,0,0.06)]"
                    }`}>
                      <div className="font-mono text-[9px] text-muted tracking-[0.08em] uppercase">
                        Metadata authority
                      </div>
                      <div className={`mt-[2px] ${
                        result.details.metadataAuthorityHeld ? "text-pass" : "text-at-param"
                      }`}>
                        {result.details.metadataAuthorityHeld
                          ? "✓ Held by your wallet"
                          : "Not held — Update Metadata proposals will fail"}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {result.ok && result.details && (
                !result.details.mintAuthorityHeld || !result.details.metadataAuthorityHeld
              ) && (
                <div className="mt-[10px] text-[11px] text-subtle leading-[1.6]">
                  Authorities you don&apos;t hold can&apos;t be transferred to the DAO
                  by you alone. Whoever currently holds them needs to transfer them to the
                  DAO multisig (created at launch). The Market still works for proposal
                  types that don&apos;t need those authorities.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-[10px] p-[12px] bg-[rgba(234,170,0,0.06)] border-[1px] border-[rgba(234,170,0,0.25)] rounded-[8px]">
        <div className="font-mono text-[10px] text-at-param tracking-[0.08em] uppercase mb-[4px]">
          Authority requirements
        </div>
        <div className="text-[11px] text-subtle leading-[1.6]">
          For full functionality, the following authorities must be held by the DAO multisig
          (we&apos;ll create it at launch):
          <ul className="ml-[16px] mt-[4px] list-disc">
            <li>Mint authority — required for Mint Tokens proposals</li>
            <li>Metadata update authority — required for Update Token Metadata proposals</li>
          </ul>
          At launch, these authorities are automatically transferred from your wallet to the
          DAO treasury vault.
        </div>
      </div>
    </>
  );
}

interface ValidationResult {
  ok: boolean;
  message: string;
  details?: {
    decimals: number;
    supply: string;
    mintAuthorityHeld: boolean;
    metadataAuthorityHeld: boolean;
    mintAuthority: string | null;
    metadataUpdateAuthority: string | null;
    tokenName: string | null;
    tokenSymbol: string | null;
  };
}

function NewTokenForm() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <CardSub className="mb-[10px]">
        We&apos;ll generate the Metaplex metadata file from these fields when
        you launch — no JSON editing required.
      </CardSub>

      <div className="grid grid-cols-[140px_1fr] gap-[16px] items-start mt-[12px]">
        <div className="field">
          <label>Token icon</label>
          <ImagePicker hint="PNG or SVG, square" />
        </div>
        <div className="flex flex-col gap-[10px]">
          <div className="row-2">
            <div className="field">
              <label>Name</label>
              <input
                placeholder="e.g. Acme Token"
                value={tokenConfig.tokenName}
                onChange={(e) => updateTokenConfig({ tokenName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Ticker</label>
              <input
                placeholder="ACME"
                maxLength={10}
                value={tokenConfig.ticker}
                onChange={(e) => updateTokenConfig({ ticker: e.target.value.toUpperCase() })}
              />
              <div className="hint">3–10 uppercase characters.</div>
            </div>
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea
              rows={2}
              placeholder="A short blurb shown in wallets and explorers."
              value={tokenConfig.description}
              onChange={(e) => updateTokenConfig({ description: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Total supply + Decimals ────────────────────────────────── */}
      <div className="row-2 mt-[14px]">
        <div className="field">
          <label>Total supply</label>
          <input
            type="number"
            min={1}
            placeholder="e.g. 1000000000"
            value={tokenConfig.totalSupply || ""}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              updateTokenConfig({ totalSupply: Number.isNaN(n) ? 0 : Math.max(0, n) });
            }}
          />
          <div className="hint">
            Total number of tokens to mint. Entire supply goes to your wallet first,
            then distributed per the allocation in the next card.
          </div>
        </div>
        <div className="field">
          <label>Decimals</label>
          <select
            value={tokenConfig.decimals}
            onChange={(e) => updateTokenConfig({ decimals: Number.parseInt(e.target.value, 10) })}
          >
            <option value={9}>9 (standard SPL)</option>
            <option value={6}>6 (like USDC)</option>
            <option value={0}>0 (whole tokens only)</option>
          </select>
          <div className="hint">
            Precision. 9 is the Solana default. Only change this if you have a specific reason.
          </div>
        </div>
      </div>

      <div className="advanced">
        <div
          className="advanced-trigger cursor-pointer"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span>🔗 External links (optional)</span>
          <span className="chev">{showAdvanced ? "▲" : "▼"}</span>
        </div>
        {showAdvanced && (
          <div className="advanced-body">
            <div className="row-2 mt-[10px]">
              <div className="field">
                <label>Website</label>
                <input placeholder="https://acme.io" />
              </div>
              <div className="field">
                <label>Twitter / X</label>
                <input placeholder="@acme_token" />
              </div>
            </div>
            <div className="field">
              <label>Or paste a hosted JSON URI directly</label>
              <input
                placeholder="https://yourcdn.com/token.json"
                value={tokenConfig.metadataUri}
                onChange={(e) => updateTokenConfig({ metadataUri: e.target.value })}
              />
              <div className="hint">
                Advanced. If provided, this URI is stored as the token&apos;s Metaplex metadata URI.
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── 2 · Raise target ────────────────────────────────────────────────────
function RaiseTargetCard() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();
  return (
    <Card className="mb-[14px]">
      <CardTitle>2 · USDC budget</CardTitle>
      <CardSub>
        Total USDC allocated for pool liquidity, treasury funding, and
        futarchy market seeding.
      </CardSub>
      <div className="row-2 mt-[12px]">
        <div className="field">
          <label>Total USDC budget</label>
          <input
            type="number"
            min={0}
            placeholder="65000"
            value={tokenConfig.maxRaise || ""}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              updateTokenConfig({ maxRaise: Number.isNaN(n) ? 0 : Math.max(0, n) });
            }}
          />
          <div className="hint">
            How much USDC the sponsor provides for pool seeding, treasury, and
            futarchy liquidity. Split is configured in the USDC allocation card below.
          </div>
        </div>
        <div className="field">
          <label>Trading window</label>
          <select
            value={tokenConfig.launchPeriodDays}
            onChange={(e) => updateTokenConfig({ launchPeriodDays: Number.parseInt(e.target.value, 10) })}
          >
            <option value={1}>1 day (minimum)</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
          </select>
          <div className="hint">
            How long each futarchy proposal&apos;s trading window lasts.
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── 3 · Premine & distribution ─────────────────────────────────────────

type DistKey = "ico" | "team" | "damm" | "futarchy";

interface DistRow {
  key: DistKey;
  label: string;
  hint: string;
  color: string;
  configKey: "icoPct" | "teamAllocPct" | "poolPct" | "futarchyPct";
}

const DIST_ROWS: DistRow[] = [
  { key: "ico", label: "Sponsor reserve", hint: "Stays in your wallet", color: "var(--pass)", configKey: "icoPct" },
  { key: "team", label: "Team (vesting)", hint: "Performance-locked", color: "var(--info)", configKey: "teamAllocPct" },
  { key: "damm", label: "DAMM v2 pool", hint: "AMM liquidity", color: "var(--accent)", configKey: "poolPct" },
  { key: "futarchy", label: "Futarchy spot pool", hint: "Conditional market liquidity", color: "var(--at-perf)", configKey: "futarchyPct" },
];

function PremineCard() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();

  const dist: Record<DistKey, number> = {
    ico: tokenConfig.icoPct,
    team: tokenConfig.teamAllocPct,
    damm: tokenConfig.poolPct,
    futarchy: tokenConfig.futarchyPct,
  };

  const total = DIST_ROWS.reduce((s, r) => s + dist[r.key], 0);
  const totalOk = total === 100;
  const remainder = 100 - total;

  const setValue = (row: DistRow, raw: number) => {
    const n = Math.max(0, Math.min(100, Math.round(raw)));
    updateTokenConfig({ [row.configKey]: n });
  };

  return (
    <Card className="mb-[14px]">
      <CardTitle>3 · Token supply allocation</CardTitle>
      <CardSub>
        How the total token supply is split between your wallet, the team,
        and the DAO&apos;s liquidity pools.
      </CardSub>

      {/* Stacked bar */}
      <div className="mt-[14px]">
        <div className="flex h-[10px] rounded-[5px] overflow-hidden bg-[rgba(255,255,255,0.04)] border-[1px] border-border">
          {DIST_ROWS.map((r) => {
            const pct = dist[r.key];
            if (pct <= 0) return null;
            return (
              <div
                key={r.key}
                title={`${r.label} · ${pct}%`}
                style={{ width: `${pct}%`, background: r.color }}
                className="h-full transition-[width] duration-150"
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-[14px] gap-y-[4px] mt-[8px]">
          {DIST_ROWS.map((r) => (
            <div key={r.key} className="flex items-center gap-[6px] text-[11px] text-subtle">
              <span className="inline-block w-[8px] h-[8px] rounded-[2px]" style={{ background: r.color }} />
              <span>{r.label}</span>
              <span className="font-mono text-muted">{dist[r.key]}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editable inputs */}
      <div className="mt-[12px] flex flex-col gap-[10px]">
        {DIST_ROWS.map((r) => (
          <div key={r.key} className="grid grid-cols-[16px_1fr_92px] gap-[10px] items-center">
            <span className="block w-[10px] h-[10px] rounded-[2px]" style={{ background: r.color }} />
            <div className="min-w-0">
              <div className="text-[12px] text-fg leading-[1.2]">{r.label}</div>
              <div className="text-[10px] text-muted mt-[2px]">{r.hint}</div>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={dist[r.key]}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  setValue(r, Number.isNaN(n) ? 0 : n);
                }}
                className="w-full pr-[24px] text-right font-mono text-[13px]"
              />
              <span className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-[11px] text-muted font-mono">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-[10px] p-[8px] rounded-[6px] text-[12px] flex items-center justify-between ${
        totalOk
          ? "bg-[rgba(34,197,94,0.06)] border-[1px] border-[rgba(34,197,94,0.25)] text-pass"
          : "bg-[rgba(235,128,0,0.06)] border-[1px] border-[rgba(235,128,0,0.3)] text-at-param"
      }`}>
        <span>Total: <b>{total}%</b></span>
        <span className="text-muted">
          {totalOk ? "✓ Sums to 100%" : `Off by ${Math.abs(remainder)}%`}
        </span>
      </div>
    </Card>
  );
}

// ─── 3b · USDC budget split ─────────────────────────────────────────────
function UsdcSplitCard() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();

  const pool = tokenConfig.usdcPoolPct;
  const treasury = tokenConfig.usdcTreasuryPct;
  const futarchy = tokenConfig.usdcFutarchyPct;
  const total = pool + treasury + futarchy;
  const totalOk = total === 100;

  return (
    <Card className="mb-[14px]">
      <CardTitle>3b · USDC allocation</CardTitle>
      <CardSub>
        How the USDC budget is split between the Meteora pool, the treasury vault,
        and the futarchy conditional markets.
      </CardSub>

      <div className="mt-[12px] flex flex-col gap-[10px]">
        <div className="grid grid-cols-[1fr_92px] gap-[10px] items-center">
          <div>
            <div className="text-[12px] text-fg">Meteora pool liquidity</div>
            <div className="text-[10px] text-muted">Seeds the DAMM v2 trading pool</div>
          </div>
          <div className="relative">
            <input type="number" min={0} max={100} value={pool}
              onChange={(e) => updateTokenConfig({ usdcPoolPct: Math.max(0, Math.min(100, Number.parseInt(e.target.value, 10) || 0)) })}
              className="w-full pr-[24px] text-right font-mono text-[13px]" />
            <span className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-[11px] text-muted font-mono">%</span>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_92px] gap-[10px] items-center">
          <div>
            <div className="text-[12px] text-fg">Treasury vault</div>
            <div className="text-[10px] text-muted">Funded into the Squads multisig vault</div>
          </div>
          <div className="relative">
            <input type="number" min={0} max={100} value={treasury}
              onChange={(e) => updateTokenConfig({ usdcTreasuryPct: Math.max(0, Math.min(100, Number.parseInt(e.target.value, 10) || 0)) })}
              className="w-full pr-[24px] text-right font-mono text-[13px]" />
            <span className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-[11px] text-muted font-mono">%</span>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_92px] gap-[10px] items-center">
          <div>
            <div className="text-[12px] text-fg">Futarchy liquidity</div>
            <div className="text-[10px] text-muted">Seeds the conditional spot market</div>
          </div>
          <div className="relative">
            <input type="number" min={0} max={100} value={futarchy}
              onChange={(e) => updateTokenConfig({ usdcFutarchyPct: Math.max(0, Math.min(100, Number.parseInt(e.target.value, 10) || 0)) })}
              className="w-full pr-[24px] text-right font-mono text-[13px]" />
            <span className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-[11px] text-muted font-mono">%</span>
          </div>
        </div>
      </div>

      <div className={`mt-[10px] p-[8px] rounded-[6px] text-[12px] flex items-center justify-between ${
        totalOk
          ? "bg-[rgba(34,197,94,0.06)] border-[1px] border-[rgba(34,197,94,0.25)] text-pass"
          : "bg-[rgba(235,128,0,0.06)] border-[1px] border-[rgba(235,128,0,0.3)] text-at-param"
      }`}>
        <span>Total: <b>{total}%</b></span>
        <span className="text-muted">
          {totalOk ? "✓ Sums to 100%" : `Off by ${Math.abs(100 - total)}%`}
        </span>
      </div>

      {tokenConfig.maxRaise > 0 && (
        <div className="mt-[10px] text-[11px] text-muted leading-[1.6]">
          From {tokenConfig.maxRaise.toLocaleString()} USDC budget: pool gets{" "}
          {Math.floor(tokenConfig.maxRaise * pool / 100).toLocaleString()}, treasury gets{" "}
          {Math.floor(tokenConfig.maxRaise * treasury / 100).toLocaleString()}, futarchy gets{" "}
          {Math.floor(tokenConfig.maxRaise * futarchy / 100).toLocaleString()}.
        </div>
      )}
    </Card>
  );
}

// ─── 4 · Monthly spending limit ─────────────────────────────────────────
function SpendingLimitCard() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();

  return (
    <Card className="mb-[14px]">
      <CardTitle>4 · Monthly spending limit</CardTitle>
      <CardSub>
        Sets an on-chain spending limit on the DAO account. When enabled,
        the DAO&apos;s <code>initialSpendingLimit</code> parameter is set
        during launch.
      </CardSub>

      <div className="mt-[10px] flex gap-[10px] items-start">
        <input
          type="checkbox"
          id="spend-toggle"
          className="w-[auto] mt-[3px]"
          checked={tokenConfig.spendingLimitEnabled}
          onChange={(e) => updateTokenConfig({ spendingLimitEnabled: e.target.checked })}
        />
        <label htmlFor="spend-toggle" className="cursor-pointer flex-1">
          <div className="text-[13px]">Enable a monthly spending limit</div>
          <div className="text-[11px] text-muted leading-[1.5]">
            Uncheck if every spend should go through governance.
          </div>
        </label>
      </div>

      {tokenConfig.spendingLimitEnabled && (
        <div className="field mt-[14px]">
          <label>Monthly cap (USDC)</label>
          <input
            type="number"
            min={0}
            placeholder="50000"
            value={tokenConfig.monthlyLimitUsdc || ""}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              updateTokenConfig({ monthlyLimitUsdc: Number.isNaN(n) ? 0 : Math.max(0, n) });
            }}
          />
        </div>
      )}

      <div className="mt-[10px] p-[10px] bg-[rgba(235,128,0,0.06)] border-[1px] border-[rgba(235,128,0,0.25)] rounded-[8px] text-[11px] text-subtle leading-[1.6]">
        <b>On-chain note:</b> The monthly cap is written to the DAO&apos;s{" "}
        <code>initialSpendingLimit</code> parameter at launch. Authorized
        spender wallets are not yet supported on-chain — all spends go
        through futarchy proposals regardless. Spender-level enforcement
        will be added in a future protocol update.
      </div>
    </Card>
  );
}

// ─── 5 · Vesting ────────────────────────────────────────────────────────
function VestingCard() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();
  const recipients = tokenConfig.recipients;

  const total = recipients.reduce((s, r) => s + r.pct, 0);
  const totalOk = total === 100;

  const addRecipient = () => {
    updateTokenConfig({
      recipients: [...recipients, { id: `r${Date.now()}`, wallet: "", pct: 0 }],
    });
  };
  const removeRecipient = (id: string) => {
    updateTokenConfig({ recipients: recipients.filter((r) => r.id !== id) });
  };
  const updateWallet = (id: string, wallet: string) => {
    updateTokenConfig({ recipients: recipients.map((r) => (r.id === id ? { ...r, wallet } : r)) });
  };
  const updatePct = (id: string, pct: number) => {
    updateTokenConfig({ recipients: recipients.map((r) => (r.id === id ? { ...r, pct } : r)) });
  };

  return (
    <Card className="mb-[14px]">
      <CardTitle>5 · Team lockup &amp; vesting</CardTitle>
      <CardSub>
        Where the team allocation unlocks. Add one or more wallets — each gets
        their own percentage of the team pool.
      </CardSub>

      <div className="row-2 mt-[12px]">
        <div className="field">
          <label>Lockup period</label>
          <select
            value={tokenConfig.lockupMonths}
            onChange={(e) => updateTokenConfig({ lockupMonths: Number.parseInt(e.target.value, 10) })}
          >
            <option value={18}>18 months (minimum)</option>
            <option value={24}>24 months</option>
            <option value={36}>36 months</option>
            <option value={48}>48 months</option>
          </select>
        </div>
        <div className="field">
          <label>Vesting style</label>
          <select
            value={tokenConfig.vestingStyle}
            onChange={(e) => updateTokenConfig({ vestingStyle: e.target.value })}
          >
            <option value="cliff_linear">Cliff + linear (12mo cliff)</option>
            <option value="linear">Linear from day 1</option>
            <option value="cliff_only">Cliff only (all at end)</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Recipients</label>
        <div className="flex flex-col gap-[6px]">
          {recipients.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_90px_32px] gap-[6px] items-start">
              <input placeholder="Solana wallet address" value={r.wallet} onChange={(e) => updateWallet(r.id, e.target.value)} />
              <div className="flex items-center gap-[4px]">
                <input type="number" min={0} max={100} value={r.pct}
                  onChange={(e) => { const n = Number.parseInt(e.target.value, 10); if (!Number.isNaN(n)) updatePct(r.id, Math.max(0, Math.min(100, n))); }}
                  className="text-right" />
                <span className="text-muted text-[12px]">%</span>
              </div>
              {recipients.length > 1 ? (
                <button type="button" onClick={() => removeRecipient(r.id)} className="text-muted hover:text-fail cursor-pointer text-[16px] self-start mt-[6px]" aria-label="Remove">×</button>
              ) : <div />}
            </div>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="mt-[8px]" onClick={addRecipient}>＋ Add recipient</Button>

        <div className={`mt-[10px] p-[8px] rounded-[6px] text-[12px] flex items-center justify-between ${
          totalOk
            ? "bg-[rgba(34,197,94,0.06)] border-[1px] border-[rgba(34,197,94,0.25)] text-pass"
            : "bg-[rgba(234,170,0,0.06)] border-[1px] border-[rgba(234,170,0,0.3)] text-at-param"
        }`}>
          <span>Recipient total: <b>{total}%</b></span>
          <span className="text-muted">{totalOk ? "✓ Sums to 100%" : `Off by ${Math.abs(total - 100)}%`}</span>
        </div>
      </div>
    </Card>
  );
}

// ─── 6 · Multisig info card ─────────────────────────────────────────────
function MultisigInfoCard() {
  return (
    <Card className="mb-[14px]">
      <CardTitle>6 · DAO multisig <span className="text-[11px] text-muted font-normal ml-[4px]">auto-created</span></CardTitle>
      <CardSub>
        A Squads multisig is created automatically when the DAO launches.
        The treasury vault sits inside this multisig.
      </CardSub>
      <div className="mt-[12px] p-[10px] bg-[rgba(106,166,255,0.06)] border-[1px] border-[rgba(106,166,255,0.25)] rounded-[8px] text-[12px] text-subtle leading-[1.6]">
        The futarchy program creates the multisig with the sponsor (your wallet)
        as the initial member. Additional members can be added post-launch via
        Squads proposals.
      </div>
    </Card>
  );
}

// ─── 7 · Bid wall ───────────────────────────────────────────────────────
function BidWallCard() {
  const { tokenConfig, updateTokenConfig } = useMarketCreate();
  return (
    <Card className="mb-[14px]">
      <CardTitle>
        7 · Bid wall{" "}
        <span className="text-[11px] text-muted font-normal ml-[4px]">
          advanced · optional
        </span>
      </CardTitle>
      <CardSub>
        A smart contract that automatically buys back tokens at a price floor
        tied to the treasury&apos;s value. Most v1 launches skip this.
      </CardSub>
      <div className="flex gap-[10px] items-start mt-[10px]">
        <input
          type="checkbox"
          id="bidwall-toggle"
          className="w-[auto] mt-[3px]"
          checked={tokenConfig.enableBidWall}
          onChange={(e) => updateTokenConfig({ enableBidWall: e.target.checked })}
        />
        <label htmlFor="bidwall-toggle" className="cursor-pointer">
          <div className="text-[13px]">Enable bid wall on launch</div>
          <div className="text-[11px] text-muted leading-[1.5]">
            Skip if unsure — you can deploy one later via a parameter-change proposal.
          </div>
        </label>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Objective + Operator pickers (both paths)
// ════════════════════════════════════════════════════════════════════════
function ObjectiveCard({
  objectiveId,
  onChange,
}: {
  objectiveId: string;
  onChange: (id: string | null) => void;
}) {
  return (
    <Card className="mb-[14px]">
      <CardTitle>Objective</CardTitle>
      <CardSub>
        The category of decisions this Market organizes around. Defines the
        value dimensions and which proposal types are allowed.
      </CardSub>
      <div className="mt-[12px]">
        <ObjectivePicker value={objectiveId} onChange={onChange} />
      </div>
    </Card>
  );
}

function OperatorSummary({
  operator,
}: {
  operator: ReturnType<typeof findOperator>;
}) {
  if (!operator) {
    return (
      <Card>
        <CardTitle>Operator</CardTitle>
        <CardSub>
          No Operator selected yet. Go back to step 1 to pick or create one —
          every Market needs an Operator to author proposals and to serve as
          a multisig signer.
        </CardSub>
        <div className="mt-[12px]">
          <Link href="/market/market-create/connect">
            <Button>← Back to step 1</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Operator</CardTitle>
      <CardSub>
        Chosen in step 1. This agent authors proposals on a schedule and is
        one of the three signers on the Market&apos;s multisig.
      </CardSub>
      <div className="mt-[12px] p-[12px] rounded-[10px] bg-[rgba(255,255,255,0.02)] border-[1px] border-border">
        <div className="flex items-center justify-between gap-[12px]">
          <div className="min-w-0">
            <div className="font-mono text-[13px] text-fg truncate">
              {operator.name}
            </div>
            <div className="text-[11px] text-muted mt-[2px] truncate">
              {operator.description}
            </div>
          </div>
          <Link
            href="/market/market-create/connect"
            className="text-[11px] text-accent-2 underline whitespace-nowrap cursor-pointer"
          >
            Change
          </Link>
        </div>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Right-column explainers
// ════════════════════════════════════════════════════════════════════════
function LaunchpadExplainer() {
  return (
    <>
      <Explainer>
        <h4>What the launchpad does on launch</h4>
        <p>
          When you click Launch, the MetaDAO launchpad program runs these
          things atomically:
        </p>
        <p>
          <b>1.</b> Mints (or imports) your token.
          <br /><b>2.</b> Opens a fundraise window for your Launch period.
          <br /><b>3.</b> Sets up vesting for the team allocation.
          <br /><b>4.</b> Configures the spending limit (if enabled).
          <br /><b>5.</b> Creates the 1-of-3 DAO multisig.
          <br /><b>6.</b> Optionally deploys the bid wall.
        </p>
        <p>
          If the raise meets its minimum, the Market goes live. If not,
          contributors are refunded.
        </p>
      </Explainer>
      <Annote className="mt-[14px] mb-[14px]">
        <b>This is a one-time setup.</b> Once launched, most launchpad
        parameters can only be changed via parameter-change proposals.
      </Annote>
    </>
  );
}

function ObjectiveExplainer() {
  return (
    <Explainer className="mb-[14px]">
      <h4>What is an Objective?</h4>
      <p>
        An Objective groups decisions that share priorities. A Growth proposal
        is judged on revenue and user love; a Strategy proposal might weight
        long-term vision higher than next-quarter speed.
      </p>
      <p>
        Objectives are reusable — you can pick an existing one or create a
        new one. Each Objective declares its own value dimensions and the
        proposal types it allows.
      </p>
    </Explainer>
  );
}

function OperatorExplainer() {
  return (
    <Explainer className="mb-[14px]">
      <h4>What is an Operator?</h4>
      <p>
        An Operator is your sponsor-side agent that authors proposals on a
        schedule. Each Operator runs one Objective and can only emit proposal
        types that Objective allows.
      </p>
      <p>
        The Operator&apos;s system prompt and tone shape how it writes;
        the Objective bounds what it can write about. The Operator you picked
        in step 1 also serves as one of the three signers on the
        Market&apos;s multisig.
      </p>
    </Explainer>
  );
}

function CoSignerNote() {
  return (
    <Annote>
      <b>Operator agent vs Co-signer key.</b> The Operator on this page is the
      agent that authors proposals. The DAO multisig also has an "Operator
      agent" member — that&apos;s the static keypair the platform holds so the
      agent can submit on-chain transactions. They&apos;re paired but
      distinct: configurable prompt vs static keypair.
    </Annote>
  );
}