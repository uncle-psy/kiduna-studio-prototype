/**
 * Operators are agents that author proposals on a schedule.
 *
 * Each Operator is bound to one Objective; its proposals can only use the
 * proposal types that Objective allows (Option 3 scoping). The Operator's
 * `systemPrompt` and `tone` shape *how* it thinks about proposals; the
 * Objective constrains *what* kinds of proposals it can emit.
 *
 * Operators are reusable across Markets — the same Operator can run on
 * multiple Markets that share an Objective with compatible types.
 *
 * NOTE: an "Operator" agent is distinct from the multisig "Co-signer" key.
 * Don't confuse them. The agent runs server-side and emits proposals; the
 * Co-signer is a static keypair the platform holds for multisig membership.
 */

export type OperatorTone = "formal" | "casual" | "evidence-based" | "punchy";

export type OperatorSchedule =
  | { kind: "manual" }
  | { kind: "daily"; atHour: number /* UTC 0-23 */ }
  | { kind: "weekly"; dayOfWeek: number /* 0=Sun */; atHour: number }
  | { kind: "interval"; everyHours: number };

/** What the Operator does after composing a proposal. */
export type OperatorPublishMode =
  /** Operator submits the proposal directly (and the futarchy market judges). */
  | "autonomous"
  /** Operator drafts; sponsor must review & confirm before publishing. */
  | "draft-then-confirm";

/**
 * A document the Operator can reference while authoring proposals.
 * Either uploaded directly by the sponsor or selected from a connected
 * Google Drive. UI-only for now — wiring to storage / indexing comes
 * later.
 */
export type KnowledgeSource =
  | {
      id: string;
      kind: "upload";
      name: string;
      sizeBytes: number;
      mimeType: string;
      /** Local-only object URL for previews, if needed. Not persisted. */
      previewUrl?: string;
    }
  | {
      id: string;
      kind: "drive";
      name: string;
      mimeType: string;
      /** Google Drive file id. */
      driveFileId: string;
      /** Direct link back to the doc in Drive. */
      webViewLink?: string;
    };

export interface Operator {
  id: string;
  name: string;
  /** Objective this Operator runs. */
  objectiveId: string;
  /** Free-form description shown on the operator card. */
  description: string;
  /** Core agent instructions. */
  systemPrompt: string;
  tone: OperatorTone;
  schedule: OperatorSchedule;
  publishMode: OperatorPublishMode;
  /** Active = scheduled runs are firing. Disabled = no runs. */
  active: boolean;
  /** Optional: reference docs the Operator can quote when authoring. */
  knowledgeSources?: KnowledgeSource[];
  /** Stats (mock for wireframe). */
  stats: {
    proposalsPublished: number;
    drafts: number;
    passed: number;
    failed: number;
    lastRunIso: string | null;
  };
}

export const MOCK_OPERATORS: Operator[] = [
  {
    id: "growth-operator-v1",
    name: "growth-operator-v1",
    objectiveId: "growth",
    description:
      "Daily marketing and sales proposal generator. Watches campaign performance and proposes spend reallocations.",
    systemPrompt: `You are the Growth operator for {marketName}. Your job is to author Spend Tokens proposals to fund marketing campaigns and sales initiatives that score well on Revenue (0.40) and User love (0.25).

When pricing a proposal, justify the amount, the recipient, and the expected value-vector impact. Cite recent data when available.

Tone: clear, evidence-based, brief. No hype.`,
    tone: "evidence-based",
    schedule: { kind: "daily", atHour: 14 },
    publishMode: "draft-then-confirm",
    active: true,
    stats: {
      proposalsPublished: 7,
      drafts: 3,
      passed: 5,
      failed: 2,
      lastRunIso: "2026-05-08T14:00:00Z",
    },
  },
  {
    id: "ops-operator-v1",
    name: "ops-operator-v1",
    objectiveId: "operations",
    description:
      "Weekly operations review. Proposes vendor changes, parameter tweaks, and liquidity adjustments.",
    systemPrompt: `You are the Operations operator for {marketName}. You author proposals that improve Cost, Reliability, and Morale.

Bias toward small, reversible changes over big bets.`,
    tone: "formal",
    schedule: { kind: "weekly", dayOfWeek: 1, atHour: 10 },
    publishMode: "autonomous",
    active: true,
    stats: {
      proposalsPublished: 4,
      drafts: 0,
      passed: 3,
      failed: 1,
      lastRunIso: "2026-05-05T10:00:00Z",
    },
  },
  {
    id: "tokenomics-operator-v1",
    name: "tokenomics-operator-v1",
    objectiveId: "tokenomics",
    description:
      "On-demand tokenomics agent. Authors mint/metadata/liquidity proposals only when sponsor requests.",
    systemPrompt: `You are the Tokenomics operator. You author proposals that affect token supply, metadata, and liquidity.

Be especially conservative with mint proposals — every dilution event must justify itself with strong holder-value evidence.`,
    tone: "formal",
    schedule: { kind: "manual" },
    publishMode: "draft-then-confirm",
    active: false,
    stats: {
      proposalsPublished: 1,
      drafts: 2,
      passed: 1,
      failed: 0,
      lastRunIso: "2026-04-22T09:30:00Z",
    },
  },
];

/** Look up an Operator by id. */
export function findOperator(id: string): Operator | undefined {
  return MOCK_OPERATORS.find((o) => o.id === id);
}

/** Filter Operators by Objective. */
export function operatorsForObjective(objectiveId: string): Operator[] {
  return MOCK_OPERATORS.filter((o) => o.objectiveId === objectiveId);
}

/** Human-readable schedule blurb. */
export function scheduleBlurb(schedule: OperatorSchedule): string {
  switch (schedule.kind) {
    case "manual":
      return "Manual triggers only";
    case "daily":
      return `Daily at ${schedule.atHour.toString().padStart(2, "0")}:00 UTC`;
    case "weekly": {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `Weekly on ${days[schedule.dayOfWeek]} at ${schedule.atHour
        .toString()
        .padStart(2, "0")}:00 UTC`;
    }
    case "interval":
      return `Every ${schedule.everyHours} hours`;
  }
}

/** Human-readable tone label. */
export function toneLabel(tone: OperatorTone): string {
  switch (tone) {
    case "formal":
      return "Formal";
    case "casual":
      return "Casual";
    case "evidence-based":
      return "Evidence-based";
    case "punchy":
      return "Punchy / direct";
  }
}