import type { PersonaKey } from "./v0-model";

export type JourneyStepId = "landing";
export type JourneyPanel = "story" | "engineering";

export const PERSONA_JOURNEY_STEPS = [
  {
    id: "landing" as const,
    number: 1,
    title: "Landing Page — Outside The Field",
    label: "1. Landing Page — Outside The Field",
    route: "/journey/landing",
  },
];

const PERSONA_NAMES: Record<PersonaKey, string> = {
  david: "David",
  matt: "Matt",
};

export function journeyStory(persona: PersonaKey) {
  const name = PERSONA_NAMES[persona];
  return {
    eyebrow: `Step 1 · ${name}’s Story`,
    title: `${name} arrives as a Visitor`,
    role: "Visitor",
    body: `${name} arrives at Kiduna outside the Field. As a Visitor, ${name} has no Kiduna identity, Ally, relationships, permissions, shared Sources, projects, or Compute authority yet. The landing page offers an invitation into the world: understand the promise, read The Nightpaper, request early access, or log in if an account already exists. Nothing on this page silently creates membership or grants authority.`,
    moment: `This is the threshold moment. ${name} is outside the Field, learning what Kiduna is and deciding whether to approach it.`,
  };
}

export const JOURNEY_ENGINEERING_NOTES = {
  eyebrow: "Step 1 · Engineering Notes",
  title: "Landing Page — Outside The Field",
  source: "https://kiduna.ai",
  notes: [
    "Copy this page and all destination links from https://kiduna.ai; the live site is the engineering source of truth.",
    "Preserve the supplied page’s composition, typography, color, content hierarchy, and responsive behavior.",
    "The Nightpaper link belongs immediately left of Log in and resolves to /nightpaper on this prototype.",
    "Hero bodies orbit continuously at distinct, physically legible speeds; outer bodies move more slowly than inner bodies.",
    "Respect reduced-motion preferences by pausing decorative orbital movement.",
    "This prototype is a deterministic design simulation. Forms and authentication links do not imply production identity, membership, or authority.",
  ],
};
