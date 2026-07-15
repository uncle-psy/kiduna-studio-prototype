export type StudioMessage = {
  id: string;
  author: string;
  initials: string;
  body: string;
  createdAt: string;
};

export type StudioReceipt = {
  id: string;
  action: string;
  summary: string;
  createdAt: string;
};

export type StudioState = {
  version: 1;
  scene: number;
  communityStatus: "none" | "gathered" | "draft" | "active";
  projectStatus: "none" | "active";
  materialCount: number;
  actorStatus: "idle" | "comparing" | "change-ready" | "complete";
  briefVersion: "0.1" | "0.2";
  briefApproved: boolean;
  messages: StudioMessage[];
  lastReceipt: StudioReceipt | null;
};

export const defaultStudioState: StudioState = {
  version: 1,
  scene: 0,
  communityStatus: "none",
  projectStatus: "none",
  materialCount: 0,
  actorStatus: "idle",
  briefVersion: "0.1",
  briefApproved: false,
  messages: [],
  lastReceipt: null,
};

export type StudioAction =
  | "GATHER_MEMBERS"
  | "CREATE_COMMUNITY"
  | "SEND_INVITATIONS"
  | "START_PROJECT"
  | "BRING_MATERIALS"
  | "OPEN_PROJECT_CHAT"
  | "PREPARE_UPDATE"
  | "APPROVE_UPDATE"
  | "SEND_MESSAGE"
  | "RESET";
