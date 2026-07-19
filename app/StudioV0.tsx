"use client";

import Image from "next/image";
import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import capabilityRows from "@/lib/capabilities.json";
import {
  PERSONA_JOURNEY_STEPS,
  JourneyPanel,
  JourneyStepId,
  journeyEngineeringCopyText,
  journeyEngineeringNotes,
  journeyStory,
  journeyStoryCopyText,
  personaJourneySteps,
} from "@/lib/persona-journey";
import {
  FIXTURES,
  PERSONAS,
  STATE_PLATES,
  FixtureId,
  GuidedAction,
  PersonaKey,
  StudioAction,
  StudioState,
  createFixtureState,
  createInitialState,
  createPlateState,
  deriveJourney,
  deriveStage,
  interpretUtterance,
  ledgerBalance,
  ledgerConserves,
  nextGuidedAction,
  studioReducer,
} from "@/lib/v0-model";
import styles from "./studio-v0.module.css";

type CapabilityRow = {
  id: string;
  capability: string;
  status: string;
  actionClass: string;
  authority: string;
  sources: string;
  prototype: string;
  v0Coverage: "demonstrated" | "represented" | "catalog-only";
};

type HudRest = "clear" | "context" | "focus";
type Distance = "far" | "middle" | "near";
type LocalMessage = { id: string; role: "member" | "ally"; body: string; objectId: string };
type NodeKind = "persona" | "relationship" | "project" | "source" | "actor" | "artifact" | "organization" | "record" | "registry";
type FieldNodeData = { id: string; kind: NodeKind; title: string; meta: string; state: string; x: number; y: number; visible: boolean; attention?: boolean };

async function copyJourneyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection-based copy method when clipboard
      // permissions are unavailable in the current browser context.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy command was unavailable");
}

const STORAGE_KEY = "kiduna-studio-v0:shared-state";
const CHANNEL_KEY = "kiduna-studio-v0:shared-channel";

function validState(value: unknown): value is StudioState {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: number }).schemaVersion === 1);
}

function readStoredState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return validState(parsed) ? parsed : createInitialState();
  } catch {
    return createInitialState();
  }
}

function useSharedStudioState() {
  const [state, setState] = useState<StudioState>(() => createInitialState());
  const [ready, setReady] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      setState(readStoredState());
      setReady(true);
    });
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(CHANNEL_KEY);
      channel.current.onmessage = (event) => {
        if (validState(event.data)) setState(event.data);
      };
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        if (validState(parsed)) setState(parsed);
      } catch {
        // Keep the last valid deterministic projection.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.cancelAnimationFrame(restoreFrame);
      window.removeEventListener("storage", onStorage);
      channel.current?.close();
    };
  }, []);

  const publish = useCallback((next: StudioState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    channel.current?.postMessage(next);
  }, []);

  const dispatch = useCallback((action: StudioAction) => {
    setState((current) => {
      const next = studioReducer(current, action);
      if (next !== current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        channel.current?.postMessage(next);
      }
      return next;
    });
  }, []);

  return { state, ready, dispatch, publish };
}

function initialPersona(): PersonaKey {
  if (typeof window === "undefined") return "david";
  const query = new URLSearchParams(window.location.search).get("persona");
  if (query === "matt" || query === "david") return query;
  return sessionStorage.getItem("kiduna-studio-v0:persona") === "matt" ? "matt" : "david";
}

function alternateGuidedActions(state: StudioState, persona: PersonaKey): GuidedAction[] {
  const actions: GuidedAction[] = [];
  if (state.foundMatt && state.relationship === "none" && state.code.status === "none" && persona === "david") {
    actions.push({
      id: "create-recipient-code", label: "Prepare recipient Code", short: "Single-use · expiring · no Relationship", actionClass: "Commit", actor: "david", authority: "David · inviter", objectId: "relationship-intent", consequence: "Creates a deterministic, recipient-bound Code for Matt with a visible purpose and expiry.", nonEffect: "Does not contact Matt, create a Persona, create a Relationship, or grant access.", compute: "No material charge", confirmation: "explicit", simulation: true, create: () => ({ type: "CREATE_CODE", persona: "david", key: "code:create:matt" }),
    });
  }
  if (state.code.status === "active" && persona === "matt") {
    actions.push({
      id: "redeem-recipient-code", label: "Redeem exact Code", short: `${state.code.value} · ${state.code.expires}`, actionClass: "Commit", actor: "matt", authority: "Matt · bound recipient", objectId: "relationship-intent", consequence: "Consumes the single-use Code after the deterministic recipient proof matches.", nonEffect: "Does not create a Relationship, accept an approach, share Sources, or grant authority.", compute: "No material charge", confirmation: "explicit", simulation: true, create: () => ({ type: "REDEEM_CODE", persona: "matt", key: "code:redeem:matt" }),
    });
  }
  if (state.approach === "sent" && persona === "matt") {
    actions.push({
      id: "decline-approach", label: "Decline privately", short: "Boundary preserved · rationale protected", actionClass: "Commit", actor: "matt", authority: "Matt · recipient", objectId: "relationship-david-matt", consequence: "Declines this exact purpose-limited approach and records the delivery result.", nonEffect: "Does not reveal private rationale, create a Relationship, or permit a bypass.", compute: "No material charge", confirmation: "explicit", simulation: true, create: () => ({ type: "RESPOND_APPROACH", persona: "matt", response: "decline", key: "approach:decline" }),
    });
  }
  return actions;
}

export default function StudioV0() {
  const { state, ready, dispatch, publish } = useSharedStudioState();
  const [persona, setPersona] = useState<PersonaKey>("david");
  const [hudRest, setHudRest] = useState<HudRest>("clear");
  const [distance, setDistance] = useState<Distance>("middle");
  const [selectedId, setSelectedId] = useState("current-context");
  const [pending, setPending] = useState<GuidedAction | null>(null);
  const [structured, setStructured] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [journeyStep, setJourneyStep] = useState<JourneyStepId | null>("landing");
  const [journeyPanel, setJourneyPanel] = useState<JourneyPanel | null>(null);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [atlasFilter, setAtlasFilter] = useState<"all" | CapabilityRow["v0Coverage"]>("all");
  const [atlasQuery, setAtlasQuery] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<PersonaKey, LocalMessage[]>>({
    david: [{ id: "welcome-david", role: "ally", body: "Ki: Begin with the kind of Ally relationship you want. You remain the sole Source.", objectId: "ally-david" }],
    matt: [{ id: "welcome-matt", role: "ally", body: "Ki: Begin with the kind of Ally relationship you want. You remain the sole Source.", objectId: "ally-matt" }],
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preferencesFrame = window.requestAnimationFrame(() => {
      setPersona(initialPersona());
      setReduced(media.matches);
    });
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener("change", listener);
    return () => {
      window.cancelAnimationFrame(preferencesFrame);
      media.removeEventListener("change", listener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const journey = deriveJourney(state);
  const nextAction = nextGuidedAction(state, persona);
  const alternateActions = alternateGuidedActions(state, persona);
  const otherPersona: PersonaKey = persona === "david" ? "matt" : "david";
  const otherAction = nextGuidedAction(state, otherPersona);
  const allyName = state.allies[persona].name ?? "Ki · Genesis";
  const nodes = useMemo(() => fieldNodes(state), [state]);

  const switchPersona = (next: PersonaKey) => {
    setPersona(next);
    sessionStorage.setItem("kiduna-studio-v0:persona", next);
    const url = new URL(window.location.href);
    url.searchParams.set("persona", next);
    window.history.replaceState({}, "", url);
    setPending(null);
    setJourneyStep("landing");
    setJourneyPanel(null);
    setToast(`${PERSONAS[next].firstName} session active · independent local focus`);
  };

  const replaceState = (next: StudioState, note: string) => {
    publish(next);
    setPending(null);
    setSelectedId(next.fixture ? `fixture-${next.fixture.id}` : "current-context");
    setHudRest(next.fixture ? "focus" : "clear");
    setToast(note);
  };

  const selectNode = (id: string) => {
    setSelectedId(id);
    setHudRest("context");
    setFindOpen(false);
  };

  const runGuided = (action: GuidedAction) => {
    setSelectedId(action.objectId);
    if (action.confirmation === "none") {
      const exactAction = action.create(state);
      const candidate = studioReducer(state, exactAction);
      if (candidate === state) {
        setToast("State changed or authority no longer applies · review current context");
        return;
      }
      dispatch(exactAction);
      setHudRest("context");
      setToast(action.simulation ? "Simulated state updated" : "State updated");
    } else {
      setPending(action);
      setHudRest("focus");
    }
  };

  const confirmPending = () => {
    if (!pending) return;
    const action = pending.create(state);
    if (studioReducer(state, action) === state) {
      setPending(null);
      setToast("Preview expired or authority no longer applies · no state changed");
      return;
    }
    dispatch(action);
    setPending(null);
    setHudRest("context");
    setToast("Exact simulated Action recorded");
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = new FormData(form).get("message")?.toString().trim() ?? "";
    if (!input) return;
    const result = interpretUtterance(input, state, persona);
    const now = `${persona}-${state.revision}-${localMessages[persona].length}`;
    setLocalMessages((current) => ({
      ...current,
      [persona]: [
        ...current[persona],
        { id: `${now}-member`, role: "member", body: input, objectId: selectedId },
        { id: `${now}-ally`, role: "ally", body: result.body, objectId: result.objectId },
      ].slice(-12),
    }));
    setSelectedId(result.objectId);
    setHudRest("context");
    if (result.deniedMutation) setToast("Language prepared context only · no mutation");
    form.reset();
  };

  const openPlate = (plateId: string) => {
    if (!plateId) return;
    setJourneyStep(null);
    setJourneyPanel(null);
    replaceState(createPlateState(plateId), `State plate loaded · ${STATE_PLATES.find((plate) => plate.id === plateId)?.title}`);
    if (plateId === "structured") setStructured(true);
    if (plateId === "constellation") setDistance("far");
    if (plateId === "compute-expanded") { setSelectedId("compute-project"); setHudRest("focus"); }
  };

  if (!ready) return <main className={styles.loading}><Image src="/ki-avatar-glyph.png" alt="" width={76} height={76} priority /><p>Restoring the deterministic Field…</p></main>;

  return (
    <main className={`${styles.studio} ${styles[`rest_${hudRest}`] ?? ""} ${styles[`distance_${distance}`] ?? ""} ${structured ? styles.structuredMode : ""} ${reduced ? styles.reduced : ""}`}>
      <a className={styles.skip} href="#scene-account">Skip to structured Scene</a>
      <div className={styles.ambient} aria-hidden="true"><i /><i /><i /><i /></div>
      <div className={styles.grain} aria-hidden="true" />

      <LabDock
        persona={persona}
        switchPersona={switchPersona}
        state={state}
        structured={structured}
        setStructured={setStructured}
        reduced={reduced}
        setReduced={setReduced}
        journeyStep={journeyStep}
        journeyPanel={journeyPanel}
        onJourneyStep={(id) => { const stepNumber = PERSONA_JOURNEY_STEPS.find((step) => step.id === id)?.number ?? 1; setJourneyStep(id); setJourneyPanel(null); setToast(`${PERSONAS[persona].firstName} · Step ${stepNumber} active`); }}
        onJourneyPanel={(panel) => setJourneyPanel((current) => current === panel ? null : panel)}
        onScenario={(id) => { setJourneyStep(null); setJourneyPanel(null); replaceState(createFixtureState(id), `Deterministic fixture loaded · ${id}`); }}
        onPlate={openPlate}
        onReset={() => { setJourneyStep("landing"); setJourneyPanel(null); replaceState(createInitialState(), "Clean deterministic reset · Step 1 active"); }}
      />

      {journeyStep && <JourneyScene step={journeyStep} persona={persona} panel={journeyPanel} reduced={reduced} onClosePanel={() => setJourneyPanel(null)} />}

      <div className={journeyStep ? styles.fieldLayerHidden : styles.fieldLayer} aria-hidden={journeyStep ? true : undefined}>

      <header className={styles.contextAnchor} aria-label="Current context">
        <button onClick={() => { setSelectedId("organization-kinship"); setHudRest(hudRest === "focus" ? "context" : "focus"); }}>
          <span>KINSHIP DUNA</span>
          <b>{state.project === "none" ? "Relational Terrain" : "Service Alliance Formation"}</b>
          <small>{journey} · {distance === "far" ? "Constellation" : distance === "middle" ? "Relational Terrain" : "Living Workbench"}</small>
        </button>
      </header>

      <ComputeAnchor state={state} onOpen={() => { setSelectedId("compute-project"); setHudRest("focus"); }} />
      <AttentionAnchor state={state} persona={persona} onOpen={() => { setSelectedId(state.fixture ? `fixture-${state.fixture.id}` : state.records[0]?.objectId ?? "records"); setHudRest("focus"); }} />

      <nav className={styles.distanceControl} aria-label="Field distance">
        {(["far", "middle", "near"] as Distance[]).map((value) => <button key={value} className={distance === value ? styles.active : ""} onClick={() => setDistance(value)} aria-pressed={distance === value}>{value === "far" ? "Constellation" : value === "middle" ? "Terrain" : "Workbench"}</button>)}
      </nav>

      <section className={styles.field} aria-label={`Kiduna Studio Field · ${journey}`}>
        <div className={styles.groundMark} aria-hidden="true">
          <span>SERVICE ALLIANCE</span><b>{state.organization === "active" ? "Active · simulation" : "Forming Organization"}</b>
        </div>
        {!structured ? (
          <>
            <div className={styles.spatialScene}>
              <svg className={styles.paths} viewBox="0 0 1000 680" preserveAspectRatio="none" aria-hidden="true">
                <path d="M180 300 C320 225 430 300 500 370 S720 500 850 345" />
                <path d="M500 370 C520 230 640 175 805 170" />
                <path d="M500 370 C430 475 365 510 240 515" />
              </svg>
              {nodes.filter((node) => node.visible).map((node) => <FieldNode key={node.id} node={node} selected={selectedId === node.id} onSelect={selectNode} />)}
              {state.fixture && <FixtureObject fixture={state.fixture} selected={selectedId === `fixture-${state.fixture.id}`} onSelect={() => selectNode(`fixture-${state.fixture?.id}`)} />}
            </div>
            <div className={styles.mobileStructured}><StructuredScene nodes={nodes} state={state} selectedId={selectedId} onSelect={selectNode} /></div>
          </>
        ) : (
          <StructuredScene nodes={nodes} state={state} selectedId={selectedId} onSelect={selectNode} />
        )}
      </section>

      {hudRest === "context" && (
        <aside className={styles.contextLens} aria-label="Context lens">
          <ObjectSummary id={selectedId} state={state} persona={persona} />
          <button className={styles.openFocus} onClick={() => setHudRest("focus")}>Open exact context <span>↗</span></button>
        </aside>
      )}

      {hudRest === "focus" && (
        <aside className={styles.focusPanel} aria-label="Focused context">
          <button className={styles.closeFocus} onClick={() => { setPending(null); setHudRest("context"); }} aria-label="Return to context">×</button>
          {pending ? <ActionPreview action={pending} state={state} onConfirm={confirmPending} onCancel={() => setPending(null)} /> : <ObjectLens id={selectedId} state={state} persona={persona} onSelect={selectNode} onOpenAtlas={() => setAtlasOpen(true)} />}
        </aside>
      )}

      <AllyBand
        persona={persona}
        allyName={allyName}
        state={state}
        messages={localMessages[persona]}
        nextAction={nextAction}
        alternateActions={alternateActions}
        otherAction={otherAction}
        onRun={runGuided}
        onSubmit={submitMessage}
        onFocus={() => { setSelectedId(`ally-${persona}`); setHudRest("focus"); }}
        onSwitch={switchPersona}
      />

      <FindAnchor onOpen={() => setFindOpen(true)} />
      {findOpen && <FindLens state={state} onClose={() => setFindOpen(false)} onSelect={selectNode} onAtlas={() => { setFindOpen(false); setAtlasOpen(true); }} />}
      {atlasOpen && <CapabilityAtlas rows={capabilityRows as CapabilityRow[]} query={atlasQuery} setQuery={setAtlasQuery} filter={atlasFilter} setFilter={setAtlasFilter} onClose={() => setAtlasOpen(false)} />}
      {toast && <div className={styles.toast} role="status">{toast}</div>}

      <div id="scene-account" className={styles.srScene} tabIndex={-1}>
        <h2>Structured Scene account</h2>
        <p>{journey}; revision {state.revision}; {ledgerConserves(state) ? "Compute ledger reconciles" : "Compute ledger needs review"}.</p>
        <ul>{nodes.filter((node) => node.visible).map((node) => <li key={node.id}>{node.kind}: {node.title}; {node.state}</li>)}</ul>
      </div>
      </div>
    </main>
  );
}

function JourneyScene({ step, persona, panel, reduced, onClosePanel }: {
  step: JourneyStepId;
  persona: PersonaKey;
  panel: JourneyPanel | null;
  reduced: boolean;
  onClosePanel: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<{ key: string; state: "copied" | "error" } | null>(null);
  const journey = PERSONA_JOURNEY_STEPS.find((candidate) => candidate.id === step) ?? PERSONA_JOURNEY_STEPS[0];
  const story = journeyStory(persona, step);
  const engineeringNotes = journeyEngineeringNotes(step);
  const sceneParams = new URLSearchParams();
  if (step === "resources") sceneParams.set("persona", persona);
  if (reduced) sceneParams.set("reduced", "1");
  const sceneRoute = `${journey.route}${sceneParams.size ? `?${sceneParams.toString()}` : ""}`;
  const copyCard = async (card: JourneyPanel) => {
    const key = `${persona}:${step}:${card}`;
    const text = card === "story" ? journeyStoryCopyText(persona, step) : journeyEngineeringCopyText(step);
    try {
      await copyJourneyText(text);
      setCopyStatus({ key, state: "copied" });
    } catch {
      setCopyStatus({ key, state: "error" });
    }
    window.setTimeout(() => setCopyStatus((current) => current?.key === key ? null : current), 1800);
  };
  return <section className={styles.journeyScene} aria-label={`${journey.label} for ${PERSONAS[persona].firstName}`}>
    <iframe src={sceneRoute} title={journey.label} />
    {panel && <aside className={styles.journeyPanel} aria-label={panel === "story" ? story.eyebrow : engineeringNotes.eyebrow}>
      <button className={styles.journeyCopy} onClick={() => void copyCard(panel)} aria-label={`Copy entire ${panel === "story" ? "Story" : "Engineering Notes"} card`}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="5" width="9" height="11" rx="1.5"/><path d="M4 13V4.5C4 3.7 4.7 3 5.5 3H12"/></svg>
        <span>{copyStatus?.key === `${persona}:${step}:${panel}` ? copyStatus.state === "copied" ? "Copied" : "Copy unavailable" : "Copy"}</span>
      </button>
      <button className={styles.journeyPanelClose} onClick={onClosePanel} aria-label="Close journey notes">×</button>
      {panel === "story" ? <>
        <small>{story.eyebrow}</small>
        <h1>{story.title}</h1>
        <p className={styles.journeyRole}><b>Role</b><span>{story.role}</span></p>
        <p>{story.body}</p>
        <blockquote>{story.moment}</blockquote>
      </> : <>
        <small>{engineeringNotes.eyebrow}</small>
        <h1>{engineeringNotes.title}</h1>
        <p className={styles.journeySource}><b>{engineeringNotes.sourceHref ? "Source of truth" : "Reference"}</b>{engineeringNotes.sourceHref ? <a href={engineeringNotes.sourceHref} target="_blank" rel="noreferrer">{engineeringNotes.source} ↗</a> : <span>{engineeringNotes.source}</span>}</p>
        <ol>{engineeringNotes.notes.map((note) => <li key={note}>{note}</li>)}</ol>
      </>}
    </aside>}
  </section>;
}

function LabDock({ persona, switchPersona, state, structured, setStructured, reduced, setReduced, journeyStep, journeyPanel, onJourneyStep, onJourneyPanel, onScenario, onPlate, onReset }: {
  persona: PersonaKey;
  switchPersona: (persona: PersonaKey) => void;
  state: StudioState;
  structured: boolean;
  setStructured: (value: boolean) => void;
  reduced: boolean;
  setReduced: (value: boolean) => void;
  journeyStep: JourneyStepId | null;
  journeyPanel: JourneyPanel | null;
  onJourneyStep: (id: JourneyStepId) => void;
  onJourneyPanel: (panel: JourneyPanel) => void;
  onScenario: (id: FixtureId) => void;
  onPlate: (id: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const journeyOptions = personaJourneySteps(persona);
  const activeJourney = PERSONA_JOURNEY_STEPS.find((step) => step.id === journeyStep);
  return <aside className={`${styles.labDock} ${open ? styles.labOpen : ""}`} aria-label="Design lab utilities">
    <button className={styles.labToggle} onClick={() => setOpen((value) => !value)} aria-expanded={open}><i /> DESIGN LAB <span>{activeJourney ? `STEP ${activeJourney.number}` : state.scenario === "clean" ? `R${state.revision}` : state.scenario}</span></button>
    {open && <div className={styles.labBody}>
      <p>Utilities are outside canonical Member UI. All consequences are deterministic simulation.</p>
      <fieldset><legend>Independent session</legend><button className={persona === "david" ? styles.labActive : ""} onClick={() => switchPersona("david")}>David</button><button className={persona === "matt" ? styles.labActive : ""} onClick={() => switchPersona("matt")}>Matt</button></fieldset>
      <div className={styles.pairedLinks}><a href="?persona=david" target="_blank" rel="noreferrer">Open David ↗</a><a href="?persona=matt" target="_blank" rel="noreferrer">Open Matt ↗</a></div>
      <label>Persona Journey<select value={journeyStep ?? ""} onChange={(event) => onJourneyStep(event.target.value as JourneyStepId)}><option value="" disabled>Current Studio scenario</option>{journeyOptions.map((step) => <option value={step.id} key={step.id}>{step.label}</option>)}</select></label>
      {journeyStep && <div className={styles.journeyButtons}><button className={journeyPanel === "story" ? styles.labActive : ""} onClick={() => onJourneyPanel("story")}>{PERSONAS[persona].firstName}’s Story</button><button className={journeyPanel === "engineering" ? styles.labActive : ""} onClick={() => onJourneyPanel("engineering")}>Engineering Notes</button></div>}
      <label>State plate<select defaultValue="" onChange={(event) => { onPlate(event.target.value); event.target.value = ""; }}><option value="" disabled>Choose one of 15…</option>{STATE_PLATES.map((plate) => <option value={plate.id} key={plate.id}>{plate.title}</option>)}</select></label>
      <label>P0 fixture<select defaultValue="" onChange={(event) => { onScenario(event.target.value as FixtureId); event.target.value = ""; }}><option value="" disabled>Inject deterministic state…</option>{FIXTURES.filter((fixture) => fixture.priority === "P0").map((fixture) => <option value={fixture.id} key={fixture.id}>{fixture.journey} · {fixture.title}</option>)}</select></label>
      <fieldset><legend>Access view</legend><button className={structured ? styles.labActive : ""} onClick={() => setStructured(!structured)}>Structured</button><button className={reduced ? styles.labActive : ""} onClick={() => setReduced(!reduced)}>Reduced motion</button></fieldset>
      <button className={styles.resetButton} onClick={onReset}>Reset both sessions</button>
    </div>}
  </aside>;
}

function ComputeAnchor({ state, onOpen }: { state: StudioState; onOpen: () => void }) {
  const available = ledgerBalance(state);
  const projectRemaining = Math.max(0, state.compute.allocated - state.compute.consumed - state.compute.reserved);
  return <button className={`${styles.computeAnchor} ${state.compute.reserved ? styles.computeLive : ""}`} onClick={onOpen} aria-label={`${available} Compute available; ${projectRemaining} remains in Project allocation`}>
    <span>COMPUTE · SIMULATED</span><b>{available.toLocaleString()}</b><i><em style={{ width: `${state.compute.allocated ? Math.min(100, state.compute.consumed / state.compute.allocated * 100) : 0}%` }} /></i><small>{state.compute.allocated ? `${projectRemaining} Project remaining` : "No Project allocation"}</small><small>USDC equivalent · policy unresolved</small>
  </button>;
}

function AttentionAnchor({ state, persona, onOpen }: { state: StudioState; persona: PersonaKey; onOpen: () => void }) {
  const next = nextGuidedAction(state, persona);
  const needs = state.fixture && !state.fixture.resolved ? state.fixture.title : next?.label ?? "No decision waiting";
  return <button className={`${styles.attentionAnchor} ${next || state.fixture ? styles.needsAttention : ""}`} onClick={onOpen}><i /> <span>ATTENTION</span><b>{needs}</b></button>;
}

function FindAnchor({ onOpen }: { onOpen: () => void }) {
  return <button className={styles.findAnchor} onClick={onOpen} aria-label="Find and approach anything"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg><span>Find / approach</span><kbd>⌘ K</kbd></button>;
}

function fieldNodes(state: StudioState): FieldNodeData[] {
  const stage = deriveStage(state);
  const artifact = state.artifacts.find((item) => item.id === state.activeArtifactId);
  const sourceCount = state.sources.filter((source) => source.shared).length;
  return [
    { id: "persona-david", kind: "persona", title: "David", meta: state.allies.david.name ? `with ${state.allies.david.name}` : "with Ki · Genesis", state: state.allies.david.confirmed ? "Ally confirmed" : "Genesis waiting", x: 18, y: 43, visible: true },
    { id: "persona-matt", kind: "persona", title: "Matt Simon", meta: state.allies.matt.name ? `with ${state.allies.matt.name}` : "with Ki · Genesis", state: state.relationship === "active" ? "Relationship active" : state.approach === "sent" ? "Approach waiting" : "Public context", x: state.foundMatt ? 68 : 82, y: state.foundMatt ? 39 : 24, visible: state.foundMatt || stage > 0, attention: state.approach === "sent" },
    { id: "relationship-david-matt", kind: "relationship", title: "David ↔ Matt", meta: "Kinship Duna Relationship", state: state.relationship === "active" ? "Active · grants separate" : state.approach === "sent" ? "Intent delivered" : "Potential", x: 42, y: 45, visible: state.foundMatt },
    { id: "source-overview", kind: "source", title: "Service Alliance Sources", meta: `${sourceCount} shared · 5 families`, state: state.sharedBy.length ? "Provenance inspectable" : "Incoming / personal", x: 27, y: 70, visible: state.relationship === "active" },
    { id: "project-formation", kind: "project", title: "Formation Project", meta: "Kinship Duna accountable", state: state.project === "none" ? "Not created" : state.project === "pending-matt" ? "Waiting for Matt" : state.project === "complete" ? "Milestone complete" : state.project, x: 50, y: 61, visible: state.project !== "none" },
    { id: "actor-service-alliance", kind: "actor", title: "Service Alliance Actor", meta: "Unified Organization façade", state: state.actor.status === "running" ? `Working · ${state.actor.progress}%` : state.actor.status, x: 73, y: 66, visible: state.project === "active" || stage >= 4, attention: state.actor.status === "partial" },
    { id: artifact?.id ?? "artifact-formation", kind: "artifact", title: artifact ? `Formation Package ${artifact.label}` : "Formation Package", meta: artifact ? artifact.hash : "Not yet created", state: artifact?.status ?? "Awaiting Actor", x: 51, y: 79, visible: Boolean(artifact) },
    { id: "organization-service-alliance", kind: "organization", title: "Service Alliance", meta: "Support · Connection · History", state: state.organization === "active" ? "Active · simulation" : "Forming", x: 79, y: 19, visible: stage >= 1 },
    { id: "records", kind: "record", title: "Records", meta: `${state.records.length} immutable receipts`, state: state.records[0]?.title ?? "No committed state", x: 88, y: 49, visible: state.records.length > 0 },
    { id: "registry-service-alliance", kind: "registry", title: "Registry", meta: "Synthetic WV evidence", state: state.registry, x: 88, y: 76, visible: state.launch === "purchase-settled" || state.organization === "active" },
  ];
}

function FieldNode({ node, selected, onSelect }: { node: FieldNodeData; selected: boolean; onSelect: (id: string) => void }) {
  const style = { "--node-x": `${node.x}%`, "--node-y": `${node.y}%` } as CSSProperties;
  return <button style={style} className={`${styles.node} ${styles[`node_${node.kind}`]} ${selected ? styles.nodeSelected : ""} ${node.attention ? styles.nodeAttention : ""}`} onClick={() => onSelect(node.id)} aria-pressed={selected}>
    <i className={styles.nodeGlyph}>{node.kind === "persona" ? node.title.split(" ").map((part) => part[0]).join("").slice(0,2) : node.kind === "actor" ? "A" : node.kind === "project" ? "P" : node.kind === "source" ? "S" : node.kind === "artifact" ? "v" : node.kind === "record" ? "R" : node.kind === "registry" ? "↗" : node.kind === "relationship" ? "↔" : "◇"}</i>
    <span><small>{node.meta}</small><b>{node.title}</b><em>{node.state}</em></span>
  </button>;
}

function FixtureObject({ fixture, selected, onSelect }: { fixture: NonNullable<StudioState["fixture"]>; selected: boolean; onSelect: () => void }) {
  return <button className={`${styles.fixtureObject} ${selected ? styles.nodeSelected : ""} ${fixture.resolved ? styles.fixtureResolved : ""}`} onClick={onSelect}><i>!</i><span><small>{fixture.journey} · {fixture.priority} EXCEPTION</small><b>{fixture.title}</b><em>{fixture.resolved ? "Recovery recorded" : "Needs a valid recovery"}</em></span></button>;
}

function StructuredScene({ nodes, state, selectedId, onSelect }: { nodes: FieldNodeData[]; state: StudioState; selectedId: string; onSelect: (id: string) => void }) {
  const groups: { title: string; kinds: NodeKind[] }[] = [
    { title: "Ground", kinds: ["organization"] }, { title: "People and Relationships", kinds: ["persona", "relationship"] }, { title: "Work", kinds: ["project", "actor", "artifact", "source"] }, { title: "Actions and evidence", kinds: ["record", "registry"] },
  ];
  return <div className={styles.structuredScene} aria-label="Structured non-spatial Scene">
    <header><span>STRUCTURED SCENE</span><h1>{deriveJourney(state)} · Service Alliance Formation</h1><p>Equivalent objects and actions, grouped by ground → people → work → evidence.</p></header>
    {groups.map((group) => <section key={group.title}><h2>{group.title}</h2>{nodes.filter((node) => node.visible && group.kinds.includes(node.kind)).map((node) => <button key={node.id} className={selectedId === node.id ? styles.structuredSelected : ""} onClick={() => onSelect(node.id)}><span>{node.kind}</span><b>{node.title}</b><small>{node.state}</small></button>)}</section>)}
    {state.fixture && <section><h2>Exceptional state</h2><button onClick={() => onSelect(`fixture-${state.fixture?.id}`)}><span>{state.fixture.priority}</span><b>{state.fixture.title}</b><small>{state.fixture.truth}</small></button></section>}
  </div>;
}

function ObjectSummary({ id, state, persona }: { id: string; state: StudioState; persona: PersonaKey }) {
  const detail = objectDetail(id, state, persona);
  return <><small>{detail.eyebrow}</small><h2>{detail.title}</h2><p>{detail.summary}</p><div className={styles.summaryState}><i />{detail.state}</div></>;
}

function objectDetail(id: string, state: StudioState, persona: PersonaKey) {
  const artifact = state.artifacts.find((item) => item.id === id) ?? state.artifacts.find((item) => item.id === state.activeArtifactId);
  if (id === "persona-matt") return { eyebrow: "PERSONA · KINSHIP DUNA", title: "Matt Simon", summary: "Public, owner-approved professional context. Conversation feels direct; David’s Ally mediates outgoing intent and Matt’s Ally controls delivery.", state: state.relationship === "active" ? "Relationship active · authority unchanged" : state.approach === "sent" ? "Approach waiting at Harbor" : "No Relationship yet" };
  if (id === "persona-david") return { eyebrow: "PERSONA · KINSHIP DUNA", title: "David Nikzad", summary: "Technologist context. Private and personal details are synthetic or absent; no production Relationship Wisdom is present.", state: `${state.allies.david.name ?? "Ki"} · ${state.allies.david.confirmed ? "Stance v0.1" : "Genesis"}` };
  if (id.startsWith("ally-")) return { eyebrow: "ALLY · SOURCE-DIRECTED", title: state.allies[persona].name ?? "Ki · Genesis", summary: PERSONAS[persona].allyNote, state: state.allies[persona].confirmed ? "Active Stance v0.1 · only you direct this Ally" : "Proposal awaiting your exact confirmation" };
  if (id.includes("relationship") || id === "relationship-intent") return { eyebrow: "RELATIONSHIP · KINSHIP DUNA", title: "David ↔ Matt", summary: "A per-Organization relational space with two independent trust declarations, grants, shared materials and pending acts.", state: state.relationship === "active" ? "Active · trust is not authority" : state.approach === "sent" ? "Intent delivered · no Relationship yet" : "Potential" };
  if (id.includes("source") || id.includes("gather")) return { eyebrow: "SOURCES · PERMISSIONED PROVENANCE", title: "Service Alliance Source ground", summary: "Five approved document families and one synthetic personal boundary remain distinct, attributable and reversible.", state: `${state.sources.filter((source) => source.shared).length} shared · ${state.sources.filter((source) => source.gatheredBy.length > 0).length} gathered` };
  if (id.includes("project") || id === "current-context") return { eyebrow: "PROJECT · KINSHIP DUNA ACCOUNTABLE", title: "Service Alliance Formation", summary: "David and Matt build one sourced, versioned Formation Package with a Project-bounded Organization Actor and simulated Compute ledger.", state: state.project === "none" ? "Not yet created" : state.project };
  if (id.includes("actor")) return { eyebrow: "ORGANIZATION ACTOR · SIMULATED", title: "Service Alliance Actor", summary: "One coherent façade delegates to a Researcher, Formation Drafter, Project Steward and Registrar only within their manifests.", state: state.actor.note };
  if (id.includes("formation-v") || id.includes("artifact")) return { eyebrow: "ARTIFACT · EXACT VERSION", title: artifact ? `Formation Package ${artifact.label}` : "Formation Package", summary: artifact ? `${artifact.hash}. ${artifact.sourceIds.length} Sources; ${artifact.contributions.length} contributions; ${artifact.unresolved.length} unresolved variables.` : "No version exists yet.", state: artifact ? `${artifact.status} · ${artifact.acceptedBy.length} of 2 accepted` : "Awaiting cited Actor work" };
  if (id.includes("compute") || id.includes("treasury")) return { eyebrow: "COMPUTE · SIMULATED PREPAID CREDITS", title: `${ledgerBalance(state).toLocaleString()} available`, summary: `${state.compute.allocated} allocated · ${state.compute.reserved} reserved · ${state.compute.consumed} consumed · ${state.compute.released} released.`, state: ledgerConserves(state) ? "Ledger reconciles · USDC policy unresolved" : "Ledger invariant needs review" };
  if (id.includes("organization")) return { eyebrow: "ORGANIZATION · SERVICE ALLIANCE", title: "Support · Connection · History", summary: "The principal worked example. Bounded bronze/navy identity sits inside the shared Kidunaverse Field and authority grammar.", state: state.organization === "active" ? "Active in simulation · synthetic legal evidence" : "Forming · not yet a verified DUNA claim" };
  if (id.includes("registry")) return { eyebrow: "EXTERNAL OPERATION · SIMULATED", title: "Service Alliance registry", summary: "Synthetic WV evidence, internal Record and simulated adapter result remain separate, attributable states.", state: state.registry };
  if (id === "records" || state.records.some((record) => record.objectId === id)) return { eyebrow: "RECORD · IMMUTABLE", title: state.records.find((record) => record.objectId === id)?.title ?? "Project Records", summary: state.records.find((record) => record.objectId === id)?.summary ?? `${state.records.length} permission-filtered Records prove committed state.`, state: "Simulation labels and supersession remain inspectable" };
  if (id.startsWith("fixture-")) return { eyebrow: `${state.fixture?.priority ?? "P0"} EXCEPTION · ${state.fixture?.journey ?? deriveJourney(state)}`, title: state.fixture?.title ?? "Exceptional state", summary: state.fixture?.truth ?? "The prior truthful state is preserved.", state: state.fixture?.resolved ? "Recovery recorded" : "Needs a valid recovery" };
  return { eyebrow: "CURRENT CONTEXT", title: "Kiduna Studio Field", summary: "Conversation and visible objects carry one continuous relationship, Project and consequence narrative.", state: `${deriveJourney(state)} · revision ${state.revision}` };
}

function ObjectLens({ id, state, persona, onSelect, onOpenAtlas }: { id: string; state: StudioState; persona: PersonaKey; onSelect: (id: string) => void; onOpenAtlas: () => void }) {
  const detail = objectDetail(id, state, persona);
  const artifact = state.artifacts.find((item) => item.id === state.activeArtifactId);
  return <div className={styles.objectLens}>
    <header><small>{detail.eyebrow}</small><h1>{detail.title}</h1><p>{detail.summary}</p><span><i />{detail.state}</span></header>
    {id === "persona-matt" && <section className={styles.axes}><h2>Three separate axes</h2><div><span>Registration</span><b>Authenticated Persona · owner-approved fixture</b></div><div><span>Directional trust</span><b>{state.trust.david === "unset" ? "Not declared" : "Medium · David’s declaration"}</b></div><div><span>Privacy</span><b>Public identity · private professional context</b></div><p>None of these grants a Command or Organization role.</p></section>}
    {(id.includes("relationship") || id === "relationship-intent") && <section><h2>Mediation and grants</h2><div className={styles.mediation}><span>Aster<small>David’s Ally</small></span><i>→</i><b>David ↔ Matt</b><i>→</i><span>Harbor<small>Matt’s Ally</small></span></div><dl><div><dt>Delivery</dt><dd>{state.approach}</dd></div><div><dt>Recipient Code</dt><dd>{state.code.status}{state.code.value ? ` · ${state.code.value}` : ""}</dd></div><div><dt>Relationship</dt><dd>{state.relationship}</dd></div><div><dt>David trust</dt><dd>{state.trust.david}</dd></div><div><dt>Shared Sources</dt><dd>{state.sources.filter((source) => source.shared).length}</dd></div></dl></section>}
    {(id.includes("project") || id === "current-context") && <section><h2>Living Workbench</h2><div className={styles.metricGrid}><div><small>PEOPLE</small><b>{state.project === "active" || state.project === "under-review" || state.project === "complete" ? "2" : "—"}</b></div><div><small>SOURCES</small><b>{state.sources.filter((source) => source.shared).length}</b></div><div><small>ACTOR</small><b>{state.actor.status}</b></div><div><small>COMPUTE</small><b>{state.compute.consumed}</b></div></div><p>Purpose: produce and independently accept a sourced Service Alliance Formation Package without implying legal formation or launch.</p></section>}
    {(id.includes("source") || id.includes("gather")) && <SourceDetail state={state} />}
    {id.includes("actor") && <section><h2>Actor manifest</h2><dl><div><dt>Function</dt><dd>Research, source map, formation drafting</dd></div><div><dt>Invoker</dt><dd>David · Project requester</dd></div><div><dt>Organization</dt><dd>Kinship Duna during formation</dd></div><div><dt>Sources</dt><dd>{state.sources.filter((source) => source.shared).length} granted; no personal Wisdom</dd></div><div><dt>Commands</dt><dd>Create draft · propose revision · return partial</dd></div><div><dt>Cannot</dt><dd>Accept · authorize · sign · vote · widen grants · move treasury</dd></div><div><dt>Budget</dt><dd>180/run ceiling · {state.compute.consumed} settled</dd></div></dl></section>}
    {(id.includes("formation-v") || id.includes("artifact")) && artifact && <ArtifactDetail state={state} onSelect={onSelect} />}
    {(id.includes("compute") || id.includes("treasury")) && <ComputeDetail state={state} />}
    {id.includes("organization") && <OrganizationDetail state={state} />}
    {(id.includes("registry") || id === "records") && <RecordDetail state={state} />}
    {id.startsWith("fixture-") && state.fixture && <FixtureDetail state={state} persona={persona} />}
    <footer><button onClick={onOpenAtlas}>Inspect complete Studio capability atlas <span>282 →</span></button></footer>
  </div>;
}

function ArtifactDetail({ state, onSelect }: { state: StudioState; onSelect: (id: string) => void }) {
  const active = state.artifacts.find((artifact) => artifact.id === state.activeArtifactId);
  if (!active) return null;
  return <section><h2>Version chain and exact acceptance</h2><div className={styles.versionChain}>{state.artifacts.map((artifact) => <button key={artifact.id} className={artifact.id === active.id ? styles.currentVersion : ""} onClick={() => onSelect(artifact.id)}><small>{artifact.hash}</small><b>{artifact.label}</b><span>{artifact.status}</span></button>)}</div><dl><div><dt>Parent</dt><dd>{active.parentId ?? "First version"}</dd></div><div><dt>Sources</dt><dd>{active.sourceIds.length} exact Source references</dd></div><div><dt>Contributions</dt><dd>{active.contributions.length} human + Actor entries</dd></div><div><dt>Acceptance</dt><dd>{active.acceptedBy.map((key) => PERSONAS[key].firstName).join(" + ") || "None"}</dd></div></dl><div className={styles.sourceCitations}>{active.sourceIds.map((sourceId, index) => { const source = state.sources.find((item) => item.id === sourceId); return <article key={sourceId}><span>[{index + 1}]</span><b>{source?.title ?? sourceId}</b><small>{source?.provenance} · {source?.status} · {source?.privacy}</small></article>; })}</div><div className={styles.unresolved}><small>UNRESOLVED · NOT INVENTED</small>{active.unresolved.map((item) => <span key={item}>{item}</span>)}</div><p className={styles.nonEffect}>Acceptance never implies launch, treasury authorization, settlement, activation or registry completion.</p></section>;
}

function SourceDetail({ state }: { state: StudioState }) {
  return <section><h2>Gather Ring and sharing boundary</h2><div className={styles.sourceManifest}>{state.sources.map((source) => <article key={source.id} className={source.privacy === "personal" ? styles.sourcePersonal : ""}><header><span>{source.provenance}</span><b>{source.title}</b></header><p>{source.family}</p><dl><div><dt>Owner</dt><dd>{source.owner}</dd></div><div><dt>Privacy</dt><dd>{source.privacy}</dd></div><div><dt>Source state</dt><dd>{source.status}</dd></div><div><dt>Gathered</dt><dd>{source.gatheredBy.map((key) => PERSONAS[key].firstName).join(" + ") || "No"}</dd></div><div><dt>Shared</dt><dd>{source.shared ? "Relationship scope" : "No grant"}</dd></div></dl></article>)}</div><p className={styles.nonEffect}>Gathering never shares. Personal Wisdom cannot enter this outgoing manifest and its exclusion reveals no content.</p></section>;
}

function ComputeDetail({ state }: { state: StudioState }) {
  return <><section><h2>Action → Project attribution</h2><div className={styles.computeRings}><div><small>AVAILABLE</small><b>{ledgerBalance(state)}</b></div><div><small>ALLOCATED</small><b>{state.compute.allocated}</b></div><div><small>RESERVED</small><b>{state.compute.reserved}</b></div><div><small>SETTLED USE</small><b>{state.compute.consumed}</b></div></div><p className={styles.policyPending}>USDC equivalent unavailable · approved calculation and quote policy unresolved.</p></section><section><h2>Simulated ledger</h2><div className={styles.ledger}>{state.compute.entries.length ? state.compute.entries.map((entry) => <div key={entry.id}><span>{entry.kind}</span><b>{entry.amount} Compute</b><small>{entry.label} · {entry.actor}</small></div>) : <p>No Project entries yet.</p>}</div><p className={ledgerConserves(state) ? styles.ledgerGood : styles.ledgerBad}>{ledgerConserves(state) ? "Opening + credits − settled use = closing. Reservations are separate." : "Ledger invariant failed; do not rely on this projection."}</p></section></>;
}

function OrganizationDetail({ state }: { state: StudioState }) {
  const programs = ["Roll Call", "LegacyLog", "Veteran Voices", "Service Connected", "The Campaign", "Wall of Honor", "Into the Breach", "The Forge"];
  return <><section><h2>Three domain pillars</h2><div className={styles.pillars}><article><b>Support</b><p>Benefits navigation, referrals, careers, education and mutual aid.</p></article><article><b>Connection</b><p>Roll calls, events, reunions, mentorship and belonging.</p></article><article><b>History</b><p>Preserve, migrate and extend lineage, memory and archives.</p></article></div></section><section><h2>Eight represented programs</h2><div className={styles.programs}>{programs.map((program) => <span key={program}>{program}</span>)}</div><p>Represented breadth is not claimed functional in V0.</p></section><section><h2>Formation truth</h2><dl><div><dt>Status</dt><dd>{state.organization}</dd></div><div><dt>Legal evidence</dt><dd>{state.organization === "forming" ? "Not verified" : "[WV_ORG_ID · SYNTHETIC]"}</dd></div><div><dt>Launch</dt><dd>{state.launch}</dd></div><div><dt>Registry</dt><dd>{state.registry}</dd></div></dl></section></>;
}

function RecordDetail({ state }: { state: StudioState }) {
  return <section><h2>Permission-filtered receipt chain</h2><div className={styles.records}>{state.records.length ? state.records.map((record) => <article key={record.id}><header><span>{record.kind}</span><b>{record.title}</b><small>{record.clock}</small></header><p>{record.summary}</p><dl><div><dt>Command</dt><dd>{record.command}</dd></div><div><dt>Authority</dt><dd>{record.authority}</dd></div><div><dt>Actor</dt><dd>{record.actor}</dd></div><div><dt>Simulation</dt><dd>{record.simulation ? "Yes · structurally isolated" : "No"}</dd></div><div><dt>Idempotency</dt><dd>{record.idempotencyKey}</dd></div></dl></article>) : <p>No committed Record exists yet.</p>}</div></section>;
}

function FixtureDetail({ state, persona }: { state: StudioState; persona: PersonaKey }) {
  const fixture = state.fixture;
  if (!fixture) return null;
  return <><section className={styles.exceptionTruth}><h2>Required visible truth</h2><p>{fixture.truth}</p></section><section><h2>Compatible session projections</h2><div className={styles.sessionProjection}><article><small>DAVID SESSION</small><p>{fixture.davidView}</p></article><article><small>MATT SESSION</small><p>{fixture.mattView}</p></article></div></section><section><h2>Evidence and recovery</h2><dl><div><dt>Ledger</dt><dd>{fixture.ledger}</dd></div><div><dt>Record</dt><dd>{fixture.record}</dd></div><div><dt>Current viewer</dt><dd>{PERSONAS[persona].firstName} · independent session</dd></div></dl><ol>{fixture.recovery.map((item) => <li key={item}>{item}</li>)}</ol></section></>;
}

function ActionPreview({ action, state, onConfirm, onCancel }: { action: GuidedAction; state: StudioState; onConfirm: () => void; onCancel: () => void }) {
  return <div className={`${styles.actionPreview} ${action.confirmation === "sovereign" ? styles.sovereignPreview : ""}`}>
    <header><small>{action.actionClass.toUpperCase()} · {action.simulation ? "SIMULATED" : "LIVE"}</small><h1>{action.label}</h1><p>{action.consequence}</p></header>
    <div className={styles.consequenceLead}><p><b>What changes</b>{action.consequence}</p><p><b>What does not</b>{action.nonEffect}</p></div>
    <dl><div><dt>Organization</dt><dd>{action.objectId.includes("service-alliance") && state.organization === "active" ? "Service Alliance · simulated active" : "Kinship Duna"}</dd></div><div><dt>Affected object</dt><dd>{action.objectId}</dd></div><div><dt>Authority</dt><dd>{action.authority}</dd></div><div><dt>Expected revision</dt><dd>R{state.revision} · changing state invalidates this preview</dd></div><div><dt>Compute / value</dt><dd>{action.compute}</dd></div><div><dt>External system</dt><dd>{action.simulation ? "Deterministic fixture only · no live endpoint" : "None"}</dd></div><div><dt>Idempotency</dt><dd>{action.id}</dd></div></dl>
    {action.confirmation === "sovereign" && <div className={styles.sovereignNotice}><i>◆</i><p><b>Fresh sovereign confirmation</b>This binds only the exact object, version, parameters and authority shown above. An Ally or Actor cannot confirm it.</p></div>}
    <footer><button onClick={onCancel}>Not now</button><button onClick={onConfirm}>{action.confirmation === "sovereign" ? `Confirm exact ${action.actionClass}` : action.label}</button></footer>
  </div>;
}

function AllyBand({ persona, allyName, state, messages, nextAction, alternateActions, otherAction, onRun, onSubmit, onFocus, onSwitch }: { persona: PersonaKey; allyName: string; state: StudioState; messages: LocalMessage[]; nextAction: GuidedAction | null; alternateActions: GuidedAction[]; otherAction: GuidedAction | null; onRun: (action: GuidedAction) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onFocus: () => void; onSwitch: (persona: PersonaKey) => void }) {
  const latest = messages[messages.length - 1];
  return <section className={styles.allyBand} aria-label={`${allyName}, ${PERSONAS[persona].firstName}’s Ally`}>
    <button className={styles.allyIdentity} onClick={onFocus}><Image src="/ki-avatar-glyph.png" alt="" width={58} height={58} priority/><span><small>{state.allies[persona].confirmed ? "YOUR ALLY" : "GENESIS AGENT"}</small><b>{allyName}</b><em>Source: {PERSONAS[persona].firstName}</em></span></button>
    <div className={styles.allyThread}><small>{latest.role === "ally" ? `${allyName} · ${latest.objectId}` : `${PERSONAS[persona].firstName} · ${latest.objectId}`}</small><p>{latest.body}</p></div>
    <form className={styles.allyInput} onSubmit={onSubmit}><label htmlFor={`message-${persona}`}>Talk with {allyName}</label><div><input id={`message-${persona}`} name="message" autoComplete="off" placeholder="Ask in this context…"/><button aria-label="Send message">↑</button></div><small>Language prepares intent; it cannot perform a sovereign act.</small></form>
    <div className={styles.nextAction}>{nextAction ? <button className={`${styles.guidedAction} ${styles[`action_${nextAction.actionClass.toLowerCase()}`]}`} onClick={() => onRun(nextAction)}><span>{nextAction.actionClass} · {nextAction.simulation ? "simulation" : "live"}</span><b>{nextAction.label}</b><small>{nextAction.short}</small></button> : otherAction ? <button className={styles.waitingAction} onClick={() => onSwitch(otherAction.actor === "matt" ? "matt" : "david")}><span>WAITING FOR {otherAction.actor.toUpperCase()}</span><b>{otherAction.label}</b><small>Open the independent {otherAction.actor} session →</small></button> : <div className={styles.completeAction}><span>{state.project === "complete" ? "CONNECTED JOURNEY COMPLETE" : "NO COMMITMENT WAITING"}</span><b>{state.project === "complete" ? "Service Alliance Record chain settled" : "Explore the Field or ask in context."}</b></div>}{alternateActions.length > 0 && <div className={styles.alternateActions}>{alternateActions.map((action) => <button key={action.id} onClick={() => onRun(action)}>{action.label}<span>↗</span></button>)}</div>}</div>
  </section>;
}

function FindLens({ state, onClose, onSelect, onAtlas }: { state: StudioState; onClose: () => void; onSelect: (id: string) => void; onAtlas: () => void }) {
  const options = [
    { id: "persona-matt", label: "Matt Simon", type: "Persona", note: state.relationship === "active" ? "Relationship active" : "Permission-safe public context" },
    { id: "organization-service-alliance", label: "Service Alliance", type: "Organization", note: state.organization },
    { id: state.activeArtifactId ?? "artifact-formation", label: "Formation Package", type: "Artifact", note: state.activeArtifactId ?? "Not yet created" },
    { id: "compute-project", label: "Formation Compute", type: "Compute", note: `${state.compute.consumed} settled use` },
    { id: "records", label: "Project Records", type: "Evidence", note: `${state.records.length} receipts` },
  ];
  return <div className={styles.modalScrim} role="dialog" aria-modal="true" aria-label="Find and approach"><section className={styles.findLens}><header><small>FIND / APPROACH ANYTHING</small><h1>Bring context near.</h1><button onClick={onClose} aria-label="Close">×</button></header><input autoFocus placeholder="Search permitted people, work, Sources…"/><div>{options.map((option) => <button key={option.id} onClick={() => { onSelect(option.id); onClose(); }}><span>{option.type}</span><b>{option.label}</b><small>{option.note}</small></button>)}<button onClick={onAtlas}><span>COMPLETE STUDIO</span><b>Capability atlas</b><small>282 demonstrated, represented or catalog-only rows</small></button></div><p>Results are permission-safe. Finding brings an object near; it never grants access or opens a detached product page.</p></section></div>;
}

function CapabilityAtlas({ rows, query, setQuery, filter, setFilter, onClose }: { rows: CapabilityRow[]; query: string; setQuery: (value: string) => void; filter: "all" | CapabilityRow["v0Coverage"]; setFilter: (value: "all" | CapabilityRow["v0Coverage"]) => void; onClose: () => void }) {
  const filtered = rows.filter((row) => (filter === "all" || row.v0Coverage === filter) && `${row.id} ${row.capability} ${row.status}`.toLowerCase().includes(query.toLowerCase()));
  const counts = { demonstrated: rows.filter((row) => row.v0Coverage === "demonstrated").length, represented: rows.filter((row) => row.v0Coverage === "represented").length, "catalog-only": rows.filter((row) => row.v0Coverage === "catalog-only").length };
  return <div className={styles.atlas} role="dialog" aria-modal="true" aria-label="Complete Studio capability atlas"><header><div><small>COMPLETE STUDIO 1.0 · SOURCE-BACKED</small><h1>Capability atlas</h1><p>V0 breadth is accounted for without implying that represented or catalog-only rows are functional.</p></div><button onClick={onClose} aria-label="Close capability atlas">×</button></header><div className={styles.atlasControls}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a capability…"/><div><button className={filter === "all" ? styles.atlasActive : ""} onClick={() => setFilter("all")}>All <b>{rows.length}</b></button>{(["demonstrated", "represented", "catalog-only"] as const).map((value) => <button key={value} className={filter === value ? styles.atlasActive : ""} onClick={() => setFilter(value)}>{value} <b>{counts[value]}</b></button>)}</div></div><div className={styles.atlasRows}>{filtered.map((row) => <article key={row.id}><span className={styles[`coverage_${row.v0Coverage.replace("-", "_")}`]}>{row.v0Coverage}</span><small>{row.id} · {row.actionClass}</small><h2>{row.capability}</h2><p>{row.status}</p><footer><span>Authority · {row.authority}</span><span>Source · {row.sources}</span><span>Definition coverage · {row.prototype}</span></footer></article>)}</div><footer>{filtered.length} of 282 rows shown · source count mismatch preserved separately: acceptance table has 75 IDs while the prior audit says 72.</footer></div>;
}
