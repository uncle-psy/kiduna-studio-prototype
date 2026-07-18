import type { PersonaKey } from "./v0-model";

export type JourneyStepId = "landing" | "signup-start";
export type JourneyPanel = "story" | "engineering";

type JourneyStep = {
  id: JourneyStepId;
  number: number;
  title: string;
  label: string;
  route: string;
  personas: readonly PersonaKey[];
};

export const PERSONA_JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    id: "landing",
    number: 1,
    title: "Landing Page — Outside The Field",
    label: "1. Landing Page — Outside The Field",
    route: "/journey/landing",
    personas: ["david", "matt"],
  },
  {
    id: "signup-start",
    number: 2,
    title: "Sign-up Start — Outside the Field",
    label: "2. Sign-up Start — Outside the Field",
    route: "/journey/signup?inviter=The%20Genesis%20Ecosystem",
    personas: ["david"],
  },
];

const PERSONA_NAMES: Record<PersonaKey, string> = {
  david: "David",
  matt: "Matt",
};

export function personaJourneySteps(persona: PersonaKey) {
  return PERSONA_JOURNEY_STEPS.filter((step) => step.personas.includes(persona));
}

export function journeyStory(persona: PersonaKey, step: JourneyStepId) {
  const name = PERSONA_NAMES[persona];
  if (step === "signup-start") {
    return {
      eyebrow: `Step 2 · ${name}’s Story`,
      title: `${name} follows a trusted invitation`,
      role: "Invited Visitor",
      body: `The Genesis Ecosystem invited ${name} with a valid Kinship Code. “The Genesis Ecosystem” is the inviter’s display name, supplied by the code as [Inviter’s Display Name] rather than fixed page copy. ${name} remains outside the Field as an Invited Visitor while beginning sign-up. The invitation establishes context and provenance; it does not silently create membership, an Ally, permissions, relationships, or authority.`,
      moment: `${name} has crossed from general curiosity into a specific, attributable invitation—but has not entered the Field yet.`,
    };
  }
  return {
    eyebrow: `Step 1 · ${name}’s Story`,
    title: `${name} arrives as a Visitor`,
    role: "Visitor",
    body: `${name} arrives at Kiduna outside the Field. As a Visitor, ${name} has no Kiduna identity, Ally, relationships, permissions, shared Sources, projects, or Compute authority yet. The landing page offers an invitation into the world: understand the promise, read The Nightpaper, request early access, or log in if an account already exists. Nothing on this page silently creates membership or grants authority.`,
    moment: `This is the threshold moment. ${name} is outside the Field, learning what Kiduna is and deciding whether to approach it.`,
  };
}

const ENGINEERING_NOTES = {
  landing: {
    eyebrow: "Step 1 · Engineering Notes",
    title: "Landing Page — Outside The Field",
    source: "https://kiduna.ai",
    sourceHref: "https://kiduna.ai",
    notes: [
      "Copy this page and all destination links from https://kiduna.ai; the live site is the engineering source of truth.",
      "Preserve the supplied page’s composition, typography, color, content hierarchy, and responsive behavior.",
      "The Nightpaper link belongs immediately left of Log in and resolves to /nightpaper on this prototype.",
      "Hero bodies orbit continuously at distinct, physically legible speeds; outer bodies move more slowly than inner bodies.",
      "Respect reduced-motion preferences by pausing decorative orbital movement.",
      "This prototype is a deterministic design simulation. Forms and authentication links do not imply production identity, membership, or authority.",
    ],
  },
  "signup-start": {
    eyebrow: "Step 2 · Engineering Notes",
    title: "Sign-up Start — Outside the Field",
    source: "Supplied signup.html reference",
    sourceHref: null,
    notes: [
      "[Inviter’s Display Name] is a variable resolved from the validated Kinship Code. “The Genesis Ecosystem” is David’s example inviter display name and must not be hard-coded as the universal inviter.",
      "In production, this page must only be reachable through kiduna.design/join/[kinship-code] after the code has been validated.",
      "A request for kiduna.design/join/ without a code, or with an invalid code, must route to the invalid-code page. That page will be supplied later; do not invent its final content in this step.",
      "Keep the user outside the Field and without membership or authority until the appropriate sign-up and consent actions are completed.",
      "The header contains only a Kiduna logo linked to the home page and The Nightpaper. Remove Powered by, Request early access, and header Log in treatments.",
      "The internal /journey/signup path exists only for Design Lab review and is not the production access contract.",
      "Do not reveal whether an invalid code once existed, who created it, or other inviter details on the invalid-code state.",
    ],
  },
} satisfies Record<JourneyStepId, {
  eyebrow: string;
  title: string;
  source: string;
  sourceHref: string | null;
  notes: string[];
}>;

export function journeyEngineeringNotes(step: JourneyStepId) {
  return ENGINEERING_NOTES[step];
}
