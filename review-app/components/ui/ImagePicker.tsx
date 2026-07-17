"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

export interface ImagePickerProps {
  /** Initial preview URL (e.g., for editing existing markets). */
  initialPreview?: string;
  /** Aspect ratio for the preview box. Default 1:1. */
  aspect?: "square" | "wide";
  /** Hint text under the picker. */
  hint?: string;
  /** Max file size in MB. Default 5. */
  maxSizeMb?: number;
  /** Called when user selects/drops a file. */
  onChange?: (file: File | null) => void;
}

/**
 * Lightweight image picker — file input + drag-and-drop + FileReader preview.
 * No upload. The selected File is held in component state and surfaced via
 * `onChange`. Use this anywhere a sponsor needs to attach an image (Market
 * logo, token icon, etc.). Backend upload (Pinata / S3 / etc.) is wired
 * separately when the launch action runs.
 */
export function ImagePicker({
  initialPreview,
  aspect = "square",
  hint,
  maxSizeMb = 5,
  onChange,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File | null) => {
    setError(null);

    if (!file) {
      setPreview(null);
      setFileName(null);
      onChange?.(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > maxSizeMb) {
      setError(`Image must be under ${maxSizeMb} MB. This one is ${sizeMb.toFixed(1)} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(typeof reader.result === "string" ? reader.result : null);
      setFileName(file.name);
      onChange?.(file);
    };
    reader.onerror = () => {
      setError("Couldn't read this file. Try a different one?");
    };
    reader.readAsDataURL(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const aspectClass = aspect === "wide" ? "aspect-[3/1]" : "aspect-square";

  return (
    <div className="image-picker">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative ${aspectClass} max-w-[200px] rounded-[10px] border-[1px] border-dashed cursor-pointer overflow-hidden flex items-center justify-center transition-colors ${
          dragOver
            ? "border-accent-2 bg-[rgba(106,166,255,0.08)]"
            : "border-border bg-[rgba(255,255,255,0.02)] hover:border-subtle hover:bg-[rgba(255,255,255,0.04)]"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={fileName ?? "preview"}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="text-center px-[12px] text-muted">
            <div className="text-[24px] leading-none mb-[6px]">🖼️</div>
            <div className="text-[11px] leading-[1.4]">
              Click or drop an image here
            </div>
            <div className="text-[10px] mt-[4px] opacity-70">
              PNG, JPG, SVG · max {maxSizeMb}MB
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
      </div>

      {fileName && (
        <div className="mt-[6px] flex items-center gap-[6px] text-[11px] text-subtle">
          <span className="truncate max-w-[160px]" title={fileName}>
            {fileName}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-muted hover:text-pass cursor-pointer"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="mt-[6px] text-[11px] text-fail">{error}</div>
      )}

      {hint && !error && !fileName && (
        <div className="mt-[6px] text-[11px] text-muted">{hint}</div>
      )}
    </div>
  );
}
