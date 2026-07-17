"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";

interface FileDropzoneProps {
  kbId: string;
  onUploadComplete: () => void;
  clearTrigger?: number;
  existingItemNames?: string[];
}

interface UploadingFile {
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const ACCEPTED_TYPES = ".pdf,.txt,.docx";
const ACCEPTED_MIMES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileDropzone({ kbId, onUploadComplete, clearTrigger, existingItemNames }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear files when parent signals (e.g. after item deletion)
  useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      setFiles([]);
      setSizeError(null);
    }
  }, [clearTrigger]);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setSizeError(null);
      const allFiles = Array.from(fileList).filter(
        (f) =>
          ACCEPTED_MIMES.includes(f.type) ||
          /\.(pdf|txt|docx)$/i.test(f.name)
      );

      if (allFiles.length === 0) return;

      // Check file sizes
      const oversized = allFiles.filter((f) => f.size > MAX_FILE_SIZE);
      const validFiles = allFiles.filter((f) => f.size <= MAX_FILE_SIZE);

      if (oversized.length > 0) {
        setSizeError(
          `${oversized.length} file${oversized.length > 1 ? "s exceed" : " exceeds"} the 5 MB limit: ${oversized.map((f) => `${f.name} (${formatFileSize(f.size)})`).join(", ")}`
        );
      }

      if (validFiles.length === 0) return;

      // Skip exact duplicates within the same batch (same name + same size)
      const seenInBatch = new Set<string>();
      const deduped: File[] = [];
      for (const f of validFiles) {
        const key = `${f.name.toLowerCase()}::${f.size}`;
        if (seenInBatch.has(key)) continue;
        seenInBatch.add(key);
        deduped.push(f);
      }

      if (deduped.length === 0) return;

      // Skip files that already exist in the KB (by name, case-insensitive)
      const existingSet = new Set((existingItemNames || []).map((n) => n.toLowerCase()));
      const duplicateNames: string[] = [];
      const newFiles: File[] = [];
      for (const f of deduped) {
        if (existingSet.has(f.name.toLowerCase())) {
          duplicateNames.push(f.name);
        } else {
          newFiles.push(f);
        }
      }

      if (duplicateNames.length > 0) {
        const dupMsg = `${duplicateNames.length} file${duplicateNames.length > 1 ? "s" : ""} already uploaded: ${duplicateNames.join(", ")}`;
        setSizeError((prev) => prev ? `${prev}. ${dupMsg}` : dupMsg);
      }

      if (newFiles.length === 0) return;

      setUploading(true);
      setFiles(newFiles.map((f) => ({ name: f.name, size: f.size, status: "uploading" })));

      const formData = new FormData();
      newFiles.forEach((f) => formData.append("files", f));

      try {
        const res = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        setFiles((prev) =>
          prev.map((pf, idx) => {
            const serverFile = data.files?.[idx];
            return {
              ...pf,
              status: serverFile && (serverFile.status === "ingested" || serverFile.status === "pending") ? "done" : "error",
              error: serverFile?.error,
            };
          })
        );

        onUploadComplete();
      } catch (err) {
        console.error("Upload error:", err);
        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: "error" as const }))
        );
      } finally {
        setUploading(false);
      }
    },
    [kbId, onUploadComplete]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function clearFiles() {
    setFiles([]);
    setSizeError(null);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${
            dragging
              ? "border-accent bg-accent/10"
              : "border-card-border hover:border-accent/50 bg-white/[0.02]"
          }
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        <Icon
          icon="lucide:upload-cloud"
          width={40}
          height={40}
          className="mx-auto mb-3 text-muted"
        />
        <p className="text-foreground font-medium mb-1">
          {uploading ? "Uploading..." : "Drag & drop files here"}
        </p>
        <p className="text-sm text-muted">
          or click to browse. Supports PDF, TXT, DOCX (max 5 MB each)
        </p>
      </div>

      {/* Size error */}
      {sizeError && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm flex items-start gap-2">
            <Icon icon="lucide:alert-triangle" width={15} height={15} className="shrink-0 mt-0.5" />
            {sizeError}
          </p>
        </div>
      )}

      {/* Upload progress */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white/[0.04] rounded-lg px-4 py-2.5 text-sm"
            >
              {f.status === "uploading" && (
                <Icon
                  icon="lucide:loader-2"
                  width={16}
                  height={16}
                  className="text-accent animate-spin shrink-0"
                />
              )}
              {f.status === "done" && (
                <Icon
                  icon="lucide:check-circle"
                  width={16}
                  height={16}
                  className="text-green-500 shrink-0"
                />
              )}
              {f.status === "error" && (
                <Icon
                  icon="lucide:x-circle"
                  width={16}
                  height={16}
                  className="text-red-500 shrink-0"
                />
              )}
              <span className="text-foreground truncate flex-1">{f.name}</span>
              <span className="text-muted/60 text-xs shrink-0">{formatFileSize(f.size)}</span>
              {f.error && (
                <span className="text-red-400 text-xs truncate">{f.error}</span>
              )}
            </div>
          ))}
          
          {!uploading && (
            <button
              onClick={clearFiles}
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}