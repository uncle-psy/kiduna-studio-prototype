import { describe, expect, it } from "vitest";
import {
  PERSONA_JOURNEY_STEPS,
  journeyEngineeringCopyText,
  journeyEngineeringNotes,
  journeyStory,
  journeyStoryCopyText,
  personaJourneySteps,
} from "./persona-journey";

describe("persona journey", () => {
  it("begins with the canonical outside-the-Field landing step", () => {
    expect(PERSONA_JOURNEY_STEPS[0]).toMatchObject({
      id: "landing",
      number: 1,
      label: "1. Landing Page — Outside The Field",
      route: "/journey/landing",
    });
  });

  it("adds sign-up start as David’s second outside-the-Field step", () => {
    expect(personaJourneySteps("david")).toHaveLength(5);
    expect(personaJourneySteps("david")[1]).toMatchObject({
      id: "signup-start",
      number: 2,
      label: "2. Sign-up Start — Outside the Field",
    });
    expect(personaJourneySteps("matt")).toHaveLength(2);
  });

  it("adds checkout as David’s third outside-the-Field step", () => {
    expect(personaJourneySteps("david")[2]).toMatchObject({
      id: "checkout",
      number: 3,
      label: "3. Checkout — Outside the Field",
      route: "/journey/checkout",
    });
    const story = journeyStory("david", "checkout");
    expect(story.role).toBe("Prospective Founding Member");
    expect(story.body).toContain("not yet a Founding Member");
  });

  it("adds organization selection as David’s fourth onboarding step", () => {
    expect(personaJourneySteps("david")[3]).toMatchObject({
      id: "organization-selection",
      number: 4,
      label: "4. Organization Selection — Onboarding",
      route: "/journey/organization-selection",
    });
    const story = journeyStory("david", "organization-selection");
    expect(story.role).toBe("Founding Member in Onboarding");
    expect(story.body).toContain("authoritative receipt");
    expect(story.body).toContain("does not silently grant organization membership");
    expect(story.body).toContain("31 powerful movements");
  });

  it.each(["david", "matt"] as const)("makes %s a Visitor without implied authority at Step 1", (persona) => {
    const story = journeyStory(persona, "landing");
    expect(story.role).toBe("Visitor");
    expect(story.title).toContain(persona === "david" ? "David" : "Matt");
    expect(story.body).toContain("outside the Field");
    expect(story.body).toContain("Nothing on this page silently creates membership or grants authority");
  });

  it("keeps David invited but outside the Field at Step 2", () => {
    const story = journeyStory("david", "signup-start");
    expect(story.role).toBe("Invited Visitor");
    expect(story.body).toContain("[Inviter’s Display Name]");
    expect(story.body).toContain("does not silently create membership");
  });

  it("records the live landing page as the Step 1 engineering source of truth", () => {
    const notes = journeyEngineeringNotes("landing");
    expect(notes.source).toBe("https://kiduna.ai");
    expect(notes.notes.join(" ")).toContain("Copy this page and all destination links");
  });

  it("records the code-gated production contract for Step 2", () => {
    const notes = journeyEngineeringNotes("signup-start").notes.join(" ");
    expect(notes).toContain("kiduna.design/join/[kinship-code]");
    expect(notes).toContain("kiduna.design/join/ without a code");
    expect(notes).toContain("invalid-code page");
  });

  it("keeps Step 3 non-transactional and policy-driven", () => {
    const notes = journeyEngineeringNotes("checkout").notes.join(" ");
    expect(notes).toContain("non-transactional");
    expect(notes).toContain("server-provided policy variables");
    expect(notes).toContain("Prospective Founding Member");
  });

  it("keeps Step 4 selection reversible and non-consequential", () => {
    const notes = journeyEngineeringNotes("organization-selection").notes.join(" ");
    expect(notes).toContain("reversible onboarding draft");
    expect(notes).toContain("governed server data");
    expect(notes).toContain("Continue and Skip for now");
    expect(notes).toContain("Most active");
    expect(notes).toContain("registration identifiers and dates");
  });

  it("adds persona-specific Web Resources as Step 5 outside the Field", () => {
    expect(personaJourneySteps("david")[4]).toMatchObject({
      id: "resources",
      number: 5,
      label: "5. Resources — Outside the Field",
      route: "/journey/resources",
    });
    expect(personaJourneySteps("matt")[1]).toMatchObject({ id: "resources" });
    const david = journeyStory("david", "resources");
    const matt = journeyStory("matt", "resources");
    expect(david.role).toBe("New Founding Member");
    expect(david.body).toContain("outside the Field in the Web Resources experience");
    expect(david.body).toContain("no paid role or earnings yet");
    expect(matt.role).toBe("Organizer across 4 Organizations");
    expect(matt.body).toContain("outside the Field in the Web Resources experience");
    expect(matt.body).toContain("$22,610 USDC");
  });

  it("records Step 5 fixture, authority, economic, and alternate-reference boundaries", () => {
    const notes = journeyEngineeringNotes("resources").notes.join(" ");
    expect(notes).toContain("Hearth.dc.html");
    expect(notes).toContain("Web experience outside the Field");
    expect(notes).toContain("deterministic persona fixtures");
    expect(notes).toContain("non-consequential");
    expect(notes).toContain("treasury, governance, and legal validation");
    expect(notes).toContain("Conversation alone is not consent");
  });

  it("produces complete plain-text Story and Engineering Notes cards", () => {
    const storyCopy = journeyStoryCopyText("david", "checkout");
    expect(storyCopy).toContain("Step 3 · David’s Story");
    expect(storyCopy).toContain("Role: Prospective Founding Member");
    expect(storyCopy).toContain("Moment:");

    const notesCopy = journeyEngineeringCopyText("checkout");
    expect(notesCopy).toContain("Step 3 · Engineering Notes");
    expect(notesCopy).toContain("Reference: Supplied checkout.html reference");
    expect(notesCopy).toContain("1. Preserve the supplied checkout.html composition");
  });
});
