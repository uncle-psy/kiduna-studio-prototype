import type { PersonaKey } from "./v0-model";

export type JourneyStepId = "landing" | "signup-start" | "checkout" | "organization-selection" | "resources";
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
  {
    id: "checkout",
    number: 3,
    title: "Checkout — Outside the Field",
    label: "3. Checkout — Outside the Field",
    route: "/journey/checkout",
    personas: ["david"],
  },
  {
    id: "organization-selection",
    number: 4,
    title: "Organization Selection — Onboarding",
    label: "4. Organization Selection — Onboarding",
    route: "/journey/organization-selection",
    personas: ["david"],
  },
  {
    id: "resources",
    number: 5,
    title: "Resources — Outside the Field",
    label: "5. Resources — Outside the Field",
    route: "/journey/resources",
    personas: ["david", "matt"],
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
  if (step === "resources") {
    if (persona === "matt") {
      return {
        eyebrow: "Step 5 · Matt’s Story",
        title: "Matt returns to the resources behind his work",
        role: "Organizer across 4 Organizations",
        body: "Matt remains outside the Field in the Web Resources experience as a returning Organizer working across Kinship Duna, Service Alliance, Black Love, and Soul Kitchen. His Resources view brings together a 1.24M Compute balance, a $22,610 USDC earnings summary, paid roles, connected accounts, and a 214-person team spanning four generations. These values are persona fixtures for the prototype—not authoritative balances, payouts, memberships, roles, or lineage records. Matt can ask Ki about what he sees, but no simulated response or button silently spends Compute, moves funds, connects an account, changes a role, or acts for an organization.",
        moment: "From the Web, outside the Field, Matt sees one coherent picture of the resources flowing into and out of his work, with Ki present in context and every consequential action still requiring visible authority and confirmation.",
      };
    }
    return {
      eyebrow: "Step 5 · David’s Story",
      title: "David meets the resources of membership",
      role: "New Founding Member",
      body: "David remains outside the Field in the Web Resources experience as a new Founding Member of Kinship Duna. His Resources view introduces 100 $KIDUNA of Compute, the founding-round context, his Kinship link, account connections, and the roles through which organizations may pay members in USDC. He has no paid role or earnings yet. The page helps him understand what is available and lets him talk with Ki in context, while all balances, purchases, connections, memberships, roles, payments, and agent actions remain non-consequential prototype fixtures.",
      moment: "From the Web, outside the Field, David’s abstract membership becomes tangible: he can see the resources he may use, the work he may take on, and the Ally who can help—without mistaking a prototype interaction for an executed action.",
    };
  }
  if (step === "organization-selection") {
    return {
      eyebrow: `Step 4 · ${name}’s Story`,
      title: `${name} finds his first organizations`,
      role: "Founding Member in Onboarding",
      body: `${name} has an authoritative receipt for the successful checkout outcome and is now a Founding Member completing onboarding. Kinship Duna is already included as his founding home. He can explore 31 powerful movements, compare their activity and communities, and draft the additional organizations he wants to join. Card selection changes only this onboarding draft; it does not silently grant organization membership, permissions, governance rights, Source access, or authority.`,
      moment: `${name} begins turning broad belonging into specific community choices, while the system keeps the consequences visible and reversible until he explicitly continues.`,
    };
  }
  if (step === "checkout") {
    return {
      eyebrow: `Step 3 · ${name}’s Story`,
      title: `${name} reaches the founding checkout`,
      role: "Prospective Founding Member",
      body: `${name} has completed the preceding invitation and sign-up sequence and now reaches a consequential choice: whether to purchase 100 USDC of Compute by card or through a Solana wallet. ${name} is a Prospective Founding Member, not yet a Founding Member. Viewing this page, choosing a payment path, or connecting a wallet must not itself create a purchase, membership, Compute balance, or entry into the Field.`,
      moment: `${name} can understand the offer and choose a payment path, but membership and Compute require an explicit purchase, authoritative settlement, and an inspectable receipt.`,
    };
  }
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
  checkout: {
    eyebrow: "Step 3 · Engineering Notes",
    title: "Checkout — Outside the Field",
    source: "Supplied checkout.html reference",
    sourceHref: null,
    notes: [
      "Preserve the supplied checkout.html composition, purchase-path comparison, responsive behavior, and visual hierarchy for this prototype step.",
      "This Design Lab scene is non-transactional: Buy 100 USDC and Connect Solana Wallet must not initiate a real payment, wallet connection, Compute purchase, or membership change.",
      "In production, model checkout as preview → explicit confirmation → external settlement → authoritative receipt. Cancellation, decline, timeout, partial settlement, duplicate submission, and receipt failure require distinct recoverable states.",
      "Card purchase and Solana wallet transfer are separate Actions. Never auto-connect a wallet, auto-select an account, or treat connection as consent to transfer.",
      "The price, currency, Compute quantity, supply policy, and Founding Member entitlement must be server-provided policy variables. The reference page’s $100 / 100 USDC and lifetime-membership claims require product, treasury, and legal validation before production use.",
      "David remains outside the Field as a Prospective Founding Member until the system has authoritative evidence of the required outcome. A client redirect or payment-provider callback alone is not sufficient.",
      "Never place payment credentials, wallet secrets, signing material, or treasury authority in the browser client.",
    ],
  },
  "organization-selection": {
    eyebrow: "Step 4 · Engineering Notes",
    title: "Organization Selection — Onboarding",
    source: "Supplied Organization selection onboarding (2).zip",
    sourceHref: null,
    notes: [
      "Preserve the revised organization-selection composition, movement framing and hero copy, 31-organization catalog, search, category filters, sorting, Compute activity, member counts, West Virginia registration metadata, multi-selection, fixed selection tray, responsive behavior, and visual hierarchy.",
      "Step 4 assumes an authoritative successful-checkout receipt. Do not enter this state from a client redirect, wallet connection, or unverified payment-provider callback alone.",
      "Kinship Duna is David’s included founding home and cannot be deselected in this step. Its inclusion, and any future rule that changes it, must come from server-provided membership policy.",
      "Organization cards create a reversible onboarding draft only. Selection must not itself grant membership, permissions, governance rights, Source access, roles, Compute authority, or other organizational powers.",
      "In production, Continue must preview the exact requested memberships, applicable terms and consent, eligibility or approval requirements, and resulting consequences before an authoritative commit and inspectable receipt.",
      "Skip for now preserves Kinship Duna and records no additional organization requests. The user must be able to revisit organization discovery later.",
      "Organization names, descriptions, categories, member counts, Compute activity, registration identifiers and dates, availability, joining rules, and entitlements are governed server data. Do not treat the reference catalog, metrics, or legal metadata as permanent hard-coded truth.",
      "Most active is the revised default sort and uses the supplied Compute values. Production must define the time window, unit, freshness, and provenance of activity rather than presenting an unexplained ranking.",
      "Handle unavailable, archived, invite-only, approval-required, age- or geography-restricted, capacity-limited, and failed-membership states without discarding the rest of the user’s draft.",
      "This Design Lab scene is non-consequential: Continue and Skip for now show prototype feedback but do not create, remove, or modify memberships.",
    ],
  },
  resources: {
    eyebrow: "Step 5 · Engineering Notes",
    title: "Resources — Outside the Field",
    source: "Supplied Organization selection onboarding (4).zip · Resources.dc.html",
    sourceHref: null,
    notes: [
      "Implement Resources.dc.html as the Step 5 reference for both David and Matt. Preserve its rich dark composition, responsive hierarchy, Compute purchase area, persona-specific founding-round or earnings state, work and earnings, team lineage, account connections, Nightpapers entry, and in-context Ki conversation.",
      "Resources is a Web experience outside the Field. David and Matt may hold membership and organizational roles while using it, but this page does not place either persona spatially inside the Field.",
      "The package also contains Hearth.dc.html. The supplied package thumbnail selects Resources, so Hearth remains an alternate reference and is not silently merged into this step.",
      "David is a new Founding Member with 100 $KIDUNA, no paid roles, and no earnings. Matt is an Organizer across four organizations with 1.24M $KIDUNA, $22,610 lifetime USDC earnings, and a 214-person team across four generations. These are deterministic persona fixtures for Design Lab review, not production claims.",
      "The ?persona=david|matt query selects a Design Lab fixture only. Production identity, organizations, roles, balances, earnings, permissions, and agent authority must come from authenticated, authorized server state—not a URL parameter or client-side switch.",
      "Compute and earnings are distinct ledgers: $KIDUNA is shown as Compute while role pay and recruiting distributions are shown in USDC. Every balance, exchange-rate approximation, wallet amount, payout, role, organization, team count, generation, percentage, and founding-round figure must be server-provided, timestamped, and provenance-aware.",
      "This scene is non-consequential. Pay with card, Connect wallet, account connections, Studio download or launch, copied links, Nightpapers links, and Ki’s suggested actions provide review feedback only and must not spend funds, sign messages, connect external accounts, change roles, publish content, or execute an agent action.",
      "Production agent actions follow preview → authority and consent check → explicit confirmation → execution → inspectable receipt. Support cancel, decline, timeout, partial success, stale data, insufficient Compute, unavailable provider, revoked permission, and retry without hiding the prior state.",
      "Wallet secrets, payment credentials, signing material, OAuth tokens, and treasury authority never belong in the browser client. External-account connections require provider consent, scoped permissions, revocation, status visibility, and an audit trail.",
      "The recruiting percentages, lifetime distributions, founding-round claims, exchange-rate approximations, role compensation, and economic language require explicit product, treasury, governance, and legal validation before production use.",
      "View as David or Matt is a Design Lab capability, not a normal production control. Any future support or administrative impersonation must be separately authorized, visibly disclosed, audited, and unable to acquire the represented person’s signing authority.",
      "Ki must state what it knows, which Sources support an answer, which Actor it represents, and what authority it has. Conversation alone is not consent; suggested actions stay reversible until a distinct confirmed execution step.",
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

export function journeyStoryCopyText(persona: PersonaKey, step: JourneyStepId) {
  const story = journeyStory(persona, step);
  return [story.eyebrow, story.title, `Role: ${story.role}`, story.body, `Moment: ${story.moment}`].join("\n\n");
}

export function journeyEngineeringCopyText(step: JourneyStepId) {
  const notes = journeyEngineeringNotes(step);
  const numberedNotes = notes.notes.map((note, index) => `${index + 1}. ${note}`).join("\n");
  return [notes.eyebrow, notes.title, `Reference: ${notes.source}`, numberedNotes].join("\n\n");
}
