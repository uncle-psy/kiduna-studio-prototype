"use client";

/**
 * Update Token Metadata — proposal creation form.
 * Reads current metadata from blockchain, lets user edit fields,
 * saves draft via API, navigates to launching page.
 */

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { Icon } from "@iconify/react";
import { useCurrentMarket } from "@/lib/market-context";
import { useAuth } from "@/lib/auth-context";
import { useDaoContext } from "@/lib/onchain/useDaoContext";
import { getToken, getSessionToken } from "@/lib/auth";
import { ObjectiveSelector, type ImpactClaim } from "@/components/proposal-create/ObjectiveSelector";

// Metaplex Token Metadata program
const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM_ID,
  );
  return pda;
}

function readBorshString(buf: Buffer, offset: number): { value: string; newOffset: number } {
  const len = buf.readUInt32LE(offset);
  const value = buf.slice(offset + 4, offset + 4 + len).toString("utf8").replace(/\0+$/, "");
  return { value, newOffset: offset + 4 + len };
}

const parseAmount = (s: string) => { const n = parseFloat(s); return isNaN(n) ? 0 : n; };

// ── Page ──────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const { current } = useCurrentMarket();
  const daoCtx = useDaoContext();
  const { connection } = useConnection();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const walletAddress = user?.wallet ?? "";
  const connected = !!walletAddress;
  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Form state
  const [title, setTitle] = useState("");
  const [objectiveId, setObjectiveId] = useState<string | null>(null);
  const [objectiveName, setObjectiveName] = useState("");
  const [impactClaims, setImpactClaims] = useState<ImpactClaim[]>([]);
  const [rationale, setRationale] = useState("");

  // Metadata fields
  const [currentName, setCurrentName] = useState("");
  const [currentSymbol, setCurrentSymbol] = useState("");
  const [currentUri, setCurrentUri] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newUri, setNewUri] = useState("");
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [updateAuthority, setUpdateAuthority] = useState<string | null>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Scroll to top when form error appears
  useEffect(() => {
    if (formError) requestAnimationFrame(() => document.querySelector('[data-form-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [formError])

  // ── Read current metadata from blockchain ───────────────────────
  useEffect(() => {
    if (!daoCtx.ok || !daoCtx.ctx?.baseMint) return;
    let cancelled = false;
    (async () => {
      setMetadataLoading(true);
      try {
        const metadataPda = findMetadataPda(daoCtx.ctx!.baseMint!);
        const acct = await connection.getAccountInfo(metadataPda);
        if (!acct || cancelled) { setMetadataLoading(false); return; }

        const data = acct.data;
        const authority = new PublicKey(data.slice(1, 33));
        setUpdateAuthority(authority.toBase58());

        let offset = 65;
        const name = readBorshString(data, offset); offset = name.newOffset;
        const symbol = readBorshString(data, offset); offset = symbol.newOffset;
        const uri = readBorshString(data, offset);

        if (!cancelled) {
          setCurrentName(name.value); setNewName(name.value);
          setCurrentSymbol(symbol.value); setNewSymbol(symbol.value);
          setCurrentUri(uri.value); setNewUri(uri.value);
        }
      } catch (e) {
        console.error("Failed to read metadata:", e);
      } finally {
        if (!cancelled) setMetadataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [connection, daoCtx.ok, daoCtx.ctx]);

  // Check if vault holds update authority
  const vaultAddress = daoCtx.ctx?.treasuryVault?.toBase58();
  const authorityMatch = updateAuthority && vaultAddress && updateAuthority === vaultAddress;

  // ── Validation ──────────────────────────────────────────────────
  const validate = useCallback(() => {
    if (!title.trim()) return "Title is required.";
    if (!objectiveId) return "Select an objective.";
    if (!rationale.trim()) return "Rationale is required.";
    if (newName === currentName && newSymbol === currentSymbol && newUri === currentUri) {
      return "No changes detected. Modify at least one field.";
    }
    return null;
  }, [title, objectiveId, rationale, newName, newSymbol, newUri, currentName, currentSymbol, currentUri]);

  // ── Save draft ──────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    const err = validate();
    if (err) { setFormError(err); return null; }
    setFormError(null);
    setSaving(true);
    try {
      const token = getToken() || getSessionToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/v1/markets/${current.slug}/proposals/metadata`, {
        method: "POST", headers,
        body: JSON.stringify({
          title: title.trim(), rationale: rationale.trim(), objectiveId, impactClaims,
          fieldsBefore: { name: currentName, symbol: currentSymbol, uri: currentUri },
          fieldsAfter: { name: newName.trim(), symbol: newSymbol.trim(), uri: newUri.trim() },
          newMetadataUri: newUri.trim() || null,
        }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error ?? `Failed (${res.status})`); }
      const data = await res.json();
      setDraftId(data.id);
      return data.id as string;
    } catch (e) { setFormError(e instanceof Error ? e.message : "Save failed"); return null; }
    finally { setSaving(false); }
  }, [title, rationale, objectiveId, impactClaims, currentName, currentSymbol, currentUri, newName, newSymbol, newUri, current.slug]);

  // ── Navigate to launch ──────────────────────────────────────────
  const handleReviewOpen = useCallback(async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    const id = draftId ?? (await handleSaveDraft());
    if (!id) return;

    sessionStorage.setItem("kinship.proposal-launch.proposalId", id);
    sessionStorage.setItem("kinship.proposal-launch.title", title);
    sessionStorage.setItem("kinship.proposal-launch.objectiveName", objectiveName);
    sessionStorage.setItem("kinship.proposal-launch.rationale", rationale);
    sessionStorage.setItem("kinship.proposal-launch.kind", "metadata");
    sessionStorage.setItem("kinship.proposal-launch.marketSlug", current.slug);
    sessionStorage.setItem("kinship.proposal-launch.summary",
      `Update: ${currentName} → ${newName.trim()}, ${currentSymbol} → ${newSymbol.trim()}`
    );
    sessionStorage.setItem("kinship.proposal-launch.metadataData", JSON.stringify({
      name: newName.trim(),
      symbol: newSymbol.trim(),
      uri: newUri.trim(),
    }));

    // Persist for resume
    const lcToken = getToken() || getSessionToken();
    const lcHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (lcToken) lcHeaders.Authorization = `Bearer ${lcToken}`;
    fetch(`/api/v1/proposals/${id}/launch-context`, {
      method: "PATCH", headers: lcHeaders,
      body: JSON.stringify({ launchPhase: 0, context: { metadataData: { name: newName.trim(), symbol: newSymbol.trim(), uri: newUri.trim() } } }),
    }).catch(() => {});

    router.push("/market/proposals/launching");
  }, [draftId, handleSaveDraft, title, objectiveName, rationale, currentName, currentSymbol, newName, newSymbol, newUri, current.slug, router]);

  // ── Render ──────────────────────────────────────────────────────
  const hasChanges = newName !== currentName || newSymbol !== currentSymbol || newUri !== currentUri;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs text-muted mb-1">
            <Link href="/market/proposals" className="hover:text-accent no-underline text-muted">Proposals</Link> / New / Update metadata
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Update token metadata.</h1>
          <p className="text-muted mt-1">Change the token's name, symbol, or metadata URI on-chain.</p>
        </div>
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0">
          <Icon icon="lucide:arrow-left" width={14} height={14} /> Change type
        </button>
      </div>

      {/* Type banner */}
      <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
        <div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <Icon icon="lucide:file-edit" width={22} height={22} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">Metadata update</h2>
          <p className="text-xs text-muted">Modify the token's on-chain identity on Pass.</p>
        </div>
      </div>

      {/* Authority check */}
      {!metadataLoading && updateAuthority && (
        authorityMatch ? (
          <div className="mb-5 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-2">
            <Icon icon="lucide:shield-check" width={16} height={16} className="text-green-400" />
            <p className="text-xs text-green-400">Metadata update authority verified. The treasury vault holds update authority.</p>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2">
            <Icon icon="lucide:alert-triangle" width={16} height={16} className="text-red-400" />
            <p className="text-xs text-red-400">
              Update authority mismatch. The update authority is not the treasury vault. Transfer it first — this proposal's execution will fail otherwise.
            </p>
          </div>
        )
      )}

      {formError && (
        <div data-form-error className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{formError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <div className="space-y-4">
          {/* Sponsor wallet (FROST) */}
          <div className="bg-card border border-green-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted font-mono">Sponsor Wallet · FROST</div>
                {walletAddress ? (
                  <div className="text-sm text-white font-mono mt-0.5">{walletAddress.slice(0, 4)}&hellip;{walletAddress.slice(-4)}</div>
                ) : (
                  <div className="text-sm text-muted mt-0.5">Sign in to load your wallet</div>
                )}
              </div>
            </div>
          </div>

          {/* 1. Story */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">1 · Tell the story</h2>
            <p className="text-xs text-muted/60 mb-4">What citizens see when this proposal opens for trading.</p>

            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Update token icon to new brand mark"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50" />
            </div>

            <ObjectiveSelector kind="metadata" objectiveId={objectiveId} impactClaims={impactClaims}
              onObjectiveChange={(id, _dims, name) => { setObjectiveId(id); setObjectiveName(name); }}
              onClaimsChange={setImpactClaims} />

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Rationale</label>
              <textarea rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="What's changing and why?"
                className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none" />
            </div>
          </div>

          {/* 2. New metadata */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-base font-bold text-white mb-1">2 · New metadata</h2>
            <p className="text-xs text-muted/60 mb-4">
              {metadataLoading ? "Reading current metadata from blockchain…" : "Current values loaded from blockchain. Edit the fields you want to change."}
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)}
                    className={`w-full bg-input border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent/50 ${newName !== currentName ? "border-amber-500/50" : "border-card-border"}`} />
                  <p className="text-[10px] text-muted mt-1">Currently: {currentName || "—"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Symbol</label>
                  <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} maxLength={10}
                    className={`w-full bg-input border rounded-xl px-4 py-3 text-foreground uppercase focus:outline-none focus:border-accent/50 ${newSymbol !== currentSymbol ? "border-amber-500/50" : "border-card-border"}`} />
                  <p className="text-[10px] text-muted mt-1">Currently: {currentSymbol || "—"}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Metadata URI</label>
                <input value={newUri} onChange={(e) => setNewUri(e.target.value)} placeholder="https://arweave.net/..."
                  className={`w-full bg-input border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 ${newUri !== currentUri ? "border-amber-500/50" : "border-card-border"}`} />
                <p className="text-[10px] text-muted mt-1">Currently: {currentUri || "(empty)"}</p>
              </div>

              {hasChanges && (
                <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Changes preview</p>
                  {newName !== currentName && <p className="text-xs text-muted">Name: <span className="text-white">{currentName}</span> → <span className="text-amber-400">{newName}</span></p>}
                  {newSymbol !== currentSymbol && <p className="text-xs text-muted">Symbol: <span className="text-white">{currentSymbol}</span> → <span className="text-amber-400">{newSymbol}</span></p>}
                  {newUri !== currentUri && <p className="text-xs text-muted">URI: <span className="text-white truncate">{currentUri || "(empty)"}</span> → <span className="text-amber-400 truncate">{newUri || "(empty)"}</span></p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
            <h3 className="text-white font-bold text-sm mb-2">On Pass</h3>
            <p className="text-muted text-xs leading-relaxed mb-2">
              The token's Metaplex metadata account is updated. Wallets and explorers reflect the change immediately.
            </p>
            <p className="text-muted text-xs leading-relaxed">
              Citizens see this as a <span className="text-amber-400 font-semibold">METADATA</span> proposal.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={() => router.push("/market/create-start")}
          className="px-4 py-2.5 text-sm text-muted hover:text-white transition-colors cursor-pointer">← Back</button>
        <button onClick={handleSaveDraft} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-medium border border-card-border text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50">
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button onClick={handleReviewOpen} disabled={saving}
          className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
          Review & open →
        </button>
      </div>
    </div>
  );
}