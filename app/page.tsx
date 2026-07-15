"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import styles from "./studio.module.css";
import type { StudioAction, StudioState } from "@/lib/studio-state";

type WorkspaceEvent = {
  id: number;
  action: string;
  actor: string;
  summary: string;
  createdAt: string;
};

const scenes = [
  {
    kicker: "Living return",
    title: "Back in Kinship Duna",
    ally: "Good morning. David, Jeya, and Aashik are present. Nothing needs your approval.",
    action: "Gather members",
    actionKey: "GATHER_MEMBERS",
    depth: "Clear",
    depthValue: "12%",
  },
  {
    kicker: "Gather · reversible",
    title: "Two members, one intention",
    ally: "You brought Jeya and Aashik into context. I can start a project or create a community. Nothing has changed yet.",
    action: "Create community",
    actionKey: "CREATE_COMMUNITY",
    depth: "Context",
    depthValue: "56%",
  },
  {
    kicker: "Command preview",
    title: "Invite them into a community",
    ally: "This will invite Jeya and Aashik to Studio Makers, a private community in Kinship Duna. You will be its steward.",
    action: "Send invitations",
    actionKey: "SEND_INVITATIONS",
    depth: "Focus",
    depthValue: "94%",
  },
  {
    kicker: "Community · active",
    title: "Studio Makers is here",
    ally: "Both invitations were accepted. The three of you now share this community and its private materials.",
    action: "Start a project",
    actionKey: "START_PROJECT",
    depth: "Context",
    depthValue: "56%",
  },
  {
    kicker: "Project · created",
    title: "Shape the first demonstration",
    ally: "Studio Field Prototype is ready. I carried over the community members, private scope, and the design intention you named.",
    action: "Bring materials",
    actionKey: "BRING_MATERIALS",
    depth: "Clear",
    depthValue: "12%",
  },
  {
    kicker: "Living workbench",
    title: "The work is visible",
    ally: "The meeting transcript and two design references are private project materials. Mapper is comparing them now; no external action is allowed.",
    action: "Open project chat",
    actionKey: "OPEN_PROJECT_CHAT",
    depth: "Context",
    depthValue: "56%",
  },
  {
    kicker: "Project conversation",
    title: "Work through it together",
    ally: "I can turn this conversation into a proposed project update, with every source cited and nothing published.",
    action: "Prepare update",
    actionKey: "PREPARE_UPDATE",
    depth: "Focus",
    depthValue: "94%",
  },
  {
    kicker: "Artifact · proposed change",
    title: "Review before the project changes",
    ally: "Mapper proposes a new accepted brief from three private sources. Approving creates version 0.2 inside this project; it does not publish or deploy it.",
    action: "Review version 0.2",
    actionKey: "APPROVE_UPDATE",
    depth: "Focus",
    depthValue: "94%",
  },
] as const;

const members = [
  { id: "david", initials: "DL", name: "David", role: "Steward" },
  { id: "jeya", initials: "JY", name: "Jeya", role: "Meaning maker" },
  { id: "aashik", initials: "AK", name: "Aashik", role: "Builder" },
] as const;

const accounts = [
  { id: "david", initials: "DL", name: "David", role: "Steward", ally: "Ki", allyInitials: "KI" },
  { id: "jeya", initials: "JY", name: "Jeya", role: "Meaning maker", ally: "Mira", allyInitials: "MI" },
  { id: "aashik", initials: "AK", name: "Aashik", role: "Builder", ally: "Kite", allyInitials: "KT" },
] as const;

type AccountId = typeof accounts[number]["id"];
type Focus = "chat" | "artifact" | null;

export default function StudioPage() {
  const [accountId, setAccountId] = useState<AccountId | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [scene, setScene] = useState(0);
  const [focus, setFocus] = useState<Focus>(null);
  const [workspace, setWorkspace] = useState<StudioState | null>(null);
  const [events, setEvents] = useState<WorkspaceEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [chatValue, setChatValue] = useState("");
  const current = scenes[scene];
  const account = accounts.find((item) => item.id === accountId) ?? accounts[0];

  const applyPayload = useCallback((payload: { state: StudioState; events: WorkspaceEvent[] }) => {
    setWorkspace(payload.state);
    setEvents(payload.events);
    setScene(Math.min(scenes.length - 1, payload.state.scene));
  }, []);

  const runAction = useCallback(async (action: StudioAction, message?: string) => {
    setBusy(true);
    setBackendError("");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message, memberId: accountId ?? "david" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Studio could not record that action.");
      applyPayload(payload);
      if (action === "SEND_MESSAGE") setChatValue("");
      if (action === "OPEN_PROJECT_CHAT") setFocus("chat");
      if (action === "PREPARE_UPDATE") setFocus("artifact");
      if (action === "RESET") setFocus(null);
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Studio could not record that action.");
    } finally {
      setBusy(false);
    }
  }, [accountId, applyPayload]);

  useEffect(() => {
    const saved = sessionStorage.getItem("kiduna-studio-member") as AccountId | null;
    const frame = requestAnimationFrame(() => {
      if (saved && accounts.some((item) => item.id === saved)) setAccountId(saved);
      setIdentityReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/workspace")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "The Studio backend is unavailable.");
        if (active) applyPayload(payload);
      })
      .catch((error) => active && setBackendError(error instanceof Error ? error.message : "The Studio backend is unavailable."));
    return () => { active = false; };
  }, [applyPayload]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setFocus(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isCommunity = scene >= 3;
  const isProject = scene >= 4;
  const isWorkbench = scene >= 5;
  const isChat = focus === "chat";
  const isArtifactFocus = focus === "artifact";
  const approved = workspace?.briefApproved ?? false;
  const materialCount = workspace?.materialCount ?? (isWorkbench ? 3 : 1);

  const enterAs = (id: AccountId) => {
    sessionStorage.setItem("kiduna-studio-member", id);
    setAccountId(id);
  };

  if (!identityReady) return null;

  if (!accountId) return <main className={`${styles.studio} ${styles.entry}`}>
    <div className={styles.fieldWeather} aria-hidden="true" />
    <section className={styles.entryPanel}>
      <Image src="/kiduna-mark.svg" alt="" width={46} height={46} priority />
      <span>STUDIO · KINSHIP DUNA</span>
      <h1>Enter the Field</h1>
      <p>Choose who you are entering as. This identity remains fixed for this browser session.</p>
      <div>{accounts.map((item) => <button key={item.id} type="button" onClick={() => enterAs(item.id)}>
        <b>{item.initials}</b><span><strong>{item.name}</strong><small>{item.role} · {item.ally} is their Ally</small></span><i>Enter →</i>
      </button>)}</div>
      <small>Prototype identity · no account switching inside the Field</small>
    </section>
  </main>;

  return (
    <main className={`${styles.studio} ${styles[`scene${scene}`]}`}>
      <div className={styles.fieldWeather} aria-hidden="true" />

      <header className={styles.hudTop}>
        <div className={styles.containerChip} aria-label="Current container">
          <Image src="/kiduna-mark.svg" alt="" width={40} height={40} />
          <span>
            <small>acting as member</small>
            <strong>{account.name}</strong>
          </span>
          <i>›</i><span><small>organization</small><strong>Kinship Duna</strong></span>
          {isCommunity && <><i>›</i><span><small>community</small><strong>Studio Makers</strong></span></>}
          {isProject && <><i>›</i><span><small>project</small><strong>Field Prototype</strong></span></>}
        </div>

        <div className={styles.contextActions} aria-label="Available actions">
          <button type="button" onClick={() => runAction("RESET")} disabled={busy}>Reset</button>
          {isProject && <button type="button" onClick={() => setFocus("chat")}>Ask {account.ally}</button>}
          <button className={styles.primaryAction} type="button" onClick={() => scene === 7 && !approved ? setFocus("artifact") : runAction(current.actionKey)} disabled={busy || (scene === scenes.length - 1 && approved)}>
            {busy ? "Recording…" : approved && scene === 7 ? "Version 0.2 accepted" : current.action}
          </button>
        </div>
      </header>

      <section className={styles.field} aria-label="Kinship Duna Studio Field">
        <div className={styles.horizonLabel}>
          <span>GENESIS ECOSYSTEM</span>
          <i />
          <strong>Kinship Duna</strong>
          <small>registered organization · 118 members · <b>{backendError ? "backend unavailable" : workspace ? "live state connected" : "connecting…"}</b></small>
        </div>

        <div className={styles.sceneTitle}>
          <span>{current.kicker}</span>
          <h1>{current.title}</h1>
        </div>

        <div className={`${styles.communityBoundary} ${isCommunity ? styles.visible : ""}`}>
          <div className={styles.boundaryLabel}><span>COMMUNITY</span> Studio Makers <i>3 members</i></div>
        </div>

        <div className={`${styles.gatherRing} ${scene === 1 || scene === 2 ? styles.visible : ""}`}>
          <span>GATHER · 2 MEMBERS</span>
        </div>

        <div className={styles.members}>
          {members.map((member, index) => (
            <button
              key={member.id}
              className={`${styles.persona} ${styles[member.id]} ${scene === 0 && index === 2 ? styles.away : ""}`}
              type="button"
              aria-label={`${member.name}, ${member.role}`}
            >
              <span>{member.initials}</span>
              <strong>{member.name}</strong>
              <small>{scene >= 3 ? (index === 0 ? "steward" : "member") : member.role.toLowerCase()}</small>
            </button>
          ))}
        </div>

        <div className={`${styles.invitePreview} ${scene === 2 ? styles.visible : ""}`}>
          <div className={styles.previewHeader}>
            <span>COMMUNITY INVITATION</span>
            <small>private · reversible until accepted</small>
          </div>
          <h2>Studio Makers</h2>
          <p>A place to build the first Studio Field demonstration from inside Kiduna.</p>
          <div className={styles.inviteRows}>
            <div><b>JY</b><span><strong>Jeya</strong><small>invitation ready</small></span><em>Meaning maker</em></div>
            <div><b>AK</b><span><strong>Aashik</strong><small>invitation ready</small></span><em>Builder</em></div>
          </div>
          <div className={styles.consequence}>
            <span>WHAT CHANGES</span>
            They may enter the community, join its conversation, and see material shared at its private scope.
          </div>
          <button type="button" onClick={() => runAction("SEND_INVITATIONS")} disabled={busy}>Send 2 invitations <span>→</span></button>
        </div>

        <div className={`${styles.projectBench} ${isProject ? styles.visible : ""}`}>
          <div className={styles.projectHeader}>
            <span>PROJECT · PRIVATE</span>
            <i>studio://kinship/studio-makers/field-prototype</i>
          </div>
          <h2>Studio Field Prototype</h2>
          <p>Make organizations, communities, projects, people, agents, and artifacts immediately understandable.</p>
          <div className={styles.milestoneLine}><span style={{ width: isWorkbench ? "46%" : "12%" }} /></div>
          <div className={styles.projectMeta}>
            <span><b>{materialCount}</b> materials</span>
            <span><b>3</b> members</span>
            <span><b>{isWorkbench ? "1" : "0"}</b> Actor working</span>
          </div>
        </div>

        <div className={`${styles.materials} ${isWorkbench ? styles.visible : ""}`}>
          <button className={`${styles.artifact} ${styles.artifactOne}`} type="button">
            <span>TRANSCRIPT · PRIVATE</span>
            <strong>Studio working session</strong>
            <small>Google Meet · Jul 15 · 26 min</small>
          </button>
          <button className={`${styles.artifact} ${styles.artifactTwo}`} type="button">
            <span>REFERENCE · PRIVATE</span>
            <strong>Spatial UI Domain Model</strong>
            <small>David · 24 pages · live source</small>
          </button>
          <button className={`${styles.artifact} ${styles.artifactThree}`} type="button">
            <span>REFERENCE · PRIVATE</span>
            <strong>Surfaces Design Bible</strong>
            <small>Project canon · version 0.1</small>
          </button>
          <button className={styles.actor} type="button">
            <span>MAP</span>
            <strong>Mapper</strong>
            <small>{approved ? "completed" : isArtifactFocus ? "change ready" : "comparing sources"}</small>
          </button>
          <div className={styles.workTrace}><span>Mapper</span><i /><b>{approved ? "accepted v0.2" : isArtifactFocus ? "proposed v0.2" : "reading 3 private sources"}</b></div>
        </div>

        <div className={`${styles.focusScrim} ${isChat || isArtifactFocus ? styles.visible : ""}`} />

        <aside className={`${styles.focusPanel} ${isChat ? styles.visible : ""}`} aria-hidden={!isChat}>
          <div className={styles.focusHeading}>
            <span>PROJECT CONVERSATION</span>
            <small>3 people · Ally present · private</small>
          </div>
          <div className={styles.chatThread}>
            <article><b>JY</b><div><strong>Jeya</strong><p>The field should stay present even when we are talking. I want the project objects to respond to the work.</p></div><time>11:56</time></article>
            <article><b>{account.initials}</b><div><strong>You</strong><p>Yes. Keep the field underneath, but let focused information become nearly opaque when we need to read and work through something.</p></div><time>11:58</time></article>
            {workspace?.messages.map((message) => <article key={message.id}><b>{message.initials}</b><div><strong>You</strong><p>{message.body}</p></div><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></article>)}
            <article className={styles.allyMessage}><b>{account.allyInitials}</b><div><strong>{account.ally} · your Ally</strong><p>I can update the project brief with that principle and cite this work plus the two source documents.</p><button type="button" onClick={() => runAction("PREPARE_UPDATE")} disabled={busy}>Prepare a proposed update →</button></div><time>now</time></article>
          </div>
          <label className={styles.chatInput}><input aria-label="Message the project" placeholder="Talk to the project…" value={chatValue} onChange={(event) => setChatValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && chatValue.trim()) runAction("SEND_MESSAGE", chatValue); }} /><button type="button" onClick={() => runAction("SEND_MESSAGE", chatValue)} disabled={busy || !chatValue.trim()}>Send</button></label>
        </aside>

        <aside className={`${styles.focusPanel} ${styles.artifactPanel} ${isArtifactFocus ? styles.visible : ""}`} aria-hidden={!isArtifactFocus}>
          <div className={styles.focusHeading}>
            <span>PROPOSED PROJECT ARTIFACT</span>
            <small>{approved ? "accepted · receipt recorded" : "Mapper · awaiting your approval"}</small>
          </div>
          <div className={styles.artifactTitle}>
            <div><span>BRIEF · DRAFT</span><h2>Studio Field interaction brief</h2></div>
            <b>v{approved ? workspace?.briefVersion : "0.2"}</b>
          </div>
          <div className={styles.diffBlock}>
            <span>{approved ? "ACCEPTED ADDITION · PRINCIPLE 04" : "PROPOSED ADDITION · PRINCIPLE 04"}</span>
            <p>“The Field remains continuously present. Chat and detailed information rise to 94% opacity when they lead attention; the current organization, community, project, people, agents, and work remain spatially legible underneath.”</p>
          </div>
          <div className={styles.sourceList}>
            <span>SOURCE CHAIN</span>
            <div><i>01</i><b>Spatial UI Domain Model</b><small>§15.6–15.7</small></div>
            <div><i>02</i><b>Surfaces Design Bible</b><small>§4.2, §6</small></div>
            <div><i>03</i><b>Studio working session</b><small>25:05–26:29</small></div>
          </div>
          <div className={styles.approvalBox}>
            <span>{approved ? "RECEIPT" : "CONSEQUENCE"}</span>
            <p>{approved ? workspace?.lastReceipt?.summary : "Creates accepted brief v0.2 inside Studio Field Prototype. Private. No external action. Previous version remains available."}</p>
            {!approved && <div><button type="button" onClick={() => setFocus(null)}>Not now</button><button type="button" className={styles.approve} onClick={() => runAction("APPROVE_UPDATE")} disabled={busy}>Approve version 0.2</button></div>}
          </div>
        </aside>

        {(workspace?.lastReceipt || backendError) && <div className={`${styles.receiptToast} ${backendError ? styles.receiptError : ""}`}>
          <span>{backendError ? "CONNECTION" : `RECEIPT · ${events.length} RECORDED`}</span>
          <p>{backendError || workspace?.lastReceipt?.summary}</p>
        </div>}
      </section>

      <footer className={`${styles.allyBand} ${current.depth === "Focus" ? styles.allyFocus : ""}`}>
        <button className={styles.allyPresence} type="button" onClick={() => isProject && setFocus("chat")}><span>{account.allyInitials}</span><i /></button>
        <div className={styles.allyCopy}>
          <span>{account.ally.toUpperCase()} · YOUR ALLY</span>
          <p>{approved && scene === 7 ? "Version 0.2 is now accepted inside this private project. The previous version and its complete source chain remain available." : current.ally}</p>
        </div>
        <div className={styles.attentionDial} aria-label={`HUD attention: ${current.depth}`}>
          <span>HUD</span>
          <div><i className={styles[`dial${current.depth}`]} /></div>
          <strong>{current.depth}</strong>
          <small>{current.depthValue}</small>
        </div>
      </footer>
    </main>
  );
}
