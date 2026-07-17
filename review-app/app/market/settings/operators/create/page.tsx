"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Annote,
  Button,
  Card,
  CardSub,
  CardTitle,
  Explainer,
} from "@/components/ui/index";
import { useRouter } from "next/navigation";
import { MOCK_OBJECTIVES, findObjective } from "@/lib/objectives";
import { findProposalType } from "@/lib/proposal-types";
import type {
  OperatorTone,
  OperatorPublishMode,
  OperatorSchedule,
  KnowledgeSource,
} from "@/lib/operators";
import { KnowledgeSources } from "@/components/operators/KnowledgeSources";
import { AdminPageGate } from "@/components/market/AdminOnly";

export default function Page() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [objectiveId, setObjectiveId] = useState(MOCK_OBJECTIVES[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [tone, setTone] = useState<OperatorTone>("evidence-based");
  const [scheduleKind, setScheduleKind] = useState<OperatorSchedule["kind"]>("daily");
  const [scheduleHour, setScheduleHour] = useState(14);
  const [scheduleDow, setScheduleDow] = useState(1);
  const [scheduleEvery, setScheduleEvery] = useState(6);
  const [publishMode, setPublishMode] = useState<OperatorPublishMode>("draft-then-confirm");
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);

  // AI generation state for the system prompt.
  const [showGenerator, setShowGenerator] = useState(false);
  const [genDescription, setGenDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const objective = findObjective(objectiveId);

  const handleGenerate = async () => {
    if (genDescription.trim().length < 10) {
      setGenError("Describe what this Operator should do in at least one sentence.");
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/operators/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: genDescription.trim(),
          objectiveId,
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Generation failed. Try again.");
        return;
      }
      if (typeof data.systemPrompt !== "string") {
        setGenError("Unexpected response from generator.");
        return;
      }
      setSystemPrompt(data.systemPrompt);
      setShowGenerator(false);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setGenerating(false);
    }
  };


  return (
    <AdminPageGate>
    <>
      <div className="pageheader">
        <div>
          <div className="crumbs">
            <Link href="/market/settings/operators">Operators</Link> / New
          </div>
          <div className="pagetitle">New Operator.</div>
          <div className="pagedesc">
            An agent that authors proposals on a schedule. Bound to one
            Objective; can only emit proposal types that Objective allows.
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => router.push("/market/settings/operators")}
        >
          ← Back
        </Button>
      </div>

      <div className="grid-2">
        <div>
          {/* ─── Identity ─── */}
          <Card className="mb-[14px]">
            <CardTitle>1 · Identity</CardTitle>
            <div className="row-2">
              <div className="field">
                <label>Operator name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. growth-operator-v1"
                />
                <div className="hint">
                  A short identifier you&apos;ll see in proposal histories.
                </div>
              </div>
              <div className="field">
                <label>Runs Objective</label>
                <select
                  value={objectiveId}
                  onChange={(e) => setObjectiveId(e.target.value)}
                >
                  {MOCK_OBJECTIVES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.icon} {o.name}
                    </option>
                  ))}
                </select>
                <div className="hint">
                  This Operator can only emit proposal types this Objective
                  allows.
                </div>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this operator does and when it fires (shown on the operator list)."
              />
            </div>

            {objective && (
              <div className="mt-[10px] p-[10px] bg-[rgba(106,166,255,0.06)] border-[1px] border-[rgba(106,166,255,0.25)] rounded-[8px]">
                <div className="font-mono text-[10px] text-at-mint tracking-[0.08em] uppercase mb-[4px]">
                  Inherited proposal types
                </div>
                <div className="flex flex-wrap gap-[6px]">
                  {objective.allowedProposalTypes.map((kind) => {
                    const meta = findProposalType(kind);
                    return (
                      <span
                        key={kind}
                        className="text-[11px] px-[8px] py-[2px] rounded-[4px] bg-[rgba(255,255,255,0.06)] text-subtle"
                      >
                        {meta?.icon} {meta?.name ?? kind}
                      </span>
                    );
                  })}
                </div>
                <div className="text-[11px] text-muted mt-[6px] leading-[1.5]">
                  This Operator can author any of these. To allow more types,
                  edit the {objective.name} Objective.
                </div>
              </div>
            )}
          </Card>

          {/* ─── Behavior ─── */}
          <Card className="mb-[14px]">
            <CardTitle>2 · Behavior</CardTitle>
            <CardSub>
              How this Operator thinks and writes. Tone shapes voice; system
              prompt shapes judgment.
            </CardSub>

            <div className="field mt-[12px]">
              <div className="flex items-center justify-between mb-[6px]">
                <label className="m-0">System prompt</label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => setShowGenerator((v) => !v)}
                >
                  ✨ Generate with AI
                </Button>
              </div>

              {showGenerator && (
                <div className="mb-[10px] p-[12px] bg-[rgba(106,166,255,0.06)] border-[1px] border-[rgba(106,166,255,0.25)] rounded-[10px]">
                  <div className="font-mono text-[10px] text-at-mint tracking-[0.08em] uppercase mb-[6px]">
                    Generate from description
                  </div>
                  <div className="text-[12px] text-subtle leading-[1.6] mb-[8px]">
                    Describe in plain language what this Operator should do.
                    We&apos;ll write the system prompt for you, scoped to the
                    {objective ? ` ${objective.name}` : ""} Objective and your
                    chosen tone.
                  </div>
                  <textarea
                    rows={3}
                    value={genDescription}
                    onChange={(e) => setGenDescription(e.target.value)}
                    placeholder="e.g. Daily marketing campaign generator. Watches our Discord and Twitter for trending topics among our user base, then proposes campaign spend to ride the trends. Avoids campaigns we&apos;ve already tried in the last 30 days."
                    disabled={generating}
                  />
                  {genError && (
                    <div className="mt-[6px] text-[11px] text-fail">
                      {genError}
                    </div>
                  )}
                  <div className="flex gap-[6px] justify-end mt-[8px]">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowGenerator(false);
                        setGenError(null);
                      }}
                      disabled={generating}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleGenerate}
                      disabled={generating || genDescription.trim().length < 10}
                    >
                      {generating ? "Generating…" : "Generate prompt"}
                    </Button>
                  </div>
                </div>
              )}

              <textarea
                rows={8}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
              <div className="hint">
                The core instructions for this agent. Use{" "}
                <code className="text-[11px] bg-[rgba(255,255,255,0.05)] px-[4px] rounded-[3px]">
                  {"{marketName}"}
                </code>{" "}
                to substitute the Market name at run time. Edit the generated
                prompt before saving — AI is a starting point, not a final answer.
              </div>
            </div>

            <div className="field">
              <label>Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as OperatorTone)}
              >
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="evidence-based">Evidence-based</option>
                <option value="punchy">Punchy / direct</option>
              </select>
              <div className="hint">
                Influences phrasing in proposal titles and rationales.
              </div>
            </div>
          </Card>

          {/* ─── Knowledge sources ─── */}
          <Card className="mb-[14px]">
            <CardTitle>3 · Knowledge sources</CardTitle>
            <CardSub>
              Reference docs the Operator can quote when authoring proposals.
              Optional — strategy docs, brand guidelines, OKRs, recent
              decisions. Upload files directly or pick from Google Drive.
            </CardSub>
            <div className="mt-[12px]">
              <KnowledgeSources
                value={knowledgeSources}
                onChange={setKnowledgeSources}
              />
            </div>
          </Card>

          {/* ─── Schedule ─── */}
          <Card className="mb-[14px]">
            <CardTitle>4 · Schedule</CardTitle>
            <CardSub>When this Operator&apos;s agent loop fires.</CardSub>

            <div className="row-2 mt-[12px]">
              <div className="field">
                <label>Frequency</label>
                <select
                  value={scheduleKind}
                  onChange={(e) =>
                    setScheduleKind(e.target.value as OperatorSchedule["kind"])
                  }
                >
                  <option value="manual">Manual triggers only</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="interval">Every N hours</option>
                </select>
              </div>

              {scheduleKind === "daily" && (
                <div className="field">
                  <label>At hour (UTC)</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={scheduleHour}
                    onChange={(e) =>
                      setScheduleHour(
                        Math.max(0, Math.min(23, Number(e.target.value) || 0)),
                      )
                    }
                  />
                </div>
              )}

              {scheduleKind === "weekly" && (
                <>
                  <div className="field">
                    <label>Day of week</label>
                    <select
                      value={scheduleDow}
                      onChange={(e) => setScheduleDow(Number(e.target.value))}
                    >
                      {[
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ].map((d, i) => (
                        <option key={d} value={i}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {scheduleKind === "interval" && (
                <div className="field">
                  <label>Run every</label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={scheduleEvery}
                    onChange={(e) =>
                      setScheduleEvery(
                        Math.max(1, Math.min(168, Number(e.target.value) || 1)),
                      )
                    }
                  />
                  <div className="hint">Hours between runs (1–168).</div>
                </div>
              )}
            </div>

            {scheduleKind === "weekly" && (
              <div className="field mt-[8px]">
                <label>At hour (UTC)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={scheduleHour}
                  onChange={(e) =>
                    setScheduleHour(
                      Math.max(0, Math.min(23, Number(e.target.value) || 0)),
                    )
                  }
                />
              </div>
            )}
          </Card>

          {/* ─── Publish mode ─── */}
          <Card>
            <CardTitle>5 · Publish mode</CardTitle>
            <CardSub>
              What happens when the Operator finishes composing a proposal.
            </CardSub>

            <div className="mt-[12px] flex flex-col gap-[8px]">
              <label className="flex gap-[10px] items-start cursor-pointer p-[10px] rounded-[8px] border-[1px] border-border hover:bg-[rgba(255,255,255,0.02)]">
                <input
                  type="radio"
                  name="publishMode"
                  className="w-[auto] mt-[3px]"
                  checked={publishMode === "draft-then-confirm"}
                  onChange={() => setPublishMode("draft-then-confirm")}
                />
                <div>
                  <div className="text-[13px] font-semibold">
                    Draft → sponsor confirms
                  </div>
                  <div className="text-[11px] text-muted leading-[1.5] mt-[2px]">
                    The Operator drafts the proposal and notifies you. It only
                    publishes after you click confirm. Recommended for new
                    Operators.
                  </div>
                </div>
              </label>

              <label className="flex gap-[10px] items-start cursor-pointer p-[10px] rounded-[8px] border-[1px] border-border hover:bg-[rgba(255,255,255,0.02)]">
                <input
                  type="radio"
                  name="publishMode"
                  className="w-[auto] mt-[3px]"
                  checked={publishMode === "autonomous"}
                  onChange={() => setPublishMode("autonomous")}
                />
                <div>
                  <div className="text-[13px] font-semibold">Autonomous</div>
                  <div className="text-[11px] text-muted leading-[1.5] mt-[2px]">
                    The Operator publishes proposals directly when it composes
                    one. The futarchy market still has to pass them. Use only
                    after you trust the Operator&apos;s outputs.
                  </div>
                </div>
              </label>
            </div>
          </Card>
        </div>

        <div>
          <Explainer>
            <h4>What is an Operator?</h4>
            <p>
              An Operator is your sponsor-side agent that authors proposals on
              a schedule. Think of it as a recurring decision-generator —
              instead of you sitting down every week to file proposals, the
              Operator does it.
            </p>
            <p>
              Each Operator runs one Objective (Growth, Operations, Strategy,
              Tokenomics, …). The Objective bounds which proposal types it can
              emit; you control how the Operator thinks via its system prompt.
            </p>
            <p>
              The futarchy market is still the gatekeeper. Operators don&apos;t
              decide what passes — Citizens&apos; Electors trade those
              decisions out. Operators just ensure proposals exist to be
              traded.
            </p>
          </Explainer>

          <Annote className="mt-[14px]">
            <b>Operator vs Co-signer.</b> An Operator is an agent. A Co-signer
            is a static keypair the platform holds for multisig membership.
            They&apos;re distinct roles even though both involve the platform.
          </Annote>
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Button onClick={() => router.push("/market/settings/operators")}>
          ← Cancel
        </Button>
        <Button data-alert="Operator saved (wireframe demo).">Save draft</Button>
        <Button
          variant="primary"
          data-alert="Operator created (wireframe demo)."
          onClick={() => router.push("/market/settings/operators")}
        >
          Create Operator
        </Button>
      </div>
    </>
    </AdminPageGate>
  );
}

const DEFAULT_PROMPT = `You are an Operator for {marketName}, running the Growth Objective.

Your job: author proposals that, if passed, would advance Growth's value vector (Revenue 0.40, User love 0.25, Speed 0.20, Runway 0.15).

For each proposal you draft:
1. State the action concisely (title).
2. Explain why this action serves Growth (rationale).
3. Show your dimension impact estimate.
4. Cite recent data when you have it.

Keep proposals small and reversible when possible. The market judges them, but small proposals have a better chance of clear pricing.

Tone: clear, evidence-based, brief. No hype.`;