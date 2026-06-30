import { describe, expect, it } from "vitest";
import { elevationAt } from "../elevationAt";
import { mergeVerticalZ } from "../zMerge";
import type {
  VerticalAlignmentDraft,
  VerticalGradeElementDraft,
  VerticalParabolicElementDraft,
} from "../../schema/types";

describe("mergeVerticalZ (PR-C)", () => {
  const gradeElement: VerticalGradeElementDraft = {
    type: "grade",
    id: "VG-merge",
    startStation: 0,
    endStation: 100,
    startElevation: 10,
    grade: 0.02,
    length: 100,
  };

  const parabolicElement: VerticalParabolicElementDraft = {
    type: "parabolic",
    id: "VP-merge",
    startStation: 0,
    endStation: 100,
    startGrade: 0,
    endGrade: 0.02,
    length: 100,
    startElevation: 0,
  };

  it("merges grade element elevations via elevationAt", () => {
    const verticalAlignment: VerticalAlignmentDraft = {
      id: "VA-grade",
      elements: [gradeElement],
    };

    const result = mergeVerticalZ([{ x: 0, y: 0, station: 50 }], verticalAlignment);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.points[0]?.z).toBeCloseTo(11, 9);
    expect(elevationAt(50, verticalAlignment)).toBeCloseTo(11, 9);
  });

  it("merges parabolic element elevations via elevationAt (JIP-LINER compatible)", () => {
    const verticalAlignment: VerticalAlignmentDraft = {
      id: "VA-parabolic",
      elements: [parabolicElement],
    };

    const result = mergeVerticalZ([{ x: 0, y: 0, station: 50 }], verticalAlignment);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.points[0]?.z).toBeCloseTo(elevationAt(50, verticalAlignment) ?? NaN, 9);
  });
});
