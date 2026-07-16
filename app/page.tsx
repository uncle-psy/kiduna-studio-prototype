"use client";

import Image from "next/image";
import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./studio.module.css";

const personas = [
  { id: "david", initials: "DL", name: "David", role: "Steward" },
  { id: "moto", initials: "MO", name: "Moto", role: "Founder" },
] as const;

const openingPrompts = [
  "What is this place?",
  "Who are you, Ki?",
  "I want to begin with Kinship Duna.",
];

type PersonaId = (typeof personas)[number]["id"];
type GenesisEffect = "ORIENT_FIELD" | "SEED_ORGANIZATION" | "PREPARE_INVITES" | "SEED_PROJECT" | "NONE";
type VoiceState = "idle" | "listening" | "speaking" | "simulated";
type Message = { id: string; role: "ki" | "source"; body: string };
type PrimaryAction = { label: string; prompt: string } | null;

type KiResponse = {
  reply: string;
  effect: GenesisEffect;
  suggestedPrompts: string[];
  primaryAction: PrimaryAction;
  runtime: { wisdomChunks: number; skills: number; executionMode: string };
};

type SpeechResult = { 0?: { transcript?: string }; isFinal?: boolean };
type SpeechEvent = { results: ArrayLike<SpeechResult> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const initialMessage = (name: string): Message => ({
  id: `ki-inception-${name.toLowerCase()}`,
  role: "ki",
  body: `Hello, ${name}. I’m Ki, the Genesis Ally. This is the Inception Point—the Fertile Void. We can begin with what matters to you, and let the world take shape around it. What would you like to do first?`,
});

function effectStage(effect: GenesisEffect, current: number) {
  if (effect === "SEED_ORGANIZATION") return Math.max(current, 1);
  if (effect === "PREPARE_INVITES") return Math.max(current, 2);
  if (effect === "SEED_PROJECT") return Math.max(current, 3);
  return current;
}

function KiAvatar({ size, className = "" }: { size: number; className?: string }) {
  return <Image className={className} src="/ki-avatar-glyph.png" alt="Ki" width={size} height={size} priority />;
}

function VoiceButton({ state, onClick }: { state: VoiceState; onClick: () => void }) {
  const label = state === "listening" ? "Stop listening" : state === "speaking" ? "Ki is speaking" : "Talk with Ki by voice";
  return <button className={`${styles.voiceButton} ${state !== "idle" ? styles.voiceActive : ""}`} type="button" aria-label={label} title={label} onClick={onClick}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.25a3.25 3.25 0 0 0 3.25-3.25V6.25a3.25 3.25 0 0 0-6.5 0V12A3.25 3.25 0 0 0 12 15.25Z"/><path d="M5.75 11.5V12a6.25 6.25 0 0 0 12.5 0v-.5M12 18.25V22M8.75 22h6.5"/></svg>
    {state === "listening" && <i />}
  </button>;
}

export default function StudioPage() {
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const [stage, setStage] = useState(0);
  const [focus, setFocus] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState(openingPrompts);
  const [primaryAction, setPrimaryAction] = useState<PrimaryAction>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceNote, setVoiceNote] = useState("");
  const [manualTransparency, setManualTransparency] = useState<number | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const persona = useMemo(() => personas.find((item) => item.id === personaId) ?? personas[0], [personaId]);
  const autoTransparency = focus ? 6 : stage === 0 ? 88 : 78;
  const transparency = manualTransparency ?? autoTransparency;
  const surfaceOpacity = Math.max(.06, (100 - transparency) / 100);
  const surfaceStyle = { "--surface-opacity": surfaceOpacity.toFixed(2), "--scrim-opacity": Math.max(.04, surfaceOpacity * .46).toFixed(2) } as CSSProperties;

  useEffect(() => {
    const saved = sessionStorage.getItem("kiduna-studio-member") as PersonaId | null;
    const frame = requestAnimationFrame(() => {
      if (saved && personas.some((item) => item.id === saved)) {
        const selected = personas.find((item) => item.id === saved) ?? personas[0];
        setPersonaId(saved);
        setMessages([initialMessage(selected.name)]);
      }
      setIdentityReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!focus) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, focus, suggestedPrompts]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setFocus(false); setPersonaMenuOpen(false); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const selectPersona = (id: PersonaId) => {
    const selected = personas.find((item) => item.id === id) ?? personas[0];
    sessionStorage.setItem("kiduna-studio-member", id);
    setPersonaId(id);
    setPersonaMenuOpen(false);
    setStage(0);
    setFocus(false);
    setManualTransparency(null);
    setSuggestedPrompts(openingPrompts);
    setPrimaryAction(null);
    setMessages([initialMessage(selected.name)]);
  };

  const beginAgain = () => {
    setStage(0);
    setFocus(false);
    setError("");
    setManualTransparency(null);
    setSuggestedPrompts(openingPrompts);
    setPrimaryAction(null);
    setMessages([initialMessage(persona.name)]);
  };

  const leave = () => {
    sessionStorage.removeItem("kiduna-studio-member");
    setPersonaId(null);
    setMessages([]);
    setStage(0);
    setFocus(false);
    setPersonaMenuOpen(false);
  };

  const speakReply = (reply: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(reply);
    utterance.rate = .94;
    utterance.pitch = .9;
    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend = () => setVoiceState("idle");
    utterance.onerror = () => setVoiceState("idle");
    window.speechSynthesis.speak(utterance);
  };

  const talkToKi = async (text: string, fromVoice = false) => {
    const message = text.trim();
    if (!message || busy) return;
    const sourceMessage: Message = { id: crypto.randomUUID(), role: "source", body: message };
    const history = [...messages, sourceMessage];
    setMessages(history);
    setValue("");
    setFocus(true);
    setBusy(true);
    setError("");
    setVoiceNote("");

    try {
      const response = await fetch("/api/ki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, persona: persona.name, stage, history: history.slice(-8) }),
      });
      const payload = await response.json() as KiResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Ki is unavailable.");
      setStage((current) => effectStage(payload.effect, current));
      setSuggestedPrompts(payload.suggestedPrompts ?? []);
      setPrimaryAction(payload.primaryAction ?? null);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "ki", body: payload.reply }]);
      if (fromVoice) speakReply(payload.reply);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ki is unavailable.");
      setVoiceState("idle");
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    if (voiceState === "listening") {
      recognitionRef.current?.stop();
      setVoiceState("idle");
      return;
    }
    if (voiceState === "speaking") {
      window.speechSynthesis?.cancel();
      setVoiceState("idle");
      return;
    }

    const speechWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    setFocus(true);
    if (!Recognition) {
      setVoiceState("simulated");
      setVoiceNote("Voice presence is simulated here; live recognition is not available in this browser.");
      window.setTimeout(() => setVoiceState("idle"), 1800);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0]?.transcript ?? ""} `;
        isFinal ||= Boolean(event.results[index].isFinal);
      }
      const heard = transcript.trim();
      setValue(heard);
      if (isFinal && heard) void talkToKi(heard, true);
    };
    recognition.onend = () => setVoiceState((current) => current === "speaking" ? current : "idle");
    recognition.onerror = () => {
      setVoiceState("simulated");
      setVoiceNote("The voice connection is represented, but this browser did not provide live recognition.");
      window.setTimeout(() => setVoiceState("idle"), 1800);
    };
    recognitionRef.current = recognition;
    setVoiceNote("Listening…");
    setVoiceState("listening");
    recognition.start();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void talkToKi(value);
  };

  if (!identityReady) return null;

  if (!personaId) return <main className={`${styles.studio} ${styles.entry}`}>
    <div className={styles.fieldWeather} aria-hidden="true" />
    <section className={styles.entryPanel}>
      <Image src="/kiduna-mark.svg" alt="" width={46} height={46} priority />
      <span>STUDIO · INCEPTION POINT</span>
      <h1>Enter the Field</h1>
      <p>Choose the Persona entering now. You can switch Personas from inside the Field.</p>
      <div>{personas.map((item) => <button key={item.id} type="button" onClick={() => selectPersona(item.id)}>
        <b>{item.initials}</b><span><strong>{item.name}</strong><small>{item.role} · Ki will meet them here</small></span><i>Enter →</i>
      </button>)}</div>
      <small>Genesis prototype · each Persona begins at the Inception Point</small>
    </section>
  </main>;

  const lastKi = [...messages].reverse().find((message) => message.role === "ki")?.body ?? initialMessage(persona.name).body;

  return <main className={`${styles.studio} ${styles[`genesis${stage}`]} ${focus ? styles.hasFocus : ""}`} style={surfaceStyle}>
    <div className={styles.fieldWeather} aria-hidden="true" />

    <header className={styles.hudTop}>
      <div className={styles.containerChip}>
        <Image src="/kiduna-mark.svg" alt="" width={40} height={40} />
        <div className={styles.personaSwitcher}>
          <button type="button" className={styles.personaCrumb} aria-expanded={personaMenuOpen} onClick={() => setPersonaMenuOpen((open) => !open)}>
            <span><small>Persona</small><strong>{persona.name}</strong></span><em>⌄</em>
          </button>
          {personaMenuOpen && <div className={styles.personaMenu}>{personas.map((item) => <button key={item.id} type="button" className={item.id === personaId ? styles.selectedPersona : ""} onClick={() => selectPersona(item.id)}><b>{item.initials}</b><span><strong>{item.name}</strong><small>{item.role}</small></span>{item.id === personaId && <i>current</i>}</button>)}</div>}
        </div>
        <i>›</i><span><small>Current Ecosystem</small><strong>Kiduna.ai</strong></span>
        <i>›</i><span><small>Current Organization</small><strong>Kinship Duna</strong></span>
        {stage >= 3 && <><i>›</i><span><small>Project</small><strong>Genesis Studio</strong></span></>}
      </div>
      <div className={styles.contextActions}><button type="button" onClick={beginAgain}>Begin again</button><button type="button" onClick={leave}>Leave Field</button></div>
    </header>

    <section className={styles.field} aria-label="Kiduna Genesis Field">
      <div className={styles.clearSignal}><span>THE FIELD IS CLEAR</span><i /></div>
      <div className={styles.genesisTitle}>
        <span>{stage === 0 ? "INCEPTION POINT" : stage === 1 ? "FIRST CONTEXT" : stage === 2 ? "A RELATIONSHIP TAKES SHAPE" : "CREATING FROM WITHIN"}</span>
        <h1>{stage === 0 ? "The Fertile Void" : stage === 1 ? "Kinship Duna" : stage === 2 ? "Bring them in well." : "Genesis Studio"}</h1>
        <p>{stage === 0 ? "Only you and the Genesis Ally. The world begins in conversation." : stage === 1 ? "The first Organization is becoming legible around your intention." : stage === 2 ? "Jeya and Aashik are context, not members. Ki is preparing to understand the relationships first." : "A Project can now hold the work, its people, its sources, and its Actors."}</p>
      </div>

      <div className={styles.kiNode}><button type="button" onClick={() => setFocus(true)} aria-label="Open conversation with Ki"><KiAvatar size={86} /><i /></button><strong>Ki</strong><small>Genesis Ally</small></div>

      <div className={styles.organizationSeed}><div className={styles.seedLabel}><span>ORGANIZATION · FORMING</span><strong>Kinship Duna</strong><small>Genesis in sequence, not authority</small></div><div className={styles.seedOrbit} /></div>
      <div className={styles.peopleSeed}><div><b>JY</b><strong>Jeya</strong><small>relationship context</small></div><div><b>AK</b><strong>Aashik</strong><small>relationship context</small></div><span>PROFILER · INPUT NEEDED</span></div>
      <div className={styles.projectSeed}><span>PROJECT · PRIVATE · PREVIEW</span><h2>Genesis Studio</h2><p>A place for the three of you to shape the system from within it.</p><div><b>0</b> artifacts <b>0</b> Actors <b>1</b> open question</div></div>

      {stage === 0 && !focus && <div className={styles.openingExchange}>
        <div><KiAvatar size={42} /><span><small>KI · THE GENESIS ALLY</small><p>{initialMessage(persona.name).body}</p></span></div>
        <footer><small>YOUR POSSIBLE RESPONSES</small>{openingPrompts.map((prompt) => <button className={styles.suggestedPrompt} key={prompt} type="button" onClick={() => void talkToKi(prompt)}>{prompt}</button>)}</footer>
      </div>}

      <div className={`${styles.focusScrim} ${focus ? styles.visible : ""}`} onClick={() => setFocus(false)} />
      <aside className={`${styles.kiPanel} ${focus ? styles.visible : ""}`} aria-hidden={!focus}>
        <header><KiAvatar size={42} className={styles.miniKi} /><span><small>GENESIS ALLY</small><strong>Ki · Kinship Intelligence</strong></span><button type="button" onClick={() => setFocus(false)} aria-label="Close conversation">×</button></header>
        <div className={styles.kiThread} ref={threadRef}>
          {messages.map((message) => <article key={message.id} className={message.role === "ki" ? styles.fromKi : styles.fromSource}><div>{message.role === "ki" ? <KiAvatar size={36} /> : <b>{persona.initials}</b>}<span><strong>{message.role === "ki" ? "Ki" : "You"}</strong><p>{message.body}</p></span></div></article>)}
          {busy && <article className={`${styles.fromKi} ${styles.thinking}`}><div><KiAvatar size={36} /><span><strong>Ki</strong><p>Listening and bringing the right Wisdom into context…</p></span></div></article>}
          {!busy && (suggestedPrompts.length > 0 || primaryAction) && <div className={styles.conversationChoices}>
            {suggestedPrompts.map((prompt) => <button className={styles.suggestedPrompt} key={prompt} type="button" onClick={() => void talkToKi(prompt)}>{prompt}</button>)}
            {primaryAction && <button className={styles.primaryChoice} type="button" onClick={() => void talkToKi(primaryAction.prompt)}>{primaryAction.label}<span>→</span></button>}
          </div>}
          {voiceNote && <div className={styles.voiceNote}>{voiceNote}</div>}
          {error && <div className={styles.errorNotice}>{error}</div>}
        </div>
        <form className={styles.panelComposer} onSubmit={submit}><VoiceButton state={voiceState} onClick={toggleVoice} /><input aria-label="Talk with Ki" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Tell Ki what you’d like to do…" autoFocus /><button type="submit" disabled={busy || !value.trim()}>Send</button></form>
      </aside>
    </section>

    <footer className={`${styles.allyBand} ${focus ? styles.allyFocus : ""}`}>
      <button className={styles.allyPresence} type="button" onClick={() => setFocus(true)}><KiAvatar size={52} /><i /></button>
      <div className={styles.allyCopy}><span>KI · THE GENESIS ALLY</span><p>{lastKi}</p></div>
      <form className={styles.quickComposer} onSubmit={submit}><VoiceButton state={voiceState} onClick={toggleVoice} /><input aria-label="Talk with Ki" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Talk with Ki…" /><button className={styles.sendButton} type="submit" disabled={busy || !value.trim()}>→</button></form>
      <div className={styles.transparencyControl}>
        <div className={styles.transparencyStatus}><span>{manualTransparency === null ? "AUTO" : "OVERRIDE"}</span><strong>{transparency}%</strong>{manualTransparency !== null && <button type="button" onClick={() => setManualTransparency(null)}>Return to Auto</button>}</div>
        <input aria-label="Transparency" type="range" min="0" max="100" value={transparency} onChange={(event) => setManualTransparency(Number(event.target.value))} />
        <div className={styles.transparencyLabels}><span>0% · Opaque</span><b>Transparency</b><span>100% · Clear</span></div>
      </div>
    </footer>
  </main>;
}
