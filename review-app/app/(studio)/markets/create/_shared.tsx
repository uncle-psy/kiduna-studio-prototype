"use client";

import Link from "next/link";

/* ── Wizard sessionStorage prefix ────────────────────────── */

export const WIZARD_PREFIX = "kinship.market-create.";

/**
 * Clear ALL wizard sessionStorage keys.
 */
export function clearWizardState() {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(WIZARD_PREFIX)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // sessionStorage unavailable (SSR, private browsing)
  }
}

/* ── Server-side draft persistence ──────────────────────────────────
   The wizard runs BEFORE a Market row exists, so per-tab sessionStorage is the
   only local state. To survive logout / new tab / new device, we mirror the
   wizard blob to a per-wallet server draft (/api/v1/market-drafts). */

async function draftAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { getToken, getSessionToken } = await import("@/lib/auth");
    const t = getToken() || getSessionToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  } catch {}
  return headers;
}

/** Snapshot all wizard sessionStorage keys into a plain string map. */
export function readWizardBlob(): Record<string, string> {
  const blob: Record<string, string> = {};
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(WIZARD_PREFIX)) {
        blob[key] = sessionStorage.getItem(key) ?? "";
      }
    }
  } catch {}
  return blob;
}

/** Upsert the current wizard state to the per-wallet server draft. No-op if empty. */
export async function saveWizardDraft(): Promise<void> {
  const data = readWizardBlob();
  if (Object.keys(data).length === 0) return;
  try {
    await fetch("/api/v1/market-drafts", {
      method: "PUT",
      headers: await draftAuthHeaders(),
      body: JSON.stringify({ data }),
    });
  } catch {
    // Non-blocking: a failed save must never break the wizard.
  }
}

/**
 * Load the server draft into sessionStorage (used when local wizard state is
 * empty — e.g. after logout / on a new tab). Returns true if anything restored.
 */
export async function loadWizardDraft(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/market-drafts", { headers: await draftAuthHeaders() });
    if (!res.ok) return false;
    const { draft } = await res.json();
    if (!draft || typeof draft !== "object") return false;
    let restored = false;
    for (const [k, v] of Object.entries(draft)) {
      if (k.startsWith(WIZARD_PREFIX) && typeof v === "string") {
        sessionStorage.setItem(k, v);
        restored = true;
      }
    }
    return restored;
  } catch {
    return false;
  }
}

/** Delete the server draft (after the wizard successfully creates the Market). */
export async function deleteWizardDraft(): Promise<void> {
  try {
    await fetch("/api/v1/market-drafts", { method: "DELETE", headers: await draftAuthHeaders() });
  } catch {}
}

/* ── Step definitions ─────────────────────────────────────── */

const STEPS: { label: string; href: string }[] = [
  { label: "Operator", href: "/markets/create" },
  { label: "Basics",    href: "/markets/create/basics" },
  { label: "Configure", href: "/markets/create/configure" },
  { label: "Review",    href: "/markets/create/review" },
];

/**
 * Wizard step rail — Tailwind styled to match Kinship Studio theme.
 */
export function StepRail({
  activeIndex,
}: {
  activeIndex: number;
}) {
  return (
    <div className="flex gap-0 mb-7 border-b border-card-border overflow-x-auto">
      {STEPS.map((s, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;

        const numClass = isDone
          ? "bg-green-500/15 text-green-400 border-green-500/40"
          : isActive
            ? "bg-accent text-on-accent border-accent"
            : "bg-white/[0.04] text-muted border-card-border";

        const labelClass = isActive
          ? "text-white border-b-2 border-accent"
          : isDone
            ? "text-green-400"
            : "text-muted";

        const inner = (
          <div className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${labelClass}`}>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md border text-[10px] font-bold ${numClass}`}>
              {isDone ? "✓" : i + 1}
            </span>
            {s.label}
          </div>
        );

        if (isDone) {
          return (
            <Link key={s.label} href={s.href} className="no-underline hover:bg-white/[0.03] transition-colors">
              {inner}
            </Link>
          );
        }
        return <div key={s.label}>{inner}</div>;
      })}
    </div>
  );
}

/**
 * Wizard page header — Tailwind styled to match Kinship Studio theme.
 */
export function WizardHeader({
  stepLabel,
  title,
  description,
}: {
  stepLabel: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex justify-between items-end mb-7 gap-6">
      <div>
        <div className="text-[11px] font-mono tracking-wider uppercase text-muted mb-2">
          Markets / Create / <span className="text-accent">{stepLabel}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{title}</h1>
        <p className="text-sm text-muted max-w-xl">{description}</p>
      </div>
    </div>
  );
}

/**
 * Wizard action buttons — matches studio button styles.
 */
export function WizardActions({
  onCancel,
  onContinue,
  continueLabel = "Continue →",
  cancelLabel = "← Cancel",
  disabled = false,
}: {
  onCancel: () => void;
  onContinue: () => void;
  continueLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mt-8">
      <button
        onClick={onCancel}
        className="px-5 py-2.5 text-sm font-medium text-muted border border-card-border rounded-full hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors cursor-pointer"
      >
        {cancelLabel}
      </button>
      <button
        onClick={onContinue}
        disabled={disabled}
        className="bg-accent hover:bg-accent-dark text-on-accent font-semibold px-6 py-2.5 text-sm rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {continueLabel}
      </button>
    </div>
  );
}