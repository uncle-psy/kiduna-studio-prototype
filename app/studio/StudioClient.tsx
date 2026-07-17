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
type CreatedCode = { id?: string; code: string; boundName?: string; boundEmail?: string | null; audience: string; trustLevel: string; maxUses: number | null; redeemBy: string | null; usesCount?: number; status?: string; createdAt?: string };
type RelationshipNamespace = { id: string; ownerName: string; ownerHandle: string; subjectName: string; subjectEmail: string | null; subjectHandle: string | null; joined: boolean; code: string | null; trustLevel: string | null; usesCount: number; viewerRole: "owner" | "subject"; lastSeenAt: string | null; isOnline: boolean; entries: { id: string; perspective: string; content: string; accessLevel: string }[] };
type PersonMatch = { id: string; name: string; handle: string; initials: string };
type Organization = { id: string; name: string; orgId: string; description: string; role: string; memberCount: number };
type InviteStep = "name" | "confirm-person" | "choose-person" | "relationship" | "social" | "purpose" | "trust" | "privacy" | "grants" | "email" | "limits" | "summary" | "refine";
type InviteDraft = { audience: "personal" | "open"; boundName: string; boundEmail: string; targetUserId: string; inSystem: boolean; relationshipDescription: string; socialProfiles: string; purpose: string; trustLevel: "high" | "medium" | "low"; accessLevel: "public" | "private" | "secret" | "personal"; accessNotes: string; expiresIn: string; useLimit: string; generalAudience: string; organizationId: string };
type InviteFlow = { step: InviteStep; draft: InviteDraft; matches: PersonMatch[] };
type DunaFlow = { step: "name" | "registered" | "orgId" | "registration" | "purpose" | "summary"; draft: { name: string; registered: boolean | null; orgId: string; wantsRegistration: boolean; purpose: string } };

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

function restoredThread(key: string, fallback: Message[]) {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) as Message[] : null;
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const blankInvite = (organizationId = ""): InviteFlow => ({ step: "name", matches: [], draft: { audience: "personal", boundName: "", boundEmail: "", targetUserId: "", inSystem: false, relationshipDescription: "", socialProfiles: "", purpose: "", trustLevel: "medium", accessLevel: "private", accessNotes: "", expiresIn: "7d", useLimit: "single", generalAudience: "", organizationId } });

function inviteSummary(draft: InviteDraft) {
  const purpose = draft.purpose.trim().replace(/[.!?]+$/, "");
  const naturalPurpose = purpose ? `${purpose[0].toLowerCase()}${purpose.slice(1)}` : "begin together";
  const person = draft.audience === "open" ? `an open invitation for ${draft.generalAudience}` : `${draft.boundName}${draft.inSystem ? "—already in Kiduna" : "—new to Kiduna"}`;
  const profile = draft.audience === "open" ? "" : draft.socialProfiles ? ` I’ll use the profiles you shared (${draft.socialProfiles}) only to prepare useful arrival context.` : " You chose not to add social profiles.";
  const visibility = draft.accessLevel === "public" ? "public" : draft.accessLevel === "private" ? "private to you, the invitee, and anyone you name" : draft.accessLevel === "secret" ? "visible only to explicitly named people" : "personal to you alone";
  const limit = draft.audience === "open" ? `${draft.useLimit === "single" ? "one use" : "unlimited uses"}, ${draft.expiresIn === "permanent" ? "with no expiration" : `expiring in ${draft.expiresIn}`}` : "one use, expiring in seven days";
  const binding = draft.audience === "personal" ? draft.boundEmail ? ` It will be bound to ${draft.boundEmail}.` : " It will not be email-bound; the first person who enters with it may claim it." : "";
  return `Here’s what I have: ${person}. You want to ${naturalPurpose}. You’re extending ${draft.trustLevel} trust. Your thoughts about this will be ${visibility}. The Code will allow ${limit}.${binding}${profile} Did I get that right?`;
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
  const [codes, setCodes] = useState<CreatedCode[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [relationshipNamespaces, setRelationshipNamespaces] = useState<RelationshipNamespace[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState("");
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipNamespace | null>(null);
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [dunaFlow, setDunaFlow] = useState<DunaFlow | null>(null);
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
        setMessages(restoredThread(`kiduna-ally-thread:${account.id}:${saved}`, [initialMessage(selected.name, account.arrival)]));
      } else {
        const selected = personas.find((item) => item.isDefault) ?? personas[0];
        setPersonaId(selected.id);
        setMessages(restoredThread(`kiduna-ally-thread:${account.id}:${selected.id}`, [initialMessage(selected.name, account.arrival)]));
      }
      setIdentityReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [personas, account.arrival, account.id]);

  useEffect(() => {
    Promise.all([
      fetch("/api/relationships").then((response) => response.ok ? response.json() : null),
      fetch("/api/codes").then((response) => response.ok ? response.json() : null),
      fetch("/api/organizations").then((response) => response.ok ? response.json() : null),
    ]).then(([relationshipsPayload, codesPayload, organizationsPayload]: [{ namespaces?: RelationshipNamespace[] } | null, { codes?: CreatedCode[] } | null, { organizations?: Organization[] } | null]) => {
      const namespaces = relationshipsPayload?.namespaces ?? [];
      const codes = codesPayload?.codes ?? [];
      const orgs = organizationsPayload?.organizations ?? [];
      setRelationshipNamespaces(namespaces);
      setCodes(codes);
      setCreatedCode(codes[0] ?? null);
      setOrganizations(orgs);
      setActiveOrgId(orgs[0]?.id ?? "");
      if (namespaces.length || codes.length) {
        setStage(2);
        const person = namespaces[0]?.viewerRole === "subject" ? namespaces[0].ownerName : namespaces[0]?.subjectName ?? codes[0]?.boundName;
        setSuggestedPrompts(person ? [`What can I do with ${person}?`, `Show me our relationship`, `Invite ${person} into a Duna`] : ["Invite someone else"]);
      } else if (orgs.length) setStage(1);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!identityReady || !personaId || messages.length === 0) return;
    localStorage.setItem(`kiduna-ally-thread:${account.id}:${personaId}`, JSON.stringify(messages.slice(-80)));
  }, [messages, identityReady, personaId, account.id]);

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
    setStage(relationshipNamespaces.length ? 2 : organizations.length ? 1 : 0);
    setFocus(false);
    setManualTransparency(null);
    const person = relationshipNamespaces[0]?.viewerRole === "subject" ? relationshipNamespaces[0].ownerName : relationshipNamespaces[0]?.subjectName;
    setSuggestedPrompts(person ? [`What can I do with ${person}?`, `Show me our relationship`, `Invite ${person} into a Duna`] : openingPrompts);
    setPrimaryAction(null);
    setInviteFlow(null);
    setMessages(restoredThread(`kiduna-ally-thread:${account.id}:${id}`, [initialMessage(selected.name, account.arrival)]));
  };

  const beginAgain = () => {
    setStage(relationshipNamespaces.length ? 2 : organizations.length ? 1 : 0);
    setFocus(false);
    setError("");
    setManualTransparency(null);
    const person = relationshipNamespaces[0]?.viewerRole === "subject" ? relationshipNamespaces[0].ownerName : relationshipNamespaces[0]?.subjectName;
    setSuggestedPrompts(person ? [`What can I do with ${person}?`, `Show me our relationship`, `Invite ${person} into a Duna`] : openingPrompts);
    setPrimaryAction(null);
    setInviteFlow(null);
    setDunaFlow(null);
    setMessages([initialMessage(persona.name, account.arrival)]);
  };

  const openAllyWith = (prompt: string) => {
    setSelectedRelationship(null);
    setShowCodes(false);
    setFocus(true);
    setValue(prompt);
    setPrimaryAction(null);
    if (prompt.startsWith("Invite ")) setSuggestedPrompts([`Invite ${prompt.slice(7).split(" to a ")[0]} to a Duna`, `Invite ${prompt.slice(7).split(" to a ")[0]} to a Project`, `Invite ${prompt.slice(7).split(" to a ")[0]} to a Community`]);
    else if (prompt.includes("share these files")) setPrimaryAction({ label: "Review access and share", prompt });
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>(`.${styles.panelComposer} textarea`)?.focus(), 0);
  };

  const beginCode = () => {
    setInviteFlow(blankInvite(activeOrgId));
    setDunaFlow(null);
    setShowCodes(false);
    setFocus(true);
    setValue("I’d like to invite ");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "ki", body: "Who would you like to invite?" }]);
    setSuggestedPrompts(["Create a general invitation instead"]);
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
      if (next.draft.audience === "personal" && next.draft.boundName && !["summary", "refine"].includes(next.step) && !prompts.includes("That’s enough—make the Code")) prompts.push("That’s enough—make the Code");
      setInviteFlow(next);
      setSuggestedPrompts(prompts);
      setPrimaryAction(null);
      setMessages([...history, { id: crypto.randomUUID(), role: "ki", body: reply }]);
      if (fromVoice) speakReply(reply);
    };
    const createNow = async () => {
      if (!next.draft.boundName && next.draft.audience === "personal") {
        next.step = "name"; reply = "Absolutely. Just give me their name, and I’ll use safe, private defaults for the rest."; finish(); return;
      }
      if (!next.draft.relationshipDescription) next.draft.relationshipDescription = `${next.draft.boundName || "This group"} is someone ${persona.name} wants to welcome into Kiduna.`;
      if (!next.draft.purpose) next.draft.purpose = next.draft.organizationId ? "Join the Duna and begin together" : "Explore Kiduna together";
      const response = await fetch("/api/codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...next.draft, personaId: persona.id, contextSummary: `${next.draft.relationshipDescription} Shared intention: ${next.draft.purpose}` }) });
      const payload = await response.json() as { code?: CreatedCode; error?: string };
      if (!response.ok || !payload.code) throw new Error(payload.error || "The Code could not be created.");
      const refreshed = await fetch("/api/relationships").then((result) => result.ok ? result.json() : null) as { namespaces?: RelationshipNamespace[] } | null;
      setRelationshipNamespaces(refreshed?.namespaces ?? relationshipNamespaces);
      setCreatedCode(payload.code); setCodes((current) => [payload.code!, ...current]); setInviteFlow(null); setSuggestedPrompts([`Show me ${next.draft.boundName}’s relationship`, "Invite someone else"]); setStage(2);
      reply = `Done. I used private, medium-trust defaults and left the Code unbound to email. You can edit those details from ${next.draft.boundName}’s card before they join.`;
      setMessages([...history, { id: crypto.randomUUID(), role: "ki", body: reply }]); if (fromVoice) speakReply(reply);
    };

    if (/just.*(?:give|make|create).*(?:code)|that.?s enough.*code|skip.*(?:questions|ahead)/.test(lower)) { await createNow(); return; }
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
        reply = `Would you like to bind ${next.draft.boundName}’s one-person Code to an email, or leave it unbound so the first person who enters with it can claim it?`;
        prompts = ["Leave it unbound", "Bind it to an email"];
      } else {
        next.step = "summary";
        reply = inviteSummary(next.draft);
        prompts = ["Yes—create the Code", "I want to change something"];
      }
    };

    if (flow.step === "name") {
      const requestedName = answer.replace(/^(?:i(?:’|')?d like to |i want to |please )?invite\s+/i, "").trim();
      if (/general|group|social|post|many people|anyone|public invite/.test(lower)) {
        next.draft.audience = "open"; next.step = "relationship";
        reply = "A general invitation needs a different shape. Who do you hope it reaches, and where are you likely to share it?";
      } else {
        const response = await fetch(`/api/people?name=${encodeURIComponent(requestedName)}`);
        const payload = await response.json() as { people?: PersonMatch[] };
        const people = payload.people ?? [];
        next.draft.boundName = requestedName;
        if (people.length === 0) {
          next.draft.inSystem = false; next.step = "relationship";
          reply = `I don’t find ${requestedName} in Kiduna yet. What should I understand about them from your perspective? I’ll keep this private by default, and it will remain your account—not theirs.`;
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
      next.draft.socialProfiles = /skip|none|no\b/.test(lower) ? "" : answer; next.step = "purpose";
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
      else if (!next.draft.inSystem) { next.step = "email"; reply = `Would you like to bind ${next.draft.boundName}’s one-person Code to an email, or leave it unbound so the first person who enters with it can claim it?`; prompts = ["Leave it unbound", "Bind it to an email"]; }
      else { next.step = "summary"; reply = inviteSummary(next.draft); prompts = ["Yes—create the Code", "I want to change something"]; }
    } else if (flow.step === "email") {
      if (/leave.*unbound|no email|whoever|first person|skip/.test(lower)) { next.draft.boundEmail = ""; next.step = "summary"; reply = inviteSummary(next.draft); prompts = ["Yes—create the Code", "I want to change something"]; }
      else if (/bind.*email/.test(lower)) { reply = `What email should I bind ${next.draft.boundName}’s Code to?`; prompts = ["Leave it unbound"]; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) { reply = "That doesn’t look like a complete email address. Give me the address, or say “leave it unbound.”"; prompts = ["Leave it unbound"]; }
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
        const refreshed = await fetch("/api/relationships").then((result) => result.ok ? result.json() : null) as { namespaces?: RelationshipNamespace[] } | null;
        setRelationshipNamespaces(refreshed?.namespaces ?? relationshipNamespaces);
        setCreatedCode(payload.code); setCodes((current) => [payload.code!, ...current]); setInviteFlow(null); setSuggestedPrompts([`Show me ${next.draft.boundName}’s relationship`, "Invite someone else"]); setStage(2);
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

  const continueDuna = async (message: string, history: Message[], flow: DunaFlow, fromVoice: boolean) => {
    const answer = message.trim();
    const lower = answer.toLowerCase();
    const next: DunaFlow = { step: flow.step, draft: { ...flow.draft } };
    let reply = "";
    let prompts: string[] = [];
    if (flow.step === "name") {
      next.draft.name = answer; next.step = "registered";
      reply = `Has ${answer} been registered with the West Virginia Secretary of State?`;
      prompts = ["Yes, it’s registered", "No, not yet"];
    } else if (flow.step === "registered") {
      if (/^y|registered/.test(lower) && !/not|no/.test(lower)) { next.draft.registered = true; next.step = "orgId"; reply = "What is its West Virginia Organization ID?"; }
      else { next.draft.registered = false; next.step = "registration"; reply = "Would you like help registering it, or should we create the Duna here as unregistered for now?"; prompts = ["Help me register it", "Create it unregistered for now"]; }
    } else if (flow.step === "orgId") {
      next.draft.orgId = answer; next.step = "purpose"; reply = `What is ${next.draft.name} here to make possible?`;
    } else if (flow.step === "registration") {
      next.draft.wantsRegistration = /help|register/.test(lower) && !/unregistered|not now/.test(lower); next.step = "purpose";
      reply = next.draft.wantsRegistration ? `I’ll preserve registration as an open step. What is ${next.draft.name} here to make possible?` : `All right. What is ${next.draft.name} here to make possible?`;
    } else if (flow.step === "purpose") {
      next.draft.purpose = answer; next.step = "summary";
      reply = `${next.draft.name} will begin as ${next.draft.registered ? `a registered Duna with WV Organization ID ${next.draft.orgId}` : "an unregistered Duna"}. Its purpose is: ${answer}${next.draft.wantsRegistration ? " I’ll keep West Virginia registration as a next step." : ""} Did I get that right?`;
      prompts = ["Yes—create the Duna", "I want to change something"];
    } else if (/^y|create|correct|right/.test(lower)) {
      const response = await fetch("/api/organizations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: next.draft.name, orgId: next.draft.orgId, description: next.draft.purpose }) });
      const payload = await response.json() as { organization?: Organization; error?: string };
      if (!response.ok || !payload.organization) throw new Error(payload.error ?? "The Duna could not be created.");
      setOrganizations((current) => [...current, payload.organization!]); setActiveOrgId(payload.organization.id); setStage((current) => Math.max(current, 1)); setDunaFlow(null);
      reply = `${payload.organization.name} is now present in the Field. ${next.draft.registered ? `Its Organization ID is ${next.draft.orgId}.` : "It is marked unregistered for now."}`;
      prompts = [`Invite someone to ${payload.organization.name}`, "What should we shape next?"];
    } else {
      next.step = "name"; reply = "No problem. Let’s refine it. What should the Duna be called?";
    }
    if (next.step !== "summary" || !/^y|create|correct|right/.test(lower)) setDunaFlow(next);
    setSuggestedPrompts(prompts); setPrimaryAction(null);
    setMessages([...history, { id: crypto.randomUUID(), role: "ki", body: reply }]);
    if (fromVoice) speakReply(reply);
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
      if (dunaFlow) {
        await continueDuna(message, history, dunaFlow, fromVoice);
        return;
      }
      if (/(?:invite someone|invite a person|create|make|new).*(?:kinship )?code|^invite someone[.!]?$/i.test(message)) {
        const flow = blankInvite(activeOrgId);
        setInviteFlow(flow); setSuggestedPrompts(["A specific person", "A group or social audience"]); setPrimaryAction(null);
        const reply = "Who would you like to invite?";
        setMessages([...history, { id: crypto.randomUUID(), role: "ki", body: reply }]);
        if (fromVoice) speakReply(reply);
        return;
      }
      const directInvite = message.match(/^(?:i(?:’|')?d like to |i want to |please )?invite\s+(.+)$/i);
      if (directInvite && !/\s+to\s+(?:a\s+)?(?:duna|project|community|alliance|institution)\b/i.test(message)) {
        const flow = blankInvite(activeOrgId);
        await continueInvite(directInvite[1], history, flow, fromVoice);
        return;
      }
      if (/(?:create|make|start|new).*(?:duna)/i.test(message)) {
        const flow: DunaFlow = { step: "name", draft: { name: "", registered: null, orgId: "", wantsRegistration: false, purpose: "" } };
        setDunaFlow(flow); setSuggestedPrompts([]); setPrimaryAction(null);
        const reply = "What would you like to call the Duna?";
        setMessages([...history, { id: crypto.randomUUID(), role: "ki", body: reply }]);
        if (fromVoice) speakReply(reply);
        return;
      }
      const relationship = relationshipNamespaces[0];
      const relatedPerson = relationship ? (relationship.viewerRole === "subject" ? relationship.ownerName : relationship.subjectName) : null;
      if (relationship && relatedPerson && /(?:what can i do|relationship|show.*profile|show.*invitation|tell me about)/i.test(message)) {
        if (/show|profile|invitation/i.test(message)) setSelectedRelationship(relationship);
        if (/add|edit|update/i.test(message)) setEditingRelationshipId(relationship.id);
        const reply = relationship.joined
          ? `${relatedPerson} is connected to you here. You can open their profile, add a processed insight to your relationship Wisdom, review what each of you can see, or invite them into a Duna. What would you like to do together?`
          : `${relatedPerson} has a place waiting here. You can open their profile to copy or resend the Code, change its optional email binding, add relationship Wisdom, or invite them into a Duna. Nothing is sent unless you send it.`;
        setSuggestedPrompts([`Open ${relatedPerson}’s profile`, `Add to my relationship with ${relatedPerson}`, `Invite ${relatedPerson} into a Duna`]);
        setPrimaryAction(null);
        setMessages((current) => [...current, { id: crypto.randomUUID(), role: "ki", body: reply }]);
        if (fromVoice) speakReply(reply);
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
      if (payload.effect === "PREPARE_INVITES") setInviteFlow(blankInvite(activeOrgId));
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
  const activeRelationship = relationshipNamespaces[0] ?? null;
  const relationshipPerson = activeRelationship ? (activeRelationship.viewerRole === "subject" ? activeRelationship.ownerName : activeRelationship.subjectName) : createdCode?.boundName ?? "the person you invite";
  const activeOrganization = organizations.find((organization) => organization.id === activeOrgId) ?? organizations[0] ?? null;

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
        <i>›</i><span><small>Current Organization</small><strong>{activeOrganization?.name ?? "Kinship Duna"}</strong></span>
        {stage >= 3 && <><i>›</i><span><small>Project</small><strong>Genesis Studio</strong></span></>}
      </div>
      <div className={styles.contextActions}><button type="button" onClick={() => setShowCodes(true)}>Codes</button><button type="button" onClick={beginAgain}>Clear conversation</button><button type="button" onClick={() => void leave()}>Log out</button></div>
    </header>

    <section className={styles.field} aria-label="Kiduna Genesis Field">
      <div className={styles.clearSignal}><span>THE FIELD IS CLEAR</span><i /></div>
      <div className={styles.genesisTitle}>
        <span>{stage === 0 ? "INCEPTION POINT" : stage === 1 ? "ORGANIZATION · ACTIVE" : stage === 2 ? `${activeOrganization?.name ?? "KINSHIP DUNA"} · RELATIONSHIP FIELD` : "CREATING FROM WITHIN"}</span>
        <h1>{stage === 0 ? "The Fertile Void" : stage === 1 ? activeOrganization?.name ?? "Kinship Duna" : stage === 2 ? activeRelationship?.joined ? `${relationshipPerson} is here.` : `${relationshipPerson} is invited.` : "Genesis Studio"}</h1>
        <p>{stage === 0 ? "Only you and the Genesis Ally. The world begins in conversation." : stage === 1 ? `${activeOrganization?.name ?? "The first Organization"} is legible around its members and purpose.` : stage === 2 ? activeRelationship?.joined ? `You and ${relationshipPerson} are visible inside ${activeOrganization?.name ?? "Kinship Duna"}. Open their profile to see what you know, your relationship, and what you can do together.` : `Ki orbits ${activeOrganization?.name ?? "Kinship Duna"}; ${relationshipPerson} now has a place inside it. Open their profile to review or resend the invitation.` : "A Project can now hold the work, its people, its sources, and its Actors."}</p>
      </div>

      <div className={styles.kiNode}><button type="button" onClick={() => setFocus(true)} aria-label="Open conversation with Ki"><KiAvatar size={86} /><i /></button><strong>Ki</strong><small>Genesis Ally</small></div>

      <div className={styles.organizationSeed}><div className={styles.seedLabel}><span>ORGANIZATION · {activeOrganization ? "ACTIVE" : "FORMING"}</span><strong>{activeOrganization?.name ?? "Kinship Duna"}</strong><small>{activeOrganization ? `Org ID ${activeOrganization.orgId} · ${activeOrganization.memberCount} member${activeOrganization.memberCount === 1 ? "" : "s"}` : "Genesis in sequence, not authority"}</small></div><div className={styles.seedOrbit} /></div>
      <div className={styles.peopleSeed}>{createdCode || activeRelationship ? <button type="button" onClick={() => activeRelationship && setSelectedRelationship(activeRelationship)}><b>{relationshipPerson.split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase()}</b><strong>{relationshipPerson}</strong><small>{activeRelationship?.joined ? `@${activeRelationship.viewerRole === "subject" ? activeRelationship.ownerHandle : activeRelationship.subjectHandle} · connected` : `${createdCode?.trustLevel ?? activeRelationship?.trustLevel} trust · invited`}</small></button> : <div><b>+</b><strong>Someone you invite</strong><small>relationship context needed</small></div>}<span>{activeRelationship?.joined ? "RELATIONSHIP · ACTIVE" : createdCode || activeRelationship ? "KINSHIP CODE · READY" : "INVITATION · INPUT NEEDED"}</span></div>
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
          {relationshipNamespaces.map((namespace) => <RelationshipWisdom key={`${namespace.id}-${editingRelationshipId === namespace.id}`} namespace={namespace} startOpen={editingRelationshipId === namespace.id} onAdded={(entry) => setRelationshipNamespaces((current) => current.map((item) => item.id === namespace.id ? { ...item, entries: [...item.entries, entry] } : item))} />)}
          {voiceNote && <div className={styles.voiceNote}>{voiceNote}</div>}
          {error && <div className={styles.errorNotice}>{error}</div>}
        </div>
        <div className={styles.panelDock}><form className={styles.panelComposer} onSubmit={submit}><VoiceButton state={voiceState} onClick={toggleVoice} /><textarea aria-label="Talk with Ki" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Tell Ki what you’d like to do…" autoFocus /><button type="submit" disabled={busy || !value.trim()}>Send</button></form><TransparencyControl transparency={transparency} manual={manualTransparency !== null} onChange={setManualTransparency} onAuto={() => setManualTransparency(null)} /></div>
      </aside>
      {selectedRelationship && <PersonCard relationship={selectedRelationship} onClose={() => setSelectedRelationship(null)} onAction={openAllyWith} onTrustChanged={(trustLevel) => {
        setRelationshipNamespaces((current) => current.map((item) => item.id === selectedRelationship.id ? { ...item, trustLevel } : item));
        setSelectedRelationship((current) => current ? { ...current, trustLevel } : current);
      }} />}
      {showCodes && <CodeCenter codes={codes} onClose={() => setShowCodes(false)} onCreate={beginCode} />}
    </section>

    <footer className={`${styles.allyBand} ${focus ? styles.allyFocus : ""}`}>
      <button className={styles.allyPresence} type="button" onClick={() => setFocus(true)}><KiAvatar size={52} /><i /></button>
      <div className={styles.allyCopy}><span>KI · THE GENESIS ALLY</span><p>{lastKi}</p></div>
      {!focus && <><form className={styles.quickComposer} onSubmit={submit}><VoiceButton state={voiceState} onClick={toggleVoice} /><textarea aria-label="Talk with Ki" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Talk with Ki…" /><button className={styles.sendButton} type="submit" disabled={busy || !value.trim()}>→</button></form><TransparencyControl transparency={transparency} manual={manualTransparency !== null} onChange={setManualTransparency} onAuto={() => setManualTransparency(null)} /></>}
    </footer>
  </main>;
}

function TransparencyControl({ transparency, manual, onChange, onAuto }: { transparency: number; manual: boolean; onChange: (value: number) => void; onAuto: () => void }) {
  return <div className={styles.transparencyControl}><div className={styles.transparencyStatus}><span>{manual ? "OVERRIDE" : "AUTO"}</span><strong>{transparency}%</strong>{manual && <button type="button" onClick={onAuto}>Return to Auto</button>}</div><input aria-label="Transparency" type="range" min="0" max="100" value={transparency} onChange={(event) => onChange(Number(event.target.value))} /><div className={styles.transparencyLabels}><span>0% · Opaque</span><b>Transparency</b><span>100% · Clear</span></div></div>;
}

function CodeCenter({ codes, onClose, onCreate }: { codes: CreatedCode[]; onClose: () => void; onCreate: () => void }) {
  const [copied, setCopied] = useState("");
  const [openedAt] = useState(() => Date.now());
  const usable = (code: CreatedCode) => code.status === "active" && !(code.maxUses !== null && (code.usesCount ?? 0) >= code.maxUses) && (!code.redeemBy || new Date(code.redeemBy).getTime() > openedAt);
  return <div className={styles.modalScrim}><section className={styles.codeCenter}>
    <header><span><small>KINSHIP CODES</small><h2>Your Codes</h2><p>Active invitations and their lineage history.</p></span><button type="button" onClick={onClose}>×</button></header>
    <button className={styles.createCodeAction} type="button" onClick={onCreate}>Create a new Code with Ki <span>→</span></button>
    <div className={styles.codeLedger}>{codes.length ? codes.map((code) => <article key={code.id ?? code.code} className={!usable(code) ? styles.usedCode : ""}>
      <div><i /><span><strong>{code.boundName || (code.audience === "open" ? "Open invitation" : "Personal invitation")}</strong><small>{usable(code) ? "AVAILABLE" : "USED OR CLOSED"} · {code.trustLevel} trust</small></span></div>
      {usable(code) ? <div className={styles.liveCode}><code>{code.code}</code><button type="button" onClick={async () => { await navigator.clipboard.writeText(code.code); setCopied(code.code); }}>{copied === code.code ? "Copied" : "Copy"}</button></div> : <p>The single-use Code is no longer valid. Its use remains in the lineage record.</p>}
    </article>) : <p className={styles.emptyLedger}>You haven’t created a Code yet.</p>}</div>
  </section></div>;
}

function relativePresence(relationship: RelationshipNamespace, now: number) {
  if (relationship.isOnline) return "Online now";
  if (!relationship.lastSeenAt) return "Not online yet";
  const minutes = Math.max(1, Math.round((now - new Date(relationship.lastSeenAt).getTime()) / 60_000));
  if (minutes < 60) return `Last online ${minutes}m ago`;
  const hours = Math.round(minutes / 60); if (hours < 24) return `Last online ${hours}h ago`;
  return `Last online ${Math.round(hours / 24)}d ago`;
}

function PersonCard({ relationship, onClose, onAction, onTrustChanged }: { relationship: RelationshipNamespace; onClose: () => void; onAction: (prompt: string) => void; onTrustChanged: (trust: string) => void }) {
  const person = relationship.viewerRole === "subject" ? relationship.ownerName : relationship.subjectName;
  const handle = relationship.viewerRole === "subject" ? relationship.ownerHandle : relationship.subjectHandle;
  const [trust, setTrust] = useState(relationship.trustLevel ?? "medium");
  const [openedAt] = useState(() => Date.now());
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  async function changeTrust(nextTrust: string) {
    setTrust(nextTrust); setStatus("Saving…");
    const response = await fetch("/api/relationships", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ namespaceId: relationship.id, trustLevel: nextTrust }) });
    const payload = await response.json() as { error?: string };
    setStatus(response.ok ? "Trust updated" : payload.error ?? "Could not update trust");
    if (response.ok) onTrustChanged(nextTrust);
  }
  async function prepareFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).sort((a, b) => Number(b.name.toLowerCase() === "kiduna.md") - Number(a.name.toLowerCase() === "kiduna.md"));
    const instructions = files[0]?.name.toLowerCase() === "kiduna.md" ? (await files[0].text()).slice(0, 1200).trim() : "";
    const names = files.map((file) => file.name).join(", ");
    onAction(`I want to share these files with ${person}: ${names}.${instructions ? ` Read kiduna.md first. Its instructions begin: ${instructions}` : " There is no kiduna.md in this drop."} Help me review access and send them.`);
  }
  return <div className={styles.modalScrim}><section className={styles.personCard} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void prepareFiles(event.dataTransfer.files); }}>
    <header><div><b>{person.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</b><span><small>RELATIONSHIP</small><h2>{person}</h2><p>{handle && `@${handle} · `}<i className={relationship.isOnline ? styles.onlineDot : styles.offlineDot} />{relativePresence(relationship, openedAt)}</p></span></div><button type="button" onClick={onClose}>×</button></header>
    <div className={styles.relationshipActions}>
      <button type="button" onClick={() => onAction(`Help me send ${person} a message about `)}><b>Message</b><span>Start with Ki</span></button>
      <button type="button" onClick={() => onAction(`Invite ${person} to a `)}><b>Invite to…</b><span>Duna, Alliance, Project, Community, or Institution</span></button>
      <button className={styles.dropAction} type="button" onClick={() => fileRef.current?.click()}><b>Drop files</b><span>kiduna.md is read first when present</span></button>
      <button type="button" onClick={() => onAction(`Help me add to or edit my relationship with ${person}: `)}><b>Add or edit relationship</b><span>Shape what Ki understands</span></button>
      <input ref={fileRef} hidden multiple type="file" onChange={(event) => void prepareFiles(event.target.files)} />
    </div>
    <div className={styles.profileWisdom}><small>WHAT YOU UNDERSTAND ABOUT THIS RELATIONSHIP</small><p>{relationship.entries[0]?.content ?? `You haven’t added your perspective on ${person} yet.`}</p><button type="button" onClick={() => onAction(`Help me add or edit profile Wisdom about ${person}: `)}>Add or edit profile Wisdom</button></div>
    <details className={styles.relationshipDetails}><summary>Relationship details</summary><label><span>Your trust in {person}</span><select value={trust} onChange={(event) => void changeTrust(event.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>{status && <small>{status}</small>}<p>{relationship.joined ? "Connected through a Kinship Code." : "Invitation not yet accepted."}</p></details>
    <footer><button type="button" onClick={onClose}>Close</button></footer>
  </section></div>;
}

function RelationshipWisdom({ namespace, startOpen, onAdded }: { namespace: RelationshipNamespace; startOpen: boolean; onAdded: (entry: RelationshipNamespace["entries"][number]) => void }) {
  const [open, setOpen] = useState(startOpen); const [error, setError] = useState("");
  const [people, setPeople] = useState<PersonMatch[]>([]); const [allowUserIds, setAllowUserIds] = useState<string[]>([]);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const form = event.currentTarget;
    const response = await fetch("/api/relationships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), namespaceId: namespace.id, allowUserIds }) });
    const payload = await response.json() as { entry?: RelationshipNamespace["entries"][number]; error?: string };
    if (!response.ok || !payload.entry) { setError(payload.error || "Wisdom could not be added."); return; }
    onAdded(payload.entry); form.reset(); setAllowUserIds([]); setPeople([]); setOpen(false);
  }
  return <section className={styles.relationshipCard}><header><span><small>RELATIONSHIP WISDOM</small><strong>{namespace.viewerRole === "subject" ? "What was carried into your arrival" : namespace.subjectName}</strong></span><button type="button" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Add perspective"}</button></header>
    {namespace.entries.length ? namespace.entries.map((entry) => <article key={entry.id}><small>{entry.perspective === "owner_belief" ? "INVITER’S PERSPECTIVE" : "SELF-SHARED"} · {entry.accessLevel}</small><p>{entry.content}</p><details><summary>About this insight</summary><p>Processed into relationship Wisdom rather than stored as a verbatim note. Visibility: {entry.accessLevel}.</p></details></article>) : <p className={styles.noVisibleWisdom}>No shared insights are visible to this Persona. Other perspectives remain preserved under their own authorship and visibility.</p>}
    {open && <form onSubmit={add}><textarea name="content" required placeholder={namespace.viewerRole === "subject" ? "What would you like Ki to understand about you?" : "What should Ki understand about this relationship?"}/><small>Ki will process this into a concise relationship insight; the verbatim note is not retained.</small><div><select name="accessLevel" defaultValue="private"><option value="public">Public</option><option value="private">Private</option><option value="secret">Secret</option><option value="personal">Personal</option></select><input name="accessNotes" list={`people-${namespace.id}`} placeholder="Type a name or @handle" onChange={async (event) => { const query = event.target.value; const selected = people.find((person) => query.includes(`@${person.handle}`)); if (selected) setAllowUserIds((current) => current.includes(selected.id) ? current : [...current, selected.id]); if (query.trim().length >= 2) { const response = await fetch(`/api/people?name=${encodeURIComponent(query)}`); const payload = await response.json() as { people?: PersonMatch[] }; setPeople(payload.people ?? []); } }}/><datalist id={`people-${namespace.id}`}>{people.map((person) => <option key={person.id} value={`${person.name} (@${person.handle})`} />)}</datalist><button>Add</button></div>{allowUserIds.length > 0 && <small>Sharing with {people.filter((person) => allowUserIds.includes(person.id)).map((person) => `${person.name} (@${person.handle})`).join(", ")}</small>}{error && <small>{error}</small>}</form>}
  </section>;
}
