"use client";

import { useRef, useState } from "react";
import type { KnowledgeSource } from "@/lib/operators";

/**
 * Knowledge sources picker. Two ways to add documents:
 *   1. Upload from the user's device (multi-file, drag-drop).
 *   2. Choose from connected Google Drive (mocked — see openDrivePicker).
 *
 * Controlled component: parent owns the list, passes value + onChange.
 *
 * UI-only for now — no upload endpoint, no real Drive integration. The
 * onChange callback is fired with the updated list so the parent can
 * include it in the Operator payload when wiring is added later.
 */

const ACCEPTED_EXTS = [".pdf", ".docx", ".txt", ".md"] as const;
const ACCEPT_ATTR = ACCEPTED_EXTS.join(",");

const MAX_SIZE_MB = 25;

// Mock files returned by the fake Drive picker. Swap with real Google
// Picker API results when integrating.
const MOCK_DRIVE_FILES: Array<{
  driveFileId: string;
  name: string;
  mimeType: string;
}> = [
  {
    driveFileId: "drive-1",
    name: "2026 Strategy & priorities.docx",
    mimeType: "application/vnd.google-apps.document",
  },
  {
    driveFileId: "drive-2",
    name: "Brand voice guidelines.pdf",
    mimeType: "application/pdf",
  },
  {
    driveFileId: "drive-3",
    name: "Q1 OKRs (final).md",
    mimeType: "text/markdown",
  },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(name: string, mimeType: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "📕";
  if (lower.endsWith(".docx") || mimeType.includes("word") || mimeType.includes("document")) return "📄";
  if (lower.endsWith(".md") || mimeType === "text/markdown") return "📝";
  if (lower.endsWith(".txt") || mimeType === "text/plain") return "📃";
  return "📎";
}

export interface KnowledgeSourcesProps {
  value: KnowledgeSource[];
  onChange: (next: KnowledgeSource[]) => void;
  /** Whether the user has linked Google Drive. UI-only. */
  driveConnected?: boolean;
  /** Called when the user clicks "Connect Drive". UI-only. */
  onConnectDrive?: () => void;
}

export function KnowledgeSources({
  value,
  onChange,
  driveConnected = false,
  onConnectDrive,
}: KnowledgeSourcesProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    setError(null);
    const accepted: KnowledgeSource[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((file) => {
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      const isAccepted = (ACCEPTED_EXTS as readonly string[]).includes(ext);
      if (!isAccepted) {
        rejected.push(`${file.name} — unsupported type`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        rejected.push(`${file.name} — over ${MAX_SIZE_MB}MB`);
        return;
      }
      accepted.push({
        id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: "upload",
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      });
    });

    if (rejected.length) {
      setError(rejected.join(" · "));
    }
    if (accepted.length) {
      onChange([...value, ...accepted]);
    }
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    // Reset input so the same file can be re-selected after removal.
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleConnectDrive = () => {
    if (onConnectDrive) onConnectDrive();
    // For the UI-only flow, immediately open the mock picker.
    setPickerOpen(true);
  };

  const handlePickFromDrive = () => {
    setPickerOpen(true);
  };

  const addDriveFiles = (
    files: Array<{ driveFileId: string; name: string; mimeType: string }>,
  ) => {
    const additions: KnowledgeSource[] = files
      .filter(
        (f) => !value.some((v) => v.kind === "drive" && v.driveFileId === f.driveFileId),
      )
      .map((f) => ({
        id: `dr_${f.driveFileId}`,
        kind: "drive",
        name: f.name,
        mimeType: f.mimeType,
        driveFileId: f.driveFileId,
      }));
    if (additions.length) onChange([...value, ...additions]);
    setPickerOpen(false);
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v.id !== id));
  };

  return (
    <div className="flex flex-col gap-[10px]">
      {/* ── Source pickers row ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
        {/* Upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`cursor-pointer rounded-[10px] border-[1px] border-dashed p-[14px] text-center transition-colors ${
            dragging
              ? "border-accent-2 bg-[rgba(255,163,64,0.06)]"
              : "border-border bg-[rgba(255,255,255,0.02)] hover:border-border-hi"
          }`}
        >
          <div className="text-[18px] mb-[4px]">⬆</div>
          <div className="text-[12px] text-fg font-medium">Upload files</div>
          <div className="text-[11px] text-muted mt-[2px]">
            Drop or click · pdf, docx, txt, md · up to {MAX_SIZE_MB}MB each
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            onChange={onPickFiles}
            className="hidden"
          />
        </div>

        {/* Google Drive */}
        <div
          onClick={driveConnected ? handlePickFromDrive : handleConnectDrive}
          className="cursor-pointer rounded-[10px] border-[1px] border-border bg-[rgba(255,255,255,0.02)] p-[14px] text-center hover:border-border-hi transition-colors"
        >
          <div className="text-[18px] mb-[4px]">🗂</div>
          <div className="text-[12px] text-fg font-medium">
            {driveConnected ? "Choose from Google Drive" : "Connect Google Drive"}
          </div>
          <div className="text-[11px] text-muted mt-[2px]">
            {driveConnected
              ? "Pick docs without leaving this page"
              : "One-time connection · pick docs after"}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-fail">{error}</div>
      )}

      {/* ── Selected sources list ───────────────────────── */}
      {value.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          {value.map((src) => (
            <div
              key={src.id}
              className="flex items-center gap-[10px] p-[8px_12px] rounded-[8px] bg-[rgba(255,255,255,0.02)] border-[1px] border-border"
            >
              <div className="text-[16px]">{iconFor(src.name, src.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-fg truncate">{src.name}</div>
                <div className="text-[10px] text-muted font-mono tracking-[0.04em]">
                  {src.kind === "upload"
                    ? `Upload · ${formatBytes(src.sizeBytes)}`
                    : "Google Drive"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(src.id)}
                className="text-[11px] text-muted hover:text-fail cursor-pointer px-[6px]"
                aria-label={`Remove ${src.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Mock Drive picker modal ───────────────────────── */}
      {pickerOpen && (
        <DriveMockPicker
          alreadySelectedIds={value
            .filter((v) => v.kind === "drive")
            .map((v) => (v.kind === "drive" ? v.driveFileId : ""))}
          onCancel={() => setPickerOpen(false)}
          onConfirm={addDriveFiles}
        />
      )}
    </div>
  );
}

/**
 * Mock Google Drive picker. Renders a small modal listing canned files.
 * Real integration would swap this with the Google Picker API or a
 * REST list of the user's Drive contents.
 */
function DriveMockPicker({
  alreadySelectedIds,
  onCancel,
  onConfirm,
}: {
  alreadySelectedIds: string[];
  onCancel: () => void;
  onConfirm: (files: typeof MOCK_DRIVE_FILES) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleConfirm = () => {
    onConfirm(MOCK_DRIVE_FILES.filter((f) => selected.has(f.driveFileId)));
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-[16px] bg-[rgba(0,0,0,0.6)]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[480px] rounded-[12px] bg-bg-2 border-[1px] border-border p-[16px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-display text-[16px] font-semibold mb-[2px]">
          Choose from Google Drive
        </div>
        <div className="text-[11px] text-muted mb-[12px]">
          Pick one or more files. Demo data — real Drive integration is wired separately.
        </div>

        <div className="flex flex-col gap-[6px] max-h-[280px] overflow-y-auto">
          {MOCK_DRIVE_FILES.map((f) => {
            const isSel = selected.has(f.driveFileId);
            const isDupe = alreadySelectedIds.includes(f.driveFileId);
            return (
              <label
                key={f.driveFileId}
                className={`flex items-center gap-[10px] p-[8px_12px] rounded-[8px] border-[1px] cursor-pointer ${
                  isDupe
                    ? "opacity-50 cursor-not-allowed border-border"
                    : isSel
                    ? "border-accent-2 bg-[rgba(255,163,64,0.08)]"
                    : "border-border bg-[rgba(255,255,255,0.02)] hover:border-border-hi"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  disabled={isDupe}
                  onChange={() => toggle(f.driveFileId)}
                  className="cursor-pointer"
                />
                <div className="text-[14px]">{iconFor(f.name, f.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-fg truncate">{f.name}</div>
                  {isDupe && (
                    <div className="text-[10px] text-muted">Already added</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex gap-[8px] justify-end mt-[14px]">
          <button
            type="button"
            onClick={onCancel}
            className="text-[12px] px-[12px] py-[6px] rounded-[6px] border-[1px] border-border text-muted cursor-pointer hover:text-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="text-[12px] px-[12px] py-[6px] rounded-[6px] bg-accent text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
          >
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}