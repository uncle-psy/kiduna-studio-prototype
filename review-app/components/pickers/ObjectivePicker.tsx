"use client";

/**
 * ObjectivePicker — starts empty, user creates objectives inline.
 *
 * The dropdown shows only objectives the user has explicitly created
 * during this wizard session. Templates from the API are offered as
 * starting points inside the "Create new" flow — NOT pre-populated
 * in the dropdown.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchObjectiveTemplates,
  type Objective,
} from "@/lib/objectives";
import { findProposalType, PROPOSAL_TYPES } from "@/lib/proposal-types";
import type { ProposalKind } from "@/lib/proposal-types";
import { useAuth } from "@/lib/auth-context";

export interface ObjectivePickerProps {
  value?: string;
  onChange?: (id: string | null) => void;
  hideCreateCta?: boolean;
}

export function ObjectivePicker({
  value,
  onChange,
  hideCreateCta = false,
}: ObjectivePickerProps) {
  // Only objectives the user has created in this session
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [internal, setInternal] = useState(value ?? "");
  const selectedId = value ?? internal;
  const selected = objectives.find((o) => o.id === selectedId);
  const router = useRouter();
  const { token } = useAuth();

  // Fetch user's objectives from the standalone API on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch("/api/v1/objectives?page=1&pageSize=50", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        const items: Objective[] = (data.items ?? []).map((o: any) => ({
          id: o.id,
          icon: o.icon || "",
          name: o.name,
          description: o.description || "",
          dimensions: (o.dimensions || []).map((d: any) => ({
            id: d.id, name: d.name, description: d.description || "", weightPct: d.weightPct,
          })),
          allowedProposalTypes: o.allowedProposalKinds || [],
        }));
        setObjectives(items);
        // Auto-select if value matches or select first
        if (value && items.find((o) => o.id === value)) {
          setInternal(value);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Templates fetched from API — used as starting points in create flow
  const [templates, setTemplates] = useState<Objective[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Create mode state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("*");
  const [newDescription, setNewDescription] = useState("");
  const [newAllowedTypes, setNewAllowedTypes] = useState<ProposalKind[]>(["spend", "param"]);
  const [newDimensions, setNewDimensions] = useState([
    { id: "d1", name: "Primary impact", weightPct: 50 },
    { id: "d2", name: "Speed", weightPct: 25 },
    { id: "d3", name: "Cost", weightPct: 25 },
  ]);

  // Fetch templates when entering create mode
  useEffect(() => {
    if (!creating || templates.length > 0) return;
    setTemplatesLoading(true);
    fetchObjectiveTemplates()
      .then((t) => setTemplates(t))
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, [creating, templates.length]);

  const handleChange = (id: string) => {
    if (id === "__create__") {
      router.push("/objectives/create");
      return;
    }
    setInternal(id);
    onChange?.(id || null);
  };

  const applyTemplate = (t: Objective) => {
    setNewName(t.name);
    setNewIcon(t.icon);
    setNewDescription(t.description);
    setNewAllowedTypes(t.allowedProposalTypes);
    setNewDimensions(
      t.dimensions.map((d, i) => ({
        id: `d${i}`,
        name: d.name,
        weightPct: d.weightPct,
      }))
    );
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewName("");
    setNewIcon("*");
    setNewDescription("");
    setNewAllowedTypes(["spend", "param"]);
    setNewDimensions([
      { id: "d1", name: "Primary impact", weightPct: 50 },
      { id: "d2", name: "Speed", weightPct: 25 },
      { id: "d3", name: "Cost", weightPct: 25 },
    ]);
  };

  const confirmCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || newAllowedTypes.length === 0) return;

    const id = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const obj: Objective = {
      id,
      icon: newIcon || "*",
      name: trimmed,
      description: newDescription.trim() || `Decisions in ${trimmed}.`,
      dimensions: newDimensions.map((d) => ({
        id: d.id,
        name: d.name,
        description: "",
        weightPct: d.weightPct,
      })),
      allowedProposalTypes: newAllowedTypes,
    };

    setObjectives((prev) => [...prev, obj]);
    setInternal(obj.id);
    onChange?.(obj.id);
    cancelCreate();
  };

  const toggleAllowedType = (kind: ProposalKind) => {
    setNewAllowedTypes((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
    );
  };

  // ─── CREATE mode ──────────────────────────────────────────────────────────
  if (creating) {
    return (
      <div className="p-[14px] bg-[rgba(106,166,255,0.06)] border-[1px] border-[rgba(106,166,255,0.25)] rounded-[10px]">
        <div className="font-mono text-[10px] text-at-mint tracking-[0.08em] uppercase mb-[8px]">
          New Objective
        </div>

        {/* ── Start from template ─────────────────────── */}
        {templates.length > 0 && (
          <div className="mb-[12px]">
            <div className="text-[11px] text-muted mb-[6px]">Start from a template:</div>
            <div className="flex flex-wrap gap-[6px]">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className={`text-[11px] px-[8px] py-[4px] rounded-[6px] cursor-pointer border-[1px] transition-colors ${
                    newName === t.name
                      ? "bg-[rgba(106,166,255,0.15)] border-accent-2 text-accent-2"
                      : "bg-[rgba(255,255,255,0.03)] border-border text-subtle hover:border-accent-2/40"
                  }`}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {templatesLoading && (
          <div className="text-[10px] text-muted animate-pulse mb-[10px]">Loading templates...</div>
        )}

        {/* ── Form fields ─────────────────────────────── */}
        <div className="grid grid-cols-[80px_1fr] gap-[10px] items-end">
          <div className="field mb-0">
            <label className="text-[11px]">Icon</label>
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value.slice(0, 4))}
              maxLength={4}
              className="text-center"
            />
          </div>
          <div className="field mb-0">
            <label className="text-[11px]">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Marketing"
              autoFocus
            />
          </div>
        </div>

        <div className="field mt-[10px]">
          <label className="text-[11px]">Description</label>
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="What kinds of decisions live here?"
          />
        </div>

        <div className="field mt-[10px]">
          <label className="text-[11px]">Allowed proposal types</label>
          <div className="flex flex-wrap gap-[6px] mt-[4px]">
            {PROPOSAL_TYPES.filter((t) => t.inV1).map((t) => {
              const checked = newAllowedTypes.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleAllowedType(t.id)}
                  className={`text-[11px] px-[8px] py-[3px] rounded-[4px] cursor-pointer border-[1px] ${
                    checked
                      ? "bg-[rgba(106,166,255,0.15)] border-accent-2 text-accent-2"
                      : "bg-[rgba(255,255,255,0.03)] border-border text-subtle"
                  }`}
                >
                  {t.icon} {t.name} {checked && "✓"}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-muted mt-[4px]">
            Operators on this Objective can author any of these. Pick at least one.
          </div>
        </div>

        <div className="text-[11px] text-muted mt-[10px] leading-[1.5]">
          Default dimensions and trading parameters will be set automatically.
          You can fine-tune them later from the Objectives page.
        </div>

        <div className="flex gap-[6px] justify-end mt-[10px]">
          <button
            type="button"
            onClick={cancelCreate}
            className="text-[12px] px-[10px] py-[5px] rounded-[6px] bg-transparent text-muted hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmCreate}
            disabled={!newName.trim() || newAllowedTypes.length === 0}
            className="text-[12px] px-[10px] py-[5px] rounded-[6px] bg-accent-2 text-[#0b2010] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
          >
            Create &amp; select
          </button>
        </div>
      </div>
    );
  }

  // ─── PICK mode ────────────────────────────────────────────────────────────

  // Loading
  if (loading) {
    return (
      <div className="p-[16px] text-center">
        <div className="text-[12px] text-muted animate-pulse">Loading objectives...</div>
      </div>
    );
  }

  // No objectives created yet — prompt to create
  if (objectives.length === 0) {
    return (
      <div>
        <div className="field">
          <label>Objective</label>
          <div
            className="p-[16px] rounded-[10px] border-[1px] border-dashed border-border bg-[rgba(255,255,255,0.02)] text-center"
          >
            <div className="text-[12px] text-muted mb-[10px]">
              No Objective selected. Create one to define how this Market judges decisions.
            </div>
            {!hideCreateCta && (
              <button
                type="button"
                onClick={() => router.push("/objectives/create")}
                className="text-[12px] px-[12px] py-[6px] rounded-[6px] bg-accent-2 text-[#0b2010] cursor-pointer font-semibold"
              >
                + Create Objective
              </button>
            )}
          </div>
          <div className="hint">
            The category of decisions this Market organizes around.
          </div>
        </div>
      </div>
    );
  }

  // Has objectives — show dropdown + summary
  return (
    <div>
      <div className="field">
        <label>Objective</label>
        <select
          value={selectedId}
          onChange={(e) => handleChange(e.target.value)}
        >
          <option value="" disabled>Select an Objective…</option>
          {objectives.map((o) => (
            <option key={o.id} value={o.id}>
              {o.icon} {o.name}
            </option>
          ))}
          {!hideCreateCta && (
            <option value="__create__">+ Create another Objective…</option>
          )}
        </select>
        <div className="hint">
          The category of decisions this Market organizes around.
        </div>
      </div>

      {selected && (
        <div className="mt-[10px] p-[12px] bg-[rgba(255,255,255,0.02)] border-[1px] border-border rounded-[8px]">
          <div className="text-[11px] text-muted">{selected.description}</div>

          <div className="mt-[10px]">
            <div className="font-mono text-[10px] text-muted tracking-[0.08em] uppercase mb-[4px]">
              Dimensions
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {selected.dimensions.map((d) => (
                <span
                  key={d.id}
                  className="text-[11px] px-[8px] py-[2px] rounded-[4px] bg-[rgba(255,255,255,0.04)] text-subtle"
                >
                  {d.name} <span className="text-muted">{d.weightPct}%</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-[10px]">
            <div className="font-mono text-[10px] text-muted tracking-[0.08em] uppercase mb-[4px]">
              Allowed proposal types
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {selected.allowedProposalTypes.map((kind) => {
                const meta = findProposalType(kind);
                return (
                  <span
                    key={kind}
                    className="text-[11px] px-[8px] py-[2px] rounded-[4px] bg-[rgba(106,166,255,0.1)] text-accent-2"
                  >
                    {meta?.icon} {meta?.name ?? kind}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="mt-[10px] text-[11px] text-muted">
          </div>
        </div>
      )}
    </div>
  );
}