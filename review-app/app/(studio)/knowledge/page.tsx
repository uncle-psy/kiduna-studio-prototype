"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";
import { useStudio } from "@/lib/studio-context";

interface KnowledgeBase {
  id: string;
  name: string;
  namespace: string;
  createdAt: string;
  itemCount: number;
}

const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

const PAGE_SIZE = 9;

export default function KnowledgePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentPlatform } = useStudio();
  
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);

  // Onboarding: auto-open create dialog

  useEffect(() => {
    if (false && !showCreate) {
      setShowCreate(true);
    }
  }, [false]);

  const fetchKBs = useCallback(async () => {
    if (!user?.wallet) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({ wallet: user.wallet });
      if (currentPlatform?.id) {
        params.append("platformId", currentPlatform.id);
      }
      
      const res = await fetch(`${AGENT_API_URL}/api/knowledge?${params}`);
      if (res.ok) {
        const data = await res.json();
        setKnowledgeBases(data.knowledgeBases || []);
      }
    } catch (err) {
      console.error("Failed to fetch KBs:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.wallet, currentPlatform?.id]);

  useEffect(() => {
    fetchKBs();
  }, [fetchKBs]);

  const filtered = knowledgeBases;

  return (
    <div className="max-w-full overflow-hidden">
      {/* Onboarding Banner */}
      {false && (
        <>
        {/* Floating step badge (visible above modal) */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-card border border-accent/30 shadow-2xl flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/15 text-accent">Step 2 of {user?.subscription === 'sponsor' ? '5' : '4'}</span>
          <span className="text-sm font-semibold text-white">Create an Inform — give your avatar knowledge to draw from</span>
        </div>
        <div style={{ marginBottom: 20, padding: '16px 20px', display: showCreate ? 'none' : 'block', borderRadius: 14, background: 'rgba(255,41,195,0.06)', border: '1px solid rgba(255,41,195,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FF29C3', background: 'rgba(255,41,195,0.15)', padding: '2px 8px', borderRadius: 6 }}>Step 2 of {user?.subscription === 'sponsor' ? '5' : '4'}</span>
          </div>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '4px 0 2px' }}>Create an Inform for your Big Avatar</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>An Inform is a knowledge base your avatar uses to answer questions. Name it, then you can upload documents or add content later.</p>
        </div>
        </>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="text-[0.66rem] font-bold tracking-[0.16em] uppercase text-[#03CCD9] mb-2">
            Building mode · Step 1
          </div>
          <h1
            className="text-[2.1rem] font-normal text-white leading-none m-0"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Inform
          </h1>
          <p className="text-[0.9rem] text-white/60 mt-1.5">
            Give your ally what it knows — documents, sources, and reference material.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1 bg-accent hover:bg-accent-hover text-[#09073A] font-bold text-[0.92rem] px-6 py-[0.7rem] rounded transition-colors"
        >
          <Icon icon="lucide:plus" width={16} height={16} />
          Create Inform
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <style>{`@keyframes kb-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-card-border rounded-[14px] p-5 flex flex-col gap-2"
              style={{ minHeight: 130, position: 'relative', overflow: 'hidden' }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                animation: 'kb-shimmer 1.4s ease-in-out infinite',
              }} />
              {/* icon placeholder */}
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.06)' }} />
              {/* name placeholder */}
              <div style={{ height: 22, width: '65%', borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginTop: 4 }} />
              {/* footer placeholder */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ height: 12, width: '30%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ height: 12, width: '20%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KB Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((kb) => (
            <button
              key={kb.id}
              onClick={() => router.push(`/knowledge/${kb.id}`)}
              className="bg-card border border-card-border rounded-[14px] p-5 text-left flex flex-col gap-2 transition-all duration-150 hover:border-white/[0.22] hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="w-[42px] h-[42px] rounded-[10px] bg-[#100E59] border border-card-border grid place-items-center text-accent">
                  <Icon icon="lucide:brain" width={20} height={20} />
                </div>
              </div>
              <h3
                className="text-white font-normal text-[1.3rem] leading-[1.05] mt-1 truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {kb.name}
              </h3>
              <div className="flex items-center gap-3 mt-2 pt-3 border-t border-card-border text-[0.72rem] text-white/60">
                <span className="flex items-center gap-1.5 leading-none">
                  <Icon icon="lucide:file-text" width={13} height={13} className="shrink-0" />
                  <span className="leading-none">{kb.itemCount} item{kb.itemCount !== 1 ? "s" : ""}</span>
                </span>
                <span className="ml-auto leading-none">
                  {new Date(kb.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (() => {
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        if (totalPages <= 1) return null;
        const btnBase: React.CSSProperties = {
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          height: 38, padding: '0 20px', borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: 'rgba(255,255,255,0.65)',
          cursor: 'pointer', transition: 'all 0.15s',
          fontSize: 13, fontWeight: 600,
        };
        const disabledBtn: React.CSSProperties = { ...btnBase, opacity: 0.25, cursor: 'not-allowed' };
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 28 }}>
            <button
              style={page === 1 ? disabledBtn : btnBase}
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {page} / {totalPages}
            </span>
            <button
              style={page === totalPages ? disabledBtn : btnBase}
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        );
      })()}

      {/* Empty state */}
      {!loading && knowledgeBases.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:brain" width={32} height={32} className="text-accent" />
          </div>
          <h3
            className="text-[1.3rem] font-normal text-white mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            No inform yet
          </h3>
          <p className="text-white/60 text-[0.9rem] mb-6 max-w-md mx-auto">
            Create inform to store documents, files, and AI-generated
            content for your AI interactions.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 bg-accent hover:bg-accent-hover text-[#09073A] font-bold text-[0.92rem] px-6 py-[0.7rem] rounded transition-colors w-fit"
          >
            + Create Inform
          </button>
        </div>
      )}

      {/* Create modal - Name only */}
      {showCreate && (
        <CreateKBModal
          onClose={() => setShowCreate(false)}
          wallet={user?.wallet || ""}
          platformId={currentPlatform?.id}
          onCreate={async (kb) => {
              setShowCreate(false);
              router.push(`/knowledge/${kb.id}`);
            }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Inform Modal - Name Only
// ─────────────────────────────────────────────────────────────────────────────

interface CreateKBModalProps {
  onClose: () => void;
  onCreate: (kb: { id: string; name: string; namespace: string }) => void;
  wallet: string;
  platformId?: string;
}

function CreateKBModal({ onClose, onCreate, wallet, platformId }: CreateKBModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validation constants
  const NAME_MIN_LENGTH = 3;
  const NAME_MAX_LENGTH = 100;

  // Validation helpers
  const nameLength = name.trim().length;
  const isNameTooShort = nameLength > 0 && nameLength < NAME_MIN_LENGTH;
  const isNameTooLong = nameLength > NAME_MAX_LENGTH;
  const isNameValid = nameLength >= NAME_MIN_LENGTH && nameLength <= NAME_MAX_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    // Validation checks
    if (nameLength < NAME_MIN_LENGTH) {
      setError(`Name must be at least ${NAME_MIN_LENGTH} characters`);
      return;
    }
    if (nameLength > NAME_MAX_LENGTH) {
      setError(`Name must be no more than ${NAME_MAX_LENGTH} characters`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(), 
          wallet,
          platformId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.detail || "Failed to create");
      }

      const kb = await res.json();
      onCreate(kb);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-card-border rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Create Inform
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors cursor-pointer"
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-muted mb-2">
            📘 Inform Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            placeholder="e.g. Product Documentation, Research Papers..."
            className={`w-full bg-input border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none transition-colors ${
              isNameTooShort || isNameTooLong
                ? 'border-red-500/50 focus:border-red-500/70'
                : 'border-card-border focus:border-accent/50'
            }`}
            autoFocus
            disabled={loading}
          />
          
          {/* Validation feedback */}
          <div className="flex justify-between items-center mt-1.5 mb-1">
            <div className="text-xs">
              {isNameTooShort && (
                <span className="text-red-400">
                  ⚠ Min {NAME_MIN_LENGTH} characters required
                </span>
              )}
            </div>
            <span className={`text-xs ${
              isNameTooLong 
                ? 'text-red-400' 
                : isNameTooShort 
                  ? 'text-amber-400' 
                  : 'text-muted'
            }`}>
              {nameLength}/{NAME_MAX_LENGTH}
            </span>
          </div>
          
          <p className="text-xs text-muted mb-5">
            Namespace will be created in the vector database to hold this inform.
          </p>

          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-[0.7rem] rounded-md bg-card border border-card-border text-white font-bold text-[0.92rem] hover:border-white/[0.22] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isNameValid || loading}
              className="bg-accent hover:bg-accent-hover text-[#09073A] font-bold text-[0.92rem] px-6 py-[0.7rem] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <Icon
                  icon="lucide:loader-2"
                  width={16}
                  height={16}
                  className="animate-spin"
                />
              )}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}