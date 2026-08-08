import { describe, expect, it } from "vitest";
import {
  VISUAL_COLORS,
  axisLegend,
  boundsOf,
  errorsForObject,
  isFieldSelected,
  objectColor,
  objectDash,
  objectIdForField,
  objectStrokeWidth,
  toViewBox,
  warningsForObject,
} from "../visual";
import type { DiagramPayload, VisualObject } from "../visual";

function samplePayload(overrides: Partial<DiagramPayload> = {}): DiagramPayload {
  const objects: VisualObject[] = [
    { objectId: "align-a1", kind: "alignment-element", entityId: "a1", label: "arc a1", plane: "PLAN" },
    { objectId: "v-g0", kind: "profile-element", entityId: "g0", label: "grade g0", plane: "PROFILE" },
  ];
  return {
    plane: "PLAN",
    objects,
    mappings: [
      { fieldName: "radius", objectId: "align-a1" },
      { fieldName: "grade", objectId: "v-g0" },
    ],
    highlights: [],
    warnings: [{ objectId: "v-g0", ruleId: "X2-R-011", message: "grade limit" }],
    errors: [{ objectId: "align-a1", errorType: "GEOMETRY_ERROR", message: "discontinuity" }],
    selectedObjectId: "align-a1",
    geometryRef: {},
    ...overrides,
  };
}

describe("visual contract", () => {
  it("maps field to object id", () => {
    const payload = samplePayload();
    expect(objectIdForField(payload, "radius")).toBe("align-a1");
    expect(objectIdForField(payload, "grade")).toBe("v-g0");
  });

  it("detects field selection", () => {
    const payload = samplePayload();
    expect(isFieldSelected(payload, "radius")).toBe(true);
    expect(isFieldSelected(payload, "grade")).toBe(false);
  });

  it("collects errors and warnings per object", () => {
    const payload = samplePayload();
    expect(errorsForObject(payload, "align-a1")).toHaveLength(1);
    expect(warningsForObject(payload, "v-g0")).toHaveLength(1);
    expect(errorsForObject(payload, "v-g0")).toHaveLength(0);
  });
});

describe("svg foundation", () => {
  it("computes bounds", () => {
    const bounds = boundsOf([{ x: -10, y: 0 }, { x: 10, y: 20 }]);
    expect(bounds.minX).toBe(-10);
    expect(bounds.maxX).toBe(10);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(20);
  });

  it("empty bounds fallback", () => {
    const bounds = boundsOf([]);
    expect(bounds.maxX).toBe(1);
  });

  it("maps to viewBox", () => {
    const point = toViewBox({ x: 0, y: 0 }, { minX: 0, maxX: 100, minY: 0, maxY: 100 }, 200, 200, 0);
    expect(point.x).toBe(0);
    expect(point.y).toBe(200);
  });

  it("object color: error takes priority", () => {
    const payload = samplePayload();
    expect(objectColor("align-a1", payload, "CALCULATED")).toBe(VISUAL_COLORS.error);
  });

  it("object color: warning", () => {
    const payload = samplePayload();
    expect(objectColor("v-g0", payload, "CALCULATED")).toBe(VISUAL_COLORS.warning);
  });

  it("object color: selected", () => {
    const payload = samplePayload({ errors: [], warnings: [] });
    expect(objectColor("align-a1", payload, "INPUT")).toBe(VISUAL_COLORS.selected);
  });

  it("object color by state", () => {
    const payload = samplePayload({ errors: [], warnings: [], selectedObjectId: undefined });
    expect(objectColor("align-a1", payload, "INPUT")).toBe(VISUAL_COLORS.input);
    expect(objectColor("align-a1", payload, "VALIDATED")).toBe(VISUAL_COLORS.validated);
    expect(objectColor("align-a1", payload, "CALCULATED")).toBe(VISUAL_COLORS.calculated);
  });

  it("stroke width and dash", () => {
    const payload = samplePayload();
    expect(objectStrokeWidth("align-a1", payload)).toBe(3);
    expect(objectDash("align-a1", payload)).toBe("6 3");
    expect(objectDash("v-g0", payload)).toBeUndefined();
  });

  it("axis legend", () => {
    expect(axisLegend({ orientation: "horizontal", label: "station" })).toBe("horizontal:station");
  });
});
