# Kiduna Studio Prototype V0 — Prioritized User Stories

**Status:** Proposed for Gate 1 approval  
**Purpose:** Define Member-visible outcomes without prescribing technical implementation  
**Source:** Definition Pack journeys, principles and acceptance contract

## How to read these stories

- **P0** stories form the first connected production candidate.
- **P1** stories deepen completeness after the first preview is reviewed.
- Acceptance IDs refer to the source contract in `08-PROTOTYPE-SCOPE-AND-ACCEPTANCE.md`.
- These are product stories. They do not prescribe components, databases, APIs or production architecture.

## P0 — connected experience slice

| ID | Journey | User story | Observable outcome | Acceptance trace |
|---|---|---|---|---|
| US-P0-01 | J1 | As David or Matt, I can begin privately with Ki and explicitly shape and confirm my own Ally, so my continuous agentic counterpart reflects my direction rather than someone else’s. | Each Persona has one separately confirmed Ally identity/Stance and an attributable Record. | `AT-AG-01`, `AT-SEC-01`, `AT-COL-04` |
| US-P0-02 | J1–J3 | As a Member, I can understand where I am, who is with me, what needs me, and what Compute is available without leaving the Field. | Clear/Context/Focus and Self/Ally, context, Compute, Attention and Find remain identifiable throughout. | `AT-UX-01`, `AT-UX-02`, `AT-UX-04`, `AT-HUD-01` |
| US-P0-03 | J1 | As David, I can find and approach Matt in the current Organization without creating a Relationship or revealing protected information merely by bringing him near. | Matt approaches spatially; no Relationship, trust, permission or Project changes. | `AT-UX-05`, `AT-GAT-02`, `AT-SEC-04` |
| US-P0-04 | J1 | As an inviter, I can prepare a purpose-limited invitation for someone who is not registered without pretending that person is already a Member or Relationship. | The prospect remains an attributed intent; safe single-use/expiring Code behavior and recovery are understandable. | `AT-INV-01`, `AT-INV-02`, `AT-SEC-05` |
| US-P0-05 | J1 | As David or Matt, I can converse with the other person in a way that feels direct while understanding when our Allies mediate, filter or deliver the exchange. | The human speaker, mediator, recipient and delivery result remain recoverable without a three-bot transcript. | `AT-AG-01`, `AT-REL-04`, `AT-SEC-01` |
| US-P0-06 | J1 | As the recipient of an approach, I can accept, narrow, defer or decline it without the sender bypassing my boundary or learning private rationale. | Prior state remains truthful; delivery result and allowed next step arrive without a fabricated Relationship. | `AT-REL-04`, `AT-PRIV-03`, `AT-SEC-04` |
| US-P0-07 | J1 | As a Member, I can Gather selected Sources and prepare sharing while originals remain in place and nothing is granted by proximity alone. | Selection is reversible; Incoming Material and valid next actions show source, scope and non-effects. | `AT-GAT-01`, `AT-GAT-02`, `AT-ART-02` |
| US-P0-08 | J1–J2 | As a Source owner, I can share only permitted material and keep public, private, secret and personal boundaries intact, including if access changes during work. | Both sessions see compatible shared truth; unauthorized detail does not cross the boundary; affected work stops on revocation. | `AT-PRIV-01`, `AT-PRIV-03`, `AT-PRIV-04`, `AT-SEC-05` |
| US-P0-09 | J1 | As David or Matt, I can inspect our Relationship as a contextual place with separate trust, grants, shared material and pending acts rather than as a generic connection. | Trust does not create authority; the Relationship belongs to Kinship Duna and carries its own state. | `AT-REL-01`, `AT-REL-03`, `AT-PRJ-01` |
| US-P0-10 | J1 | As David, I can propose a Service Alliance Formation Project, and as Matt I can independently review and accept its purpose, role, Sources and grants. | One accountable Kinship Duna Project becomes active only after the required acceptance. | `AT-PRJ-01`, `AT-COL-02`, `AT-COL-04` |
| US-P0-11 | J2 | As either collaborator, I can leave and return to calm object-linked changes, then overlap live without being subjected to cursor or keystroke surveillance. | Handoffs, contributions and requests arrive at the affected object; shared state reconciles. | `AT-COL-01`, `AT-COL-02`, `AT-COL-03`, `AT-COL-04` |
| US-P0-12 | J2 | As a Project participant, I can ask one coherent Service Alliance Actor for work and inspect the Sources, scope, tools, contributors, limits, Compute and accountable authority behind its result. | The default conversation is coherent; internal delegation and provenance are available when needed. | `AT-AG-02`, `AT-AG-03`, `AT-AG-04`, `AT-SEC-02` |
| US-P0-13 | J2 | As a budget authority, I can allocate Compute to the Project, understand an estimate and ceiling, and see reservation, use, release and remaining balance without financial-market framing. | The ledger reconciles and each settled unit is attributable to its work and agent. | `AT-CMP-01`, `AT-CMP-02`, `AT-CMP-03`, `AT-CMP-05` |
| US-P0-14 | J2 | As a Project participant, I can stop or recover from low Compute, Actor limits, Source revocation or tool failure without losing truthful partial work or being charged beyond verified use. | Work does not start or pauses safely; partial result, exact use/release and valid recovery remain visible. | `AT-CMP-03`, `AT-CMP-04`, `AT-PRIV-04`, `AT-AG-03` |
| US-P0-15 | J2 | As David or Matt, I can inspect the Formation Package’s exact version, Sources, contributions, permissions, unresolved variables, rights and Compute before relying on it. | Artifact anatomy and simulation/provenance remain available from draft through acceptance. | `AT-ART-01`, `AT-ACT-04`, `AT-SEC-05` |
| US-P0-16 | J2 | As a collaborator, I can request review, ask for changes and compare v0.1 with its successor without rewriting history. | Comments and state arrive at the artifact; the prior version remains inspectable and the successor carries a clear diff. | `AT-COL-01`, `AT-COL-02`, `AT-REC-02` |
| US-P0-17 | J2 | As David or Matt, I can independently accept one exact Formation Package version and cannot accept for the other person or accidentally accept a stale successor. | “1 of 2 accepted” is truthful; both acceptances bind the same hash; acceptance alone does not launch anything. | `AT-ACT-01`, `AT-SOV-01`, `AT-SOV-02`, `AT-SOV-03`, `AT-REC-01` |
| US-P0-18 | J3 | As a founder, I can ask Studio to prepare a launch request from the accepted package without an ambiguous phrase executing any consequential action. | Language prepares an exact, inspectable request; the affected objects remain unchanged until proper authority confirms. | `AT-ACT-01`, `AT-ACT-02`, `AT-ACT-03`, `AT-SOV-01` |
| US-P0-19 | J3 | As an authorized participant, I can distinguish founder acceptance, Kinship Duna authorization and changed launch parameters, and I must re-review when material parameters change. | Each truth has its own exact version, authority and Record; changed parameters invalidate prior confirmation where required. | `AT-SOV-01`, `AT-SOV-02`, `AT-REC-01`, `AT-EXT-01` |
| US-P0-20 | J3 | As a permitted viewer or treasury authority, I can distinguish purchase preview, authorization, pending settlement and settled simulated Compute without mistaking approval for value movement. | Balances and Records remain reconciled; no live rail is reachable and every simulated consequence is labeled. | `AT-CMP-02`, `AT-EXT-01`, `AT-EXT-02`, `AT-SIM-01`, `AT-SIM-02` |
| US-P0-21 | J3 | As a Member, I can see Service Alliance remain forming until simulated legal evidence is verified, then see Organization activation and registry settlement as separate states. | Draft/forming/active/registered labels remain truthful in each Persona’s exact Organization capacity. | `AT-ORG-01`, `AT-ORG-02`, `AT-EXT-01` |
| US-P0-22 | J3 | As a Member, I can recover safely when registry completion fails or an external outcome is uncertain, without duplicating a purchase or erasing settled history. | Partial and uncertain states remain at affected objects; retries reconcile and corrections supersede. | `AT-EXT-02`, `AT-EXT-03`, `AT-ACT-03`, `AT-REC-02`, `AT-SIM-03` |
| US-P0-23 | J1–J3 | As a Member, I experience one rich, warm, mysterious Kidunaverse whose Service Alliance context feels distinct without behaving like a separate branded application. | Espresso depth, bounded navy/bronze atmosphere, shared node grammar, restrained authority color and semantic motion survive all journeys. | `AT-VIS-01`, `AT-VIS-02`, `AT-VIS-03`, `AT-MOT-01`, `AT-UX-07` |
| US-P0-24 | J1–J3 | As a Member using keyboard, screen reader, reduced motion, increased contrast or a narrow display, I can complete the same consequential journey and understand the same state. | A structured non-spatial account and accessible precision surfaces preserve every required action and result. | `AT-A11Y-01`, `AT-A11Y-02`, `AT-A11Y-03` |
| US-P0-25 | J1–J3 | As an engineering reviewer, I can inspect which complete-Studio capabilities are demonstrated, represented or catalog-only and understand the Service Alliance domain breadth without confusing it with implemented behavior. | All 282 rows are accounted for; Support, Connection, History and all eight programs remain inspectable. | `AT-COV-01`, `AT-SA-01`, `AT-SIM-02` |
| US-P0-26 | J1–J3 | As an owner or reviewer, I can reset and repeat the full connected narrative with the same outcomes and evidence instead of relying on improvised AI behavior or hidden setup. | J1 output becomes J2 input and J2 output becomes J3 input in two repeatable runs. | `AT-JRN-01`, `AT-SIM-03` |

## P1 — depth after first-preview review

| ID | User story | Why it follows P0 | Acceptance trace |
|---|---|---|---|
| US-P1-01 | As a Member, I can inspect every major node through presence, relationship, capability, authority and history. | P0 exposes required information at journey moments; P1 standardizes the full five-layer pattern across node families. | `AT-UX-03` |
| US-P1-02 | As a Member, I can change Organization, Project or zoom context during background work and return without losing any thread, selection, job or Compute state. | P0 proves semantic zoom inside the connected journey; P1 hardens cross-context continuation. | `AT-UX-06`, `AT-CMP-06` |
| US-P1-03 | As a Member, I can reliably distinguish registration evidence, directional trust and privacy, and distinguish every neighboring collaboration object. | P0 keeps trust and grants separate; P1 adds broader comprehension and complete object comparisons. | `AT-REL-02`, `AT-MOD-01` |
| US-P1-04 | As a Source owner, I can bring a live external document or snapshot into the Field with explicit owner proof and separate read, comment and edit scopes. | P0 uses controlled snapshots; P1 validates broader external-source anatomy without enabling real external mutation. | `AT-INT-01` |
| US-P1-05 | As a protected Member, I cannot infer secret Sources through counts, timing, errors or generated results, and an Actor cannot use undeclared Sources, tools or Commands. | P0 enforces visible privacy and prompt-injection boundaries; P1 performs deeper adversarial proof. | `AT-PRIV-02`, `AT-SEC-03` |
| US-P1-06 | As a Member, I can inspect eligible simulated purchase lineage while understanding that Project work, grants, Offerings and votes do not create it. | Economic meaning remains conflicted; functional lineage waits for approved semantics and review. | `AT-CMP-07` |
| US-P1-07 | As a Member, I can understand equal ballot and optional funded position as distinct acts with distinct authority and effects. | The launch path needs authority but not a complete governance-market demonstration. | `AT-GOV-01` |
| US-P1-08 | As a representative evaluator, I can correctly classify Navigate, Gather, Ask and Commit states and predict when confirmation is required. | The interface can be built in P0; the five-person comprehension result requires actual review participants. | `AT-ACT-05` |
| US-P1-09 | As a Member, I can recover from offline delivery, low-confidence conflict, treasury decline, purchase failure and offline confirmation without misleading state. | P0 covers the most architecture-revealing exceptions; these remaining fixtures complete the source contract. | P1 fixture evidence |

## Deferred user-story themes

The following are intentionally not V0 user stories:

- production-grade account/security/compliance behavior;
- real payment, exchange, signature, vote, filing, registry, publishing or deployment;
- functional voice/audio;
- complete Support, Connection and History program operations;
- complete Forums, Institutions, Engagements, administration or operational observability;
- game, Scene, site and software DomainPackage authoring;
- final engineering handoff instructions and reusable agent Skills.

They remain in the 282-row catalog and must not be inferred as absent from the complete Studio definition.

## Story-level approval test

Gate 1 story approval means:

- the 26 P0 stories describe the right first experience;
- their order preserves one continuous David/Matt/Service Alliance narrative;
- the nine P1 stories may follow after preview review;
- no story implies a real external, financial, legal or production consequence;
- no story silently resolves the recorded Compute, mediation, terminology, visual-identity or privacy conflicts.

