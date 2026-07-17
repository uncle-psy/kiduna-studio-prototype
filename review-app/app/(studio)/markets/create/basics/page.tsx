"use client";

/**
 * Step 2 — Basics.
 *
 * Collects Market identity for POST /v1/markets:
 *   name, description (one-liner), longDescription, slug, logoUrl
 *
 * API calls on this page:
 *   1. Debounced slug availability check → GET /api/v1/markets/{slug}
 *      (404 = available, 200 = taken)
 *   2. Logo upload on Continue → assets API uploadFile(file, 'markets')
 *      returns a GCS URL stored as logoUrl
 *
 * All fields persist to sessionStorage so they survive step navigation.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { WizardHeader, StepRail, saveWizardDraft } from "../_shared";

/* ── sessionStorage keys ────────────────────────────────────────────── */
const SK = {
  name: "kinship.market-create.name",
  description: "kinship.market-create.description",
  longDescription: "kinship.market-create.longDescription",
  slug: "kinship.market-create.slug",
  logo: "kinship.market-create.logo",         // base64 preview
  logoName: "kinship.market-create.logoName",
  logoUrl: "kinship.market-create.logoUrl",    // GCS URL after upload
} as const;

function ssGet(key: string) {
  try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; }
}
function ssSet(key: string, v: string) {
  try { sessionStorage.setItem(key, v); } catch {}
}

/* ── Slug helpers ───────────────────────────────────────────────────── */
function toSlug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* ── Logo constants ─────────────────────────────────────────────────── */
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const MIN_DIMENSION = 256;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Field limits ───────────────────────────────────────────────────── */
const NAME_MAX = 60;
const DESC_MAX = 160;
const LONG_DESC_MAX = 2000;
const SLUG_MAX = 48;

/** Strip emojis and special characters — allow letters, numbers, spaces, and basic punctuation */
function sanitizeText(v: string) {
  return v.replace(/[^\p{L}\p{N}\s.,!?'"\-:;()&@#/]/gu, "");
}

function validateName(v: string) {
  if (!v.trim()) return "Market name is required.";
  if (v.length > NAME_MAX) return `Max ${NAME_MAX} characters.`;
  return null;
}
function validateDescription(v: string) {
  if (!v.trim()) return "One-line description is required.";
  if (v.length > DESC_MAX) return `Max ${DESC_MAX} characters.`;
  return null;
}
function validateSlugFormat(v: string) {
  if (!v.trim()) return "URL slug is required.";
  if (v.length > SLUG_MAX) return `Max ${SLUG_MAX} characters.`;
  if (!SLUG_RE.test(v)) return "Lowercase letters, numbers, and hyphens only.";
  return null;
}

/* ════════════════════════════════════════════════════════════════════ */

export default function CreateStep2() {
  const router = useRouter();

  /* ── Form state ──────────────────────────────────────────────────── */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  /* ── Slug availability (debounced GET /api/v1/markets/{slug}) ───── */
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugVersion = useRef(0);

  function scheduleSlugCheck(s: string) {
    if (slugTimer.current) clearTimeout(slugTimer.current);
    setSlugAvailable(null);
    const trimmed = s.trim();
    if (!trimmed || validateSlugFormat(trimmed)) { setSlugChecking(false); return; }
    setSlugChecking(true);
    const v = ++slugVersion.current;
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/markets/${encodeURIComponent(trimmed)}`);
        if (v !== slugVersion.current) return;
        setSlugAvailable(res.status === 404);
      } catch {
        if (v === slugVersion.current) setSlugAvailable(null);
      } finally {
        if (v === slugVersion.current) setSlugChecking(false);
      }
    }, 500);
  }

  /* ── Logo state ──────────────────────────────────────────────────── */
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null); // GCS URL
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  /* ── Validation & submission ─────────────────────────────────────── */
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ── Restore on mount ────────────────────────────────────────────── */
  useEffect(() => {
    const n = ssGet(SK.name);
    const d = ssGet(SK.description);
    const ld = ssGet(SK.longDescription);
    const s = ssGet(SK.slug);
    const logo = ssGet(SK.logo);
    const ln = ssGet(SK.logoName);
    const lUrl = ssGet(SK.logoUrl);

    if (n) setName(n);
    if (d) setDescription(d);
    if (ld) setLongDescription(ld);
    if (s) { setSlug(s); setSlugTouched(true); scheduleSlugCheck(s); }
    if (logo) { setLogoPreview(logo); setLogoName(ln || null); }
    if (lUrl) setLogoUrl(lUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Name → slug auto-generation ─────────────────────────────────── */
  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) {
      const s = toSlug(v);
      setSlug(s);
      if (s) scheduleSlugCheck(s);
    }
  }
  function handleSlugChange(v: string) {
    const cleaned = v.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, SLUG_MAX);
    setSlug(cleaned);
    setSlugTouched(true);
    if (cleaned) scheduleSlugCheck(cleaned);
    else { setSlugAvailable(null); setSlugChecking(false); }
  }

  /* ── Persist to sessionStorage ───────────────────────────────────── */
  function persistAll() {
    ssSet(SK.name, name);
    ssSet(SK.description, description);
    ssSet(SK.longDescription, longDescription);
    ssSet(SK.slug, slug);
    if (logoPreview) ssSet(SK.logo, logoPreview);
    if (logoName) ssSet(SK.logoName, logoName);
    if (logoUrl) ssSet(SK.logoUrl, logoUrl);
    // Mirror to the per-wallet server draft (survives logout / new tab).
    saveWizardDraft();
  }

  /* ── Logo handlers ───────────────────────────────────────────────── */
  const validateAndSetLogo = useCallback((file: File) => {
    setLogoError(null); setLogoPreview(null); setLogoName(null); setLogoFile(null);
    setLogoUrl(null); // reset previous upload URL
    try { sessionStorage.removeItem(SK.logoUrl); } catch {}

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setLogoError("Invalid format. Use PNG, JPG, GIF, or WebP."); return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError(`File too large (${formatBytes(file.size)}). Maximum is 2 MB.`); return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        if (img.naturalWidth < MIN_DIMENSION || img.naturalHeight < MIN_DIMENSION) {
          setLogoError(`Image is ${img.naturalWidth}×${img.naturalHeight}px. Minimum ${MIN_DIMENSION}×${MIN_DIMENSION}px.`);
          return;
        }
        setLogoPreview(dataUrl);
        setLogoName(file.name);
        setLogoFile(file);   // keep File reference for upload
      };
      img.onerror = () => setLogoError("Could not read image.");
      img.src = dataUrl;
    };
    reader.onerror = () => setLogoError("Failed to read file.");
    reader.readAsDataURL(file);
  }, []);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetLogo(file);
    e.target.value = "";
  }, [validateAndSetLogo]);

  const removeLogo = useCallback(() => {
    setLogoPreview(null); setLogoName(null); setLogoFile(null); setLogoUrl(null); setLogoError(null);
    try { sessionStorage.removeItem(SK.logo); sessionStorage.removeItem(SK.logoName); sessionStorage.removeItem(SK.logoUrl); } catch {}
  }, []);

  /* ── Upload logo to GCS via assets API ───────────────────────────── */
  async function uploadLogo(): Promise<string | null> {
    // Already uploaded (user went back then forward)
    if (logoUrl && !logoFile) return logoUrl;
    // No logo selected — that's okay, it's optional
    if (!logoFile) return null;

    setLogoUploading(true);
    try {
      const result = await api.uploadFile(logoFile, "markets");
      const url = result.file_url || result.url;
      setLogoUrl(url);
      ssSet(SK.logoUrl, url);
      return url;
    } catch (err) {
      throw new Error("Logo upload failed. Please try again.");
    } finally {
      setLogoUploading(false);
    }
  }

  /* ── Validation ──────────────────────────────────────────────────── */
  const nameErr   = validateName(name);
  const descErr   = validateDescription(description);
  const slugFmtErr = validateSlugFormat(slug);
  const slugTakenErr = !slugFmtErr && slugAvailable === false ? `"${slug}" is already taken.` : null;
  const slugErr   = slugFmtErr || slugTakenErr;
  const hasErrors = !!(nameErr || descErr || slugErr) || slugChecking;

  const showNameErr = attempted && nameErr;
  const showDescErr = attempted && descErr;
  const showSlugErr = attempted && slugErr;

  /* ── Continue handler ────────────────────────────────────────────── */
  async function handleContinue() {
    setAttempted(true);
    setSubmitError(null);

    if (hasErrors) return;

    setSubmitting(true);
    try {
      // Upload logo if a new file was selected
      await uploadLogo();
      persistAll();
      router.push("/markets/create/configure");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Save draft ──────────────────────────────────────────────────── */
  function handleSaveDraft() {
    persistAll();
    setSaving(true);
    setTimeout(() => setSaving(false), 1200);
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="market-wizard">
      <WizardHeader
        stepLabel="Step 2 · Basics"
        title="Create a new Market."
        description="Four steps. Takes about 10 minutes. You can save & continue anytime."
      />
      <StepRail activeIndex={1} />

      <div className="grid-2">
        <div className="card">
          <div className="card-title">1 · Tell us about your team</div>
          <div className="card-sub">
            This creates the top-level container for all your decisions. You can change these anytime.
          </div>

          {/* ── Market name ──────────────────────────────── */}
          <div className="field">
            <label>Market name <span style={{ color: "var(--accent)" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input
                value={name}
                onChange={(e) => handleNameChange(sanitizeText(e.target.value))}
                placeholder="e.g. Acme, Loom Co-op, Inkwell Studio"
                maxLength={NAME_MAX}
                style={{ borderColor: showNameErr ? "var(--fail)" : undefined, paddingRight: 50 }}
              />
              <span style={S.counter}>{name.length}/{NAME_MAX}</span>
            </div>
            {showNameErr
              ? <div style={S.error}>⚠ {nameErr}</div>
              : <div className="hint">The name your team and members will recognize.</div>}
          </div>

          {/* ── One-line description ─────────────────────── */}
          <div className="field">
            <label>One-line description <span style={{ color: "var(--accent)" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input
                value={description}
                onChange={(e) => setDescription(sanitizeText(e.target.value))}
                placeholder="e.g. Acme's team decision log"
                maxLength={DESC_MAX}
                style={{ borderColor: showDescErr ? "var(--fail)" : undefined, paddingRight: 60 }}
              />
              <span style={S.counter}>{description.length}/{DESC_MAX}</span>
            </div>
            {showDescErr
              ? <div style={S.error}>⚠ {descErr}</div>
              : <div className="hint">A short line that explains what this Market is for.</div>}
          </div>

          {/* ── Longer description ───────────────────────── */}
          <div className="field">
            <label>Longer description (optional)</label>
            <div style={{ position: "relative" }}>
              <textarea
                rows={3}
                value={longDescription}
                onChange={(e) => setLongDescription(sanitizeText(e.target.value))}
                maxLength={LONG_DESC_MAX}
                placeholder="What decisions will this Market make? Who participates? What's the purpose?"
                style={{ paddingRight: 60 }}
              />
              <span style={{ ...S.counter, bottom: 10, top: "auto" }}>
                {longDescription.length}/{LONG_DESC_MAX}
              </span>
            </div>
          </div>

          {/* ── Logo + URL row ───────────────────────────── */}
          <div className="grid grid-cols-[200px_1fr] gap-[16px] items-start mt-[4px]">
            {/* Logo */}
            <div className="field">
              <label>Logo (optional)</label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
              {logoPreview ? (
                <div style={{ position: "relative", width: 120, height: 120 }}>
                  <img
                    src={logoPreview}
                    alt={logoName ?? "Logo preview"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }}
                  />
                  <button type="button" onClick={removeLogo} style={S.removeBtn}>✕</button>
                  {logoUploading && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em" }} className="animate-pulse">
                        Uploading…
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="img-pick"
                  role="button"
                  tabIndex={0}
                  onClick={() => logoInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); logoInputRef.current?.click(); } }}
                >
                  Click to upload
                </div>
              )}
              {logoError
                ? <div style={{ ...S.error, marginTop: 4, fontSize: 11 }}>{logoError}</div>
                : !logoPreview && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>Square works best (256×256+)</div>}
            </div>

            {/* URL slug */}
            <div className="field">
              <label>URL <span style={{ color: "var(--accent)" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  value={slug ? `kiduna.club/m/${slug}` : "kiduna.club/m/"}
                  onChange={(e) => handleSlugChange(e.target.value.replace("kiduna.club/m/", ""))}
                  style={{
                    borderColor: showSlugErr ? "var(--fail)"
                      : slugAvailable === true && slug ? "var(--pass)" : undefined,
                    paddingRight: 36,
                  }}
                />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                  {slugChecking && slug && !slugFmtErr && (
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)", fontSize: 11 }} className="animate-pulse">...</span>
                  )}
                  {!slugChecking && slugAvailable === true && slug && !slugFmtErr && (
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--pass)", fontSize: 11 }}>ok</span>
                  )}
                  {!slugChecking && slugAvailable === false && slug && !slugFmtErr && (
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--fail)", fontSize: 11 }}>taken</span>
                  )}
                </span>
              </div>
              {showSlugErr
                ? <div style={S.error}>{slugErr}</div>
                : !slugFmtErr && slugAvailable === true && slug
                  ? <div style={{ fontSize: 11, color: "var(--pass)", marginTop: -2 }}>Slug is available</div>
                  : <div className="hint">A short, memorable web address. Lowercase, no spaces.</div>}
            </div>
          </div>
        </div>

        <div>
          <div className="explainer">
            <h4>What is a Market?</h4>
            <p>
              A Market is the top-level container for everything: your treasury,
              your team members (we call them <b>Citizens</b>), the Objectives
              you organize decisions under, and all the proposals ever made.
            </p>
            <p>
              One team usually has one Market. Larger orgs might have several
              (one per business unit, for example).
            </p>
          </div>
        </div>
      </div>

      {/* ── Submit error ──────────────────────────────── */}
      {submitError && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fail)" }}>
          ⚠ {submitError}
        </div>
      )}

      {/* ── Action bar ──────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-6">
        <button
          className="px-5 py-2.5 text-sm font-medium text-muted border border-card-border rounded-full hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors cursor-pointer"
          onClick={() => { persistAll(); router.push("/markets/create"); }}
        >
          ← Back
        </button>
        <button
          className="px-5 py-2.5 text-sm font-medium text-muted border border-card-border rounded-full hover:text-white hover:border-white/30 hover:bg-white/[0.03] transition-colors cursor-pointer"
          style={{ minWidth: 100 }}
          onClick={handleSaveDraft}
        >
          {saving ? "Saved ✓" : "Save draft"}
        </button>
        <button
          className="bg-accent hover:bg-accent-dark text-on-accent font-semibold px-6 py-2.5 text-sm rounded-full transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-wait flex items-center gap-2"
          disabled={submitting}
          onClick={handleContinue}
          style={{ minWidth: 140 }}
        >
          {submitting && (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {submitting ? (logoUploading ? "Uploading logo…" : "Saving…") : "Continue →"}
        </button>
      </div>
    </div>
  );
}

/* ── Shared inline styles ──────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  counter: {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)",
    pointerEvents: "none", letterSpacing: "0.04em",
  },
  error: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 12, color: "var(--fail)", marginTop: -2,
  },
  removeBtn: {
    position: "absolute", top: -8, right: -8, width: 20, height: 20,
    borderRadius: "50%", background: "var(--fail)", color: "#fff",
    fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
    border: "none", cursor: "pointer",
  },
};