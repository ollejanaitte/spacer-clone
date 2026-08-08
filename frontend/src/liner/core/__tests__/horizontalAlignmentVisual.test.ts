import { describe, expect, it } from "vitest";
import {
  buildPlanPayload,
  isElementSelectedByField,
} from "../visual/horizontalAlignment";
import type { LinerDraftAlignmentElement } from "../../adapters/linerUiAdapter";

function element(
  id: string,
  type: "straight" | "arc" | "clothoid",
): LinerDraftAlignmentElement {
  return {
    id,
    type,
  } as LinerDraftAlignmentElement;
}

describe("horizontalAlignment visual", () => {
  it("builds objects and mappings", () => {
    const payload = buildPlanPayload({
      elements: [element("e0", "straight"), element("a1", "arc")],
    });
    expect(payload.plane).toBe("PLAN");
    expect(payload.objects.map((o) => o.objectId)).toEqual(["align-e0", "align-a1"]);
    expect(payload.mappings).toContainEqual(
      expect.objectContaining({ fieldName: "radius", objectId: "align-a1" }),
    );
  });

  it("selects element by index", () => {
    const payload = buildPlanPayload({
      elements: [element("e0", "straight"), element("a1", "arc")],
      selectedElementIndex: 1,
    });
    expect(payload.selectedObjectId).toBe("align-a1");
  });

  it("field selection highlights matching element", () => {
    const payload = buildPlanPayload({
      elements: [element("a1", "arc")],
      selectedElementIndex: 0,
    });
    expect(isElementSelectedByField(payload, element("a1", "arc"), "radius")).toBe(true);
    expect(isElementSelectedByField(payload, element("a1", "arc"), "length")).toBe(false);
  });

  it("carries warnings and errors", () => {
    const payload = buildPlanPayload({
      elements: [element("a1", "arc")],
      warnings: [{ objectId: "align-a1", ruleId: "X2-R-021", message: "curve length" }],
      errors: [{ objectId: "align-a1", errorType: "GEOMETRY_ERROR", message: "gap" }],
      visualState: "VALIDATED",
    });
    expect(payload.warnings).toHaveLength(1);
    expect(payload.errors).toHaveLength(1);
    expect(payload.geometryRef.visualState).toBe("VALIDATED");
  });
});
