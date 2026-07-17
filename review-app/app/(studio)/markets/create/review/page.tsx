"use client";

/**
 * Step 4 — Review and Launch.
 *
 * Reads all wizard data from sessionStorage, displays a summary,
 * and launches the Market via POST /api/v1/markets.
 */

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAgent } from "@/lib/agents-api";
import { getToken, getSessionToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { useStudio } from "@/lib/studio-context";
import type { Presence } from "@/lib/agent-types";
import type { Objective } from "@/lib/objectives";
import { WizardHeader, StepRail, saveWizardDraft, deleteWizardDraft } from "../_shared";

/* ── sessionStorage helpers ─────────────────────────────────────────── */
function ssGet(key: string) {
  try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; }
}

const SK = {
  name: "kinship.market-create.name",
  description: "kinship.market-create.description",
  longDescription: "kinship.market-create.longDescription",
  slug: "kinship.market-create.slug",
  logoUrl: "kinship.market-create.logoUrl",
  type: "kinship.market-create.type",
  operatorId: "kinship.market-create.operatorId",
  objectiveId: "kinship.market-create.objectiveId",
  tokenConfig: "kinship.market-create.tokenConfig",
} as const;

/* ════════════════════════════════════════════════════════════════════ */

function PageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { currentPlatform } = useStudio();

  // When set, we're resuming an existing draft market (slug) rather than a
  // fresh wizard run held in sessionStorage.
  const resumeSlug = searchParams.get("resume");

  /* ── Wizard data from sessionStorage ─────────────────────────────── */
  const [marketName, setMarketName] = useState("");
  const [marketDesc, setMarketDesc] = useState("");
  const [marketSlug, setMarketSlug] = useState("");
  const [marketLogoUrl, setMarketLogoUrl] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [objectiveId, setObjectiveId] = useState("");

  /* ── Fetched / looked-up data ────────────────────────────────────── */
  const [operator, setOperator] = useState<Presence | null>(null);
  const [objective, setObjective] = useState<Objective | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Launch state ────────────────────────────────────────────────── */
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Load all data on mount ──────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      let name = ssGet(SK.name);
      let desc = ssGet(SK.description);
      let slug = ssGet(SK.slug);
      let logoUrl = ssGet(SK.logoUrl);
      let opId = ssGet(SK.operatorId);
      let objId = ssGet(SK.objectiveId);

      // Resuming an existing draft: sessionStorage was cleared after the
      // previous save/launch, so load the market from the backend instead.
      if (resumeSlug) {
        try {
          const t = token || getToken() || getSessionToken();
          const headers: Record<string, string> = { Accept: "application/json" };
          if (t) headers.Authorization = `Bearer ${t}`;

          const res = await fetch(
            `/api/v1/markets/${encodeURIComponent(resumeSlug)}`,
            { headers },
          );
          if (res.ok) {
            const data = await res.json();
            const m = data.market ?? {};
            const resume = data.resume ?? {};

            name = m.name || name;
            desc = m.description || desc;
            slug = m.slug || slug || resumeSlug;
            logoUrl = m.logoUrl || logoUrl;
            opId = resume.operatorId || opId;
            objId = resume.objectiveId || objId;

            // Re-seed sessionStorage so the launch flow + token-config logic work.
            try {
              const set = (k: string, v: string) => { if (v) sessionStorage.setItem(k, v); };
              set(SK.name, name);
              set(SK.description, desc);
              set(SK.slug, slug);
              set(SK.logoUrl, logoUrl);
              set(SK.operatorId, opId);
              set(SK.objectiveId, objId);
              if (resume.tokenConfig) {
                sessionStorage.setItem(SK.tokenConfig, JSON.stringify(resume.tokenConfig));
              }
            } catch { /* sessionStorage unavailable */ }
          }
        } catch (err) {
          console.error("Failed to load draft market:", err);
        }
      }

      if (cancelled) return;

      setMarketName(name);
      setMarketDesc(desc);
      setMarketSlug(slug);
      setMarketLogoUrl(logoUrl);
      setOperatorId(opId);
      setObjectiveId(objId);

      // Fetch the actual objective from the API (not templates)
      if (objId) {
        const t = token || getToken() || getSessionToken();
        const headers: Record<string, string> = { Accept: "application/json" };
        if (t) headers.Authorization = `Bearer ${t}`;

        fetch(`/api/v1/objectives/${encodeURIComponent(objId)}`, { headers })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (cancelled || !data) return;
            setObjective({
              id: data.id,
              icon: data.icon || "",
              name: data.name,
              description: data.description || "",
              dimensions: (data.dimensions || []).map((d: any) => ({
                id: d.id, name: d.name, description: d.description || "", weightPct: d.weightPct,
              })),
              allowedProposalTypes: data.allowedProposalKinds || [],
            });
          })
          .catch((err) => console.error("Failed to load objective:", err));
      }

      // Fetch operator from backend
      if (opId) {
        getAgent(opId)
          .then((agent) => { if (!cancelled) setOperator(agent); })
          .catch((err) => console.error("Failed to load operator:", err))
          .finally(() => { if (!cancelled) setLoading(false); });
      } else {
        setLoading(false);
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, [resumeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Validation ───────────────────────────────────────────────────── */
  const missingFields: string[] = [];
  if (!marketName) missingFields.push("Market name");
  if (!marketSlug) missingFields.push("URL slug");
  if (!operatorId) missingFields.push("Operator");
  if (!objectiveId) missingFields.push("Objective");

  /* ── Launch handler ───────────────────────────────────────────────── */
  async function handleLaunch() {
    setLaunchError(null);

    // Resuming an existing draft: it's already created and valid, so continue
    // the launch flow instead of re-creating it (a re-POST would fail with a
    // "slug is taken" conflict). Skip the wizard-field validation — the market
    // record is now the source of truth, and the operator selection only ever
    // lived in sessionStorage (it isn't persisted on the market).
    if (resumeSlug) {
      const rawTc = ssGet(SK.tokenConfig);
      const isIco = (() => { try { return JSON.parse(rawTc).mode === "new"; } catch { return false; } })();
      router.push(isIco ? `/launchpad/${marketSlug}` : `/markets/create/launching?slug=${marketSlug}`);
      return;
    }

    if (missingFields.length > 0) {
      setLaunchError(`Missing required fields: ${missingFields.join(", ")}.`);
      return;
    }

    if (!token) {
      setLaunchError("You must be logged in to launch a Market.");
      return;
    }

    setLaunching(true);
    try {
      const res = await fetch("/api/v1/markets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: marketName,
          description: marketDesc || null,
          slug: marketSlug,
          logoUrl: marketLogoUrl || null,
          ...(currentPlatform?.id ? { platformId: currentPlatform.id } : {}),
          tokenTicker: (() => {
            const raw = ssGet(SK.tokenConfig);
            if (!raw) return null;
            try {
              const tc = JSON.parse(raw);
              return tc.ticker || tc.tokenName || tc.existingMint?.slice(0, 10) || "TOKEN";
            } catch { return null; }
          })(),
          tokenConfig: (() => {
            const raw = ssGet(SK.tokenConfig);
            if (!raw) return null;
            try { return JSON.parse(raw); } catch { return null; }
          })(),
          objectiveId: objectiveId || null,
          operatorId: operatorId || null,
          // ICO launchpad fields
          ...(() => {
            const raw = ssGet(SK.tokenConfig);
            if (!raw) return {};
            try {
              const tc = JSON.parse(raw);
              if (tc.mode !== "new") return {};
              return {
                launchMode: "ico",
                minRaise: tc.minRaise || 50000,
                icoDurationSeconds: (tc.icoDurationDays || 4) * 86400,
                monthlyBudgetUsdc: tc.monthlyBudgetUsdc || 1,
                hasBidWall: tc.hasBidWall ?? true,
                perfPackageTokens: tc.perfPackageTokens || 10,
                perfPackageGrantee: tc.perfPackageGrantee || null,
                perfMinUnlockMonths: tc.perfMinUnlockMonths || 12,
                additionalTokensAmount: tc.additionalTokensAmount || 0,
                additionalTokensRecipient: tc.additionalTokensRecipient || null,
                teamAddress: tc.teamAddress || null,
              };
            } catch { return {}; }
          })(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Launch failed (${res.status})`);
      }

      const market = await res.json();

      // ICO mode → redirect to launchpad page; existing token → launch flow
      // Read BEFORE clearing sessionStorage!
      const rawTc = ssGet(SK.tokenConfig);
      const isIco = (() => { try { return JSON.parse(rawTc).mode === "new"; } catch { return false; } })();

      // Clear wizard sessionStorage AND the server-side draft — the Market row
      // now exists; further resume happens via ?resume={slug} from the list.
      Object.values(SK).forEach((key) => {
        try { sessionStorage.removeItem(key); } catch {}
      });
      deleteWizardDraft();

      if (isIco) {
        router.push(`/launchpad/${marketSlug}`);
      } else {
        router.push(`/markets/create/launching?slug=${marketSlug}`);
      }
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLaunching(false);
    }
  }

  function handleSaveDraft() {
    saveWizardDraft();
    setSaving(true);
    setTimeout(() => setSaving(false), 1200);
  }

  /* ── Dimension colors ─────────────────────────────────────────────── */
  const dimColors = ["var(--pass)", "var(--at-mint)", "var(--accent)", "var(--at-perf)", "var(--at-param)"];

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="market-wizard">
      <WizardHeader
        stepLabel="Step 4 - Review"
        title="Review and launch."
        description="Everything you have set up. You can edit almost anything later."
      />
      <StepRail activeIndex={3} />

      <div className="grid-2">
        <div>
          {/* ── Market identity ────────────────────────────── */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="section-cap">MARKET</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {marketLogoUrl && (
                <img
                  src={marketLogoUrl}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
                />
              )}
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
                  {marketName || "Untitled Market"}
                </div>
                {marketDesc && (
                  <div style={{ fontSize: 13, color: "var(--subtle)", marginTop: 2 }}>{marketDesc}</div>
                )}
                {marketSlug && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    kiduna.club/m/{marketSlug}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Type ───────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="section-cap">TYPE</div>
            <div style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <>
                  <span className="badge live dot">TOKEN-BACKED</span>
                  Solana on-chain, utility token + USDC, launchpad-backed
                </>
            </div>
          </div>

          {/* ── Operator ───────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="section-cap">OPERATOR</div>
            {loading ? (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }} className="animate-pulse">
                Loading...
              </div>
            ) : operator ? (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
                      {operator.name}
                    </span>
                    {operator.handle && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", wordBreak: "break-all" }}>@{operator.handle}</span>
                    )}
                    {operator.tone && (
                      <span style={S.badge}>{operator.tone.toLowerCase()}</span>
                    )}
                  </div>
                  {(operator.description || operator.briefDescription) && (
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      {operator.description || operator.briefDescription}
                    </div>
                  )}
                </div>
                <Link href="/markets/create" style={{ fontSize: 11, color: "var(--accent-2)", textDecoration: "underline", whiteSpace: "nowrap" }}>
                  Change
                </Link>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--warn)" }}>
                No Operator selected.{" "}
                <Link href="/markets/create" style={{ color: "var(--accent-2)", textDecoration: "underline" }}>Go to step 1</Link>
              </div>
            )}
          </div>

          {/* ── Objective ──────────────────────────────────── */}
          <div className="card">
            <div className="section-cap">OBJECTIVE</div>
            {objective ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                      {objective.icon} {objective.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{objective.description}</div>
                  </div>
                  <Link href={`/markets/create/configure`} style={{ fontSize: 11, color: "var(--accent-2)", textDecoration: "underline", whiteSpace: "nowrap" }}>
                    Change
                  </Link>
                </div>
                {/* Dimensions */}
                <div className="vec-row" style={{ marginTop: 10 }}>
                  {objective.dimensions.map((d, i) => (
                    <div key={d.id} className="vec-pill">
                      <span className="swatch" style={{ background: dimColors[i % dimColors.length] }} />
                      {d.name}
                      <span className="w">{(d.weightPct / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "var(--warn)" }}>
                No Objective selected.{" "}
                <Link href={`/markets/create/configure`} style={{ color: "var(--accent-2)", textDecoration: "underline" }}>Go to step 4</Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────── */}
        <div>
          <div className="explainer" style={{ marginBottom: 14 }}>
            <h4>What happens when you launch</h4>
                <p>Clicking Launch starts the MetaDAO launchpad flow: token mint, fundraise window opens, premine + lockup configured, futarchy pool seeded.</p>
                <p>If your raise reaches its minimum target, the Market goes live and you can start drafting proposals. If not, contributors are refunded.</p>
                <p>You will get a launchpad URL to share with prospective participants.</p>
          </div>

          <div className="annote">
            <b>This is reversible.</b> Identity and dimensions are always editable. The only things locked after launch are mechanism-level — changing those needs a meta-proposal.
          </div>
        </div>
      </div>

      {/* ── Launch error ──────────────────────────────────── */}
      {launchError && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fail)" }}>
          {launchError}
        </div>
      )}

      {/* ── Action bar ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-6">
        <button
          className="px-5 py-2.5 text-sm font-medium text-muted border border-card-border rounded-full hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors cursor-pointer"
          onClick={() => router.push(`/markets/create/configure`)}
        >
          ← Back
        </button>
        <button
          className="px-5 py-2.5 text-sm font-medium text-muted border border-card-border rounded-full hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors cursor-pointer"
          style={{ minWidth: 120 }}
          onClick={handleSaveDraft}
        >
          {saving ? "Saved" : "Save as draft"}
        </button>
        <button
          className="bg-accent hover:bg-accent-dark text-on-accent font-semibold px-6 py-2.5 text-sm rounded-full transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
          style={{ minWidth: 200 }}
          disabled={launching}
          onClick={handleLaunch}
        >
          {launching && (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {launching
            ? "Saving…"
            : (() => {
                try {
                  const tc = JSON.parse(ssGet(SK.tokenConfig));
                  return tc.mode === "new" ? "Create ICO campaign →" : "Save and launch →";
                } catch { return "Save and launch →"; }
              })()}
        </button>
      </div>
    </div>
  );
}

export default function CreateStep5() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}

/* ── Shared styles ─────────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  badge: {
    fontFamily: "var(--font-mono)", fontSize: 10,
    letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "2px 7px", borderRadius: 999,
    border: "1px solid var(--border)", color: "var(--muted)",
  },
};