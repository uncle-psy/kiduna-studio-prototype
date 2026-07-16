"use client";

import Image from "next/image";
import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "../studio.module.css";

const openingPrompts = [
  "What is this place?",
  "Who are you, Ki?",
  "Invite someone.",
];

type Persona = { id: string; initials: string; name: string; handle: string; role: string; isDefault: boolean };
type Account = { id: string; name: string; email: string; lineage: string[]; personas: Persona[]; arrival: null | { inviterName: string; trustLevel: string; contextSummary: string; purpose: string } };
type PersonaId = string;
type GenesisEffect = "ORIENT_FIELD" | "SEED_ORGANIZATION" | "PREPARE_INVITES" | "SEED_PROJECT" | "NONE";
type VoiceState = "idle" | "listening" | "speaking" | "simulated";
type Message = { id: string; role: "ki" | "source"; body: string };
type PrimaryAction = { label: string; prompt: string } | null;
type CreatedCode = { code: string; boundName?: string; audience: string; trustLevel: string; maxUses: number | null; redeemBy: string | null };
type RelationshipNamespace = { id: string; subjectName: string; viewerRole: "owner" | "subject"; entries: { id: string; perspective: string; content: string; accessLevel: string }[] };
type PersonMatch = { id: string; name: string; handle: string; initials: string };
type InviteStep = "name" | "confirm-person" | "choose-person" | "relationship" | "social" | "purpose" | "trust" | "privacy" | "grants" | "email" | "limits" | "summary" | "refine";
type InviteDraft = { audience: "personal" | "open"; boundName: string; boundEmail: string; targetUserId: string; inSystem: boolean; relationshipDescription: string; socialProfiles: string; purpose: string; trustLevel: "high" | "medium" | "low"; accessLevel: "public" | "private" | "secret" | "personal"; accessNotes: string; expiresIn: string; useLimit: string; generalAudience: string };
type InviteFlow = { step: InviteStep; draft: InviteDraft; matches: PersonMatch[] };

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

const initialMessage = (name: string, arrival?: Account["arrival"]): Message => ({
  id: `ki-inception-${name.toLowerCase()}`,
  role: "ki",
  body: arrival ? `Hello, ${name}. I’m Ki, the Genesis Ally. ${arrival.inviterName} invited you here to ${arrival.purpose.toLowerCase()}. Their Code carried this context: ${arrival.contextSummary} That remains their perspective; what you share about yourself will remain yours. What would you like me to know first?` : `Hello, ${name}. I’m Ki, the Genesis Ally. This is the Inception Point—the Fertile Void. We can begin with what matters to you, and let the world take shape around it. What would you like to do first?`,
});

const blankInvite = (): InviteFlow => ({ step: "name", matches: [], draft: { audience: "personal", boundName: "", boundEmail: "", targetUserId: "", inSystem: false, relationshipDescription: "", socialProfiles: "", purpose: "", trustLevel: "medium", accessLevel: "private", accessNotes: "", expiresIn: "7d", useLimit: "single", generalAudience: "" } });

function inviteSummary(draft: InviteDraft) {
  const purpose = draft.purpose.trim().replace(/[.!?]+$/, "");
  const naturalPurpose = purpose ? `${purpose[0].toLowerCase()}${purpose.slice(1)}` : "begin together";
  const person = draft.audience === "open" ? `an open invitation for ${draft.generalAudience}` : `${draft.boundName}${draft.inSystem ? "—already in Kiduna" : "—new to Kiduna"}`;
  const profile = draft.audience === "open" ? "" : draft.socialProfiles ? ` I’ll use the profiles you shared (${draft.socialProfiles}) only to prepare useful arrival context.` : " You chose not to add social profiles.";
  const visibility = draft.accessLevel === "public" ? "public" : draft.accessLevel === "private" ? "private to you, the invitee, and anyone you name" : draft.accessLevel === "secret" ? "visible only to explicitly named people" : "personal to you alone";
  const limit = draft.audience === "open" ? `${draft.useLimit === "single" ? "one use" : "unlimited uses"}, ${draft.expiresIn === "permanent" ? "with no expiration" : `expiring in ${draft.expiresIn}`}` : "one use, expiring in seven days";
  return `Here’s what I have: ${person}. You want to ${naturalPurpose}. You’re extending ${draft.trustLevel} trust. Your thoughts about this will be ${visibility}. The Code will allow ${limit}.${profile} Did I get that right?`;
}

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

export default function StudioPage({ account }: { account: Account }) {
  const personas = account.personas;
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
  const [inviteFlow, setInviteFlow] = useState<InviteFlow | null>(null);
  const [createdCode, setCreatedCode] = useState<CreatedCode | null>(null);
  const [relationshipNamespaces, setRelationshipNamespaces] = useState<RelationshipNamespace[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const persona = useMemo(() => personas.find((item) => item.id === personaId) ?? personas[0], [personaId, personas]);
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
        setMessages([initialMessage(selected.name, account.arrival)]);
      } else {
        const selected = personas.find((item) => item.isDefault) ?? personas[0];
        setPersonaId(selected.id);
        setMessages([initialMessage(selected.name, account.arrival)]);
      }
      setIdentityReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [personas, account.arrival]);

  useEffect(() => {
    fetch("/api/relationships").then((response) => response.ok ? response.json() : null).then((payload: { namespaces?: RelationshipNamespace[] } | null) => setRelationshipNamespaces(payload?.namespaces ?? [])).catch(() => undefined);
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
    setInviteFlow(null);
    setCreatedCode(null);
    setMessages([initialMessage(selected.name, account.arrival)]);
  };

  const beginAgain = () => {
    setStage(0);
    setFocus(false);
    setError("");
    setManualTransparency(null);
    setSuggestedPrompts(openingPrompts);
    setPrimaryAction(null);
    setInviteFlow(null);
    setCreatedCode(null);
    setMessages([initialMessage(persona.name, account.arrival)]);
  };

  const leave = async () => {
    sessionStorage.removeItem("kiduna-studio-member");
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
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

  const continueInvite = async (message: string, history: Message[], flow: InviteFlow, fromVoice: boolean) => {
    const answer = message.trim();
    const lower = answer.toLowerCase();
    const next = { ...flow, draft: { ...flow.draft }, matches: [...flow.matches] };
    let reply = "";
    let prompts: string[] = [];
    const finish = () => {
      setInviteFlow(next);
      setSuggestedPrompts(prompts);
      setPrimaryAction(null);
      setMessages([...history, { id: crypto.randomUUID(), role: "ki", body: reply }]);
      if (fromVoice) speakReply(reply);
    };
    const moveAfterPrivacy = () => {
      if (next.draft.accessLevel === "private" || next.draft.accessLevel === "secret") {
        next.step = "grants";
        reply = `Should anyone else be able to see what you’ve told me about ${next.draft.audience === "open" ? "this invitation" : next.draft.boundName}? You can name people, communities, Organizations, or Projects—or say “no one else.”`;
        prompts = ["No one else"];
      } else if (next.draft.audience === "open") {
        next.step = "limits";
        reply = "How should this general Code behave: stay open permanently, expire after seven days, or work only once?";
        prompts = ["Open permanently", "Expire after 7 days", "One use only"];
      } else if (!next.draft.inSystem) {
        next.step = "email";
        reply = `What email should I bind ${next.draft.boundName}’s one-person Code to?`;
      } else {
        next.step = "summary";
        reply = inviteSummary(next.draft);
        prompts = ["Yes—create the Code", "I want to change something"];
      }
    };

    if (flow.step === "name") {
      if (/general|group|social|post|many people|anyone|public invite/.test(lower)) {
        next.draft.audience = "open"; next.step = "relationship";
        reply = "A general invitation needs a different shape. Who do you hope it reaches, and where are you likely to share it?";
      } else {
        const response = await fetch(`/api/people?name=${encodeURIComponent(answer)}`);
        const payload = await response.json() as { people?: PersonMatch[] };
        const people = payload.people ?? [];
        next.draft.boundName = answer;
        if (people.length === 0) {
          next.draft.inSystem = false; next.step = "relationship";
          reply = `I don’t find ${answer} in Kiduna yet. What should I understand about them from your perspective? I’ll keep this private by default, and it will remain your account—not theirs.`;
        } else if (people.length === 1) {
          next.matches = people; next.step = "confirm-person";
          reply = `I found ${people[0].name} (@${people[0].handle}) in Kiduna. Is that the person you mean?`;
          prompts = ["Yes, that’s them", "No, someone else"];
        } else {
          next.matches = people; next.step = "choose-person";
          reply = `I found a few possible people: ${people.map((person) => `${person.name} (@${person.handle})`).join(", ")}. Which one do you mean?`;
          prompts = people.map((person) => `@${person.handle}`);
        }
      }
    } else if (flow.step === "confirm-person") {
      if (/^y|that'?s them|correct|right person/.test(lower)) {
        const person = flow.matches[0]; Object.assign(next.draft, { boundName: person.name, targetUserId: person.id, inSystem: true }); next.step = "relationship";
        reply = `Good. How do you know ${person.name}, and what feels important about the relationship from your point of view?`;
      } else { next.step = "name"; next.matches = []; reply = "All right. What name or handle should I look for instead?"; }
    } else if (flow.step === "choose-person") {
      const person = flow.matches.find((candidate) => lower.includes(candidate.handle.toLowerCase()) || lower === candidate.name.toLowerCase());
      if (!person) { reply = "I’m not sure which person you mean yet. Give me their @handle, or say “someone else.”"; prompts = flow.matches.map((candidate) => `@${candidate.handle}`); }
      else { Object.assign(next.draft, { boundName: person.name, targetUserId: person.id, inSystem: true }); next.step = "relationship"; reply = `Thank you. How do you know ${person.name}, and what feels important about the relationship from your point of view?`; }
    } else if (flow.step === "relationship") {
      if (next.draft.audience === "open") {
        next.draft.generalAudience = answer; next.draft.relationshipDescription = `Open invitation intended for ${answer}`; next.step = "purpose";
        reply = "What do you hope the people who enter will explore, build, or do together?";
      } else {
        next.draft.relationshipDescription = answer; next.step = "social";
        reply = `Do you want to share any public social profiles for ${next.draft.boundName}? I would use them only to prepare a more useful arrival in the Kidunaverse—not to speak for them or overwrite what they say about themselves.`;
        prompts = ["Skip social profiles"];
      }
    } else if (flow.step === "social") {
      next.draft.socialProfiles = /skip|none|no/.test(lower) ? "" : answer; next.step = "purpose";
      reply = `What do you hope to explore, build, or do with ${next.draft.boundName}? Mutual interests are useful here.`;
    } else if (flow.step === "purpose") {
      next.draft.purpose = answer; next.step = "trust";
      reply = "How much trust are you extending with this invitation? High means a close or proven relationship; medium means meaningful but bounded trust; low is right for a broad or lightly known connection.";
      prompts = ["High trust", "Medium trust", "Low trust"];
    } else if (flow.step === "trust") {
      const trust = lower.includes("high") ? "high" : lower.includes("low") ? "low" : lower.includes("medium") ? "medium" : null;
      if (!trust) { reply = "Would you call the trust high, medium, or low?"; prompts = ["High trust", "Medium trust", "Low trust"]; }
      else { next.draft.trustLevel = trust; next.step = "privacy"; reply = `How should I hold your thoughts about ${next.draft.audience === "open" ? "the people this may reach" : next.draft.boundName}? Public means anyone may see them. Private means you, the invited person, and anyone you name. Secret means only explicitly named people. Personal means only you—never shared.`; prompts = ["Keep them private", "Keep them secret", "Make them public", "Keep them personal"];
      }
    } else if (flow.step === "privacy") {
      const access = lower.includes("secret") ? "secret" : lower.includes("public") ? "public" : lower.includes("personal") ? "personal" : lower.includes("private") ? "private" : null;
      if (!access) { reply = "Choose public, private, secret, or personal. I can explain any one again."; prompts = ["Private", "Secret", "Public", "Personal"]; }
      else { next.draft.accessLevel = access; moveAfterPrivacy(); }
    } else if (flow.step === "grants") {
      next.draft.accessNotes = /no one|none|just me|only me/.test(lower) ? "" : answer;
      if (next.draft.audience === "open") { next.step = "limits"; reply = "How should this general Code behave: stay open permanently, expire after seven days, or work only once?"; prompts = ["Open permanently", "Expire after 7 days", "One use only"]; }
      else if (!next.draft.inSystem) { next.step = "email"; reply = `What email should I bind ${next.draft.boundName}’s one-person Code to?`; }
      else { next.step = "summary"; reply = inviteSummary(next.draft); prompts = ["Yes—create the Code", "I want to change something"]; }
    } else if (flow.step === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) { reply = "That doesn’t look like a complete email address. What address should the Code be bound to?"; }
      else { next.draft.boundEmail = answer.toLowerCase(); next.step = "summary"; reply = inviteSummary(next.draft); prompts = ["Yes—create the Code", "I want to change something"]; }
    } else if (flow.step === "limits") {
      if (/permanent|never|stay open/.test(lower)) { next.draft.expiresIn = "permanent"; next.draft.useLimit = "unlimited"; }
      else if (/one|single|once/.test(lower)) { next.draft.expiresIn = "7d"; next.draft.useLimit = "single"; }
      else { next.draft.expiresIn = "7d"; next.draft.useLimit = "unlimited"; }
      next.step = "summary"; reply = inviteSummary(next.draft); prompts = ["Yes—create the Code", "I want to change something"];
    } else if (flow.step === "summary") {
      if (/^y|create|correct|right|looks good/.test(lower)) {
        const response = await fetch("/api/codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...next.draft, personaId: persona.id, contextSummary: [next.draft.relationshipDescription, next.draft.socialProfiles ? `Public profiles offered: ${next.draft.socialProfiles}` : "", `Shared intention: ${next.draft.purpose}`].filter(Boolean).join(" ") }) });
        const payload = await response.json() as { code?: CreatedCode; error?: string };
        if (!response.ok || !payload.code) throw new Error(payload.error || "The Code could not be created.");
        setCreatedCode(payload.code); setInviteFlow(null); setSuggestedPrompts([]); setStage(2);
        reply = `It’s ready. I made the Code exactly as summarized. You send it; I haven’t contacted anyone.`;
        setMessages([...history, { id: crypto.randomUUID(), role: "ki", body: reply }]); if (fromVoice) speakReply(reply); return;
      }
      next.step = "refine"; reply = "Of course. What should we change—the person, your perspective, social profiles, what you want to do together, trust, privacy, or the Code’s limits?"; prompts = ["The person", "My perspective", "Social profiles", "Our shared purpose", "Trust", "Privacy"];
    } else {
      if (/person/.test(lower)) { Object.assign(next, blankInvite()); reply = "Who would you like to invite instead?"; }
      else if (/perspective|relationship/.test(lower)) { next.step = "relationship"; reply = next.draft.audience === "open" ? "Who should this general invitation reach?" : `What should I understand differently about ${next.draft.boundName} from your perspective?`; }
      else if (/social|profile/.test(lower)) { next.step = "social"; reply = "What public social profiles should I use—or would you rather skip them?"; }
      else if (/purpose|explore|build|do together/.test(lower)) { next.step = "purpose"; reply = "What do you hope to explore, build, or do together?"; }
      else if (/trust/.test(lower)) { next.step = "trust"; reply = "What trust level should change: high, medium, or low?"; prompts = ["High trust", "Medium trust", "Low trust"]; }
      else if (/privacy|private|secret|public|personal/.test(lower)) { next.step = "privacy"; reply = "How should I hold your thoughts: public, private, secret, or personal?"; prompts = ["Private", "Secret", "Public", "Personal"]; }
      else { reply = "Tell me which part to revisit: person, perspective, profiles, purpose, trust, privacy, or limits."; }
    }
    finish();
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
      if (inviteFlow) {
        await continueInvite(message, history, inviteFlow, fromVoice);
        return;
      }
      const response = await fetch("/api/ki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, persona: persona.name, stage, history: history.slice(-8) }),
      });
      const payload = await response.json() as KiResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Ki is unavailable.");
      setStage((current) => effectStage(payload.effect, current));
      if (payload.effect === "PREPARE_INVITES") setInviteFlow(blankInvite());
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

  if (!personaId || !persona) return null;

  const lastKi = [...messages].reverse().find((message) => message.role === "ki")?.body ?? initialMessage(persona.name, account.arrival).body;

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
      <div className={styles.contextActions}><button type="button" onClick={beginAgain}>Begin again</button><button type="button" onClick={() => void leave()}>Log out</button></div>
    </header>

    <section className={styles.field} aria-label="Kiduna Genesis Field">
      <div className={styles.clearSignal}><span>THE FIELD IS CLEAR</span><i /></div>
      <div className={styles.genesisTitle}>
        <span>{stage === 0 ? "INCEPTION POINT" : stage === 1 ? "FIRST CONTEXT" : stage === 2 ? "A RELATIONSHIP TAKES SHAPE" : "CREATING FROM WITHIN"}</span>
        <h1>{stage === 0 ? "The Fertile Void" : stage === 1 ? "Kinship Duna" : stage === 2 ? "Bring them in well." : "Genesis Studio"}</h1>
        <p>{stage === 0 ? "Only you and the Genesis Ally. The world begins in conversation." : stage === 1 ? "The first Organization is becoming legible around your intention." : stage === 2 ? "An invitation carries relationship, trust, context, and lineage into the Field." : "A Project can now hold the work, its people, its sources, and its Actors."}</p>
      </div>

      <div className={styles.kiNode}><button type="button" onClick={() => setFocus(true)} aria-label="Open conversation with Ki"><KiAvatar size={86} /><i /></button><strong>Ki</strong><small>Genesis Ally</small></div>

      <div className={styles.organizationSeed}><div className={styles.seedLabel}><span>ORGANIZATION · FORMING</span><strong>Kinship Duna</strong><small>Genesis in sequence, not authority</small></div><div className={styles.seedOrbit} /></div>
      <div className={styles.peopleSeed}>{createdCode ? <div><b>{(createdCode.boundName || "IN").split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase()}</b><strong>{createdCode.boundName || "Open invitation"}</strong><small>{createdCode.trustLevel} trust · Code ready</small></div> : <div><b>+</b><strong>Someone you invite</strong><small>relationship context needed</small></div>}<span>{createdCode ? "KINSHIP CODE · READY" : "INVITATION · INPUT NEEDED"}</span></div>
      <div className={styles.projectSeed}><span>PROJECT · PRIVATE · PREVIEW</span><h2>Genesis Studio</h2><p>A place for you and the people you invite to shape the system from within it.</p><div><b>0</b> artifacts <b>0</b> Actors <b>1</b> open question</div></div>

      {stage === 0 && !focus && <div className={styles.openingExchange}>
        <div><KiAvatar size={42} /><span><small>KI · THE GENESIS ALLY</small><p>{initialMessage(persona.name, account.arrival).body}</p></span></div>
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
          {createdCode && <CodeCard code={createdCode} />}
          {relationshipNamespaces.map((namespace) => <RelationshipWisdom key={namespace.id} namespace={namespace} onAdded={(entry) => setRelationshipNamespaces((current) => current.map((item) => item.id === namespace.id ? { ...item, entries: [...item.entries, entry] } : item))} />)}
          {voiceNote && <div className={styles.voiceNote}>{voiceNote}</div>}
          {error && <div className={styles.errorNotice}>{error}</div>}
        </div>
        <div className={styles.panelDock}><form className={styles.panelComposer} onSubmit={submit}><VoiceButton state={voiceState} onClick={toggleVoice} /><input aria-label="Talk with Ki" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Tell Ki what you’d like to do…" autoFocus /><button type="submit" disabled={busy || !value.trim()}>Send</button></form><TransparencyControl transparency={transparency} manual={manualTransparency !== null} onChange={setManualTransparency} onAuto={() => setManualTransparency(null)} /></div>
      </aside>
    </section>

    <footer className={`${styles.allyBand} ${focus ? styles.allyFocus : ""}`}>
      <button className={styles.allyPresence} type="button" onClick={() => setFocus(true)}><KiAvatar size={52} /><i /></button>
      <div className={styles.allyCopy}><span>KI · THE GENESIS ALLY</span><p>{lastKi}</p></div>
      {!focus && <><form className={styles.quickComposer} onSubmit={submit}><VoiceButton state={voiceState} onClick={toggleVoice} /><input aria-label="Talk with Ki" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Talk with Ki…" /><button className={styles.sendButton} type="submit" disabled={busy || !value.trim()}>→</button></form><TransparencyControl transparency={transparency} manual={manualTransparency !== null} onChange={setManualTransparency} onAuto={() => setManualTransparency(null)} /></>}
    </footer>
  </main>;
}

function TransparencyControl({ transparency, manual, onChange, onAuto }: { transparency: number; manual: boolean; onChange: (value: number) => void; onAuto: () => void }) {
  return <div className={styles.transparencyControl}><div className={styles.transparencyStatus}><span>{manual ? "OVERRIDE" : "AUTO"}</span><strong>{transparency}%</strong>{manual && <button type="button" onClick={onAuto}>Return to Auto</button>}</div><input aria-label="Transparency" type="range" min="0" max="100" value={transparency} onChange={(event) => onChange(Number(event.target.value))} /><div className={styles.transparencyLabels}><span>0% · Opaque</span><b>Transparency</b><span>100% · Clear</span></div></div>;
}

function CodeCard({ code }: { code: CreatedCode }) {
  const [copied, setCopied] = useState(false);
  return <section className={styles.codeCard}><small>PROTOTYPE KINSHIP CODE · UNSIGNED</small><div><h3>{code.code}</h3><button type="button" onClick={async () => { await navigator.clipboard.writeText(code.code); setCopied(true); }}>{copied ? "Copied" : "Copy Code"}</button></div><p>{code.audience === "personal" ? `Prepared for ${code.boundName}. Single use.` : code.maxUses === 1 ? "Open audience. One use." : "Open audience. Unlimited uses."} · {code.trustLevel} trust.</p></section>;
}

function RelationshipWisdom({ namespace, onAdded }: { namespace: RelationshipNamespace; onAdded: (entry: RelationshipNamespace["entries"][number]) => void }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState("");
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const form = event.currentTarget;
    const response = await fetch("/api/relationships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), namespaceId: namespace.id }) });
    const payload = await response.json() as { entry?: RelationshipNamespace["entries"][number]; error?: string };
    if (!response.ok || !payload.entry) { setError(payload.error || "Wisdom could not be added."); return; }
    onAdded(payload.entry); form.reset(); setOpen(false);
  }
  return <section className={styles.relationshipCard}><header><span><small>RELATIONSHIP WISDOM</small><strong>{namespace.viewerRole === "subject" ? "What was carried into your arrival" : namespace.subjectName}</strong></span><button type="button" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Add perspective"}</button></header>
    {namespace.entries.length ? namespace.entries.map((entry) => <article key={entry.id}><small>{entry.perspective === "owner_belief" ? "INVITER’S PERSPECTIVE" : "SELF-SHARED"} · {entry.accessLevel}</small><p>{entry.content}</p></article>) : <p className={styles.noVisibleWisdom}>No shared entries are visible to this Persona. Other perspectives remain preserved under their own authorship and visibility.</p>}
    {open && <form onSubmit={add}><textarea name="content" required placeholder={namespace.viewerRole === "subject" ? "What would you like to say about yourself?" : "Add to your understanding of this person…"}/><div><select name="accessLevel" defaultValue="private"><option value="public">Public</option><option value="private">Private</option><option value="secret">Secret</option><option value="personal">Personal</option></select><input name="accessNotes" placeholder="Who else may see this?"/><button>Add</button></div>{error && <small>{error}</small>}</form>}
  </section>;
}
