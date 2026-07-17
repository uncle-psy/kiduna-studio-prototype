"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";
import { fetchObjectiveTemplates, type Objective } from "@/lib/objectives";

/* ── Types ─────────────────────────────────────────────────────────── */

interface DimensionDraft { id: string; name: string; description: string; weightPct: number; }

const TEMPLATE_ICONS: Record<string, string> = {
  growth: "lucide:trending-up", operations: "lucide:settings",
  strategy: "lucide:compass", tokenomics: "lucide:gem",
};

const PROPOSAL_KINDS = [
  { id: "spend", icon: "lucide:banknote", label: "Spend" },
  { id: "param", icon: "lucide:sliders-horizontal", label: "Parameter" },
  { id: "mint", icon: "lucide:coins", label: "Mint" },
  { id: "metadata", icon: "lucide:file-edit", label: "Metadata" },
  { id: "liquidity", icon: "lucide:waves", label: "Liquidity" },
  { id: "perf", icon: "lucide:trophy", label: "Performance" },
] as const;

/* ════════════════════════════════════════════════════════════════════ */

function CreateObjectiveInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const { token, isLoading: authLoading } = useAuth();

  // Edit mode state
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [editSlug, setEditSlug] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<Objective[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dimensions, setDimensions] = useState<DimensionDraft[]>([
    { id: "d1", name: "Impact", description: "Primary impact", weightPct: 50 },
    { id: "d2", name: "Speed", description: "Time to results", weightPct: 25 },
    { id: "d3", name: "Cost", description: "Resource cost", weightPct: 25 },
  ]);
  const [allowedKinds, setAllowedKinds] = useState<string[]>(["spend", "param"]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ── Fetch existing objective for edit mode ───────────────────────── */
  useEffect(() => {
    if (!editId || authLoading || !token) return;
    (async () => {
      try {
        const res = await fetch(`/api/v1/objectives/${encodeURIComponent(editId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load objective.");
        const obj = await res.json();

        // Prefill form
        setName(obj.name);
        setDescription(obj.description || "");
        setEditSlug(obj.slug);
        setDimensions(
          (obj.dimensions || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((d: any) => ({
              id: d.id,
              name: d.name,
              description: d.description || "",
              weightPct: d.weightPct,
            }))
        );
        setAllowedKinds(obj.allowedProposalKinds || []);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to load objective.");
      } finally { setLoadingEdit(false); }
    })();
  }, [editId, authLoading, token]);

  /* ── Fetch templates (only for create mode) ──────────────────────── */
  useEffect(() => {
    if (isEditMode) { setLoadingTemplates(false); return; }
    fetchObjectiveTemplates()
      .then((t) => setTemplates(t))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, [isEditMode]);

  /* ── Template apply ───────────────────────────────────────────────── */
  function applyTemplate(t: Objective | null) {
    if (!t) {
      setSelectedTemplateId("__custom__");
      setName(""); setDescription("");
      setDimensions([
        { id: "d1", name: "Impact", description: "Primary impact", weightPct: 50 },
        { id: "d2", name: "Speed", description: "Time to results", weightPct: 25 },
        { id: "d3", name: "Cost", description: "Resource cost", weightPct: 25 },
      ]);
      setAllowedKinds(["spend", "param"]);
      return;
    }
    setSelectedTemplateId(t.id);
    setName(t.name); setDescription(t.description);
    setDimensions(t.dimensions.map((d, i) => ({
      id: `d${i}`, name: d.name, description: d.description, weightPct: d.weightPct,
    })));
    setAllowedKinds(t.allowedProposalTypes);
  }

  /* ── Dimension helpers ────────────────────────────────────────────── */
  const dimTotal = dimensions.reduce((s, d) => s + d.weightPct, 0);

  function addDimension() {
    setDimensions((p) => [...p, { id: `d${Date.now()}`, name: "", description: "", weightPct: 10 }]);
  }
  function removeDimension(id: string) {
    setDimensions((p) => p.filter((d) => d.id !== id));
  }
  function updateDim(id: string, patch: Partial<DimensionDraft>) {
    setDimensions((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  /* ── Submit (create or update) ────────────────────────────────────── */
  async function handleSubmit() {
    if (!token || !name.trim()) return;
    if (dimTotal !== 100) { setSubmitError(`Weights must sum to 100% (currently ${dimTotal}%).`); return; }
    if (allowedKinds.length === 0) { setSubmitError("Select at least one proposal type."); return; }

    setSubmitting(true); setSubmitError(null);
    try {
      if (isEditMode && editId) {
        // PATCH existing objective
        const res = await fetch(`/api/v1/objectives/${encodeURIComponent(editId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            allowedProposalKinds: allowedKinds,
            dimensions: dimensions.map((d) => ({
              id: d.id.startsWith("d") && d.id.length < 6 ? undefined : d.id, // new dims have temp ids
              slug: d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
              name: d.name, description: d.description || null, weightPct: d.weightPct,
            })),
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error?.message || d.message || `Failed (${res.status})`);
        }
        router.push(`/objectives/detail?id=${editId}`);
      } else {
        // POST new objective
        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
        const res = await fetch("/api/v1/objectives", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            slug, name: name.trim(), description: description.trim() || null, icon: null,
            allowedProposalKinds: allowedKinds,
            dimensions: dimensions.map((d) => ({
              slug: d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
              name: d.name, description: d.description || null, weightPct: d.weightPct,
            })),
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error?.message || d.message || `Failed (${res.status})`);
        }
        router.push("/objectives");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setSubmitting(false); }
  }

  const isReady = !authLoading && !loadingTemplates && !loadingEdit;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted mb-1">
          <span className="hover:text-accent cursor-pointer" onClick={() => router.push("/objectives")}>
            Objectives
          </span>{" "} / {isEditMode ? "Edit" : "New"}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          {isEditMode ? "Edit Objective" : "New Objective"}
        </h1>
        <p className="text-muted mt-1">
          {isEditMode
            ? "Update the objective's dimensions, proposal types, and settings."
            : "Pick a category of decisions and how it will be judged."}
        </p>
      </div>

      {/* Loading */}
      {!isReady && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted mt-4">{isEditMode ? "Loading objective..." : "Loading..."}</p>
        </div>
      )}

      {/* Form */}
      {isReady && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">

            {/* Template picker — only in create mode */}
            {!isEditMode && (
              <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
                <h2 className="text-base font-bold text-white mb-1">Pick a starter template</h2>
                <p className="text-xs text-muted/60 mb-4">Or start blank with Custom.</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {templates.map((t) => {
                    const sel = selectedTemplateId === t.id;
                    return (
                      <button key={t.id} onClick={() => applyTemplate(t)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                          sel ? "bg-accent/[0.06] border-accent text-white"
                               : "bg-card border-card-border text-white/70 hover:border-white/20 hover:bg-white/[0.04]"
                        }`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${sel ? "bg-accent/15" : "bg-white/[0.06]"}`}>
                          <Icon icon={TEMPLATE_ICONS[t.id] || "lucide:target"} width={18} height={18} className={sel ? "text-accent" : "text-white/60"} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${sel ? "text-white" : ""}`}>{t.name}</p>
                          <p className="text-[10px] text-muted/60 truncate">{t.description.split(".")[0]}</p>
                        </div>
                      </button>
                    );
                  })}
                  <button onClick={() => applyTemplate(null)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                      selectedTemplateId === "__custom__" ? "bg-accent/[0.06] border-accent text-white"
                        : "bg-card border-card-border text-white/70 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedTemplateId === "__custom__" ? "bg-accent/15" : "bg-white/[0.06]"}`}>
                      <Icon icon="lucide:sparkles" width={18} height={18} className={selectedTemplateId === "__custom__" ? "text-accent" : "text-white/60"} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${selectedTemplateId === "__custom__" ? "text-white" : ""}`}>Custom</p>
                      <p className="text-[10px] text-muted/60">Start blank</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Name & description */}
            <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">Name</label>
<div style={{ position: "relative" }}>
  <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} maxLength={80} placeholder="e.g. Growth, Operations, Hiring"
    className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors" style={{ paddingRight: 50 }} />
  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: name.length >= 80 ? "#f87171" : "var(--muted)", fontFamily: "var(--font-mono)", pointerEvents: "none" }}>{name.length}/80</span>
</div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">What decisions go here?</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Describe the kinds of decisions this Objective covers."
                  className="w-full bg-input border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none" />
              </div>
            </div>

            {/* Dimensions */}
            <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold text-white" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{name ? `How ${name} judges decisions` : "Dimensions"}</h2>
                <span className={`text-xs font-mono tabular-nums ${dimTotal === 100 ? "text-green-400" : "text-amber-400"}`}>{dimTotal}%</span>
              </div>
              <p className="text-xs text-muted/60 mb-4">
                Weights must sum to 100%.
                {dimTotal !== 100 && <span className="text-amber-400 ml-1">({dimTotal < 100 ? `${100 - dimTotal}% remaining` : `${dimTotal - 100}% over`})</span>}
              </p>

              <div className="space-y-2">
                {dimensions.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-card-border rounded-xl">
                    <div className="flex-1 min-w-0">
                      <input value={d.name} placeholder="Dimension name" onChange={(e) => updateDim(d.id, { name: e.target.value })}
                        className="w-full bg-transparent text-sm text-white font-medium placeholder:text-muted/50 focus:outline-none" />
                      <input value={d.description} placeholder="Short description" onChange={(e) => updateDim(d.id, { description: e.target.value })}
                        className="w-full bg-transparent text-[11px] text-muted placeholder:text-muted/40 focus:outline-none mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="range" min={1} max={100} value={d.weightPct} onChange={(e) => updateDim(d.id, { weightPct: Number(e.target.value) })}
                        className="w-20 sm:w-28 accent-[var(--accent)] h-1 cursor-pointer" />
                      <span className="text-xs font-mono tabular-nums text-muted w-8 text-right">{d.weightPct}%</span>
                      <button onClick={() => removeDimension(d.id)} disabled={dimensions.length <= 1}
                        className="p-1 rounded text-muted/40 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer">
                        <Icon icon="lucide:x" width={14} height={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addDimension}
                className="w-full mt-3 py-3 rounded-xl border border-dashed border-card-border text-muted hover:text-accent hover:border-accent/40 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Icon icon="lucide:plus" width={14} height={14} /><span className="text-xs">Add dimension</span>
              </button>
            </div>

            {/* Allowed proposal types */}
            <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
              <h2 className="text-base font-bold text-white mb-1">Allowed proposal types</h2>
              <p className="text-xs text-muted/60 mb-3">Operators on this Objective can author any of these.</p>
              <div className="flex flex-wrap gap-2">
                {PROPOSAL_KINDS.map((k) => {
                  const on = allowedKinds.includes(k.id);
                  return (
                    <button key={k.id} onClick={() => setAllowedKinds((p) => on ? p.filter((x) => x !== k.id) : [...p, k.id])}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        on ? "bg-accent/10 border-accent/30 text-accent" : "bg-card border-card-border text-muted hover:border-white/20"
                      }`}>
                      <Icon icon={k.icon} width={13} height={13} />{k.label}{on && <Icon icon="lucide:check" width={12} height={12} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <Icon icon="lucide:alert-circle" width={14} height={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400">{submitError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => router.push(isEditMode ? `/objectives/detail?id=${editId}` : "/objectives")}
                className="px-4 py-2.5 text-sm text-muted hover:text-white transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !name.trim() || dimTotal !== 100}
                className="bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 cursor-pointer">
                {submitting ? (
                  <><Icon icon="lucide:loader-2" width={15} height={15} className="animate-spin" />{isEditMode ? "Saving..." : "Creating..."}</>
                ) : (
                  isEditMode ? "Save Changes" : "Create Objective"
                )}
              </button>
            </div>
          </div>

          {/* Explainers */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
              <h3 className="text-white font-bold text-sm mb-2">{isEditMode ? "Editing tips" : "Why separate Objectives?"}</h3>
              <p className="text-muted text-xs leading-relaxed">
                {isEditMode
                  ? "Changing dimension weights affects how future proposals are evaluated. Existing proposals keep their original weights. Adding or removing proposal types takes effect on the next proposal created."
                  : "Decisions about marketing, hiring, and strategy are judged by different criteria. Separating them lets you say \"for Growth, revenue matters most\" while \"for Operations, reliability matters most.\""}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-card-border">
              <h3 className="text-white font-bold text-sm mb-2">About dimensions</h3>
              <p className="text-muted text-xs leading-relaxed">
                Dimensions are the criteria used to judge proposals. Each has a weight that reflects its importance.
                Electors trade based on how well a proposal scores across these dimensions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateObjectivePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Loading...</p>
      </div>
    }>
      <CreateObjectiveInner />
    </Suspense>
  );
}