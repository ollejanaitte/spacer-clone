import { describe, expect, it } from "vitest";
import { resolveGuidedNavigation } from "./guidedNavigation";
import { bindBusinessReadiness } from "./businessReadiness";
import { evaluateConfirmationGate } from "./confirmationGate";

/**
 * Step 4-5 Workflow E2E (unit-level): the navigation + readiness + confirmation
 * layers must cooperate without auto-promoting INFERRED/MISSING and without
 * fabricating values.
 */
describe("Step 4-5 workflow integration (unit E2E)", () => {
  it("guided navigation follows the ordered workflow and never skips", () => {
    const start = resolveGuidedNavigation("overview");
    let section = start.next!;
    const visited = [section];
    while (true) {
      const nav = resolveGuidedNavigation(section);
      if (!nav.hasNext) break;
      section = nav.next!;
      visited.push(section);
    }
    expect(visited).toEqual([
      "road",
      "superstructure",
      "substructure",
      "analysis",
      "main3d",
      "deliverables",
      "data",
    ]);
  });

  it("readiness never promotes INFERRED/MISSING to CONFIRMED", () => {
    const readiness = bindBusinessReadiness({
      sections: {
        road: "INFERRED",
        superstructure: "MISSING",
        analysis: "NOT_AUTHORIZED",
      },
    });
    expect(readiness.statusFor("road")).toBe("INFERRED");
    expect(readiness.statusFor("superstructure")).toBe("MISSING");
    expect(readiness.statusFor("analysis")).toBe("NOT_AUTHORIZED");
    // Unprovided sections stay MISSING; nothing becomes CONFIRMED silently.
    expect(readiness.sections.some((entry) => entry.status === "CONFIRMED")).toBe(false);
  });

  it("fail-closed blocks save when a section is NOT_AUTHORIZED", () => {
    const gate = evaluateConfirmationGate({
      notAuthorizedSections: ["substructure"],
      needsUserConfirmation: false,
      cycleGuardActive: false,
      validationErrors: 0,
      validationWarnings: 1,
    });
    expect(gate.blocked).toBe(true);
    expect(gate.blockReasons).toContain("NOT_AUTHORIZED");
    expect(gate.warningCount).toBe(1);
  });

  it("fail-closed does not fabricate a resolution for MISSING values", () => {
    // MISSING alone does not auto-block (it is surfaced, not fabricated away).
    const gate = evaluateConfirmationGate({
      notAuthorizedSections: [],
      needsUserConfirmation: false,
      cycleGuardActive: false,
      validationErrors: 0,
      validationWarnings: 0,
    });
    expect(gate.blocked).toBe(false);
    expect(gate.blockReasons).toEqual([]);
  });
});
