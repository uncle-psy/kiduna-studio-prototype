import { describe, expect, it } from "vitest";
import { JOURNEY_ENGINEERING_NOTES, PERSONA_JOURNEY_STEPS, journeyStory } from "./persona-journey";

describe("persona journey", () => {
  it("begins with the canonical outside-the-Field landing step", () => {
    expect(PERSONA_JOURNEY_STEPS).toHaveLength(1);
    expect(PERSONA_JOURNEY_STEPS[0]).toMatchObject({
      id: "landing",
      number: 1,
      label: "1. Landing Page — Outside The Field",
      route: "/journey/landing/index.html",
    });
  });

  it.each(["david", "matt"] as const)("makes %s a Visitor without implied authority", (persona) => {
    const story = journeyStory(persona);
    expect(story.role).toBe("Visitor");
    expect(story.title).toContain(persona === "david" ? "David" : "Matt");
    expect(story.body).toContain("outside the Field");
    expect(story.body).toContain("Nothing on this page silently creates membership or grants authority");
  });

  it("records the live Kiduna page as the engineering source of truth", () => {
    expect(JOURNEY_ENGINEERING_NOTES.source).toBe("https://kiduna.ai");
    expect(JOURNEY_ENGINEERING_NOTES.notes.join(" ")).toContain("Copy this page and all destination links");
  });
});
