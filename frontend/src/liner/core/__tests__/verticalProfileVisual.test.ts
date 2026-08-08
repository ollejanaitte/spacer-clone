import { describe, expect, it } from "vitest";
import {
  buildProfilePayload,
  elementEndElevation,
  vclOf,
  vpiAtBoundary,
} from "../visual/verticalProfile";
import type { VerticalAlignmentDraft } from "../../schema/types";

function grade(id: string, start = 0, end = 100, z0 = 10, g = 0.01) {
  return { type: "grade", id, startStation: start, endStation: end, startElevation: z0, grade: g, length: end - start } as const;
}

function parabolic(id: string, start = 100, end = 200, g0 = 0.01, g1 = -0.01, z0 = 11) {
  return {
    type: "parabolic", id, startStation: start, endStation: end,
    startGrade: g0, endGrade: g1, startElevation: z0, length: end - start,
  } as const;
}

const alignment: VerticalAlignmentDraft = {
  id: "v",
  elements: [grade("g0"), parabolic("p1")],
};

describe("verticalProfile visual", () => {
  it("builds objects and mappings", () => {
    const payload = buildProfilePayload({ verticalAlignment: alignment });
    expect(payload.plane).toBe("PROFILE");
    expect(payload.objects.map((o) => o.objectId)).toEqual(["v-g0", "v-p1"]);
    expect(payload.mappings).toContainEqual(
      expect.objectContaining({ fieldName: "grade", objectId: "v-g0" }),
    );
    expect(payload.mappings).toContainEqual(
      expect.objectContaining({ fieldName: "startGrade", objectId: "v-p1" }),
    );
  });

  it("selects element", () => {
    const payload = buildProfilePayload({ verticalAlignment: alignment, selectedElementId: "p1" });
    expect(payload.selectedObjectId).toBe("v-p1");
  });

  it("carries station and state in geometryRef", () => {
    const payload = buildProfilePayload({
      verticalAlignment: alignment, station: 50, visualState: "VALIDATED",
    });
    expect(payload.geometryRef.station).toBe(50);
    expect(payload.geometryRef.visualState).toBe("VALIDATED");
  });

  it("vpi at boundary", () => {
    const vpi = vpiAtBoundary(alignment.elements, 0);
    expect(vpi?.station).toBe(100);
    expect(vpi?.elevation).toBeCloseTo(11);
  });

  it("element end elevation grade", () => {
    expect(elementEndElevation(alignment.elements[0])).toBeCloseTo(11);
  });

  it("vcl only for parabolic", () => {
    expect(vclOf(alignment.elements[0])).toBeUndefined();
    expect(vclOf(alignment.elements[1])).toBe(100);
  });
});
