export type MemberId = "david" | "jeya" | "aashik";

export type StudioMessage = {
  id: string;
  author: "member" | "ally";
  memberId: MemberId;
  body: string;
  createdAt: string;
};

export type StudioReceipt = {
  id: string;
  action: string;
  actor: string;
  summary: string;
  createdAt: string;
};

export type StudioState = {
  version: 2;
  community: {
    status: "none" | "inviting" | "active";
    name: string;
    handle: string;
    privacy: "secret";
    purpose: string;
    invitations: Record<"jeya" | "aashik", "not-sent" | "delivered" | "accepted">;
  };
  project: {
    status: "none" | "active";
    name: string;
    purpose: string;
    materialCount: number;
    mapperStatus: "idle" | "reading" | "ready";
  };
  wisdom: {
    sourceCount: number;
    concepts: string[];
    synthesis: string;
  };
  direction: {
    version: "0.1" | "0.2";
    status: "forming" | "proposed" | "accepted";
    statement: string;
  };
  allyThreads: Record<MemberId, StudioMessage[]>;
  receipts: StudioReceipt[];
};

export const defaultStudioState: StudioState = {
  version: 2,
  community: {
    status: "none",
    name: "Studio Makers",
    handle: "@studio-makers",
    privacy: "secret",
    purpose: "Explore a living interface for the agentic internet.",
    invitations: { jeya: "not-sent", aashik: "not-sent" },
  },
  project: {
    status: "none",
    name: "Studio Field Prototype",
    purpose: "Make living coordination feel natural, legible, and magical.",
    materialCount: 0,
    mapperStatus: "idle",
  },
  wisdom: {
    sourceCount: 0,
    concepts: ["living field", "contextual agency", "calm coordination"],
    synthesis: "The shared Wisdom will grow from what each member and Ally makes available.",
  },
  direction: {
    version: "0.1",
    status: "forming",
    statement: "Keep the Field present while focus surfaces become calm, nearly opaque places for thought.",
  },
  allyThreads: { david: [], jeya: [], aashik: [] },
  receipts: [],
};

export type StudioAction =
  | "INVITE_MEMBERS"
  | "ACCEPT_INVITATIONS"
  | "START_PROJECT"
  | "OPEN_WISDOM"
  | "RUN_MAPPER"
  | "PROPOSE_DIRECTION"
  | "APPROVE_DIRECTION"
  | "RESET";

export function normalizeStudioState(value: unknown): StudioState {
  if (value && typeof value === "object" && "version" in value && value.version === 2) {
    return value as StudioState;
  }
  return structuredClone(defaultStudioState);
}
