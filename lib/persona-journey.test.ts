import { describe, expect, it } from "vitest";
import {
  PERSONA_JOURNEY_STEPS,
  journeyEngineeringNotes,
  journeyStory,
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
    expect(personaJourneySteps("david")).toHaveLength(2);
    expect(personaJourneySteps("david")[1]).toMatchObject({
      id: "signup-start",
      number: 2,
      label: "2. Sign-up Start — Outside the Field",
    });
    expect(personaJourneySteps("matt")).toHaveLength(1);
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
});
