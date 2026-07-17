"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";
import { listAgents } from "@/lib/agents-api";
import ConfirmationDialog from "@/components/ConfirmationDialog";

interface Prompt {
  id: string;
  name: string;
  content: string;
  tone?: string;
  persona?: string;
  audience?: string;
  format?: string;
  goal?: string;
  connectedKBId?: string;
  connectedKBName?: string;
  category?: string;
  tier: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
}

const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

const GOAL_MIN = 50;
const GOAL_MAX = 500;

export default function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: promptId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [deleteBlockReason, setDeleteBlockReason] = useState("");
  const originalContentRef = useRef("");

  // Editor fields
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [content, setContent] = useState("");
  const [goal, setGoal] = useState("");
  const [connectedKBId, setConnectedKBId] = useState("");
  const [connectedKBName, setConnectedKBName] = useState("");

  // KB list
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);

  // Panel state
  const [activePanel, setActivePanel] = useState<"guidance" | null>(null);

  // AI Generate state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [validating, setValidating] = useState(false);

  async function validateGoalClarity(goalText: string, agentName: string): Promise<{ valid: boolean; message: string }> {
    try {
      const res = await fetch(`${AGENT_API_URL}/api/prompts/validate-goal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalText, name: agentName }),
      });
      if (res.ok) return await res.json();
      return { valid: true, message: '' };
    } catch { return { valid: true, message: '' }; }
  }

  // Auto-save guidance fields — refs to track load state and debounce timer
  const guidanceLoadedRef = useRef(false);
  const guidanceSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingGuidance, setSavingGuidance] = useState(false);

  const fetchPrompt = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_API_URL}/api/prompts/${promptId}`);
      if (res.ok) {
        const data: Prompt = await res.json();
        setPrompt(data);
        setName(data.name);
        const c = data.content || "";
        setContent(c);
        if (!c) setIsEditing(true);
        setGoal(data.goal || "");
        setConnectedKBId(data.connectedKBId || "");
        setConnectedKBName(data.connectedKBName || "");
      } else if (res.status === 404) {
        router.push("/prompts");
      }
    } catch (err) {
      console.error("Failed to fetch prompt:", err);
    } finally {
      setLoading(false);
      // Mark guidance as loaded after a tick so initial state doesn't trigger auto-save
      setTimeout(() => { guidanceLoadedRef.current = true; }, 100);
    }
  }, [promptId, router]);

  const fetchKBs = useCallback(async () => {
    if (!user?.wallet) return;
    try {
      const res = await fetch(`${AGENT_API_URL}/api/knowledge?wallet=${user.wallet}`);
      if (res.ok) {
        const data = await res.json();
        setKbs(data.knowledgeBases || []);
      }
    } catch (err) {
      console.error("Failed to fetch KBs:", err);
    }
  }, [user?.wallet]);

  useEffect(() => {
    fetchPrompt();
    fetchKBs();
  }, [fetchPrompt, fetchKBs]);

  // ── Auto-save guidance fields when they change ──
  // Without this, guidance changes are lost when navigating away because
  // the Save button only appears when editing content.
  useEffect(() => {
    if (!guidanceLoadedRef.current || !promptId) return;

    // Clear any pending save
    if (guidanceSaveTimerRef.current) clearTimeout(guidanceSaveTimerRef.current);

    guidanceSaveTimerRef.current = setTimeout(async () => {
      setSavingGuidance(true);
      try {
        const res = await fetch(`${AGENT_API_URL}/api/prompts/${promptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: goal || null,
            connectedKBId: connectedKBId || null,
            connectedKBName: connectedKBName || null,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setPrompt(updated);
        }
      } catch (err) {
        console.error("Auto-save guidance failed:", err);
      } finally {
        setSavingGuidance(false);
      }
    }, 800); // debounce 800ms

    return () => {
      if (guidanceSaveTimerRef.current) clearTimeout(guidanceSaveTimerRef.current);
    };
  }, [goal, connectedKBId, connectedKBName, promptId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${AGENT_API_URL}/api/prompts/${promptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          goal: goal || null,
          connectedKBId: connectedKBId || null,
          connectedKBName: connectedKBName || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPrompt(updated);
        setIsEditing(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    originalContentRef.current = content;
    setIsEditing(true);
  }

  function handleCancel() {
    setContent(originalContentRef.current);
    setIsEditing(false);
  }

  const [nameError, setNameError] = useState("");

  async function handleSaveName() {
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (name.trim().length < 3) {
      setNameError("Name must be at least 3 characters");
      return;
    }
    if (name.trim().length > 100) {
      setNameError("Name must be 100 characters or less");
      return;
    }
    if (name.trim() === prompt?.name) {
      setEditingName(false);
      setNameError("");
      return;
    }
    setNameError("");
    try {
      const res = await fetch(`${AGENT_API_URL}/api/prompts/${promptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPrompt(updated);
        setName(updated.name);
      }
    } catch (err) {
      console.error("Name save failed:", err);
    } finally {
      setEditingName(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`${AGENT_API_URL}/api/prompts/${promptId}`, { method: "DELETE" });
      if (res.ok || res.status === 204) router.push("/prompts");
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleKBSelect(id: string) {
    setConnectedKBId(id);
    const kb = kbs.find((k) => k.id === id);
    setConnectedKBName(kb?.name || "");
  }

  async function handleGenerateFromGuidance() {
    setGenerateError("");

    if (goal.trim().length < GOAL_MIN) {
      setGenerateError(`Please enter a goal with at least ${GOAL_MIN} characters.`);
      return;
    }

    setValidating(true);
    const check = await validateGoalClarity(goal.trim(), name);
    setValidating(false);
    if (!check.valid) { setGenerateError(check.message); return; }

    setGenerating(true);

    try {
      const kbContext = connectedKBName ? `\n\nThis agent has access to a knowledge base called "${connectedKBName}". The system prompt should reference this knowledge source and instruct the agent to use it when answering questions.` : '';

      const instructions = `You are generating a system prompt (behavioral instructions) for an AI agent.

The stance is named "${name}" but do NOT use this name as the agent's identity. Instead, derive the agent's role and identity from the goal below.

The user's goal for this agent: ${goal.trim()}${kbContext}

IMPORTANT RULES:
- If the goal says "generate a system prompt about X" or "create a prompt for X", do NOT create a meta prompt-generator. Create a system prompt that makes the agent an expert on X or a worker that performs X tasks.
- Do NOT start with "You are [stance name]". Start with "You are a [role derived from the goal]..."
- If the goal mentions "worker" or "agent", focus on actionable tasks the agent should PERFORM, not just knowledge it should have.
- Do NOT include meta-instructions like "do not generate prompts" or "do not create stories" in the output.

Generate a clear, actionable system prompt that:
- Defines the agent's role, purpose, and scope derived from the goal
- Specifies how the agent should behave, respond, and interact with users
- Includes guidelines on tone, boundaries, and what the agent should and should not do
- Is written as direct instructions to the AI (e.g. "You are a...", "Your role is...", "You should...")
- Is 3-5 paragraphs long

Do NOT generate creative prose, stories, or character descriptions. Generate only a functional system prompt.`;

      const res = await fetch(`${AGENT_API_URL}/api/prompts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, knowledgeBaseName: connectedKBName || undefined, instructions }),
      });

      const data = await res.json();

      if (res.ok && data.content) {
        setContent(data.content);
        setIsEditing(true);
      } else {
        setGenerateError(data.detail || data.error || "Generation failed. You can write the stance manually.");
      }
    } catch {
      setGenerateError("Could not connect to generation service.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <Icon icon="lucide:loader-2" width={40} height={40} className="mx-auto mb-3 text-muted animate-spin" />
        <p className="text-muted">Loading stance...</p>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="text-center py-16">
        <Icon icon="lucide:alert-circle" width={40} height={40} className="mx-auto mb-3 text-red-400" />
        <p className="text-muted mb-4">Stance not found</p>
        <Link href="/prompts" className="text-accent hover:underline">
          Back to Stances
        </Link>
      </div>
    );
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return (
    <div className="max-w-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted mb-4 min-w-0">
        <Link href="/prompts" className="hover:text-accent transition-colors shrink-0">
          Instruct
        </Link>
        <Icon icon="lucide:chevron-right" width={14} height={14} className="shrink-0" />
        <span className="text-foreground truncate">{prompt.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="mb-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      if (e.target.value.length <= 100) {
                        setName(e.target.value)
                        setNameError("")
                      }
                    }}
                    maxLength={100}
                    className={`w-full text-2xl sm:text-3xl font-bold text-white bg-transparent border-b-2 focus:outline-none ${nameError ? 'border-red-500' : 'border-accent'}`}
                    style={{ fontFamily: '"Goudy Heavyface", "Goudy Old Style", Georgia, serif', fontWeight: 400, lineHeight: 1.05 }}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  />
                  <span className={`text-xs tabular-nums mt-1 block ${name.length >= 100 ? 'text-red-400' : 'text-muted'}`}>{name.length}/100</span>
                </div>
                <button onClick={handleSaveName} className="p-2 bg-accent hover:bg-accent-dark rounded-lg transition-colors">
                  <Icon icon="lucide:check" width={18} height={18} className="text-white" />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setName(prompt.name);
                    setNameError("");
                  }}
                  className="p-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
                >
                  <Icon icon="lucide:x" width={18} height={18} className="text-muted" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1">
                {nameError ? (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <Icon icon="lucide:alert-circle" width={12} height={12} />
                    {nameError}
                  </p>
                ) : <span />}
                <p className={`text-xs tabular-nums ${name.length >= 100 ? 'text-red-400' : 'text-muted'}`}>
                  {name.length}/100
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{prompt.name}</h1>
              <button onClick={() => setEditingName(true)} className="p-1.5 text-muted hover:text-accent transition-colors">
                <Icon icon="lucide:pencil" width={16} height={16} />
              </button>
            </div>
          )}
          <p className="text-muted text-sm">
            Created {new Date(prompt.createdAt).toLocaleDateString()} · Updated {new Date(prompt.updatedAt).toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={async () => {
            // Check if this stance is connected to any agent
            try {
              const result = await listAgents({ wallet: user?.wallet || '' })
              const linkedAgents = (result.agents || []).filter((a: any) => {
                const pId = a.promptId || a.prompt_id
                return pId === promptId
              })
              if (linkedAgents.length > 0) {
                const names = linkedAgents.map((a: any) => a.name).join(', ')
                setDeleteBlocked(true)
                setDeleteBlockReason(`This stance is currently connected to: ${names}. Please disconnect it from the agent(s) before deleting.`)
                return
              }
            } catch { }
            setDeleteBlocked(false)
            setShowDeleteConfirm(true)
          }}
          disabled={deleting}
          className="self-start bg-card border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 font-medium px-4 py-2.5 rounded-full transition-colors flex items-center gap-2 text-sm shrink-0"
        >
          {deleting ? (
            <Icon icon="lucide:loader-2" width={16} height={16} className="animate-spin" />
          ) : (
            <Icon icon="lucide:trash-2" width={16} height={16} />
          )}
          Delete
        </button>
      </div>

      {/* Saved Flash */}
      {savedFlash && (
        <div className="fixed top-6 right-6 bg-green-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg z-50 animate-pulse">
          <Icon icon="lucide:check-circle" width={18} height={18} />
          Saved!
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Editor */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold">System Stance</span>
                {!isEditing && content && (
                  <span className="text-xs text-muted">
                    {wordCount} words · {charCount} chars
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm text-muted hover:text-white transition-colors rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-accent hover:bg-accent-dark text-white font-medium px-4 py-1.5 rounded transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving && <Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" />}
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEditing}
                    className="text-accent hover:text-accent-dark transition-colors text-sm flex items-center gap-1"
                  >
                    <Icon icon="lucide:pencil" width={14} height={14} />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Editor Body */}
            <div className="p-4">
              {isEditing ? (
                <>
                  <textarea
                    value={content}
                    onChange={(e) => {
                      if (e.target.value.length <= 50000) {
                        setContent(e.target.value)
                      }
                    }}
                    maxLength={50000}
                    placeholder="Write your system stance here...

Example:
You are a helpful assistant for a fantasy RPG game. Your role is to guide players through quests, provide hints when they're stuck, and maintain an immersive fantasy atmosphere.

Key behaviors:
- Stay in character as a wise guide
- Be encouraging but don't give away solutions too easily
- Reference the game's lore when appropriate"
                    className="w-full bg-transparent text-foreground placeholder:text-muted focus:outline-none resize-none min-h-[400px] font-mono text-sm leading-relaxed"
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-card-border">
                    <span className="text-xs text-muted">
                      {wordCount} words
                    </span>
                    <span className={`text-xs tabular-nums ${charCount >= 50000 ? 'text-red-400' : charCount >= 40000 ? 'text-amber-400' : 'text-muted'}`}>
                      {charCount}/50000
                    </span>
                  </div>
                </>
              ) : content ? (
                <pre className="whitespace-pre-wrap text-foreground font-mono text-sm leading-relaxed">
                  {content}
                </pre>
              ) : (
                <div className="text-center py-12">
                  <Icon icon="lucide:file-text" width={40} height={40} className="mx-auto mb-3 text-muted" />
                  <p className="text-muted mb-4">No content yet</p>
                  <button
                    onClick={startEditing}
                    className="bg-accent hover:bg-accent-dark text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Start Writing
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="space-y-4">
          {/* Guidance Panel */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <button
              onClick={() => setActivePanel(activePanel === "guidance" ? null : "guidance")}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-white font-semibold flex items-center gap-2">
                <Icon icon="lucide:sliders-horizontal" width={18} height={18} className="text-accent" />
                Guidance
                {savingGuidance && (
                  <span className="text-[10px] text-muted font-normal flex items-center gap-1">
                    <Icon icon="lucide:loader-2" width={10} height={10} className="animate-spin" />
                    Saving…
                  </span>
                )}
              </span>
              <Icon
                icon={activePanel === "guidance" ? "lucide:chevron-up" : "lucide:chevron-down"}
                width={16}
                height={16}
                className="text-muted"
              />
            </button>

            {/* Summary chip when collapsed */}
            {activePanel !== "guidance" && goal && (
              <div className="px-4 pb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent/80 line-clamp-1">{goal.length > 60 ? goal.slice(0, 60) + "…" : goal}</span>
              </div>
            )}

            {activePanel === "guidance" && (
              <div className="px-4 pb-4 space-y-4 border-t border-card-border pt-4">
                <div>
                  <label className="block text-xs text-muted mb-1.5">
                    Goal{" "}
                    <span className="text-muted font-normal">(min {GOAL_MIN} chars)</span>
                  </label>
                  <textarea
                    value={goal}
                    onChange={(e) => { if (e.target.value.length <= GOAL_MAX) { setGoal(e.target.value); setGenerateError('') } }}
                    placeholder="What should this stance achieve? Describe the purpose and desired behavior."
                    rows={3}
                    maxLength={GOAL_MAX}
                    className={`w-full bg-input border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none ${goal.trim().length > 0 && goal.trim().length < GOAL_MIN ? 'border-red-400/50' : 'border-card-border'}`}
                  />
                  <div className="flex justify-between mt-1">
                    <span>
                      {goal.trim().length > 0 && goal.trim().length < GOAL_MIN && (
                        <span className="text-xs text-red-400">At least {GOAL_MIN} characters required</span>
                      )}
                    </span>
                    <span className={`text-xs tabular-nums ${goal.length >= GOAL_MAX ? 'text-red-400' : 'text-muted'}`}>{goal.length}/{GOAL_MAX}</span>
                  </div>
                </div>

                {/* Generate with AI */}
                <div className="pt-2 border-t border-card-border">
                  {generateError && (
                    <div className="mb-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-amber-400 text-xs">{generateError}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerateFromGuidance}
                    disabled={generating || validating || goal.trim().length < GOAL_MIN}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {validating ? (
                      <><Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" /> Checking goal…</>
                    ) : generating ? (
                      <><Icon icon="lucide:loader-2" width={14} height={14} className="animate-spin" /> Generating…</>
                    ) : (
                      <><Icon icon="lucide:sparkles" width={14} height={14} /> Generate with AI</>
                    )}
                  </button>
                  <p className="text-[10px] text-muted mt-1.5 text-center">
                    Generates a system prompt based on your goal
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Inform */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
              <Icon icon="lucide:brain" width={18} height={18} className="text-accent" />
              Inform
            </h3>
            <p className="text-xs text-muted mb-3">
              Connect an inform to give context when using this stance.
            </p>
            <select
              value={connectedKBId}
              onChange={(e) => handleKBSelect(e.target.value)}
              className="w-full border border-card-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-accent/50"
              style={{ backgroundColor: '#0A0D33', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              <option value="" style={{ backgroundColor: '#0A0D33', color: '#fff' }}>— No inform —</option>
              {kbs.map((kb) => (
                <option key={kb.id} value={kb.id} style={{ backgroundColor: '#0A0D33', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kb.name}</option>
              ))}
            </select>
            {connectedKBId && (
              <p className="text-xs text-accent mt-2 flex items-center gap-1">
                <Icon icon="lucide:check-circle" width={12} height={12} />
                Connected: {connectedKBName}
              </p>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3">Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Status</span>
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  {prompt.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">ID</span>
                <span className="text-foreground font-mono text-xs">{prompt.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        title="Delete Stance?"
        message="Are you sure you want to delete this stance? This cannot be undone."
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