import { describe, expect, it } from "vitest";
import capabilities from "./capabilities.json";
import {
  FIXTURES,
  STATE_PLATES,
  StudioAction,
  StudioState,
  createFixtureState,
  createInitialState,
  createPlateState,
  deriveJourney,
  interpretUtterance,
  ledgerBalance,
  ledgerConserves,
  nextGuidedAction,
  studioReducer,
} from "./v0-model";

function completeConnectedJourney() {
  let state = createInitialState();
  const actions: string[] = [];
  for (let index = 0; index < 40; index += 1) {
    const next = nextGuidedAction(state, "david") ?? nextGuidedAction(state, "matt");
    if (!next) break;
    const prior = state;
    state = studioReducer(state, next.create(state));
    expect(state, `Action ${next.id} should advance the deterministic model`).not.toBe(prior);
    actions.push(next.id);
  }
  return { state, actions };
}

describe("Kiduna Studio V0 deterministic model", () => {
  it("starts with no inferred Relationship, Project, or authority", () => {
    const state = createInitialState();
    expect(state.relationship).toBe("none");
    expect(state.project).toBe("none");
    expect(state.records).toHaveLength(0);
    expect(ledgerBalance(state)).toBe(2400);
    expect(ledgerConserves(state)).toBe(true);
  });

  it("completes one connected two-person journey with separate acceptance and external truths", () => {
    const { state, actions } = completeConnectedJourney();
    expect(state.project).toBe("complete");
    expect(state.organization).toBe("active");
    expect(state.registry).toBe("settled");
    expect(state.artifacts.find((artifact) => artifact.id === "formation-v0.2")?.acceptedBy.sort()).toEqual(["david", "matt"]);
    expect(actions).toContain("accept-v2-david");
    expect(actions).toContain("accept-v2-matt");
    expect(actions.indexOf("accept-v2-david")).not.toBe(actions.indexOf("accept-v2-matt"));
    expect(state.records.every((record) => record.simulation)).toBe(true);
    expect(ledgerConserves(state)).toBe(true);
    expect(ledgerBalance(state)).toBe(2240);
  });

  it("supports the recipient-bound Code path without creating a Relationship", () => {
    let state = createInitialState();
    state = studioReducer(state, { type: "CONFIRM_ALLY", persona: "david", key: "code:ally:david" });
    state = studioReducer(state, { type: "CONFIRM_ALLY", persona: "matt", key: "code:ally:matt" });
    state = studioReducer(state, { type: "FIND_MATT", persona: "david", key: "code:find" });
    state = studioReducer(state, { type: "CREATE_CODE", persona: "david", key: "code:create" });
    state = studioReducer(state, { type: "REDEEM_CODE", persona: "matt", key: "code:redeem" });
    expect(state.code.status).toBe("redeemed");
    expect(state.relationship).toBe("none");
    expect(state.records.at(0)?.summary).toContain("did not create a Relationship");
  });

  it("preserves the exact state object on duplicate idempotency keys", () => {
    const initial = createInitialState();
    const action: StudioAction = { type: "CONFIRM_ALLY", persona: "david", key: "same-key" };
    const once = studioReducer(initial, action);
    const twice = studioReducer(once, action);
    expect(twice).toBe(once);
    expect(twice.records).toHaveLength(1);
  });

  it("rejects an actor that lacks the command authority", () => {
    const pending = createPlateState("project-workbench");
    const invalid = { type: "ACCEPT_PROJECT", persona: "david", key: "wrong-actor" } as unknown as StudioAction;
    expect(studioReducer(pending, invalid)).toBe(pending);
  });

  it("rejects stale exact-version acceptance after another session changes revision", () => {
    const review = createPlateState("artifact-diff");
    const david = nextGuidedAction(review, "david");
    const matt = nextGuidedAction(review, "matt");
    expect(david?.id).toBe("accept-v2-david");
    expect(matt?.id).toBe("accept-v2-matt");
    const staleDavidAction = david!.create(review);
    const changed = studioReducer(review, matt!.create(review));
    const denied = studioReducer(changed, staleDavidAction);
    expect(denied).toBe(changed);
    expect(denied.artifacts.at(-1)?.acceptedBy).toEqual(["matt"]);
  });

  it("refuses ambiguous sovereign language without mutating the model", () => {
    const state = createPlateState("accepted-package");
    const before = structuredClone(state);
    const result = interpretUtterance("Launch it and pay it", state, "david");
    expect(result.deniedMutation).toBe(true);
    expect(result.body).toContain("cannot perform");
    expect(state).toEqual(before);
  });

  it("defines all 20 unique fixtures with the approved P0/P1 split and recoveries", () => {
    expect(FIXTURES).toHaveLength(20);
    expect(new Set(FIXTURES.map((fixture) => fixture.id)).size).toBe(20);
    expect(FIXTURES.filter((fixture) => fixture.priority === "P0")).toHaveLength(15);
    expect(FIXTURES.filter((fixture) => fixture.priority === "P1")).toHaveLength(5);
    for (const fixture of FIXTURES) {
      const state = createFixtureState(fixture.id);
      expect(state.fixture?.truth).toBeTruthy();
      expect(state.fixture?.davidView).toBeTruthy();
      expect(state.fixture?.mattView).toBeTruthy();
      expect(state.fixture?.recovery.length).toBeGreaterThan(0);
      expect(deriveJourney(state)).toBe(fixture.journey);
      expect(state.records.at(0)?.kind).toBe("denial");
      expect(state.records.at(0)?.simulation).toBe(true);
      expect(ledgerConserves(state)).toBe(true);
      const recovery = nextGuidedAction(state, "david");
      expect(recovery?.id).toBe(`recover-${fixture.id}`);
      expect(studioReducer(state, recovery!.create(state)).fixture?.resolved).toBe(true);
    }
  });

  it("builds all 15 review plates as valid, conserved deterministic states", () => {
    expect(STATE_PLATES).toHaveLength(15);
    expect(new Set(STATE_PLATES.map((plate) => plate.id)).size).toBe(15);
    for (const plate of STATE_PLATES) {
      const state: StudioState = createPlateState(plate.id);
      expect(state.schemaVersion).toBe(1);
      expect(ledgerConserves(state), plate.id).toBe(true);
    }
  });

  it("accounts for every source catalog row with an honest V0 coverage class", () => {
    expect(capabilities).toHaveLength(282);
    expect(new Set(capabilities.map((row) => row.id)).size).toBe(282);
    expect(capabilities.every((row) => ["demonstrated", "represented", "catalog-only"].includes(row.v0Coverage))).toBe(true);
    expect(new Set(capabilities.map((row) => row.v0Coverage))).toEqual(new Set(["demonstrated", "represented", "catalog-only"]));
  });
});
