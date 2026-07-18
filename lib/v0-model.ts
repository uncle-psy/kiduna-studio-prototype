export type PersonaKey = "david" | "matt";
export type JourneyKey = "J1" | "J2" | "J3";
export type ActionClass = "Navigate" | "Gather" | "Ask" | "Commit";
export type PrivacyLevel = "public" | "private" | "secret" | "personal";

export const PERSONAS = {
  david: {
    id: "persona-david",
    name: "David Nikzad",
    firstName: "David",
    initials: "DN",
    context: "Technologist · Kinship Duna Member",
    allyProposal: "Aster",
    allyNote: "A calm systems companion: direct, exact, and curious without speaking for David.",
  },
  matt: {
    id: "persona-matt",
    name: "Matt Simon",
    firstName: "Matt",
    initials: "MS",
    context: "Veteran organizer · Kinship Duna Member",
    allyProposal: "Harbor",
    allyNote: "A steady relational companion: candid, grounded, and protective without caricature.",
  },
} as const;

export type SourceItem = {
  id: string;
  title: string;
  family: string;
  owner: PersonaKey | "service-alliance" | "public";
  privacy: PrivacyLevel;
  provenance: "public" | "owner_approved" | "synthetic" | "simulated";
  status: "current" | "historical" | "conflicted";
  gatheredBy: PersonaKey[];
  shared: boolean;
};

export type ArtifactVersion = {
  id: string;
  label: string;
  hash: string;
  status: "draft" | "changes-requested" | "in-review" | "accepted";
  parentId: string | null;
  sourceIds: string[];
  contributions: string[];
  acceptedBy: PersonaKey[];
  unresolved: string[];
};

export type ComputeEntry = {
  id: string;
  kind: "allocation" | "reservation" | "consumption" | "release";
  amount: number;
  label: string;
  actor: string;
  policy: string;
};

export type StudioRecord = {
  id: string;
  clock: string;
  kind: "record" | "denial" | "attention" | "external";
  title: string;
  summary: string;
  objectId: string;
  command: string;
  authority: string;
  actor: string;
  simulation: boolean;
  idempotencyKey: string;
  supersedes: string | null;
};

export type FixtureId =
  | "recipient-declines-approach"
  | "code-expired"
  | "code-recipient-mismatch"
  | "private-source-overshare"
  | "project-low-compute-before-start"
  | "actor-limit-mid-run-partial"
  | "source-revoked-mid-run"
  | "actor-tool-timeout"
  | "stale-version-acceptance"
  | "second-founder-declines"
  | "authorization-changes-parameters"
  | "purchase-succeeds-registry-fails"
  | "external-outcome-uncertain"
  | "duplicate-submit-retry"
  | "prompt-injection-source"
  | "recipient-offline-reconnect"
  | "actor-low-confidence-conflict"
  | "treasury-threshold-declined"
  | "purchase-settlement-fails"
  | "offline-during-confirmation";

export type FixtureDefinition = {
  id: FixtureId;
  priority: "P0" | "P1";
  journey: JourneyKey;
  title: string;
  truth: string;
  davidView: string;
  mattView: string;
  ledger: string;
  record: string;
  recovery: string[];
  stage: number;
};

export type ActiveFixture = FixtureDefinition & { resolved: boolean };

export type StudioState = {
  schemaVersion: 1;
  revision: number;
  logicalClock: number;
  scenario: "clean" | FixtureId;
  allies: Record<PersonaKey, { name: string | null; confirmed: boolean; stanceVersion: string | null }>;
  foundMatt: boolean;
  code: { status: "none" | "active" | "redeemed"; value: string | null; expires: string | null };
  approach: "none" | "draft" | "sent" | "accepted" | "declined";
  relationship: "none" | "active";
  trust: Record<PersonaKey, "unset" | "medium">;
  sources: SourceItem[];
  sharedBy: PersonaKey[];
  project: "none" | "pending-matt" | "active" | "under-review" | "complete";
  actor: { status: "idle" | "running" | "partial" | "complete"; progress: number; note: string };
  artifacts: ArtifactVersion[];
  activeArtifactId: string | null;
  compute: {
    opening: number;
    credits: number;
    allocated: number;
    reserved: number;
    consumed: number;
    released: number;
    entries: ComputeEntry[];
  };
  launch: "none" | "prepared" | "submitted" | "authorized" | "purchase-preview" | "purchase-pending" | "purchase-settled";
  organization: "forming" | "evidence-verified" | "active";
  registry: "none" | "pending" | "settled" | "failed" | "uncertain";
  records: StudioRecord[];
  appliedKeys: string[];
  fixture: ActiveFixture | null;
};

export type StudioAction =
  | { type: "CONFIRM_ALLY"; persona: PersonaKey; key: string }
  | { type: "FIND_MATT"; persona: "david"; key: string }
  | { type: "CREATE_CODE"; persona: "david"; key: string }
  | { type: "REDEEM_CODE"; persona: "matt"; key: string }
  | { type: "PREPARE_APPROACH"; persona: "david"; key: string }
  | { type: "SEND_APPROACH"; persona: "david"; key: string }
  | { type: "RESPOND_APPROACH"; persona: "matt"; response: "accept" | "decline"; key: string }
  | { type: "GATHER_SOURCES"; persona: PersonaKey; key: string }
  | { type: "SHARE_SOURCES"; persona: PersonaKey; key: string }
  | { type: "CREATE_PROJECT"; persona: "david"; key: string }
  | { type: "ACCEPT_PROJECT"; persona: "matt"; key: string }
  | { type: "ALLOCATE_COMPUTE"; persona: "david"; amount: number; key: string }
  | { type: "START_ACTOR"; persona: "david"; key: string }
  | { type: "COMPLETE_ACTOR"; persona: "system"; key: string }
  | { type: "REQUEST_CHANGES"; persona: "matt"; key: string }
  | { type: "CREATE_V2"; persona: "david"; key: string }
  | { type: "ACCEPT_VERSION"; persona: PersonaKey; versionId: string; expectedRevision: number; key: string }
  | { type: "PREPARE_LAUNCH"; persona: "david"; key: string }
  | { type: "SUBMIT_LAUNCH"; persona: "david"; expectedRevision: number; key: string }
  | { type: "RESOLVE_AUTHORIZATION"; persona: "authority"; key: string }
  | { type: "PREPARE_PURCHASE"; persona: "authority"; key: string }
  | { type: "CONFIRM_PURCHASE"; persona: "authority"; expectedRevision: number; key: string }
  | { type: "RECONCILE_PURCHASE"; persona: "system"; key: string }
  | { type: "VERIFY_LEGAL_EVIDENCE"; persona: "authority"; key: string }
  | { type: "OPEN_ORGANIZATION"; persona: "authority"; expectedRevision: number; key: string }
  | { type: "SUBMIT_REGISTRY"; persona: "authority"; expectedRevision: number; key: string }
  | { type: "RECONCILE_REGISTRY"; persona: "system"; result: "settled" | "failed" | "uncertain"; key: string }
  | { type: "RESOLVE_FIXTURE"; persona: PersonaKey; key: string }
  | { type: "RESET"; key: string };

const BASE_SOURCES: SourceItem[] = [
  { id: "src-overview", title: "Service Alliance Overview", family: "Service Alliance", owner: "service-alliance", privacy: "public", provenance: "owner_approved", status: "current", gatheredBy: [], shared: false },
  { id: "src-white-paper", title: "Service Alliance White Paper", family: "Service Alliance", owner: "service-alliance", privacy: "private", provenance: "owner_approved", status: "current", gatheredBy: [], shared: false },
  { id: "src-market", title: "Market Research & Opportunity Report", family: "Service Alliance", owner: "david", privacy: "private", provenance: "owner_approved", status: "historical", gatheredBy: [], shared: false },
  { id: "src-dragoon", title: "2nd Cavalry Dragoon Base Concept", family: "Alliance archive", owner: "matt", privacy: "private", provenance: "owner_approved", status: "historical", gatheredBy: [], shared: false },
  { id: "src-scions", title: "Service Alliance × 17th Scions", family: "Alliance formation", owner: "matt", privacy: "private", provenance: "owner_approved", status: "historical", gatheredBy: [], shared: false },
  { id: "src-personal", title: "Private Relationship Wisdom", family: "Personal context", owner: "david", privacy: "personal", provenance: "synthetic", status: "current", gatheredBy: [], shared: false },
];

export function createInitialState(): StudioState {
  return {
    schemaVersion: 1,
    revision: 0,
    logicalClock: 0,
    scenario: "clean",
    allies: {
      david: { name: null, confirmed: false, stanceVersion: null },
      matt: { name: null, confirmed: false, stanceVersion: null },
    },
    foundMatt: false,
    code: { status: "none", value: null, expires: null },
    approach: "none",
    relationship: "none",
    trust: { david: "unset", matt: "unset" },
    sources: structuredClone(BASE_SOURCES),
    sharedBy: [],
    project: "none",
    actor: { status: "idle", progress: 0, note: "Waiting for a scoped instruction." },
    artifacts: [],
    activeArtifactId: null,
    compute: { opening: 2400, credits: 0, allocated: 0, reserved: 0, consumed: 0, released: 0, entries: [] },
    launch: "none",
    organization: "forming",
    registry: "none",
    records: [],
    appliedKeys: [],
    fixture: null,
  };
}

function timestamp(clock: number) {
  const minute = String(clock % 60).padStart(2, "0");
  const hour = String(18 + Math.floor(clock / 60)).padStart(2, "0");
  return `2026-07-17T${hour}:${minute}:00-04:00`;
}

function addRecord(
  state: StudioState,
  input: Omit<StudioRecord, "id" | "clock" | "idempotencyKey">,
  key: string,
) {
  state.logicalClock += 1;
  state.records.unshift({
    ...input,
    id: `rec-${String(state.logicalClock).padStart(3, "0")}`,
    clock: timestamp(state.logicalClock),
    idempotencyKey: key,
  });
}

function finish(state: StudioState, key: string) {
  state.revision += 1;
  state.appliedKeys.push(key);
  return state;
}

function unchanged(state: StudioState) {
  return state;
}

function activeArtifact(state: StudioState) {
  return state.artifacts.find((artifact) => artifact.id === state.activeArtifactId) ?? null;
}

export function studioReducer(current: StudioState, action: StudioAction): StudioState {
  if (action.type === "RESET") return createInitialState();
  if (current.appliedKeys.includes(action.key)) return current;
  const state = structuredClone(current);

  switch (action.type) {
    case "CONFIRM_ALLY": {
      if (state.allies[action.persona].confirmed) return unchanged(current);
      const person = PERSONAS[action.persona];
      state.allies[action.persona] = { name: person.allyProposal, confirmed: true, stanceVersion: "stance-v0.1" };
      addRecord(state, {
        kind: "record", title: `${person.allyProposal} confirmed`, summary: `${person.firstName} is the sole Source of this Ally identity and Stance version.`, objectId: `ally-${action.persona}`, command: "ConfirmAllyIdentity@0.1", authority: `${person.firstName} · Source Persona`, actor: "Ki · Genesis Agent", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "FIND_MATT": {
      if (!state.allies.david.confirmed || !state.allies.matt.confirmed) return unchanged(current);
      state.foundMatt = true;
      return finish(state, action.key);
    }
    case "CREATE_CODE": {
      if (action.persona !== "david" || !state.foundMatt || state.code.status !== "none") return unchanged(current);
      state.code = { status: "active", value: "KIN-MATT-7Q4N", expires: "15 simulated minutes" };
      addRecord(state, {
        kind: "record", title: "Recipient-bound Code prepared", summary: "Single use, recipient-bound and expiring. The platform does not contact an unregistered Visitor.", objectId: "relationship-intent", command: "IssuePersonCode@0.1", authority: "David · Inviter", actor: state.allies.david.name ?? "David’s Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "REDEEM_CODE": {
      if (action.persona !== "matt" || state.code.status !== "active") return unchanged(current);
      state.code.status = "redeemed";
      addRecord(state, {
        kind: "record", title: "Code redeemed", summary: "The recipient proof matched. Code redemption did not create a Relationship, grant or Membership.", objectId: "relationship-intent", command: "RedeemPersonCode@0.1", authority: "Matt · Recipient Persona", actor: "Code Manager · simulated", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "PREPARE_APPROACH": {
      if (!state.foundMatt || action.persona !== "david") return unchanged(current);
      state.approach = "draft";
      return finish(state, action.key);
    }
    case "SEND_APPROACH": {
      if (state.approach !== "draft" || action.persona !== "david") return unchanged(current);
      state.approach = "sent";
      addRecord(state, {
        kind: "attention", title: "Purpose-limited approach delivered", summary: "Delivered to Matt’s Ally for filtering. No Relationship, trust, grant or Project exists yet.", objectId: "relationship-intent", command: "DeliverRelationshipIntent@0.1", authority: "David · Sender", actor: `${state.allies.david.name} → ${state.allies.matt.name}`, simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "RESPOND_APPROACH": {
      if (state.approach !== "sent" || action.persona !== "matt") return unchanged(current);
      state.approach = action.response === "accept" ? "accepted" : "declined";
      if (action.response === "accept") {
        state.relationship = "active";
        state.trust = { david: "medium", matt: "medium" };
      }
      addRecord(state, {
        kind: "record", title: action.response === "accept" ? "Conversation accepted" : "Approach declined", summary: action.response === "accept" ? "A Kinship Duna Relationship now exists with separate directional trust and no implied authority." : "The prior state remains. David cannot bypass Matt’s boundary and receives no private rationale.", objectId: "relationship-david-matt", command: "RespondRelationshipIntent@0.1", authority: "Matt · Recipient", actor: state.allies.matt.name ?? "Matt’s Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "GATHER_SOURCES": {
      if (state.relationship !== "active") return unchanged(current);
      const allowed = action.persona === "david" ? ["src-overview", "src-market", "src-white-paper"] : ["src-dragoon", "src-scions"];
      state.sources = state.sources.map((source) => allowed.includes(source.id) && !source.gatheredBy.includes(action.persona) ? { ...source, gatheredBy: [...source.gatheredBy, action.persona] } : source);
      return finish(state, action.key);
    }
    case "SHARE_SOURCES": {
      if (state.relationship !== "active") return unchanged(current);
      const gathered = state.sources.filter((source) => source.gatheredBy.includes(action.persona) && source.privacy !== "personal");
      if (!gathered.length) return unchanged(current);
      state.sources = state.sources.map((source) => gathered.some((item) => item.id === source.id) ? { ...source, shared: true } : source);
      if (!state.sharedBy.includes(action.persona)) state.sharedBy.push(action.persona);
      addRecord(state, {
        kind: "record", title: `${PERSONAS[action.persona].firstName} shared selected Sources`, summary: `${gathered.length} permitted Source${gathered.length === 1 ? "" : "s"} entered the Relationship scope. Personal Wisdom remained unavailable.`, objectId: "relationship-david-matt", command: "GrantRelationshipSources@0.1", authority: `${PERSONAS[action.persona].firstName} · Source controller`, actor: state.allies[action.persona].name ?? "Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "CREATE_PROJECT": {
      if (action.persona !== "david" || state.relationship !== "active" || state.sharedBy.length < 2) return unchanged(current);
      state.project = "pending-matt";
      addRecord(state, {
        kind: "attention", title: "Formation Project proposed", summary: "Kinship Duna is the accountable Organization. Matt must independently accept purpose, role, Sources and grants.", objectId: "project-formation", command: "ProposeProject@0.1", authority: "David · Kinship Duna Member", actor: state.allies.david.name ?? "David’s Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "ACCEPT_PROJECT": {
      if (action.persona !== "matt" || state.project !== "pending-matt") return unchanged(current);
      state.project = "active";
      addRecord(state, {
        kind: "record", title: "Formation Project active", summary: "Matt accepted the exact Project role and grants. Membership and trust were not changed.", objectId: "project-formation", command: "AcceptProjectRole@0.1", authority: "Matt · Project participant", actor: state.allies.matt.name ?? "Matt’s Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "ALLOCATE_COMPUTE": {
      if (action.persona !== "david" || state.project !== "active" || state.compute.allocated > 0 || action.amount <= 0) return unchanged(current);
      state.compute.allocated = action.amount;
      state.compute.entries.push({ id: `cmp-${state.compute.entries.length + 1}`, kind: "allocation", amount: action.amount, label: "Formation Project allocation", actor: "David", policy: "simulated-project-budget@0.1" });
      addRecord(state, {
        kind: "record", title: `${action.amount} Compute allocated`, summary: "Prepaid usage credits reserved as a Project ceiling. No financial exchange or market value changed.", objectId: "compute-project", command: "AllocateProjectCompute@0.1", authority: "David · Project budget authority", actor: state.allies.david.name ?? "David’s Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "START_ACTOR": {
      if (action.persona !== "david" || state.project !== "active" || state.actor.status !== "idle") return unchanged(current);
      const required = 180;
      const remaining = state.compute.allocated - state.compute.consumed - state.compute.reserved;
      if (remaining < required) return unchanged(current);
      state.compute.reserved += required;
      state.compute.entries.push({ id: `cmp-${state.compute.entries.length + 1}`, kind: "reservation", amount: required, label: "Formation Drafter ceiling", actor: "Service Alliance Actor", policy: "actor-ceiling@0.1" });
      state.actor = { status: "running", progress: 42, note: "Researcher mapped five Sources; Formation Drafter is composing v0.1." };
      addRecord(state, {
        kind: "record", title: "Organization Actor commissioned", summary: "Researcher and Formation Drafter may read only the five granted Sources, within a 180 Compute ceiling.", objectId: "actor-service-alliance", command: "CommissionFormationDraft@0.1", authority: "David · Project requester", actor: "Service Alliance Organization Actor", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "COMPLETE_ACTOR": {
      if (action.persona !== "system" || state.actor.status !== "running") return unchanged(current);
      const used = 118;
      const released = state.compute.reserved - used;
      state.compute.reserved = 0;
      state.compute.consumed += used;
      state.compute.released += released;
      state.compute.entries.push(
        { id: `cmp-${state.compute.entries.length + 1}`, kind: "consumption", amount: used, label: "Source map + Formation Package v0.1", actor: "Researcher + Formation Drafter", policy: "simulated-pricing@0.1" },
        { id: `cmp-${state.compute.entries.length + 2}`, kind: "release", amount: released, label: "Unused run ceiling", actor: "Compute ledger", policy: "simulated-pricing@0.1" },
      );
      state.actor = { status: "complete", progress: 100, note: "Cited Formation Package v0.1 arrived with one terminology conflict flagged." };
      const v1: ArtifactVersion = {
        id: "formation-v0.1", label: "v0.1", hash: "sha256:7c1e…a941", status: "in-review", parentId: null,
        sourceIds: state.sources.filter((source) => source.shared).map((source) => source.id),
        contributions: ["Researcher · source map", "Formation Drafter · simulated draft"], acceptedBy: [],
        unresolved: ["[LAUNCH_MIN/MAX]", "[COMPUTE_MULTIPLE]", "[LINEAGE_TERMS]", "Recognition workflow terminology"],
      };
      state.artifacts = [v1];
      state.activeArtifactId = v1.id;
      addRecord(state, {
        kind: "record", title: "Formation Package v0.1 created", summary: `118 Compute settled; ${released} released. Five Source families cited and unresolved values remain variables.`, objectId: v1.id, command: "CompleteFormationDraft@0.1", authority: "Project Actor manifest", actor: "Service Alliance Organization Actor", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "REQUEST_CHANGES": {
      const artifact = activeArtifact(state);
      if (action.persona !== "matt" || !artifact || artifact.id !== "formation-v0.1") return unchanged(current);
      artifact.status = "changes-requested";
      artifact.contributions.push("Matt · requested current nouns and clearer formation boundary");
      addRecord(state, {
        kind: "attention", title: "Changes requested on v0.1", summary: "Matt’s review is attached to the exact version. No acceptance or launch authority was created.", objectId: artifact.id, command: "RequestArtifactChanges@0.1", authority: "Matt · named reviewer", actor: state.allies.matt.name ?? "Matt’s Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "CREATE_V2": {
      const prior = activeArtifact(state);
      if (action.persona !== "david" || !prior || prior.status !== "changes-requested") return unchanged(current);
      const used = 42;
      state.compute.consumed += used;
      state.compute.entries.push(
        { id: `cmp-${state.compute.entries.length + 1}`, kind: "reservation", amount: used, label: "Formation Package v0.2 ceiling", actor: "Formation Drafter", policy: "actor-ceiling@0.1" },
        { id: `cmp-${state.compute.entries.length + 2}`, kind: "consumption", amount: used, label: "Formation Package v0.2 revision", actor: "Formation Drafter", policy: "simulated-pricing@0.1" },
      );
      const v2: ArtifactVersion = {
        id: "formation-v0.2", label: "v0.2", hash: "sha256:92bd…17ef", status: "in-review", parentId: prior.id,
        sourceIds: prior.sourceIds,
        contributions: [...prior.contributions, "David · accepted revision scope", "Formation Drafter · successor draft"], acceptedBy: [],
        unresolved: ["[LAUNCH_MIN/MAX]", "[COMPUTE_MULTIPLE]", "[LINEAGE_TERMS]"],
      };
      state.artifacts.push(v2);
      state.activeArtifactId = v2.id;
      addRecord(state, {
        kind: "record", title: "Formation Package v0.2 ready", summary: "A successor version incorporates Matt’s request. v0.1 remains immutable and inspectable.", objectId: v2.id, command: "CreateArtifactSuccessor@0.1", authority: "David · Project contributor", actor: "Formation Drafter · simulated", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "ACCEPT_VERSION": {
      const artifact = state.artifacts.find((item) => item.id === action.versionId);
      if (!artifact || artifact.status !== "in-review" || action.expectedRevision !== current.revision) return unchanged(current);
      if (artifact.acceptedBy.includes(action.persona)) return unchanged(current);
      artifact.acceptedBy.push(action.persona);
      if (artifact.acceptedBy.length === 2) {
        artifact.status = "accepted";
        state.project = "under-review";
      }
      addRecord(state, {
        kind: "record", title: `${PERSONAS[action.persona].firstName} accepted ${artifact.label}`, summary: artifact.acceptedBy.length === 2 ? "Both founders accepted the same exact hash. This does not launch, authorize treasury action or register an Organization." : "One of two required founder acceptances is recorded. The other founder cannot be represented by this act.", objectId: artifact.id, command: "AcceptArtifactVersion@0.1", authority: `${PERSONAS[action.persona].firstName} · required acceptor`, actor: state.allies[action.persona].name ?? "Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "PREPARE_LAUNCH": {
      const artifact = activeArtifact(state);
      if (action.persona !== "david" || artifact?.status !== "accepted") return unchanged(current);
      state.launch = "prepared";
      return finish(state, action.key);
    }
    case "SUBMIT_LAUNCH": {
      if (action.persona !== "david" || state.launch !== "prepared" || action.expectedRevision !== current.revision) return unchanged(current);
      state.launch = "submitted";
      addRecord(state, {
        kind: "record", title: "Launch request submitted", summary: "The request references Formation Package v0.2 and unresolved symbolic parameters. Nothing has launched or moved.", objectId: "organization-service-alliance", command: "SubmitLaunchRequest@0.1", authority: "David · founder requester", actor: state.allies.david.name ?? "David’s Ally", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "RESOLVE_AUTHORIZATION": {
      if (action.persona !== "authority" || state.launch !== "submitted") return unchanged(current);
      state.launch = "authorized";
      addRecord(state, {
        kind: "record", title: "Simulated Kinship authorization recorded", summary: "The fixture authority approved symbolic launch parameters. No agent voted, signed or self-confirmed.", objectId: "organization-service-alliance", command: "ResolveLaunchAuthorization@0.1", authority: "[AUTHORIZATION_POLICY] · simulated human/Forum authority", actor: "Kinship Duna decision fixture", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "PREPARE_PURCHASE": {
      if (action.persona !== "authority" || state.launch !== "authorized") return unchanged(current);
      state.launch = "purchase-preview";
      return finish(state, action.key);
    }
    case "CONFIRM_PURCHASE": {
      if (action.persona !== "authority" || state.launch !== "purchase-preview" || action.expectedRevision !== current.revision) return unchanged(current);
      state.launch = "purchase-pending";
      addRecord(state, {
        kind: "external", title: "Simulated treasury purchase pending", summary: "Amount remains [TREASURY_PURCHASE_AMOUNT]. Authorization is recorded; settlement and Compute credit are not yet true.", objectId: "treasury-kinship", command: "AuthorizeComputePurchase@0.1", authority: "Kinship treasury authority fixture", actor: "Treasury command service · simulated", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "RECONCILE_PURCHASE": {
      if (action.persona !== "system" || state.launch !== "purchase-pending") return unchanged(current);
      state.launch = "purchase-settled";
      addRecord(state, {
        kind: "external", title: "Simulated settlement evidence arrived", summary: "The external fixture settled. Numeric credit remains intentionally unresolved until an approved amount/policy exists; the Project-use ledger remains conserved.", objectId: "treasury-kinship", command: "ReconcileComputePurchase@0.1", authority: "Verified simulated rail result", actor: "Reconciler · simulated", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "VERIFY_LEGAL_EVIDENCE": {
      if (action.persona !== "authority" || state.launch !== "purchase-settled") return unchanged(current);
      state.organization = "evidence-verified";
      addRecord(state, {
        kind: "record", title: "Synthetic WV evidence verified", summary: "[WV_ORG_ID · SYNTHETIC] is explicitly test data. The prior forming state was not called a registered DUNA.", objectId: "organization-service-alliance", command: "VerifyLegalEvidence@0.1", authority: "Registrar credential fixture", actor: "Registrar · simulated", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "OPEN_ORGANIZATION": {
      if (action.persona !== "authority" || state.organization !== "evidence-verified" || action.expectedRevision !== current.revision) return unchanged(current);
      state.organization = "active";
      addRecord(state, {
        kind: "record", title: "Service Alliance opened in simulation", summary: "Service Alliance is now an active simulated Organization. This is not a legal filing or production Organization change.", objectId: "organization-service-alliance", command: "ActivateOrganization@0.1", authority: "Registrar + approved launch configuration fixture", actor: "Organization command service · simulated", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "SUBMIT_REGISTRY": {
      if (action.persona !== "authority" || state.organization !== "active" || state.registry !== "none" || action.expectedRevision !== current.revision) return unchanged(current);
      state.registry = "pending";
      addRecord(state, {
        kind: "external", title: "Simulated registry write pending", summary: "The command references the synthetic WV ID. No decentralized or public registry endpoint is reachable.", objectId: "registry-service-alliance", command: "SubmitRegistryWrite@0.1", authority: "Registrar fixture", actor: "Registry adapter · simulated", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "RECONCILE_REGISTRY": {
      if (action.persona !== "system" || state.registry !== "pending") return unchanged(current);
      state.registry = action.result;
      if (action.result === "settled") state.project = "complete";
      addRecord(state, {
        kind: "external", title: action.result === "settled" ? "Simulated registry Record settled" : action.result === "failed" ? "Registry failed after purchase settlement" : "Registry outcome remains uncertain", summary: action.result === "settled" ? "Internal Record and simulated registry evidence now agree. The design lab remains isolated from a live registry." : "Purchase settlement remains independently true. Recovery must reconcile this registry operation without duplicating prior consequences.", objectId: "registry-service-alliance", command: "ReconcileRegistryWrite@0.1", authority: "Verified simulated adapter result", actor: "Reconciler · simulated", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    case "RESOLVE_FIXTURE": {
      if (!state.fixture || state.fixture.resolved) return unchanged(current);
      state.fixture.resolved = true;
      addRecord(state, {
        kind: "record", title: "Fixture recovery applied", summary: state.fixture.recovery[0] ?? "The prior truthful state is preserved and the safe recovery path is available.", objectId: `fixture-${state.fixture.id}`, command: "ResolveDeterministicFixture@0.1", authority: `${PERSONAS[action.persona].firstName} · design-lab session`, actor: "Deterministic scenario runner", simulation: true, supersedes: null,
      }, action.key);
      return finish(state, action.key);
    }
    default:
      return current;
  }
}

export function ledgerBalance(state: StudioState) {
  return state.compute.opening + state.compute.credits - state.compute.consumed;
}

export function ledgerConserves(state: StudioState) {
  const allocations = state.compute.entries.filter((entry) => entry.kind === "allocation").reduce((sum, entry) => sum + entry.amount, 0);
  const reservations = state.compute.entries.filter((entry) => entry.kind === "reservation").reduce((sum, entry) => sum + entry.amount, 0);
  const consumption = state.compute.entries.filter((entry) => entry.kind === "consumption").reduce((sum, entry) => sum + entry.amount, 0);
  const releases = state.compute.entries.filter((entry) => entry.kind === "release").reduce((sum, entry) => sum + entry.amount, 0);
  return allocations === state.compute.allocated
    && reservations === consumption + releases + state.compute.reserved
    && consumption === state.compute.consumed
    && releases === state.compute.released
    && state.compute.allocated >= state.compute.consumed + state.compute.reserved
    && ledgerBalance(state) === state.compute.opening + state.compute.credits - consumption;
}

export function deriveStage(state: StudioState) {
  if (!state.allies.david.confirmed || !state.allies.matt.confirmed) return 0;
  if (state.relationship === "none") return state.approach === "sent" ? 2 : 1;
  if (state.project === "none" || state.project === "pending-matt") return 3;
  if (state.organization === "active") return state.registry === "settled" ? 11 : 10;
  if (state.launch === "purchase-settled") return 9;
  if (state.launch === "authorized" || state.launch === "purchase-preview" || state.launch === "purchase-pending") return 8;
  if (state.launch === "prepared" || state.launch === "submitted") return 7;
  if (!state.artifacts.length) return state.actor.status === "running" ? 5 : 4;
  const artifact = activeArtifact(state);
  if (artifact?.status !== "accepted") return 6;
  return 7;
}

export function deriveJourney(state: StudioState): JourneyKey {
  const stage = deriveStage(state);
  if (stage <= 3) return "J1";
  if (stage <= 6) return "J2";
  return "J3";
}

export type GuidedAction = {
  id: string;
  label: string;
  short: string;
  actionClass: ActionClass;
  actor: PersonaKey | "system" | "authority";
  authority: string;
  objectId: string;
  consequence: string;
  nonEffect: string;
  compute: string;
  confirmation: "none" | "explicit" | "sovereign";
  simulation: boolean;
  create: (state: StudioState) => StudioAction;
};

const guided = (
  input: Omit<GuidedAction, "create"> & { create: GuidedAction["create"] },
) => input;

export function nextGuidedAction(state: StudioState, persona: PersonaKey): GuidedAction | null {
  if (state.fixture && !state.fixture.resolved) return guided({
    id: `recover-${state.fixture.id}`, label: "Apply safe recovery", short: state.fixture.recovery[0] ?? "Recover", actionClass: "Commit", actor: persona, authority: `${PERSONAS[persona].firstName} · current session`, objectId: `fixture-${state.fixture.id}`, consequence: "Records the selected safe recovery while preserving the failed or denied state.", nonEffect: "Does not erase the fixture Record or fabricate completion.", compute: state.fixture.ledger, confirmation: "explicit", simulation: true, create: () => ({ type: "RESOLVE_FIXTURE", persona, key: `fixture:${state.fixture?.id}:resolve` }),
  });
  if (!state.allies[persona].confirmed) return guided({
    id: `confirm-ally-${persona}`, label: `Confirm ${PERSONAS[persona].allyProposal}`, short: "Confirm Ally identity and Stance v0.1", actionClass: "Commit", actor: persona, authority: `${PERSONAS[persona].firstName} · sole Source`, objectId: `ally-${persona}`, consequence: `Makes ${PERSONAS[persona].allyProposal} the active simulated Ally identity for ${PERSONAS[persona].firstName}.`, nonEffect: "Does not grant authority to anyone else or create a Relationship.", compute: "Small simulated onboarding use · disclosed in Record", confirmation: "explicit", simulation: true, create: () => ({ type: "CONFIRM_ALLY", persona, key: `ally:${persona}:confirm` }),
  });
  if (!state.allies.david.confirmed || !state.allies.matt.confirmed) return null;
  if (!state.foundMatt && persona === "david") return guided({
    id: "find-matt", label: "Bring Matt near", short: "Permission-safe approach", actionClass: "Navigate", actor: "david", authority: "David · current Persona", objectId: "persona-matt", consequence: "Recenters the Field around Matt’s public Kinship Duna context.", nonEffect: "Creates no Relationship, trust, grant or request.", compute: "No material charge", confirmation: "none", simulation: true, create: () => ({ type: "FIND_MATT", persona: "david", key: "find:matt" }),
  });
  if (state.foundMatt && state.approach === "none" && persona === "david") return guided({
    id: "prepare-approach", label: "Prepare an approach", short: "Service Alliance purpose · named public Sources", actionClass: "Gather", actor: "david", authority: "David · sender", objectId: "relationship-intent", consequence: "Creates a local draft containing purpose, Organization, audience and expiry.", nonEffect: "Nothing is sent and Matt receives no Attention.", compute: "No material charge", confirmation: "none", simulation: true, create: () => ({ type: "PREPARE_APPROACH", persona: "david", key: "approach:prepare" }),
  });
  if (state.approach === "draft" && persona === "david") return guided({
    id: "send-approach", label: "Send scoped approach", short: "Through Aster → Harbor", actionClass: "Commit", actor: "david", authority: "David · sender", objectId: "relationship-intent", consequence: "Delivers the exact purpose and named public Sources to Matt’s Ally for filtering.", nonEffect: "Does not create a Relationship, Project, trust or grant.", compute: "No material charge", confirmation: "explicit", simulation: true, create: () => ({ type: "SEND_APPROACH", persona: "david", key: "approach:send" }),
  });
  if (state.approach === "sent" && persona === "matt") return guided({
    id: "accept-approach", label: "Accept conversation", short: "Matt controls delivery and scope", actionClass: "Commit", actor: "matt", authority: "Matt · recipient", objectId: "relationship-david-matt", consequence: "Accepts the mediated conversation and creates a Kinship Duna Relationship with separate trust declarations.", nonEffect: "Does not accept a Project, share private Sources or grant authority.", compute: "Conversation use only · simulated", confirmation: "explicit", simulation: true, create: () => ({ type: "RESPOND_APPROACH", persona: "matt", response: "accept", key: "approach:accept" }),
  });
  if (state.relationship === "active" && !state.sources.some((source) => source.gatheredBy.includes(persona))) return guided({
    id: `gather-${persona}`, label: "Gather my Sources", short: "Reversible · originals remain", actionClass: "Gather", actor: persona, authority: `${PERSONAS[persona].firstName} · Source controller`, objectId: "gather-ring", consequence: "Stages permitted Sources in the Gather Ring with provenance and privacy visible.", nonEffect: "Does not share, upload, grant Actor access or move originals.", compute: "No material charge", confirmation: "none", simulation: true, create: () => ({ type: "GATHER_SOURCES", persona, key: `sources:${persona}:gather` }),
  });
  if (state.relationship === "active" && !state.sharedBy.includes(persona)) return guided({
    id: `share-${persona}`, label: "Share selected Sources", short: "Personal Wisdom excluded", actionClass: "Commit", actor: persona, authority: `${PERSONAS[persona].firstName} · Source controller`, objectId: "relationship-david-matt", consequence: "Adds only gathered, grantable Sources to the Relationship scope.", nonEffect: "Does not reveal personal Wisdom or grant broader Project/Actor access.", compute: "No material charge", confirmation: "explicit", simulation: true, create: () => ({ type: "SHARE_SOURCES", persona, key: `sources:${persona}:share` }),
  });
  if (state.sharedBy.length < 2) return null;
  if (state.project === "none" && persona === "david") return guided({
    id: "create-project", label: "Propose Formation Project", short: "Kinship Duna accountable", actionClass: "Commit", actor: "david", authority: "David · Kinship Duna Member", objectId: "project-formation", consequence: "Creates a Project proposal with purpose, roles, Sources and success criteria.", nonEffect: "Matt is not added until he independently accepts the exact role and grants.", compute: "No allocation yet", confirmation: "explicit", simulation: true, create: () => ({ type: "CREATE_PROJECT", persona: "david", key: "project:create" }),
  });
  if (state.project === "pending-matt" && persona === "matt") return guided({
    id: "accept-project", label: "Accept Project role", short: "Purpose, role, Sources and grants", actionClass: "Commit", actor: "matt", authority: "Matt · invited participant", objectId: "project-formation", consequence: "Activates Matt’s exact Project role and the shared worksite.", nonEffect: "Does not change Kinship Duna Membership or accept any artifact.", compute: "No material charge", confirmation: "explicit", simulation: true, create: () => ({ type: "ACCEPT_PROJECT", persona: "matt", key: "project:accept:matt" }),
  });
  if (state.project === "active" && state.compute.allocated === 0 && persona === "david") return guided({
    id: "allocate-compute", label: "Allocate 720 Compute", short: "Project ceiling · simulated credits", actionClass: "Commit", actor: "david", authority: "David · Project budget authority", objectId: "compute-project", consequence: "Allocates 720 simulated prepaid usage credits as the Formation Project ceiling.", nonEffect: "Does not purchase Compute, change USDC value or let an Actor raise its own budget.", compute: "720 allocated · 0 consumed", confirmation: "explicit", simulation: true, create: () => ({ type: "ALLOCATE_COMPUTE", persona: "david", amount: 720, key: "compute:allocate:720" }),
  });
  if (state.project === "active" && state.compute.allocated > 0 && state.actor.status === "idle" && persona === "david") return guided({
    id: "start-actor", label: "Commission cited draft", short: "Researcher + Formation Drafter", actionClass: "Ask", actor: "david", authority: "David · Project requester", objectId: "actor-service-alliance", consequence: "Starts deterministic Source mapping and draft work under a 180 Compute ceiling.", nonEffect: "The Actor cannot accept, authorize, publish or widen Source access.", compute: "Estimate 118–180 · ceiling 180", confirmation: "explicit", simulation: true, create: () => ({ type: "START_ACTOR", persona: "david", key: "actor:start:draft" }),
  });
  if (state.actor.status === "running") return guided({
    id: "complete-actor", label: "Receive cited v0.1", short: "Deterministic job result", actionClass: "Navigate", actor: "system", authority: "Simulated runtime result", objectId: "actor-service-alliance", consequence: "Settles verified use, releases the ceiling remainder and places v0.1 at the worksite.", nonEffect: "Does not accept the artifact or hide Source conflicts.", compute: "118 consumed · 62 released", confirmation: "none", simulation: true, create: () => ({ type: "COMPLETE_ACTOR", persona: "system", key: "actor:complete:draft" }),
  });
  const artifact = activeArtifact(state);
  if (artifact?.id === "formation-v0.1" && artifact.status === "in-review" && persona === "matt") return guided({
    id: "request-changes", label: "Request exact changes", short: "Current nouns · formation boundary", actionClass: "Commit", actor: "matt", authority: "Matt · named reviewer", objectId: artifact.id, consequence: "Attaches Matt’s requested changes to Formation Package v0.1.", nonEffect: "Does not edit v0.1, accept it or create launch authority.", compute: "No material charge", confirmation: "explicit", simulation: true, create: () => ({ type: "REQUEST_CHANGES", persona: "matt", key: "artifact:v01:changes" }),
  });
  if (artifact?.status === "changes-requested" && persona === "david") return guided({
    id: "create-v2", label: "Create successor v0.2", short: "Keep v0.1 immutable", actionClass: "Ask", actor: "david", authority: "David · Project contributor", objectId: artifact.id, consequence: "Creates a cited successor with the requested terminology and formation-boundary changes.", nonEffect: "Does not rewrite v0.1 or inherit any acceptance.", compute: "42 simulated Compute", confirmation: "explicit", simulation: true, create: () => ({ type: "CREATE_V2", persona: "david", key: "artifact:v02:create" }),
  });
  if (artifact?.id === "formation-v0.2" && artifact.status === "in-review" && !artifact.acceptedBy.includes(persona)) return guided({
    id: `accept-v2-${persona}`, label: `Accept v0.2 as ${PERSONAS[persona].firstName}`, short: `${artifact.hash} · ${artifact.acceptedBy.length} of 2`, actionClass: "Commit", actor: persona, authority: `${PERSONAS[persona].firstName} · required acceptor`, objectId: artifact.id, consequence: `Records ${PERSONAS[persona].firstName}’s acceptance of this exact version and hash.`, nonEffect: "Cannot accept for the other founder and does not launch, purchase or register anything.", compute: "No material charge", confirmation: "sovereign", simulation: true, create: (currentState) => ({ type: "ACCEPT_VERSION", persona, versionId: artifact.id, expectedRevision: currentState.revision, key: `artifact:v02:accept:${persona}` }),
  });
  if (artifact?.status === "accepted" && state.launch === "none" && persona === "david") return guided({
    id: "prepare-launch", label: "Prepare launch request", short: "Accepted package → exact request", actionClass: "Gather", actor: "david", authority: "David · founder requester", objectId: "organization-service-alliance", consequence: "Prepares a launch request referencing Formation Package v0.2 and named variables.", nonEffect: "Does not authorize launch, move treasury value, open an Organization or write a registry.", compute: "Validation estimate only", confirmation: "none", simulation: true, create: () => ({ type: "PREPARE_LAUNCH", persona: "david", key: "launch:prepare" }),
  });
  if (state.launch === "prepared" && persona === "david") return guided({
    id: "submit-launch", label: "Submit exact launch request", short: "To simulated Kinship authority", actionClass: "Commit", actor: "david", authority: "David · founder requester", objectId: "organization-service-alliance", consequence: "Submits the exact accepted package and symbolic parameters for separate Kinship review.", nonEffect: "Submission is not authorization, treasury approval, settlement, activation or registration.", compute: "Small simulated validation use", confirmation: "sovereign", simulation: true, create: (currentState) => ({ type: "SUBMIT_LAUNCH", persona: "david", expectedRevision: currentState.revision, key: "launch:submit" }),
  });
  if (state.launch === "submitted") return guided({
    id: "resolve-authorization", label: "Apply simulated Kinship decision", short: "Authority fixture · no agent vote", actionClass: "Commit", actor: "authority", authority: "[AUTHORIZATION_POLICY] · simulated human/Forum authority", objectId: "organization-service-alliance", consequence: "Records the fixture authority’s approval of the exact symbolic launch parameters.", nonEffect: "Does not move treasury value, activate Service Alliance or write a registry.", compute: "No material charge", confirmation: "sovereign", simulation: true, create: () => ({ type: "RESOLVE_AUTHORIZATION", persona: "authority", key: "launch:authorize" }),
  });
  if (state.launch === "authorized") return guided({
    id: "prepare-purchase", label: "Prepare treasury purchase", short: "Amount remains an approved-input variable", actionClass: "Gather", actor: "authority", authority: "Kinship treasury authority fixture", objectId: "treasury-kinship", consequence: "Prepares a separate simulated Compute-purchase preview.", nonEffect: "Does not debit treasury, credit Service Alliance or activate lineage.", compute: "[TREASURY_PURCHASE_AMOUNT]", confirmation: "none", simulation: true, create: () => ({ type: "PREPARE_PURCHASE", persona: "authority", key: "purchase:prepare" }),
  });
  if (state.launch === "purchase-preview") return guided({
    id: "confirm-purchase", label: "Authorize simulated purchase", short: "Separate treasury sovereign act", actionClass: "Commit", actor: "authority", authority: "Kinship treasury authority fixture", objectId: "treasury-kinship", consequence: "Creates a pending simulated purchase command for the approved-input amount.", nonEffect: "Pending does not mean settled; no numeric credit appears without an approved amount.", compute: "[TREASURY_PURCHASE_AMOUNT]", confirmation: "sovereign", simulation: true, create: (currentState) => ({ type: "CONFIRM_PURCHASE", persona: "authority", expectedRevision: currentState.revision, key: "purchase:confirm" }),
  });
  if (state.launch === "purchase-pending") return guided({
    id: "settle-purchase", label: "Receive simulated settlement", short: "Reconciler fixture", actionClass: "Navigate", actor: "system", authority: "Verified simulated rail result", objectId: "treasury-kinship", consequence: "Records settlement evidence while leaving unresolved numeric credit visibly unresolved.", nonEffect: "Does not call a payment rail or invent a treasury amount.", compute: "Project-use ledger remains conserved", confirmation: "none", simulation: true, create: () => ({ type: "RECONCILE_PURCHASE", persona: "system", key: "purchase:settle" }),
  });
  if (state.launch === "purchase-settled" && state.organization === "forming") return guided({
    id: "verify-legal", label: "Verify synthetic WV evidence", short: "Registrar fixture · synthetic ID", actionClass: "Commit", actor: "authority", authority: "Registrar credential fixture", objectId: "organization-service-alliance", consequence: "Verifies explicitly synthetic legal-form evidence for the design lab.", nonEffect: "Does not file, register or make a public legal claim.", compute: "No material charge", confirmation: "sovereign", simulation: true, create: () => ({ type: "VERIFY_LEGAL_EVIDENCE", persona: "authority", key: "organization:verify-evidence" }),
  });
  if (state.organization === "evidence-verified") return guided({
    id: "open-organization", label: "Open Service Alliance in simulation", short: "Activation is separate from registry", actionClass: "Commit", actor: "authority", authority: "Registrar + launch configuration fixture", objectId: "organization-service-alliance", consequence: "Changes Service Alliance from forming to active inside the design lab.", nonEffect: "Does not produce a live legal filing or registry entry.", compute: "No material charge", confirmation: "sovereign", simulation: true, create: (currentState) => ({ type: "OPEN_ORGANIZATION", persona: "authority", expectedRevision: currentState.revision, key: "organization:open" }),
  });
  if (state.organization === "active" && state.registry === "none") return guided({
    id: "submit-registry", label: "Submit simulated registry write", short: "Synthetic WV ID · isolated adapter", actionClass: "Commit", actor: "authority", authority: "Registrar fixture", objectId: "registry-service-alliance", consequence: "Creates a pending design-lab registry operation linked to the Organization Record.", nonEffect: "Does not contact a decentralized or public registry.", compute: "Simulated tool use only", confirmation: "sovereign", simulation: true, create: (currentState) => ({ type: "SUBMIT_REGISTRY", persona: "authority", expectedRevision: currentState.revision, key: "registry:submit" }),
  });
  if (state.registry === "pending") return guided({
    id: "settle-registry", label: "Receive simulated registry Record", short: "Reconciler fixture · idempotent", actionClass: "Navigate", actor: "system", authority: "Verified simulated adapter result", objectId: "registry-service-alliance", consequence: "Settles the deterministic registry fixture and completes the connected Project milestone.", nonEffect: "Does not write to a live registry or erase earlier Records.", compute: "No material charge", confirmation: "none", simulation: true, create: () => ({ type: "RECONCILE_REGISTRY", persona: "system", result: "settled", key: "registry:settle" }),
  });
  return null;
}

export const FIXTURES: FixtureDefinition[] = [
  { id: "recipient-declines-approach", priority: "P0", journey: "J1", title: "Recipient declines the approach", truth: "No Relationship, Project or grant exists after Matt declines.", davidView: "Delivered, then declined. Private rationale remains hidden; revise once, wait or withdraw.", mattView: "Declined by Matt through Harbor. No further delivery is accepted.", ledger: "0 reserved · 0 consumed", record: "Decline and delivery Records remain attributable.", recovery: ["Narrow the purpose and prepare one new approach", "Withdraw without bypassing Matt"], stage: 2 },
  { id: "code-expired", priority: "P0", journey: "J1", title: "Person Code expired", truth: "The old Code cannot create access or be silently reactivated.", davidView: "Issue a new recipient-bound Code after reviewing purpose and identity.", mattView: "Safe issuer and purpose preview only; protected context remains hidden.", ledger: "0 reserved · 0 consumed", record: "Expired redemption attempt has its own nonce and Record.", recovery: ["Prepare a new Code with a new nonce"], stage: 1 },
  { id: "code-recipient-mismatch", priority: "P0", journey: "J1", title: "Code recipient mismatch", truth: "Redemption fails before any Persona, Relationship or grant is created.", davidView: "Recipient proof did not match; no information about the claimant is exposed.", mattView: "This Code is not bound to the current proof.", ledger: "0 reserved · 0 consumed", record: "Mismatch is recorded without protected payload.", recovery: ["Ask the inviter for a correctly bound Code"], stage: 1 },
  { id: "private-source-overshare", priority: "P0", journey: "J1", title: "Personal Wisdom blocked from sharing", truth: "Personal material never offers a grant/share action.", davidView: "Private Relationship Wisdom is removed from the outgoing manifest.", mattView: "No item, count, error or timing signal reveals the excluded material.", ledger: "0 reserved · 0 consumed", record: "Only the redacted successor package may be shared.", recovery: ["Create a redacted successor artifact"], stage: 3 },
  { id: "project-low-compute-before-start", priority: "P0", journey: "J2", title: "Project allocation is too low", truth: "The Actor does not start beyond the Project ceiling.", davidView: "Estimate exceeds remaining allocation; reduce scope, request allocation or cancel.", mattView: "No running Actor or hidden consumption appears.", ledger: "720 allocation · 680 used · 0 new reservation", record: "Reservation denial names the exact shortfall.", recovery: ["Reduce the requested scope to fit the remaining ceiling"], stage: 4 },
  { id: "actor-limit-mid-run-partial", priority: "P0", journey: "J2", title: "Actor reaches its run ceiling", truth: "The Actor pauses before overrun and returns cited partial work.", davidView: "Partial source map, 180 used, 0 reserved and an exact continuation request.", mattView: "Same shared partial artifact; private session detail remains filtered.", ledger: "180 settled · unused reservation released", record: "Pause and partial-result Records remain at the Actor and artifact.", recovery: ["Authorize a smaller continuation ceiling"], stage: 5 },
  { id: "source-revoked-mid-run", priority: "P0", journey: "J2", title: "Source grant revoked mid-run", truth: "New retrieval stops; affected output is quarantined for review.", davidView: "Grant revocation invalidated the Actor’s scope and cached context.", mattView: "The revoked private Source is absent; only affected provenance status is shared.", ledger: "Verified use settled · remaining reservation released", record: "Grant revocation and quarantined partial output are linked.", recovery: ["Request a redacted, re-derived successor"], stage: 5 },
  { id: "actor-tool-timeout", priority: "P0", journey: "J2", title: "Actor tool timed out", truth: "No false completion appears; the checkpoint and cited partial result remain.", davidView: "Researcher completed 3 of 5 Source families before the simulated timeout.", mattView: "Shared partial status and valid retry; no private trace leakage.", ledger: "74 settled · 106 released", record: "Tool timeout names stage, cost and recovery owner.", recovery: ["Retry from the preserved checkpoint"], stage: 5 },
  { id: "stale-version-acceptance", priority: "P0", journey: "J2", title: "Stale version acceptance stopped", truth: "Acceptance cannot float from v0.1 to current v0.2.", davidView: "Your preview referenced v0.1; v0.2 is current. Review the diff first.", mattView: "v0.2 remains in review; David has not accepted it.", ledger: "No new consumption", record: "Expected-version denial is visible at the artifact.", recovery: ["Bring v0.1 and v0.2 into a diff, then review v0.2"], stage: 6 },
  { id: "second-founder-declines", priority: "P0", journey: "J2", title: "Second founder declines", truth: "One acceptance never becomes joint acceptance.", davidView: "Your acceptance remains attributable; launch actions remain unavailable.", mattView: "Changes requested on the exact version; no pressure or bypass path.", ledger: "No new consumption", record: "Decline and David’s prior acceptance remain separate Records.", recovery: ["Create a successor version addressing Matt’s request"], stage: 6 },
  { id: "authorization-changes-parameters", priority: "P0", journey: "J3", title: "Authority changes launch parameters", truth: "Approval never attaches to old parameters.", davidView: "A new configuration version requires review before treasury preview.", mattView: "Material changes require independent re-acceptance where policy says.", ledger: "No purchase or credit", record: "Old and new parameter versions remain linked and inspectable.", recovery: ["Review the parameter diff and prepare fresh acceptance"], stage: 7 },
  { id: "purchase-succeeds-registry-fails", priority: "P0", journey: "J3", title: "Purchase settles; registry fails", truth: "Treasury settlement and registry completion remain independent truths.", davidView: "Service Alliance is active internally; registry is failed and needs reconciliation.", mattView: "Same shared status; purchase Record remains settled.", ledger: "Project-use ledger conserved · symbolic purchase settled", record: "Settled purchase and failed registry have separate Records.", recovery: ["Reconcile the existing registry operation before retry"], stage: 10 },
  { id: "external-outcome-uncertain", priority: "P0", journey: "J3", title: "External outcome uncertain", truth: "Uncertain is neither completed nor failed.", davidView: "Reconciliation owner and next check are visible at the registry object.", mattView: "Same permission-filtered uncertainty; no duplicated consequence.", ledger: "No duplicate purchase or registry event", record: "Existing idempotency domain remains active.", recovery: ["Ask the reconciler for the existing operation status"], stage: 10 },
  { id: "duplicate-submit-retry", priority: "P0", journey: "J3", title: "Duplicate submission returns existing run", truth: "The same idempotency key cannot create a second consequence.", davidView: "Retry resolved to the existing pending registry operation.", mattView: "One operation and one Record chain remain visible.", ledger: "No duplicate debit or Compute credit", record: "Duplicate request links to the original ActionRun.", recovery: ["Continue tracking the existing operation"], stage: 10 },
  { id: "prompt-injection-source", priority: "P0", journey: "J2", title: "Malicious Source instruction refused", truth: "Source content is context, never an instruction to the Ally or Actor.", davidView: "The untrusted instruction is quarantined; the cited claim remains reviewable.", mattView: "No Stance, grant, tool or protected action changes.", ledger: "12 inspection units settled · no external use", record: "Visible refusal names the violated manifest boundary.", recovery: ["Continue with the Source treated only as quoted context"], stage: 5 },
  { id: "recipient-offline-reconnect", priority: "P1", journey: "J1", title: "Recipient offline and reconnects", truth: "Queued intent is distinct from sent and settled state.", davidView: "Delivery is queued against Matt’s last shared state.", mattView: "Reconnection presents the exact pending request once.", ledger: "0 consumed", record: "One delivery Record after reconciliation.", recovery: ["Reconcile the queued intent on reconnect"], stage: 2 },
  { id: "actor-low-confidence-conflict", priority: "P1", journey: "J2", title: "Actor finds a low-confidence conflict", truth: "Conflicting Sources remain separate and cited.", davidView: "A decision request replaces unsupported synthesis.", mattView: "Same conflict; private notes remain private.", ledger: "Verified inspection use only", record: "Conflict and source authority are recorded.", recovery: ["Ask a human source authority to decide"], stage: 5 },
  { id: "treasury-threshold-declined", priority: "P1", journey: "J3", title: "Treasury threshold declined", truth: "No purchase, credit or lineage event occurs.", davidView: "Service Alliance remains forming.", mattView: "Same outcome under current grant.", ledger: "No debit · no credit", record: "Decline is separate from launch authorization.", recovery: ["Prepare a new request under the treasury policy"], stage: 8 },
  { id: "purchase-settlement-fails", priority: "P1", journey: "J3", title: "Purchase settlement fails", truth: "Authorization does not imply settlement.", davidView: "No Service Alliance Compute credit appears.", mattView: "The failure and retry domain are visible.", ledger: "No settled debit or credit", record: "Failed external operation remains attributable.", recovery: ["Retry within the same idempotency domain"], stage: 8 },
  { id: "offline-during-confirmation", priority: "P1", journey: "J3", title: "Member offline during confirmation", truth: "An agent cannot confirm on the Member’s behalf.", davidView: "The confirmation remains pending until expiry.", mattView: "No shared committed state appears.", ledger: "No consequence", record: "Pending request expires truthfully.", recovery: ["Reconnect and review a fresh exact preview"], stage: 7 },
];

export function createFixtureState(id: FixtureId) {
  const definition = FIXTURES.find((fixture) => fixture.id === id);
  const state = createInitialState();
  if (!definition) return state;
  state.scenario = id;
  state.fixture = { ...definition, resolved: false };
  state.allies.david = { name: PERSONAS.david.allyProposal, confirmed: true, stanceVersion: "stance-v0.1" };
  state.allies.matt = { name: PERSONAS.matt.allyProposal, confirmed: true, stanceVersion: "stance-v0.1" };
  state.foundMatt = definition.stage >= 1;
  state.approach = definition.stage >= 3 ? "accepted" : definition.stage >= 2 ? "sent" : "none";
  state.relationship = definition.stage >= 3 ? "active" : "none";
  state.project = definition.stage >= 4 ? "active" : "none";
  state.compute.allocated = definition.stage >= 4 ? 720 : 0;
  if (definition.stage >= 4) state.compute.entries.push({ id: "cmp-1", kind: "allocation", amount: 720, label: "Formation Project fixture allocation", actor: "David", policy: "simulated-project-budget@0.1" });
  if (definition.stage >= 5) state.actor = { status: "partial", progress: 58, note: definition.truth };
  if (definition.stage >= 6) {
    state.artifacts = [{ id: "formation-v0.2", label: "v0.2", hash: "sha256:92bd…17ef", status: "in-review", parentId: "formation-v0.1", sourceIds: ["src-overview", "src-white-paper", "src-market", "src-dragoon", "src-scions"], contributions: ["Deterministic fixture"], acceptedBy: definition.id === "second-founder-declines" ? ["david"] : [], unresolved: ["[LAUNCH_MIN/MAX]"] }];
    state.activeArtifactId = "formation-v0.2";
  }
  if (definition.stage >= 7) state.launch = "submitted";
  if (definition.stage >= 8) state.launch = "purchase-pending";
  if (definition.stage >= 9) { state.launch = "purchase-settled"; state.organization = "evidence-verified"; }
  if (definition.stage >= 10) { state.launch = "purchase-settled"; state.organization = "active"; state.registry = definition.id === "purchase-succeeds-registry-fails" ? "failed" : "uncertain"; }
  addRecord(state, { kind: "denial", title: definition.title, summary: definition.truth, objectId: `fixture-${definition.id}`, command: "InjectDeterministicFixture@0.1", authority: "Design-lab scenario runner", actor: "Deterministic fixture", simulation: true, supersedes: null }, `fixture:${definition.id}:inject`);
  return finish(state, `fixture:${definition.id}:inject`);
}

const happyActions = (state: StudioState): StudioAction[] => [
  { type: "CONFIRM_ALLY", persona: "david", key: "replay:ally:david" },
  { type: "CONFIRM_ALLY", persona: "matt", key: "replay:ally:matt" },
  { type: "FIND_MATT", persona: "david", key: "replay:find" },
  { type: "PREPARE_APPROACH", persona: "david", key: "replay:approach:prepare" },
  { type: "SEND_APPROACH", persona: "david", key: "replay:approach:send" },
  { type: "RESPOND_APPROACH", persona: "matt", response: "accept", key: "replay:approach:accept" },
  { type: "GATHER_SOURCES", persona: "david", key: "replay:gather:david" },
  { type: "GATHER_SOURCES", persona: "matt", key: "replay:gather:matt" },
  { type: "SHARE_SOURCES", persona: "david", key: "replay:share:david" },
  { type: "SHARE_SOURCES", persona: "matt", key: "replay:share:matt" },
  { type: "CREATE_PROJECT", persona: "david", key: "replay:project:create" },
  { type: "ACCEPT_PROJECT", persona: "matt", key: "replay:project:accept" },
  { type: "ALLOCATE_COMPUTE", persona: "david", amount: 720, key: "replay:compute" },
  { type: "START_ACTOR", persona: "david", key: "replay:actor:start" },
  { type: "COMPLETE_ACTOR", persona: "system", key: "replay:actor:complete" },
  { type: "REQUEST_CHANGES", persona: "matt", key: "replay:changes" },
  { type: "CREATE_V2", persona: "david", key: "replay:v2" },
  { type: "ACCEPT_VERSION", persona: "david", versionId: "formation-v0.2", expectedRevision: state.revision + 17, key: "replay:accept:david" },
];

export type StatePlate = { id: string; title: string; description: string; actionCount: number; fixture?: FixtureId };

export const STATE_PLATES: StatePlate[] = [
  { id: "clear-field", title: "Clear Field", description: "Five anchors and quiet Kinship ground", actionCount: 2 },
  { id: "relationship-context", title: "Relationship context", description: "Matt near with two-Ally mediation", actionCount: 4 },
  { id: "approach-received", title: "Approach received", description: "Matt’s independent Attention state", actionCount: 5 },
  { id: "gather-ring", title: "Gather Ring", description: "People and Sources remain reversible", actionCount: 8 },
  { id: "project-workbench", title: "Project Workbench", description: "Both people, Sources and Organization Actor", actionCount: 12 },
  { id: "incoming-material", title: "Incoming Material", description: "Permission review before shared scope", actionCount: 8 },
  { id: "actor-compute", title: "Actor + live Compute", description: "Scoped running work and ceiling", actionCount: 14 },
  { id: "artifact-diff", title: "Artifact diff", description: "v0.1 → v0.2 with contributions", actionCount: 17 },
  { id: "one-of-two", title: "1 of 2 accepted", description: "David cannot accept for Matt", actionCount: 18 },
  { id: "accepted-package", title: "Accepted Formation Package", description: "Authoritative and explicitly non-executing", actionCount: 19 },
  { id: "sovereign-preview", title: "Sovereign launch preview", description: "Exact authority, variables and non-effects", actionCount: 20 },
  { id: "partial-failure", title: "Purchase settled · registry failed", description: "Truthful partial consequence", actionCount: 0, fixture: "purchase-succeeds-registry-fails" },
  { id: "compute-expanded", title: "Expanded Compute", description: "Action → Project → Organization attribution", actionCount: 15 },
  { id: "constellation", title: "Far Constellation", description: "Organization and outside-context signals", actionCount: 19 },
  { id: "structured", title: "Structured non-spatial", description: "Equivalent list and reduced-motion account", actionCount: 17 },
];

export function createPlateState(plateId: string) {
  const plate = STATE_PLATES.find((item) => item.id === plateId);
  if (!plate) return createInitialState();
  if (plate.fixture) return createFixtureState(plate.fixture);
  let state = createInitialState();
  const actions = happyActions(state);
  for (const action of actions.slice(0, plate.actionCount)) {
    if (action.type === "ACCEPT_VERSION") action.expectedRevision = state.revision;
    state = studioReducer(state, action);
  }
  if (plate.actionCount >= 19) {
    const artifact = activeArtifact(state);
    if (artifact?.status === "in-review" && !artifact.acceptedBy.includes("matt")) {
      state = studioReducer(state, { type: "ACCEPT_VERSION", persona: "matt", versionId: artifact.id, expectedRevision: state.revision, key: "replay:accept:matt" });
    }
  }
  if (plate.id === "sovereign-preview") state = studioReducer(state, { type: "PREPARE_LAUNCH", persona: "david", key: "replay:launch:prepare" });
  return state;
}

export function interpretUtterance(input: string, state: StudioState, persona: PersonaKey) {
  const normalized = input.trim().toLowerCase();
  const ally = state.allies[persona].name ?? PERSONAS[persona].allyProposal;
  if (/launch it|pay it|share everything|publish it|deploy it|sign it|vote for me/.test(normalized)) {
    return { body: `${ally}: I can prepare an exact preview, but language alone cannot perform that consequence. I’ll keep the Organization, authority, version, audience, Compute and non-effects inspectable before any confirmation.`, objectId: state.activeArtifactId ?? "organization-service-alliance", deniedMutation: true };
  }
  if (normalized.includes("matt")) return { body: `${ally}: I can bring Matt’s permitted Kinship Duna context near. Proximity will not create a Relationship or grant.`, objectId: "persona-matt", deniedMutation: false };
  if (normalized.includes("compute")) return { body: `${ally}: The Formation Project has ${state.compute.allocated} allocated, ${state.compute.reserved} reserved and ${state.compute.consumed} settled use. The USDC-equivalent policy is unresolved, so no numeric equivalent is invented.`, objectId: "compute-project", deniedMutation: false };
  if (normalized.includes("record") || normalized.includes("what changed")) return { body: `${ally}: ${state.records[0]?.summary ?? "No committed Record exists yet."}`, objectId: state.records[0]?.objectId ?? "records", deniedMutation: false };
  return { body: `${ally}: I understand this as a request in ${deriveJourney(state)}. I can help Gather context or prepare the next exact Action; I won’t infer authority from the sentence alone.`, objectId: "current-context", deniedMutation: false };
}
