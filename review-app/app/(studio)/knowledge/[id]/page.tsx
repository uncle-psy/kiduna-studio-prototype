"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { FileDropzone } from "@/components/FileDropzone";
import { KBItemsList } from "@/components/KBItemsList";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useAuth } from "@/lib/auth-context";
import { listAgents } from "@/lib/agents-api";

interface KBItem {
  id: string;
  name: string;
  type: "file" | "ai-generated" | "drive-link";
  status: "pending" | "processing" | "ingested" | "failed";
  createdAt: string;
  url?: string;
  chunkCount?: number;
  error?: string;
}

interface KBDetail {
  id: string;
  name: string;
  namespace: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  items: KBItem[];
}

const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

// ─────────────────────────────────────────────────────────────────────────────
// Google connection from empower (persisted in localStorage)
// ─────────────────────────────────────────────────────────────────────────────

interface GoogleDriveConnection {
  email: string;
  name: string;
  connectedAt: number;
}

function getStoredGoogleConnection(): GoogleDriveConnection | null {
  try {
    const raw = localStorage.getItem("kinship_google_drive");
    if (!raw) return null;
    return JSON.parse(raw) as GoogleDriveConnection;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supported file types — only show files the backend can process
// ─────────────────────────────────────────────────────────────────────────────

const PICKER_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.google-apps.document",
];

// MIME types the backend can actually ingest (native + workspace that export to these)
const INGESTIBLE_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Google Docs — exported to PDF by the gdrive-import route
  "application/vnd.google-apps.document",
]);

/** Check whether a Drive file's MIME type is ingestible by the backend. */
function isIngestibleMime(mimeType: string): boolean {
  return INGESTIBLE_MIME_TYPES.has(mimeType);
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload source type
// ─────────────────────────────────────────────────────────────────────────────

type UploadSource = "files" | "gdrive" | null;

// ─────────────────────────────────────────────────────────────────────────────
// Google Drive Picker Component
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_LIFETIME_MS = 45 * 60 * 1000; // refresh before Google's 60 min expiry

// ── Module-level token cache — survives component remounts ──
let _cachedToken: string | null = null;
let _cachedTokenTs = 0;
let _tokenClient: any = null;            // GIS token client, initialized once
let _pendingResolve: ((token: string) => void) | null = null;
let _pendingReject: ((err: Error) => void) | null = null;

function _isTokenValid(): boolean {
  return !!_cachedToken && Date.now() - _cachedTokenTs < TOKEN_LIFETIME_MS;
}

function GoogleDrivePicker({
  kbId,
  onUploadComplete,
  clearTrigger,
  existingItemNames,
}: {
  kbId: string;
  onUploadComplete: () => void;
  clearTrigger?: number;
  existingItemNames?: string[];
}) {
  const [pickerReady, setPickerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedFiles, setImportedFiles] = useState<
    { name: string; sizeBytes?: number; status: "waiting" | "importing" | "done" | "error"; error?: string }[]
  >([]);

  // Save scroll position before picker opens so we can restore it
  const savedScrollY = useRef(0);

  // Folder URL import state
  const [folderUrl, setFolderUrl] = useState('');
  const [folderUrlImporting, setFolderUrlImporting] = useState(false);
  const [folderUrlError, setFolderUrlError] = useState('');

  // Stored Google account from empower page
  const [googleConn, setGoogleConn] = useState<GoogleDriveConnection | null>(null);

  // Clear imported files when parent signals (e.g. after item deletion)
  useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      setImportedFiles([]);
    }
  }, [clearTrigger]);

  useEffect(() => {
    setGoogleConn(getStoredGoogleConnection());
  }, []);

  // Load Google APIs
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
      setError("Google Drive not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY to your .env file.");
      return;
    }
    let cancelled = false;
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement("script");
        s.src = src; s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });
    async function init() {
      try {
        await loadScript("https://apis.google.com/js/api.js");
        await loadScript("https://accounts.google.com/gsi/client");
        await new Promise<void>((resolve, reject) => {
          (window as any).gapi.load("client:picker", {
            callback: resolve,
            onerror: () => reject(new Error("Failed to load Picker module")),
          });
        });
        if (!cancelled) setPickerReady(true);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // ── Initialize the GIS token client ONCE after APIs load ──
  useEffect(() => {
    if (!pickerReady || _tokenClient) return; // already initialized

    const hint = getStoredGoogleConnection()?.email || "";

    _tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      hint,
      prompt: hint ? "" : undefined,
      callback: (res: any) => {
        if (res.error) {
          _pendingReject?.(new Error(res.error));
        } else {
          _cachedToken = res.access_token;
          _cachedTokenTs = Date.now();
          _pendingResolve?.(res.access_token);
        }
        _pendingResolve = null;
        _pendingReject = null;
      },
    });
  }, [pickerReady]);

  /**
   * Get an OAuth access token for Google Drive.
   *
   * The GIS token client is initialized once (module-level) and reused.
   * After the first successful auth the token is cached for 45 min, so
   * subsequent calls (even after component remount) skip the account picker.
   *
   * @param forcePrompt  true → show full account picker ("Switch account")
   */
  const getAuthToken = useCallback((forcePrompt = false): Promise<string> => {
    // Return cached token if valid and not forcing account switch
    if (!forcePrompt && _isTokenValid()) {
      return Promise.resolve(_cachedToken!);
    }

    if (!_tokenClient) {
      return Promise.reject(new Error("Google auth not initialized"));
    }

    return new Promise((resolve, reject) => {
      _pendingResolve = resolve;
      _pendingReject = reject;

      // Override prompt per-request via requestAccessToken overrides
      const overrides: Record<string, unknown> = {};
      if (forcePrompt) {
        overrides.prompt = "select_account";
      } else if (googleConn?.email) {
        overrides.hint = googleConn.email;
        overrides.prompt = "";
      }

      _tokenClient.requestAccessToken(overrides);
    });
  }, [googleConn]);

  const isTokenValid = useCallback(_isTokenValid, []);

  // Import a single file via server proxy
  const importDriveFile = async (
    doc: { id: string; name: string; mimeType: string },
    token: string,
  ): Promise<void> => {
    const res = await fetch("/api/knowledge/gdrive-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kbId,
        fileId: doc.id,
        fileName: doc.name,
        mimeType: doc.mimeType,
        accessToken: token,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: `Failed (${res.status})` }));
      throw new Error(data.error || `Import failed (${res.status})`);
    }
  };

  // Process picked files one by one
  const handlePickedFiles = useCallback(async (
    docs: { id: string; name: string; mimeType: string; sizeBytes?: number }[],
    token: string,
  ) => {
    // Fetch fresh KB items and build a set of existing Drive file IDs + names
    const existingDriveIds = new Set<string>();
    const existingNames = new Set<string>();
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`);
      if (res.ok) {
        const data = await res.json();
        for (const item of (data.items || [])) {
          // Extract Drive file ID from stored URL (https://drive.google.com/file/d/{fileId}/view)
          const m = (item.url || '').match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (m) existingDriveIds.add(m[1]);
          if (item.name) existingNames.add(item.name.toLowerCase());
        }
      }
    } catch {}

    // Filter out files that already exist in the KB
    const skippedNames: string[] = [];
    const newDocs = docs.filter((d) => {
      if (existingDriveIds.has(d.id)) { skippedNames.push(d.name); return false; }
      if (existingNames.has(d.name.toLowerCase())) { skippedNames.push(d.name); return false; }
      return true;
    });

    if (skippedNames.length > 0) {
      setError(`${skippedNames.length} file${skippedNames.length > 1 ? 's' : ''} already uploaded: ${skippedNames.join(', ')}`);
    }

    if (newDocs.length === 0) {
      if (skippedNames.length > 0 && !error) setError('All selected files are already uploaded.');
      return;
    }

    setImporting(true);
    setImportedFiles(newDocs.map((d) => ({ name: d.name, sizeBytes: d.sizeBytes, status: "waiting" })));

    // Restore scroll position after picker closes — prevent auto-scroll to new content
    requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));

    for (let i = 0; i < newDocs.length; i++) {
      const doc = newDocs[i];
      setImportedFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "importing" } : f)));
      try {
        const freshToken = isTokenValid() ? token : await getAuthToken();
        await importDriveFile(doc, freshToken);
        setImportedFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f)));
      } catch (err) {
        setImportedFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "error", error: (err as Error).message } : f)));
      }
    }
    setImporting(false);
    onUploadComplete();
  }, [kbId, onUploadComplete, getAuthToken, isTokenValid]);

  /**
    * Force-center the Google Picker dialog.
    *
    * Google's picker JS continuously sets inline top/left with position:absolute.
    * Instead of fighting per-frame with rAF (which causes flicker/drift),
    * we inject a <style> tag with !important rules that override inline styles.
    */
  const centerPickerDialog = useCallback(() => {
    const STYLE_ID = "kinship-picker-center";

    // Remove any previous style tag
    document.getElementById(STYLE_ID)?.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .picker-dialog {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        margin: 0 !important;
      }
      .picker-dialog-bg {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
      }
    `;
    document.head.appendChild(style);

    // Remove the style tag once the picker closes (poll briefly)
    const cleanup = setInterval(() => {
      if (!document.querySelector(".picker-dialog")) {
        document.getElementById(STYLE_ID)?.remove();
        clearInterval(cleanup);
      }
    }, 500);

    // Safety: stop polling after 2 minutes
    setTimeout(() => clearInterval(cleanup), 120_000);
  }, []);

  /**
    * List supported files inside Google Drive folders.
    * - Filters by MIME type at the API level (not client-side)
    * - No recursion into subfolders (single level only)
    * - Caps at 20 files to prevent hanging
    */
  const listFilesInFolders = useCallback(async (
    folders: { id: string; name: string }[],
    token: string,
  ): Promise<{ id: string; name: string; mimeType: string; sizeBytes?: number }[]> => {
    const allFiles: { id: string; name: string; mimeType: string; sizeBytes?: number }[] = [];
    const MAX_FILES = 20;

    // Build MIME type filter for the API query
    const mimeFilter = PICKER_MIME_TYPES
      .map((m) => `mimeType='${m}'`)
      .join(" or ");

    for (const folder of folders) {
      if (allFiles.length >= MAX_FILES) break;

      try {
        // Query ONLY supported file types — Google Drive filters server-side
        const query = `'${folder.id}' in parents and trashed = false and (${mimeFilter})`;
        const fields = "files(id,name,mimeType,size)";
        const remaining = MAX_FILES - allFiles.length;
        const url =
          `https://www.googleapis.com/drive/v3/files` +
          `?q=${encodeURIComponent(query)}` +
          `&fields=${encodeURIComponent(fields)}` +
          `&pageSize=${remaining}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.warn(`Failed to list folder "${folder.name}": ${res.status}`);
          continue;
        }

        const data = await res.json();
        const files = (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          sizeBytes: f.size ? Number(f.size) : undefined,
        }));

        allFiles.push(...files.slice(0, remaining));
      } catch (err) {
        console.warn(`Error listing folder "${folder.name}":`, err);
      }
    }

    return allFiles;
  }, []);

  // Open Picker — filtered to supported types
  const openPicker = useCallback(async (switchAccount = false) => {
    setError(null);
    savedScrollY.current = window.scrollY;
    try {
      const token = await getAuthToken(switchAccount);
      const gPicker = (window as any).google.picker;
      const origin = window.location.protocol + "//" + window.location.host;
      const appId = GOOGLE_CLIENT_ID.split("-")[0] || "";

      const docsView = new gPicker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMimeTypes(PICKER_MIME_TYPES.join(","));

      const builder = new gPicker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setOrigin(origin)
        .setTitle("Select files or folders to import")
        .enableFeature(gPicker.Feature.MULTISELECT_ENABLED)
        .setSize(800, 550)
        .setCallback(async (data: any) => {
          if (data.action === gPicker.Action.PICKED) {
            // Separate folders from files
            const folders = data.docs.filter(
              (d: any) => d.mimeType === "application/vnd.google-apps.folder"
            );

            // Filter individually picked files — only keep ingestible types
            const pickedFiles = data.docs.filter(
              (d: any) => d.mimeType !== "application/vnd.google-apps.folder"
            );
            const validFiles: { id: string; name: string; mimeType: string; sizeBytes?: number }[] = [];
            let skippedCount = 0;
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
            const oversizedFiles: string[] = [];

            for (const d of pickedFiles) {
              if (!isIngestibleMime(d.mimeType)) {
                skippedCount++;
                continue;
              }
              // Google Docs report sizeBytes=0 — they're exported to PDF, so skip size check
              const isWorkspaceFile = (d.mimeType as string).startsWith("application/vnd.google-apps.");
              const fileSize = d.sizeBytes ? Number(d.sizeBytes) : 0;
              if (!isWorkspaceFile && fileSize > MAX_FILE_SIZE) {
                oversizedFiles.push(`${d.name} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);
                continue;
              }
              validFiles.push({ id: d.id, name: d.name, mimeType: d.mimeType, sizeBytes: fileSize || undefined });
            }

            // Resolve folders → list their files via Drive API (already filtered server-side)
            if (folders.length > 0) {
              const folderFiles = await listFilesInFolders(folders, token);
              // Client-side safety filter — omit anything the backend can't process
              for (const f of folderFiles) {
                if (!isIngestibleMime(f.mimeType)) {
                  skippedCount++;
                  continue;
                }
                const isWorkspace = (f.mimeType as string).startsWith("application/vnd.google-apps.");
                const fSize = f.sizeBytes ? Number(f.sizeBytes) : 0;
                if (!isWorkspace && fSize > MAX_FILE_SIZE) {
                  oversizedFiles.push(`${f.name} (${(fSize / (1024 * 1024)).toFixed(2)} MB)`);
                  continue;
                }
                validFiles.push({ ...f, sizeBytes: fSize || undefined });
              }
            }

            // Show feedback about oversized files
            if (oversizedFiles.length > 0) {
              setError(
                `${oversizedFiles.length} file${oversizedFiles.length > 1 ? "s exceed" : " exceeds"} the 5 MB size limit: ${oversizedFiles.join(", ")}. Please use smaller files.`
              );
            }

            // Show feedback about skipped files
            if (skippedCount > 0) {
              setError(
                `${skippedCount} unsupported file${skippedCount > 1 ? "s were" : " was"} skipped (only PDF, TXT, DOCX, and Google Docs are supported).`
              );
            }

            // Skip exact duplicates within the same batch (same file ID)
            const seenInBatch = new Set<string>();
            const newFiles = validFiles.filter((f) => {
              const key = f.id || `${f.name.toLowerCase()}::${f.sizeBytes || 0}`;
              if (seenInBatch.has(key)) return false;
              seenInBatch.add(key);
              return true;
            });
            if (newFiles.length > 0) {
              await handlePickedFiles(newFiles, token);
            } else if (folders.length > 0 && skippedCount > 0) {
              setError("No supported files found in the selected folder(s). Only PDF, TXT, DOCX, and Google Docs are supported.");
            } else if (folders.length > 0) {
              setError("No supported files found in the selected folder(s).");
            }
          }
        });
      if (appId) builder.setAppId(appId);

      // ── Inject centering CSS BEFORE the picker renders ──
      // This prevents the brief position:absolute layout shift that causes page scroll.
      centerPickerDialog();

      builder.build().setVisible(true);

      // Restore scroll position immediately — the picker is fixed-positioned now
      requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));
    } catch (err) {
      setError((err as Error).message || "Failed to open Google Drive");
    }
  }, [getAuthToken, handlePickedFiles]);

  /** Extract folder ID from a Google Drive folder URL */
  function parseFolderId(url: string): string | null {
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /** Import all files from a Google Drive folder URL */
  const handleFolderUrlImport = useCallback(async () => {
    const folderId = parseFolderId(folderUrl.trim());
    if (!folderId) {
      setFolderUrlError('Invalid Google Drive folder URL. Expected: https://drive.google.com/drive/folders/...');
      return;
    }
    setFolderUrlError('');
    setFolderUrlImporting(true);
    try {
      const token = await getAuthToken();
      const files = await listFilesInFolders([{ id: folderId, name: 'Shared Folder' }], token);

      if (files.length === 0) {
        setFolderUrlError('No supported files found in this folder (PDF, TXT, DOCX, Google Docs only).');
        setFolderUrlImporting(false);
        return;
      }

      const MAX_SIZE = 5 * 1024 * 1024;
      const validFiles: typeof files = [];
      const oversized: string[] = [];
      for (const f of files) {
        const isWorkspace = (f.mimeType as string).startsWith('application/vnd.google-apps.');
        const fSize = f.sizeBytes ? Number(f.sizeBytes) : 0;
        if (!isWorkspace && fSize > MAX_SIZE) {
          oversized.push(`${f.name} (${(fSize / (1024 * 1024)).toFixed(2)} MB)`);
          continue;
        }
        validFiles.push(f);
      }

      if (oversized.length > 0) {
        setError(`${oversized.length} file${oversized.length > 1 ? 's exceed' : ' exceeds'} the 5 MB limit: ${oversized.join(', ')}`);
      }

      // Skip exact duplicates within the same batch (same file ID)
      const seenInBatch = new Set<string>();
      const newFiles = validFiles.filter((f) => {
        const key = f.id || `${f.name.toLowerCase()}::${f.sizeBytes || 0}`;
        if (seenInBatch.has(key)) return false;
        seenInBatch.add(key);
        return true;
      });

      if (newFiles.length > 0) {
        await handlePickedFiles(newFiles, token);
        setFolderUrl('');
      } else {
        setFolderUrlError('All files in this folder exceed the 5 MB size limit.');
      }
    } catch {
      setFolderUrlError('Failed to access folder. Make sure it is shared and you are signed in.');
    } finally {
      setFolderUrlImporting(false);
    }
  }, [folderUrl, getAuthToken, listFilesInFolders, handlePickedFiles]);

  const statusText = (s: string) => {
    if (s === "waiting") return "Queued";
    if (s === "importing") return "Importing from Drive...";
    return "";
  };

  const hasResults = importedFiles.length > 0;
  const allDone = hasResults && importedFiles.every((f) => f.status === "done" || f.status === "error");

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <Icon icon="lucide:alert-triangle" width={15} height={15} className="shrink-0" />
            {error}
          </p>
        </div>
      )}

      {/* Open Drive button */}
      <button
        onClick={pickerReady && !importing ? () => openPicker(false) : undefined}
        disabled={!pickerReady || importing}
        className={`w-full flex items-center gap-4 p-5 rounded-xl border transition-all ${!pickerReady || importing
          ? "border-card-border opacity-50 cursor-not-allowed"
          : "border-card-border hover:border-blue-400/40 hover:bg-blue-500/[0.04] cursor-pointer"
          }`}
      >
        <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
          {!pickerReady ? (
            <Icon icon="lucide:loader-2" width={22} height={22} className="text-blue-400 animate-spin" />
          ) : (
            <svg width="22" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.05c0 1.6.4 3.2 1.2 4.6z" fill="#0066da" />
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.6h27.5z" fill="#00ac47" />
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.6H59.85l5.85 10.25z" fill="#ea4335" />
              <path d="M43.65 25 57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
              <path d="m59.8 53H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.3c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.6-.4-3.2-1.2-4.6z" fill="#ffba00" />
            </svg>
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-foreground font-medium text-sm">
            {!pickerReady ? "Loading Google Drive..." : importing ? "Importing files..." : "Browse Google Drive"}
          </p>
          <p className="text-xs text-muted mt-0.5">
            Select files or folders to import
          </p>
        </div>
      </button>

      {/* ── Import from folder URL ── */}
      {pickerReady && !importing && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-card-border" />
            <span className="text-[10px] text-muted uppercase tracking-wider">or paste a folder link</span>
            <div className="flex-1 h-px bg-card-border" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="flex-1 bg-input border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-blue-400/50 min-w-0"
            />
            <button
              onClick={handleFolderUrlImport}
              disabled={!folderUrl.trim() || folderUrlImporting}
              className="px-4 py-2.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-medium hover:bg-blue-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            >
              {folderUrlImporting ? (
                <><Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" /> Importing…</>
              ) : (
                <><Icon icon="lucide:folder-input" width={14} height={14} /> Import</>
              )}
            </button>
          </div>
          {folderUrlError && (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <Icon icon="lucide:alert-circle" width={12} height={12} />
              {folderUrlError}
            </p>
          )}
        </div>
      )}

      {/* Switch account — only when a Google account is already connected */}
      {pickerReady && !importing && googleConn?.email && (
        <button
          onClick={() => openPicker(true)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-blue-400 transition-colors ml-1"
        >
          <Icon icon="lucide:repeat-2" width={13} height={13} />
          Use a different Google account
        </button>
      )}

      {/* Import progress list */}
      {hasResults && (
        <div>
          <p className="text-xs text-muted mb-2 flex items-center gap-1.5">
            <Icon icon="lucide:folder-input" width={12} height={12} />
            {importing
              ? `Importing ${importedFiles.filter((f) => f.status === "done").length} of ${importedFiles.length}…`
              : `${importedFiles.filter((f) => f.status === "done").length} of ${importedFiles.length} imported`}
          </p>
          <div className="bg-white/[0.02] border border-card-border rounded-xl overflow-hidden">
            {importedFiles.map((f, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-card-border" : ""}`}>
                <div className="w-5 flex items-center justify-center shrink-0">
                  {(f.status === "waiting" || f.status === "importing") && (
                    <Icon icon="lucide:loader-2" width={14} height={14} className="text-blue-400 animate-spin" />
                  )}
                  {f.status === "done" && <Icon icon="lucide:check-circle-2" width={14} height={14} className="text-emerald-400" />}
                  {f.status === "error" && <Icon icon="lucide:x-circle" width={14} height={14} className="text-red-400" />}
                </div>
                <span className="flex-1 min-w-0 text-sm text-foreground truncate">{f.name}</span>
                <span className="text-[11px] text-muted shrink-0">
                  {f.status === "waiting" && "Queued"}
                  {f.status === "importing" && "Importing…"}
                  {f.status === "done" && "Done"}
                  {f.status === "error" && (
                    <span className="text-red-400" title={f.error}>{f.error ? f.error.slice(0, 30) : "Failed"}</span>
                  )}
                </span>
                {f.sizeBytes != null && f.sizeBytes > 0 && (
                  <span className="text-[11px] text-muted/40 shrink-0 w-14 text-right">
                    {f.sizeBytes < 1024 ? `${f.sizeBytes} B` : f.sizeBytes < 1024 * 1024 ? `${(f.sizeBytes / 1024).toFixed(0)} KB` : `${(f.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allDone && (
        <div className="flex justify-end">
          <button onClick={() => setImportedFiles([])} className="text-xs text-muted hover:text-white transition-colors">Clear list</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: kbId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [kb, setKB] = useState<KBDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteBlockReason, setDeleteBlockReason] = useState("");
  const [activeSource, setActiveSource] = useState<UploadSource>(null);

  // Edit name state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Trigger to clear Drive import progress when items are deleted
  const [clearImportsTrigger, setClearImportsTrigger] = useState(0);

  const fetchKB = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`);
      if (res.ok) {
        const data = await res.json();
        setKB(data);
        setEditName(data.name);
      } else if (res.status === 404) {
        router.push("/knowledge");
      }
    } catch (err) {
      console.error("Failed to fetch KB:", err);
    } finally {
      setLoading(false);
    }
  }, [kbId, router]);

  useEffect(() => {
    fetchKB();
  }, [fetchKB]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setToast({ message: 'Inform deleted successfully!', type: 'success' });
        setTimeout(() => router.push("/knowledge"), 1500);
      } else {
        setToast({ message: 'Failed to delete inform. Please try again.', type: 'error' });
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setToast({ message: 'Failed to delete inform. Please try again.', type: 'error' });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleSaveName() {
    if (!editName.trim() || editName.trim().length < 3 || editName.length > 100 || editName === kb?.name) { setEditing(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge/${kbId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setKB((prev) => prev ? { ...prev, name: data.name } : null);
        setEditing(false);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  function toggleSource(source: UploadSource) {
    setActiveSource((prev) => (prev === source ? null : source));
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <Icon icon="lucide:loader-2" width={40} height={40} className="mx-auto mb-3 text-muted animate-spin" />
        <p className="text-muted">Loading inform...</p>
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="text-center py-16">
        <Icon icon="lucide:alert-circle" width={40} height={40} className="mx-auto mb-3 text-red-400" />
        <p className="text-muted mb-4">Inform not found</p>
        <Link href="/knowledge" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-semibold px-5 py-2.5 rounded-full transition-colors">
          <Icon icon="lucide:arrow-left" width={16} height={16} />
          Back to Inform
        </Link>
      </div>
    );
  }

  const ingestedCount = kb.items.filter(i => i.status === "ingested").length;
  const pendingCount = kb.items.filter(i => i.status === "pending" || i.status === "processing").length;
  const failedCount = kb.items.filter(i => i.status === "failed").length;

  const UPLOAD_SOURCES: { key: UploadSource; icon: string; label: string; desc: string; color: string; activeColor: string }[] = [
    { key: "files", icon: "lucide:upload-cloud", label: "Upload Files", desc: "PDF, TXT, DOCX", color: "text-accent", activeColor: "bg-accent/10 border-accent/50" },
    { key: "gdrive", icon: "lucide:hard-drive", label: "Google Drive", desc: "Import from Drive", color: "text-blue-400", activeColor: "bg-blue-500/10 border-blue-500/50" },
  ];

  return (
    <div className="max-w-full overflow-hidden">
      {/* Toast notification */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white shadow-lg animate-[fadeIn_0.2s_ease]"
          style={{ background: toast.type === 'success' ? '#0a2e1a' : '#2e0a0a', border: toast.type === 'success' ? '1px solid rgba(0,235,117,0.5)' : '1px solid rgba(255,58,58,0.5)', color: toast.type === 'success' ? '#00EB75' : '#FF3A3A' }}
        >
          <Icon icon={toast.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={18} height={18} />
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <Icon icon="lucide:x" width={14} height={14} />
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-4 min-w-0">
        <Link href="/knowledge" className="hover:text-accent transition-colors shrink-0">Inform</Link>
        <Icon icon="lucide:chevron-right" width={14} height={14} className="shrink-0" />
        <span className="text-foreground truncate">{kb.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-8">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="mb-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value.slice(0, 100))}
                  maxLength={100}
                  style={{ fontFamily: 'var(--font-display)' }}
                  className={`text-2xl sm:text-3xl font-bold text-white bg-transparent border-b-2 ${editName.trim().length > 0 && editName.trim().length < 3 ? 'border-red-400' : 'border-accent'} focus:outline-none flex-1 min-w-0`} autoFocus />
                <button onClick={handleSaveName} disabled={saving || editName.trim().length < 3 || editName.length > 100} className="p-2 bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? <Icon icon="lucide:loader-2" width={18} height={18} className="text-white animate-spin" /> : <Icon icon="lucide:check" width={18} height={18} className="text-white" />}
                </button>
                <button onClick={() => { setEditing(false); setEditName(kb.name); }} className="p-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors">
                  <Icon icon="lucide:x" width={18} height={18} className="text-muted" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 ml-0.5">
                {editName.trim().length > 0 && editName.trim().length < 3 ? (
                  <span className="text-xs text-red-400">At least 3 characters required</span>
                ) : !editName.trim() ? (
                  <span className="text-xs text-red-400">Name is required</span>
                ) : <span />}
                <span className={`text-xs tabular-nums ${editName.length >= 100 ? 'text-red-400' : 'text-muted'}`}>{editName.length}/100</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{kb.name}</h1>
              <button onClick={() => setEditing(true)} className="p-1.5 text-muted hover:text-accent transition-colors">
                <Icon icon="lucide:pencil" width={16} height={16} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 sm:gap-4 text-muted flex-wrap text-sm">
            <span className="flex items-center gap-1"><Icon icon="lucide:files" width={14} height={14} />{kb.items.length} item{kb.items.length !== 1 ? "s" : ""}</span>
            {ingestedCount > 0 && <span className="flex items-center gap-1 text-green-500"><Icon icon="lucide:check-circle" width={14} height={14} />{ingestedCount} ingested</span>}
            {pendingCount > 0 && <span className="flex items-center gap-1 text-yellow-500"><Icon icon="lucide:clock" width={14} height={14} />{pendingCount} pending</span>}
            {failedCount > 0 && <span className="flex items-center gap-1 text-red-500"><Icon icon="lucide:x-circle" width={14} height={14} />{failedCount} failed</span>}
            <span>Created {new Date(kb.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button onClick={async () => {
          // Check if this knowledge base is connected to any agent
          try {
            const result = await listAgents({ wallet: user?.wallet || '' })
            const linkedAgents = (result.agents || []).filter((a: any) => {
              const kbIds = a.knowledgeBaseIds || a.knowledge_base_ids || []
              return kbIds.includes(kbId)
            })
            if (linkedAgents.length > 0) {
              const names = linkedAgents.map((a: any) => a.name).join(', ')
              setDeleteBlocked(true)
              setDeleteBlockReason(`This inform is currently connected to: ${names}. Please disconnect it from the agent(s) before deleting.`)
              return
            }
          } catch {}
          setDeleteBlocked(false)
          setShowDeleteConfirm(true)
        }} disabled={deleting}
          className="self-start bg-card border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 font-medium px-4 py-2.5 rounded-full transition-colors flex items-center gap-2 text-sm shrink-0">
          {deleting ? <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" /> : <Icon icon="lucide:trash-2" width={16} height={16} />}
          Delete
        </button>
      </div>

      {/* Upload Source Buttons */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {UPLOAD_SOURCES.map((s) => {
            const active = activeSource === s.key;
            return (
              <button key={s.key} onClick={() => toggleSource(s.key)}
                className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 flex-1 ${active ? s.activeColor : "bg-card border-card-border hover:border-white/[0.15]"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-white/[0.1]" : "bg-white/[0.06]"}`}>
                  <Icon icon={s.icon} width={20} height={20} className={active ? s.color : "text-muted"} />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-medium text-sm">{s.label}</p>
                  <p className="text-xs text-muted">{s.desc}</p>
                </div>
                <Icon icon={active ? "lucide:chevron-up" : "lucide:chevron-down"} width={16} height={16} className="text-muted ml-auto shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Upload Panel */}
      {activeSource && (
        <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm sm:text-base">
              {activeSource === "files" && "Upload Files"}
              {activeSource === "gdrive" && "Import from Google Drive"}
            </h3>
            <button onClick={() => setActiveSource(null)} className="text-muted hover:text-white transition-colors">
              <Icon icon="lucide:x" width={18} height={18} />
            </button>
          </div>
          {activeSource === "files" && <FileDropzone kbId={kbId} onUploadComplete={fetchKB} clearTrigger={clearImportsTrigger} existingItemNames={kb.items.map((i) => i.name)} />}
          {activeSource === "gdrive" && <GoogleDrivePicker kbId={kbId} onUploadComplete={fetchKB} clearTrigger={clearImportsTrigger} existingItemNames={kb.items.map((i) => i.name)} />}
        </div>
      )}

      {/* Vector Storage Info */}
      <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
              <Icon icon="lucide:database" width={20} height={20} className="text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium text-sm">Pinecone Namespace</p>
              <p className="text-xs text-muted font-mono truncate">{kb.namespace || kb.id}</p>
            </div>
          </div>
          <div className="sm:text-right ml-[52px] sm:ml-0">
            <p className="text-white font-medium text-sm">{ingestedCount} vectors</p>
            <p className="text-xs text-muted">stored in Pinecone</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div> 
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <Icon icon="lucide:files" width={20} height={20} className="text-muted" />
          Items
          {kb.items.length > 0 && <span className="text-sm font-normal text-muted">({kb.items.length})</span>}
        </h3>
        <KBItemsList kbId={kbId} items={kb.items} onItemRemoved={() => { fetchKB(); setClearImportsTrigger((n) => n + 1); }} />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        title="Delete Inform?"
        message="Are you sure you want to delete this inform? This will remove all documents and vectors permanently."
        confirmLabel="Delete"
        danger={true}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setShowDeleteConfirm(false)}
      />

      {/* Delete Blocked Warning */}
      {deleteBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteBlocked(false)} />
          <div className="relative bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Icon icon="lucide:alert-circle" width={24} height={24} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cannot Delete</h3>
                <p className="text-sm text-muted">Deletion is restricted</p>
              </div>
            </div>
            <p className="text-foreground text-sm mb-5">{deleteBlockReason}</p>
            <button onClick={() => setDeleteBlocked(false)}
              className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-card-border text-foreground font-medium px-4 py-2.5 rounded-xl transition-colors">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}