"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./studio.module.css";

const accounts = [
  { id: "david", initials: "DL", name: "David", role: "Steward" },
  { id: "jeya", initials: "JY", name: "Jeya", role: "Meaning maker" },
  { id: "aashik", initials: "AK", name: "Aashik", role: "Builder" },
] as const;

type AccountId = (typeof accounts)[number]["id"];
type GenesisEffect = "ORIENT_FIELD" | "SEED_ORGANIZATION" | "PREPARE_INVITES" | "SEED_PROJECT" | "NONE";
type Message = {
  id: string;
  role: "ki" | "source";
  body: string;
  citations?: { title: string; heading: string }[];
};

type KiResponse = {
  reply: string;
  effect: GenesisEffect;
  citations: { title: string; heading: string }[];
  runtime: { wisdomChunks: number; skills: number; executionMode: string };
};

const initialMessage = (name: string): Message => ({
  id: "ki-genesis-greeting",
  role: "ki",
  body: `Hello, ${name}. I’m Ki. There’s nothing here yet—only us. We can begin with what matters to you, and let the Field take shape around the work.`,
});

const prompts = [
  "What is this place?",
  "Let’s begin with Kinship Duna.",
  "I want to build something with Jeya and Aashik.",
];

function effectStage(effect: GenesisEffect, current: number) {
  if (effect === "SEED_ORGANIZATION") return Math.max(current, 1);
  if (effect === "PREPARE_INVITES") return Math.max(current, 2);
  if (effect === "SEED_PROJECT") return Math.max(current, 3);
  return current;
}

export default function StudioPage() {
  const [accountId, setAccountId] = useState<AccountId | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [stage, setStage] = useState(0);
  const [focus, setFocus] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runtime, setRuntime] = useState({ wisdomChunks: 0, skills: 14, executionMode: "simulated" });
  const threadRef = useRef<HTMLDivElement>(null);
  const account = useMemo(() => accounts.find((item) => item.id === accountId) ?? accounts[0], [accountId]);

  useEffect(() => {
    const saved = sessionStorage.getItem("kiduna-studio-member") as AccountId | null;
    const frame = requestAnimationFrame(() => {
      if (saved && accounts.some((item) => item.id === saved)) {
        setAccountId(saved);
        setMessages([initialMessage(accounts.find((item) => item.id === saved)?.name ?? "David")]);
      }
      setIdentityReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!focus) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, focus]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setFocus(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const enterAs = (id: AccountId) => {
    const selected = accounts.find((item) => item.id === id) ?? accounts[0];
    sessionStorage.setItem("kiduna-studio-member", id);
    setAccountId(id);
    setMessages([initialMessage(selected.name)]);
  };

  const beginAgain = () => {
    setStage(0);
    setFocus(false);
    setError("");
    setMessages([initialMessage(account.name)]);
  };

  const leave = () => {
    sessionStorage.removeItem("kiduna-studio-member");
    setAccountId(null);
    setMessages([]);
    setStage(0);
    setFocus(false);
  };

  const talkToKi = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const sourceMessage: Message = { id: crypto.randomUUID(), role: "source", body: message };
    const history = [...messages, sourceMessage];
    setMessages(history);
    setValue("");
    setFocus(true);
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/ki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, persona: account.name, stage, history: history.slice(-8) }),
      });
      const payload = await response.json() as KiResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Ki is unavailable.");
      setRuntime(payload.runtime);
      setStage((current) => effectStage(payload.effect, current));
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "ki", body: payload.reply, citations: payload.citations,
      }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ki is unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void talkToKi(value);
  };

  if (!identityReady) return null;

  if (!accountId) return (
    <main className={`${styles.studio} ${styles.entry}`}>
      <div className={styles.fieldWeather} aria-hidden="true" />
      <section className={styles.entryPanel}>
        <Image src="/kiduna-mark.svg" alt="" width={46} height={46} priority />
        <span>STUDIO · GENESIS FIELD</span>
        <h1>Enter the Field</h1>
        <p>Enter as one person. That identity stays fixed until you leave the Field.</p>
        <div>{accounts.map((item) => (
          <button key={item.id} type="button" onClick={() => enterAs(item.id)}>
            <b>{item.initials}</b>
            <span><strong>{item.name}</strong><small>{item.role} · Ki will meet them here</small></span>
            <i>Enter →</i>
          </button>
        ))}</div>
        <small>Genesis prototype · each entry begins in a clear Field</small>
      </section>
    </main>
  );

  const lastKi = [...messages].reverse().find((message) => message.role === "ki")?.body ?? initialMessage(account.name).body;

  return (
    <main className={`${styles.studio} ${styles[`genesis${stage}`]} ${focus ? styles.hasFocus : ""}`}>
      <div className={styles.fieldWeather} aria-hidden="true" />

      <header className={styles.hudTop}>
        <div className={styles.containerChip}>
          <Image src="/kiduna-mark.svg" alt="" width={40} height={40} />
          <span><small>acting as Persona</small><strong>{account.name}</strong></span>
          <i>›</i><span><small>current context</small><strong>{stage === 0 ? "Genesis Field" : "Kinship Duna"}</strong></span>
          {stage >= 3 && <><i>›</i><span><small>project</small><strong>Genesis Studio</strong></span></>}
        </div>
        <div className={styles.contextActions}>
          <button type="button" onClick={beginAgain}>Begin again</button>
          <button type="button" onClick={leave}>Leave Field</button>
        </div>
      </header>

      <section className={styles.field} aria-label="Kiduna Genesis Field">
        <div className={styles.clearSignal}><span>THE FIELD IS CLEAR</span><i /></div>

        <div className={styles.genesisTitle}>
          <span>{stage === 0 ? "THE BEGINNING" : stage === 1 ? "FIRST CONTEXT" : stage === 2 ? "A RELATIONSHIP TAKES SHAPE" : "CREATING FROM WITHIN"}</span>
          <h1>{stage === 0 ? "Nothing here yet." : stage === 1 ? "Kinship Duna" : stage === 2 ? "Bring them in well." : "Genesis Studio"}</h1>
          <p>{stage === 0 ? "Only David and the Genesis Ally. The system begins in conversation." : stage === 1 ? "The first Organization is becoming legible around your intention." : stage === 2 ? "Jeya and Aashik are context, not members. Ki is preparing to understand the relationships first." : "A Project can now hold the work, its people, its sources, and its Actors."}</p>
        </div>

        <div className={styles.kiNode}>
          <button type="button" onClick={() => setFocus(true)} aria-label="Open conversation with Ki"><span>KI</span><i /></button>
          <strong>Ki</strong><small>Genesis Ally</small>
        </div>

        <div className={styles.organizationSeed}>
          <div className={styles.seedLabel}><span>ORGANIZATION · FORMING</span><strong>Kinship Duna</strong><small>Genesis in sequence, not authority</small></div>
          <div className={styles.seedOrbit} />
        </div>

        <div className={styles.peopleSeed}>
          <div><b>JY</b><strong>Jeya</strong><small>relationship context</small></div>
          <div><b>AK</b><strong>Aashik</strong><small>relationship context</small></div>
          <span>PROFILER · INPUT NEEDED</span>
        </div>

        <div className={styles.projectSeed}>
          <span>PROJECT · PRIVATE · PREVIEW</span>
          <h2>Genesis Studio</h2>
          <p>A place for the three of you to shape the system from within it.</p>
          <div><b>0</b> artifacts <b>0</b> Actors <b>1</b> open question</div>
        </div>

        {stage === 0 && !focus && <div className={styles.promptCluster}>
          <small>YOU CAN SAY</small>
          {prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void talkToKi(prompt)}>{prompt}<span>→</span></button>)}
        </div>}

        <div className={`${styles.focusScrim} ${focus ? styles.visible : ""}`} onClick={() => setFocus(false)} />
        <aside className={`${styles.kiPanel} ${focus ? styles.visible : ""}`} aria-hidden={!focus}>
          <header>
            <div className={styles.miniKi}>KI</div>
            <span><small>GENESIS ALLY</small><strong>Ki · Kinship Intelligence</strong></span>
            <button type="button" onClick={() => setFocus(false)} aria-label="Close conversation">×</button>
          </header>
          <div className={styles.runtimeStrip}>
            <span><i /> stance loaded</span><span><i /> {runtime.wisdomChunks || "…"} Wisdom passages</span><span><i /> {runtime.skills} Skills</span><span>{runtime.executionMode}</span>
          </div>
          <div className={styles.kiThread} ref={threadRef}>
            {messages.map((message) => <article key={message.id} className={message.role === "ki" ? styles.fromKi : styles.fromSource}>
              <div><b>{message.role === "ki" ? "KI" : account.initials}</b><span><strong>{message.role === "ki" ? "Ki" : "You"}</strong><p>{message.body}</p></span></div>
              {!!message.citations?.length && <footer>{message.citations.slice(0, 2).map((citation) => <span key={`${citation.title}-${citation.heading}`}>{citation.heading}</span>)}</footer>}
            </article>)}
            {busy && <article className={`${styles.fromKi} ${styles.thinking}`}><div><b>KI</b><span><strong>Ki</strong><p>Listening, resolving context, and consulting Wisdom…</p></span></div></article>}
            {error && <div className={styles.errorNotice}>{error}</div>}
          </div>
          <form className={styles.panelComposer} onSubmit={submit}>
            <input aria-label="Talk with Ki" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Tell Ki what you want to make possible…" autoFocus />
            <button type="submit" disabled={busy || !value.trim()}>Send</button>
          </form>
        </aside>
      </section>

      <footer className={`${styles.allyBand} ${focus ? styles.allyFocus : ""}`}>
        <button className={styles.allyPresence} type="button" onClick={() => setFocus(true)}><span>KI</span><i /></button>
        <div className={styles.allyCopy}><span>KI · YOUR GENESIS ALLY</span><p>{lastKi}</p></div>
        <form className={styles.quickComposer} onSubmit={submit}>
          <input aria-label="Talk with Ki" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Talk with Ki…" />
          <button type="submit" disabled={busy || !value.trim()}>→</button>
        </form>
        <div className={styles.attentionDial} aria-label={`HUD attention: ${focus ? "Focus" : "Clear"}`}>
          <span>HUD</span><div><i className={focus ? styles.dialFocus : styles.dialClear} /></div><strong>{focus ? "Focus" : "Clear"}</strong><small>{focus ? "94%" : "12%"}</small>
        </div>
      </footer>
    </main>
  );
}
