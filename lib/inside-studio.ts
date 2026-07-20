export type InsideStudioStepId =
  | "calm-realm-start"
  | "scheduling-instrument"
  | "palo-alto-project"
  | "inner-clinic"
  | "nature-of-work"
  | "second-cavalry";

export type InsideStudioPanel = "story" | "engineering";

type InsideStudioStep = {
  id: InsideStudioStepId;
  number: number;
  title: string;
  label: string;
  route: string;
  presence: string;
  role: string;
  realm: string;
  storyTitle: string;
  story: string;
  moment: string;
  reference: string;
  notes: readonly string[];
};

export const INSIDE_STUDIO_STEPS: readonly InsideStudioStep[] = [
  {
    id: "calm-realm-start",
    number: 1,
    title: "Calm Realm start",
    label: "1. Calm Realm start",
    route: "/inside-studio/gate-1?scene=0&embed=1",
    presence: "David",
    role: "Project Steward returning to a Realm",
    realm: "Palo Alto Commemoration",
    storyTitle: "David returns without entering a dashboard",
    story: "David returns to the Palo Alto Commemoration Realm with Ki beside him. The Realm and current Focus are clear, while the interface asks only what deserves attention now. Work elsewhere remains quiet. People, Sources, schedules, integrations, and operational machinery do not compete for equal visual weight. David can resume the opening decision or bring the steering group together without losing the calm conversational center.",
    moment: "The Studio feels alive because it remembers the work and its relationships—not because it displays everything at once.",
    reference: "Gate 1 · Scene 1 · accepted one-center shell",
    notes: [
      "Preserve one active Realm, one current Focus, one dominant conversational surface, and no more than three elevated objects.",
      "The starting state must be understandable within three seconds without scanning a dashboard, sidebar, feed, or project-management surface.",
      "Ki is the continuous conversational presence. Realm identity and purpose remain persistent but quiet.",
      "Only material attention appears. Routine progress, social activity, integrations, and system plumbing stay hidden until requested or consequential.",
      "The review navigation shown around this design is prototype-only and must not become permanent Studio navigation.",
      "Focus, Attention Thread, Lens, Stage, and one-center shell are current design terms, not canonical taxonomy.",
    ],
  },
  {
    id: "scheduling-instrument",
    number: 2,
    title: "Scheduling instrument inside conversation",
    label: "2. Scheduling instrument inside conversation",
    route: "/inside-studio/gate-1?scene=1&embed=1",
    presence: "David",
    role: "Project Steward preparing a group decision",
    realm: "Palo Alto Commemoration",
    storyTitle: "A schedule appears because the work needs it",
    story: "David asks Ki to bring the steering group together before Friday. Ki quietly checks the connected schedules and returns three relevant choices inside the existing conversation. The scheduling instrument is temporary and purposeful: it compares availability, prepares an agenda, and names what will change. David reviews the exact invitation before anything reaches another person or calendar.",
    moment: "Connected calendars remain invisible; only the decision David needs and the consequence he controls enter the conversation.",
    reference: "Gate 1 · Scene 2 · accepted scheduling instrument",
    notes: [
      "Use conversation as the entry and return surface. The scheduling instrument appears inline only after a clear scheduling intention.",
      "Connected calendar details remain private and hidden. Expose availability needed for the decision, not other participants’ calendar contents.",
      "The proposed Action must name recipients, time, agenda, external effect, visibility, authority, reversibility, and what remains unchanged.",
      "Sending invitations requires David’s explicit Gate. A connected calendar or Agent never grants authority to contact people or create events.",
      "Successful execution creates an inspectable meeting Record. Cancellation, stale availability, declined access, partial delivery, provider failure, and retry require recoverable states before production.",
      "The instrument should recede after completion while the conversation and resulting Record remain available.",
    ],
  },
  {
    id: "palo-alto-project",
    number: 3,
    title: "Palo Alto project work with Matt",
    label: "3. Palo Alto project work with Matt, Sources, decision, and Record",
    route: "/inside-studio/gate-1?scene=2&embed=1",
    presence: "David",
    role: "Project Editor collaborating with Matt",
    realm: "Palo Alto Commemoration",
    storyTitle: "David and Matt make one grounded decision together",
    story: "David asks Ki to help him and Matt decide how the commemoration should open. Matt’s bilingual welcome proposal becomes the live contribution, while the program Artifact expands into the temporary work surface. Three Sources remain attached and inspectable. David can understand the proposed change, Matt’s reasoning, and its grounding before exercising project-editor authority. Acceptance creates a new version and a durable decision Record without erasing the prior program.",
    moment: "Collaboration is visible through contribution, grounding, authority, and version history—not a permanent roster of faces.",
    reference: "Gate 1 · Scene 3 · accepted Element Stage and decision Record",
    notes: [
      "Preserve the existing David–Ki conversation while the program Artifact becomes the temporary dominant Stage.",
      "Matt appears because his contribution is active and material. Do not add a permanent collaborator grid or equal-weight people panel.",
      "Each Source preview must retain kind, issuer or custodian, date, provenance, applicability, and a path to the permitted original.",
      "The expanded Element must clearly distinguish Artifact content, proposed change, contributor reasoning, Ki grounding, and governing authority.",
      "Acceptance requires the named project-editor Gate and creates Program version 5 plus an inspectable decision Record. Version 4 remains recoverable.",
      "Do not convert the historical Sources or the program Artifact into autonomous Agents. Ki or a relevant Actor converses with those Elements as grounded context.",
    ],
  },
  {
    id: "inner-clinic",
    number: 4,
    title: "Inner Clinic — clinician-reviewed patient-record Scene",
    label: "4. Inner Clinic — clinician-reviewed patient-record Scene",
    route: "/inside-studio/gate-2b1?scene=0&embed=1",
    presence: "Mara",
    role: "Patient in an authorized clinician Relationship",
    realm: "Inner Clinic",
    storyTitle: "Mara understands a record without receiving a diagnosis",
    story: "Mara asks Ki to help her understand what the surgeon documented and what two stents are doing. Ki uses only the authorized record set, keeps documented facts separate from clinician interpretation and generic illustration, and visibly leaves unsupported questions unknown. Patient consent and Dr. Shah’s named review are present before the explanatory Scene is complete. Mara can inspect every represented claim and return through the Portal without losing her question or review Record.",
    moment: "The Scene earns trust by making its limits, Sources, consent, and human clinical authority more visible—not less.",
    reference: "Gate 2B.1 · Inner Clinic primary scene · fictional behavior study",
    notes: [
      "This is a fictional design-pattern study and must not be treated as clinical validation, diagnosis, prognosis, treatment advice, or a production health-record implementation.",
      "Every patient-specific represented finding must resolve to a dated, authorized Source. Documented, clinician-interpreted, illustrative, and unknown layers must differ through labels and symbols, not color alone.",
      "A patient-specific Scene requires an authorized Source set, patient consent, and named clinician review. Missing authority constrains or prohibits completion.",
      "Ki must explicitly refuse unsupported diagnosis, prognosis, precision, and interpolation. Generic illustration must never imply that it represents the patient’s exact anatomy.",
      "Preserve Scene version, Source manifest, transforms, uncertainty, consent, clinician review, disclosure, correction, and Portal return continuity as durable evidence.",
      "Production work requires clinical/legal custody, privacy and security review, participating-Institution agreements, credential verification, incident handling, accessibility, and real correction/withdrawal policy. These are not supplied by this prototype.",
    ],
  },
  {
    id: "nature-of-work",
    number: 5,
    title: "The Nature of Work — legitimate collective learning",
    label: "5. The Nature of Work — private insight to collective learning",
    route: "/inside-studio/gate-2b1?scene=1&embed=1",
    presence: "Avery",
    role: "Transformation Program participant",
    realm: "The Nature of Work",
    storyTitle: "Avery contributes without surrendering a private reflection",
    story: "Avery tells Ki privately that people may not know which concerns are safe to name. The private conversation stays personal and never becomes an Organization Source. Ki prepares a separate, reviewable contribution that abstracts the pattern and shows its scope, attribution, use, retention, withdrawal, and accepting authority. The Program synthesis uses only eligible contributions, states exclusions and nonparticipation, preserves a minority interpretation, and remains a proposal until the team steward acts.",
    moment: "Collective intelligence becomes legitimate only because the private relationship, shareable Artifact, and governed synthesis remain visibly separate.",
    reference: "Gate 2B.1 · Nature of Work primary scene · fictional behavior study",
    notes: [
      "Never derive Organization learning from private Ki conversations, personal reflections, covert capture, or technically accessible data.",
      "Private reflection, Relationship reflection, deliberate contribution, and adopted collective Wisdom are separate channels; information never moves automatically between them.",
      "Before sending, the Contribution Envelope must show exact receiving scope, attribution, permitted use, retention, withdrawal, Source/provenance, and acceptance authority.",
      "A synthesis must state eligible coverage, exclusions, optional participation, uncertainty, dissent, review date, and who may accept it. Do not say ‘everyone thinks’ without support.",
      "Prohibit person-level sentiment, loyalty, engagement, wellness, performance, risk, or culture-fit scoring and any manager, sponsor, Wizard, or employer access to private Ki relationships.",
      "Production planning requires actual Organization authority, participant agreement, OD Source corpus, anti-reidentification policy, facilitation model, employment-law review, appeal, correction, withdrawal, and harm response. None is established by this prototype.",
    ],
  },
  {
    id: "second-cavalry",
    number: 6,
    title: "2nd Cavalry — oral history with provenance and control",
    label: "6. 2nd Cavalry — oral history with provenance and control",
    route: "/inside-studio/gate-2b1?scene=2&embed=1",
    presence: "Ray",
    role: "Veteran and oral-history contributor",
    realm: "73 Easting Oral History Project",
    storyTitle: "Ray preserves a memory without surrendering control",
    story: "Ray records what his crew remembers about 73 Easting before the anniversary. Ki maintains a private safe draft and never supplies or improves Ray’s memory. Ray can pause, skip, mark a passage private, or stop. The original recording remains distinct from the transcript and from linked official context. Before submission, Ray reviews attribution, audience, permitted use, sensitive passages, verification visibility, and withdrawal limits. Archive acceptance creates a durable custody Record while keeping derivatives correctable.",
    moment: "The contribution feels human because Ray controls the telling; it becomes durable because rights, custody, provenance, and correction travel with it.",
    reference: "Gate 2B.1 · 2nd Cavalry primary scene · fictional behavior study",
    notes: [
      "Preserve original media separately from transcript, metadata, interpretation, reconstruction, and later editorial representation. Never silently rewrite original testimony.",
      "Recording start is Confirmed. Member or public release, identity linking, sensitive service or health disclosure, and archive custody require the appropriate separate Gates and named authorities.",
      "Release preview must show attribution, audience, permitted use, service-verification visibility, sensitive passages, preservation terms, correction, and withdrawal limits.",
      "Related official Sources and other testimony may provide context but must not correct, rank, average, or overwrite the veteran’s memory.",
      "The prototype must not expose confidential SADUNA launch, founder, legal, governance, or financial material and must not claim current Association authority, archive custody, rights, or benefits/medical authority.",
      "Production planning requires executed archive authority, rights and release policy, custody and integrity controls, editorial governance, sensitive-service handling, human support escalation, appeal, migration reconciliation, and long-term preservation policy.",
    ],
  },
];

export function insideStudioStep(id: InsideStudioStepId) {
  return INSIDE_STUDIO_STEPS.find((step) => step.id === id) ?? INSIDE_STUDIO_STEPS[0];
}

export function insideStudioStoryCopyText(id: InsideStudioStepId) {
  const step = insideStudioStep(id);
  return [
    `Inside the Studio · ${step.number} · Presence Story`,
    step.storyTitle,
    `Presence: ${step.presence}`,
    `Role: ${step.role}`,
    `Realm: ${step.realm}`,
    step.story,
    `Moment: ${step.moment}`,
  ].join("\n\n");
}

export function insideStudioEngineeringCopyText(id: InsideStudioStepId) {
  const step = insideStudioStep(id);
  const numberedNotes = step.notes.map((note, index) => `${index + 1}. ${note}`).join("\n");
  return [
    `Inside the Studio · ${step.number} · Engineering Notes`,
    step.title,
    `Reference: ${step.reference}`,
    numberedNotes,
  ].join("\n\n");
}
