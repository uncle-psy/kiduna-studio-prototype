"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./studio.module.css";
import { defaultStudioState, type MemberId, type StudioAction, type StudioState } from "@/lib/studio-state";

type View = "field" | "community" | "project" | "wisdom" | "signals";
type Person = { id: MemberId; name: string; ally: string; role: string; color: string; status: string; gift: string };

const people: Person[] = [
  { id: "david", name: "David", ally: "Lumen", role: "Steward", color: "violet", status: "present", gift: "Holds the system intention and decides what becomes shared direction." },
  { id: "jeya", name: "Jeya", ally: "Mira", role: "Meaning maker", color: "coral", status: "deep work", gift: "Brings language, human meaning, and a sensitivity to what feels alive." },
  { id: "aashik", name: "Aashik", ally: "Kite", role: "Builder", color: "cyan", status: "available", gift: "Turns patterns into behavior and keeps the prototype grounded in use." },
];

const quickPrompts = {
  none: ["Bring Jeya and Aashik together to shape the Studio interface", "What is moving in the Field?"],
  inviting: ["They've accepted—let's continue", "What will Studio Makers know?"],
  active: ["Start the Studio Field Prototype", "Show me what the community is becoming"],
  project: ["Open our three source documents to the project's Wisdom", "Ask Mapper to find the strongest pattern"],
  mapped: ["What decision needs me?", "Approve this direction"],
};

function Face({ person, active = false }: { person: Person; active?: boolean }) {
  return <span className={`${styles.face} ${styles[person.color]} ${active ? styles.faceActive : ""}`} aria-hidden="true">
    <i className={styles.faceAura} /><i className={styles.faceHead}><b /><em /></i><i className={styles.faceSpark}>✦</i>
  </span>;
}

export default function StudioPage() {
  const [state, setState] = useState<StudioState>(defaultStudioState);
  const [memberId, setMemberId] = useState<MemberId | null>(null);
  const [view, setView] = useState<View>("field");
  const [focus, setFocus] = useState<"ally" | "person" | "community" | "direction" | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [message, setMessage] = useState("");
  const [allyReply, setAllyReply] = useState("I’m here. Tell me what you want to bring into being.");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [aiMode, setAiMode] = useState<"openai" | "prototype">("prototype");

  const person = people.find((item) => item.id === memberId) ?? people[0];
  const hydrate = useCallback((payload: { state: StudioState }) => { setState(payload.state); setConnected(true); }, []);

  useEffect(() => {
    const saved = localStorage.getItem("kiduna-demo-member") as MemberId | null;
    const place = new URLSearchParams(window.location.search).get("place") as View | null;
    const frame = requestAnimationFrame(() => {
      if (saved && people.some((item) => item.id === saved)) setMemberId(saved);
      if (place && ["field", "community", "project", "wisdom", "signals"].includes(place)) setView(place);
    });
    fetch("/api/workspace").then((r) => r.json()).then(hydrate).catch(() => setConnected(false));
    return () => cancelAnimationFrame(frame);
  }, [hydrate]);

  const signIn = (id: MemberId) => { localStorage.setItem("kiduna-demo-member", id); setMemberId(id); };
  const runAction = useCallback(async (action: StudioAction) => {
    const response = await fetch("/api/workspace", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, memberId: memberId ?? "david" }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    hydrate(payload);
    if (action === "INVITE_MEMBERS") setView("community");
    if (action === "START_PROJECT") setView("project");
    if (action === "OPEN_WISDOM" || action === "RUN_MAPPER") setView("wisdom");
    if (action === "PROPOSE_DIRECTION" || action === "APPROVE_DIRECTION") setView("signals");
  }, [hydrate, memberId]);

  const askAlly = async (event?: FormEvent, prompt?: string) => {
    event?.preventDefault();
    const content = (prompt ?? message).trim();
    if (!content || busy) return;
    setBusy(true); setMessage(""); setFocus("ally"); setAllyReply("Let me feel into the Field…");
    try {
      const response = await fetch("/api/ally", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, memberId: memberId ?? "david", state }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setAllyReply(payload.reply); setAiMode(payload.mode);
      if (payload.action) await runAction(payload.action);
    } catch (error) {
      setAllyReply(error instanceof Error ? error.message : "I lost the thread for a moment. Ask me again.");
    } finally { setBusy(false); }
  };

  const prompts = useMemo(() => {
    if (state.direction.status === "proposed") return quickPrompts.mapped;
    if (state.project.status === "active") return quickPrompts.project;
    return quickPrompts[state.community.status];
  }, [state]);

  if (!memberId) return <main className={styles.welcome}>
    <div className={styles.stars} aria-hidden="true" />
    <section className={styles.welcomeCard}>
      <Image src="/kiduna-mark.svg" alt="Kiduna" width={64} height={64} priority />
      <span className={styles.eyebrow}>STUDIO FIELD · UX PROTOTYPE 0.2</span>
      <h1>Enter as a member.</h1>
      <p>Each browser remembers its own identity, so you can open three browsers and experience the same living community from three points of view.</p>
      <div className={styles.accountGrid}>{people.map((item) => <button key={item.id} onClick={() => signIn(item.id)}>
        <Face person={item} /><span><strong>{item.name}</strong><small>{item.role} · Ally {item.ally}</small></span><b>Enter →</b>
      </button>)}</div>
      <small className={styles.demoNote}>Prototype sign-in · no password · identity is local to this browser</small>
    </section>
  </main>;

  return <main className={`${styles.studio} ${focus ? styles.hasFocus : ""}`}>
    <div className={styles.fieldAtmosphere} aria-hidden="true"><i /><i /><i /><i /></div>

    <header className={styles.topbar}>
      <button className={styles.brand} onClick={() => { setView("field"); setFocus(null); }}><Image src="/kiduna-mark.svg" alt="" width={36} height={36} /><span><small>KINSHIP DUNA</small><strong>Studio</strong></span></button>
      <div className={styles.path}><button onClick={() => setView("field")}>Field</button>{state.community.status !== "none" && <><i>›</i><button onClick={() => setView("community")}>Studio Makers</button></>}{state.project.status === "active" && <><i>›</i><button onClick={() => setView("project")}>Field Prototype</button></>}</div>
      <div className={styles.presence}><span className={connected ? styles.live : ""} />{connected ? "Field is live" : "Reconnecting"}</div>
      <button className={styles.identity} onClick={() => setMemberId(null)}><Face person={person} active /><span><small>YOU ARE</small><strong>{person.name}</strong></span><i>⌄</i></button>
    </header>

    <nav className={styles.rail} aria-label="Studio places">
      <button className={view === "field" ? styles.selected : ""} onClick={() => { setView("field"); setFocus(null); }}><b>✦</b><span>Field</span></button>
      <button disabled={state.community.status === "none"} className={view === "community" ? styles.selected : ""} onClick={() => { setView("community"); setFocus(null); }}><b>◌</b><span>Community</span></button>
      <button disabled={state.project.status === "none"} className={view === "project" ? styles.selected : ""} onClick={() => { setView("project"); setFocus(null); }}><b>◇</b><span>Project</span></button>
      <button disabled={state.project.status === "none"} className={view === "wisdom" ? styles.selected : ""} onClick={() => { setView("wisdom"); setFocus(null); }}><b>⌁</b><span>Wisdom</span></button>
      <button className={view === "signals" ? styles.selected : ""} onClick={() => { setView("signals"); setFocus(null); }}><b>·</b><span>Signals</span>{state.direction.status === "proposed" && <i>1</i>}</button>
      <Link href="/iterations"><b>≡</b><span>Spec</span></Link>
    </nav>

    <section className={styles.canvas}>
      {view === "field" && <FieldView state={state} people={people} onPerson={(p) => { setSelectedPerson(p); setFocus("person"); }} onCommunity={() => { setView("community"); setFocus("community"); }} onProject={() => setView("project")} />}
      {view === "community" && <CommunityView state={state} people={people} onPerson={(p) => { setSelectedPerson(p); setFocus("person"); }} runAction={runAction} />}
      {view === "project" && <ProjectView state={state} runAction={runAction} setView={setView} />}
      {view === "wisdom" && <WisdomView state={state} runAction={runAction} />}
      {view === "signals" && <SignalsView state={state} runAction={runAction} onFocus={() => setFocus("direction")} />}
    </section>

    <section className={`${styles.allyDock} ${focus === "ally" ? styles.allyOpen : ""}`} style={{ zIndex: focus === "ally" ? 32 : undefined }}>
      <button className={styles.allyOrb} onClick={() => setFocus(focus === "ally" ? null : "ally")}><i>✦</i><span><small>{person.ally.toUpperCase()} · YOUR ALLY</small><strong>{focus === "ally" ? "Listening closely" : "What would you like to move?"}</strong></span></button>
      <form onSubmit={askAlly}><input value={message} onChange={(e) => setMessage(e.target.value)} onFocus={() => setFocus("ally")} placeholder={`Tell ${person.ally} what you want…`} /><button disabled={busy}>{busy ? "···" : "↑"}</button></form>
    </section>

    {focus && <div className={styles.focusScrim} onClick={() => setFocus(null)} />}
    {focus === "ally" && <aside className={`${styles.focusPanel} ${styles.allyPanel}`}>
      <button className={styles.close} onClick={() => setFocus(null)}>×</button>
      <div className={styles.allyIdentity}><div className={styles.largeOrb}>✦</div><span><small>{person.ally.toUpperCase()}</small><strong>Your Ally</strong></span><em>{aiMode === "openai" ? "OpenAI connected" : "prototype intelligence"}</em></div>
      <p className={styles.allySpeech}>{allyReply}</p>
      <div className={styles.promptChips}>{prompts.map((prompt) => <button key={prompt} onClick={() => askAlly(undefined, prompt)}>{prompt}<span>→</span></button>)}</div>
      <div className={styles.allyScope}><span>✦</span><p><strong>Acting within this prototype</strong><small>{person.ally} can shape the community, project, Wisdom, and decisions here. External actions remain simulated.</small></p></div>
    </aside>}
    {focus === "person" && selectedPerson && <PersonPanel person={selectedPerson} onClose={() => setFocus(null)} />}
    {focus === "direction" && <DirectionPanel state={state} runAction={runAction} onClose={() => setFocus(null)} />}
  </main>;
}

function FieldView({ state, people, onPerson, onCommunity, onProject }: { state: StudioState; people: Person[]; onPerson: (p: Person) => void; onCommunity: () => void; onProject: () => void }) {
  return <div className={styles.fieldView}>
    <div className={styles.fieldIntro}><span className={styles.eyebrow}>THE LIVING FIELD</span><h1>Good afternoon.</h1><p>{state.community.status === "none" ? "Three people are near. Nothing needs your attention." : state.project.status === "none" ? "Studio Makers is beginning to breathe." : "The prototype is moving quietly. One shared direction is taking shape."}</p></div>
    {state.community.status !== "none" && <button className={styles.communityWorld} onClick={onCommunity}><i className={styles.worldGlow} /><span className={styles.worldSigil}>✺</span><strong>Studio Makers</strong><small>{state.community.status === "active" ? "3 present · secret community" : "2 invitations moving"}</small></button>}
    {state.project.status === "active" && <button className={styles.projectWorld} onClick={onProject}><span>◇</span><strong>Field Prototype</strong><small>{state.project.mapperStatus === "ready" ? "new pattern ready" : "project envoy listening"}</small></button>}
    <div className={styles.faceField}>{people.map((p, i) => <button key={p.id} className={`${styles.fieldPerson} ${styles[`person${i}`]}`} onClick={() => onPerson(p)}><Face person={p} /><span><strong>{p.name}</strong><small>{p.status}</small></span></button>)}</div>
    <div className={styles.fieldWhisper}><span>✦</span><p><strong>The Field is not a feed.</strong><small>It shows relationships, attention, and possibility—not everything that happened.</small></p></div>
  </div>;
}

function CommunityView({ state, people, onPerson, runAction }: { state: StudioState; people: Person[]; onPerson: (p: Person) => void; runAction: (a: StudioAction) => Promise<void> }) {
  return <div className={styles.placeView}>
    <header className={styles.placeHeader}><div className={styles.sigilLarge}>✺</div><div><span className={styles.eyebrow}>SECRET COMMUNITY · {state.community.handle}</span><h1>{state.community.name}</h1><p>{state.community.purpose}</p></div><button>Ask the Envoy <span>✦</span></button></header>
    <div className={styles.pulseGrid}><article className={styles.pulseCard}><span>COMMUNITY PULSE</span><strong>{state.community.status === "active" ? "Together" : "Invitations moving"}</strong><p>{state.community.status === "active" ? "All three members are connected. No one needs interrupting." : "Jeya and Aashik can accept through their Allies. Their attention remains protected."}</p>{state.community.status === "inviting" && <button onClick={() => runAction("ACCEPT_INVITATIONS")}>Simulate both accepting</button>}</article><article><span>ENVOY</span><strong>Studio</strong><p>Holds the community’s Stance, Wisdom, Connections, and shared intent.</p><div className={styles.capabilities}><i>Wisdom</i><i>Stance</i><i>Skills</i><i>Automations</i></div></article></div>
    <section className={styles.membersSection}><div><span className={styles.eyebrow}>FACES IN THIS COMMUNITY</span><h2>What each person brings</h2></div><div className={styles.memberCards}>{people.map((p) => <button key={p.id} onClick={() => onPerson(p)}><Face person={p} /><span><strong>{p.name}</strong><small>{p.role}</small><p>{p.gift}</p><em>Through {p.ally} →</em></span></button>)}</div></section>
  </div>;
}

function ProjectView({ state, runAction, setView }: { state: StudioState; runAction: (a: StudioAction) => Promise<void>; setView: (v: View) => void }) {
  return <div className={styles.placeView}><header className={styles.placeHeader}><div className={`${styles.sigilLarge} ${styles.projectSigil}`}>◇</div><div><span className={styles.eyebrow}>PRIVATE PROJECT · STUDIO MAKERS</span><h1>{state.project.name}</h1><p>{state.project.purpose}</p></div><button>Ask the project <span>✦</span></button></header>
    <div className={styles.projectPulse}><div><span>THE WORK NOW</span><h2>{state.project.materialCount ? "The sources agree on a living-field direction." : "The project is ready to receive what the three of you know."}</h2><p>{state.project.materialCount ? "Your Allies are carrying the useful parts forward. You can inspect provenance in Wisdom whenever you want." : "Open existing research to this project, or ask its Envoy to find what is already available."}</p></div><div className={styles.orbitMini}><i /><i /><b>◇</b></div></div>
    <div className={styles.projectLanes}><button onClick={() => setView("wisdom")}><span>⌁</span><div><small>WISDOM</small><strong>{state.wisdom.sourceCount} sources · {state.wisdom.concepts.length} living concepts</strong><p>{state.wisdom.synthesis}</p></div><b>→</b></button><button onClick={() => state.project.mapperStatus === "idle" ? runAction("RUN_MAPPER") : setView("signals")}><span>✦</span><div><small>ACTORS</small><strong>Mapper · {state.project.mapperStatus}</strong><p>Finds patterns across private project Wisdom. Read-only; cannot publish or contact anyone.</p></div><b>→</b></button><button onClick={() => setView("signals")}><span>·</span><div><small>SIGNALS</small><strong>{state.direction.status === "proposed" ? "1 needs your judgment" : "Nothing needs attention"}</strong><p>Small, contextual movements replace status feeds and group conversation.</p></div><b>→</b></button></div>
  </div>;
}

function WisdomView({ state, runAction }: { state: StudioState; runAction: (a: StudioAction) => Promise<void> }) {
  return <div className={styles.placeView}><header className={styles.placeHeader}><div className={`${styles.sigilLarge} ${styles.wisdomSigil}`}>⌁</div><div><span className={styles.eyebrow}>PROJECT WISDOM · PRIVATE NAMESPACE</span><h1>What the work knows</h1><p>Sources become usable understanding. They remain inspectable, cited, and scoped to this project.</p></div>{state.wisdom.sourceCount === 0 && <button onClick={() => runAction("OPEN_WISDOM")}>Open 3 sources <span>＋</span></button>}</header>
    <div className={styles.wisdomMap}><section><span>CURRENT SYNTHESIS</span><h2>{state.wisdom.synthesis}</h2><div className={styles.concepts}>{state.wisdom.concepts.map((c) => <i key={c}>{c}</i>)}</div></section><div className={styles.sourceCluster}>{state.wisdom.sourceCount ? <><button><b>PDF</b><span>Spatial UI<br/><small>domain model</small></span></button><button><b>NOTES</b><span>Studio review<br/><small>July 15</small></span></button><button><b>PDF</b><span>Surfaces<br/><small>design bible</small></span></button></> : <div className={styles.emptyWisdom}><span>⌁</span><p>Available sources are still held privately by their members.</p></div>}</div></div>
    <div className={styles.scopeBar}><span>◉</span><p><strong>Visible to Studio Field Prototype</strong><small>Not available to the wider community, organization, or outside connections.</small></p><button>Inspect scope</button></div>
  </div>;
}

function SignalsView({ state, runAction, onFocus }: { state: StudioState; runAction: (a: StudioAction) => Promise<void>; onFocus: () => void }) {
  return <div className={styles.placeView}><header className={styles.simpleHeader}><span className={styles.eyebrow}>SIGNALS</span><h1>Only what needs you.</h1><p>Everything else keeps moving quietly through Allies, Envoys, and Actors.</p></header>{state.direction.status === "proposed" ? <button className={styles.signalCard} onClick={onFocus}><span className={styles.signalSource}>FIELD PROTOTYPE · MAPPER</span><h2>Focused surfaces should quiet the Field—but never erase it.</h2><p>Jeya’s language notes and Aashik’s interaction findings reinforce the same direction.</p><div><i>Needs your judgment</i><b>Open signal →</b></div></button> : <div className={styles.clearSignals}><span>✦</span><h2>{state.direction.status === "accepted" ? "The direction is living in the work." : "Your attention is clear."}</h2><p>{state.direction.status === "accepted" ? "Version 0.2 and its provenance are retained in project Wisdom." : "Ask Mapper to synthesize the project when you want a meaningful signal."}</p>{state.project.status === "active" && state.direction.status === "forming" && <button onClick={() => runAction("RUN_MAPPER")}>Ask Mapper to synthesize</button>}</div>}</div>;
}

function PersonPanel({ person, onClose }: { person: Person; onClose: () => void }) { return <aside className={styles.focusPanel}><button className={styles.close} onClick={onClose}>×</button><div className={styles.personHero}><Face person={person} /><span><small>FACE · STUDIO MAKERS</small><h2>{person.name}</h2><p>{person.role}</p></span></div><p className={styles.personGift}>{person.gift}</p><div className={styles.personContext}><span>RIGHT NOW</span><strong>{person.status}</strong><p>Their Ally, {person.ally}, is protecting their attention and carrying relevant project movements to them.</p></div><div className={styles.personActions}><button><span>✦</span><strong>Message through {person.ally}</strong><small>Delivered when it fits their attention</small></button><button><span>!</span><strong>Mark urgent</strong><small>{person.ally} will decide how to interrupt</small></button><button><span>＋</span><strong>Share something</strong><small>Document, project, or living context</small></button></div></aside>; }

function DirectionPanel({ state, runAction, onClose }: { state: StudioState; runAction: (a: StudioAction) => Promise<void>; onClose: () => void }) { return <aside className={`${styles.focusPanel} ${styles.directionPanel}`}><button className={styles.close} onClick={onClose}>×</button><span className={styles.eyebrow}>ONE DIRECTION · VERSION {state.direction.version}</span><h2>{state.direction.statement}</h2><div className={styles.reasoning}><span>WHY THIS SURFACED</span><p>Three private sources converge here. Jeya’s work emphasizes calm comprehension; Aashik’s notes show orientation drops when the Field disappears completely.</p><button>See 3 sources</button></div><div className={styles.microResponse}><p>“Yes—quiet the Field, but let it breathe faintly behind focus.”</p><button onClick={async () => { await runAction("APPROVE_DIRECTION"); onClose(); }}>Make this living direction <span>→</span></button><button className={styles.secondary}>Tell my Ally something else</button></div></aside>; }
