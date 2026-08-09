import { describe, expect, it } from "vitest";
import {
  evaluateConfirmationGate,
  isStatusBlocking,
} from "./confirmationGate";

describe("evaluateConfirmationGate", () => {
  it("is not blocked when there are no issues", () => {
    const state = evaluateConfirmationGate({
      notAuthorizedSections: [],
      needsUserConfirmation: false,
      cycleGuardActive: false,
      validationErrors: 0,
      validationWarnings: 0,
    });
    expect(state.blocked).toBe(false);
    expect(state.blockReasons).toEqual([]);
    expect(state.warningCount).toBe(0);
  });

  it("blocks on NOT_AUTHORIZED", () => {
    const state = evaluateConfirmationGate({
      notAuthorizedSections: ["substructure"],
      needsUserConfirmation: false,
      cycleGuardActive: false,
      validationErrors: 0,
      validationWarnings: 0,
    });
    expect(state.blocked).toBe(true);
    expect(state.blockReasons).toContain("NOT_AUTHORIZED");
  });

  it("blocks on validation errors", () => {
    const state = evaluateConfirmationGate({
      notAuthorizedSections: [],
      needsUserConfirmation: false,
      cycleGuardActive: false,
      validationErrors: 2,
      validationWarnings: 1,
    });
    expect(state.blocked).toBe(true);
    expect(state.blockReasons).toContain("VALIDATION_ERROR");
    expect(state.warningCount).toBe(1);
  });

  it("blocks on active cycle guard", () => {
    const state = evaluateConfirmationGate({
      notAuthorizedSections: [],
      needsUserConfirmation: false,
      cycleGuardActive: true,
      validationErrors: 0,
      validationWarnings: 0,
    });
    expect(state.blocked).toBe(true);
    expect(state.blockReasons).toContain("CYCLE_GUARD");
  });

  it("surfaces user-confirmation and next action without force-blocking alone", () => {
    const state = evaluateConfirmationGate({
      notAuthorizedSections: [],
      needsUserConfirmation: true,
      cycleGuardActive: false,
      validationErrors: 0,
      validationWarnings: 3,
      nextAction: "road-alignment",
    });
    expect(state.blocked).toBe(false);
    expect(state.needsUserConfirmation).toBe(true);
    expect(state.nextAction).toBe("road-alignment");
    expect(state.warningCount).toBe(3);
  });
});

describe("isStatusBlocking", () => {
  it("treats only NOT_AUTHORIZED as blocking", () => {
    expect(isStatusBlocking("NOT_AUTHORIZED")).toBe(true);
    expect(isStatusBlocking("MISSING")).toBe(false);
    expect(isStatusBlocking("INFERRED")).toBe(false);
    expect(isStatusBlocking("CONFIRMED")).toBe(false);
  });
});
