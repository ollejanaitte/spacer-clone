import { describe, expect, it } from "vitest";
import type { VerticalAlignmentDraft } from "../../schema/types";
import { LINER_DIAGNOSTIC_CODES } from "../diagnostics";
import {
  checkVerticalGradeLimits,
  checkVerticalOverlapAndAdjacency,
  checkVerticalStartCoverage,
  validateVerticalAlignment,
  VERTICAL_GRADE_HARD_LIMIT,
  VERTICAL_GRADE_SOFT_LIMIT,
} from "../validateVerticalAlignment";
import { checkVerticalContinuity } from "../verticalContinuity";

describe("validateVerticalAlignment", () => {
  const baseAlignment: VerticalAlignmentDraft = {
    id: "VA-test",
    elements: [
      {
        type: "grade",
        id: "VG-1",
        startStation: 0,
        endStation: 100,
        startElevation: 0,
        grade: 0.02,
        length: 100,
      },
    ],
  };

  it("returns no issues for a valid profile covering the alignment", () => {
    const issues = validateVerticalAlignment(baseAlignment, 100);
    expect(issues.filter((issue) => issue.level === "error")).toHaveLength(0);
  });

  it("flags overlapping vertical ranges as fail-closed errors", () => {
    const overlapping: VerticalAlignmentDraft = {
      id: "VA-overlap",
      elements: [
        {
          type: "grade",
          id: "VG-a",
          startStation: 0,
          endStation: 60,
          startElevation: 0,
          grade: 0,
          length: 60,
        },
        {
          type: "grade",
          id: "VG-b",
          startStation: 50,
          endStation: 100,
          startElevation: 0,
          grade: 0,
          length: 50,
        },
      ],
    };

    const issues = checkVerticalOverlapAndAdjacency(overlapping);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: LINER_DIAGNOSTIC_CODES.profileOverlap,
        }),
      ]),
    );
  });

  it("flags adjacency gaps as errors", () => {
    const gapped: VerticalAlignmentDraft = {
      id: "VA-gap",
      elements: [
        {
          type: "grade",
          id: "VG-a",
          startStation: 0,
          endStation: 40,
          startElevation: 0,
          grade: 0,
          length: 40,
        },
        {
          type: "grade",
          id: "VG-b",
          startStation: 50,
          endStation: 100,
          startElevation: 0,
          grade: 0,
          length: 50,
        },
      ],
    };

    const issues = checkVerticalOverlapAndAdjacency(gapped);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: LINER_DIAGNOSTIC_CODES.profileAdjacencyGap,
        }),
      ]),
    );
  });

  it("flags missing start coverage as an error", () => {
    const issues = checkVerticalStartCoverage({
      id: "VA-late-start",
      elements: [
        {
          type: "grade",
          id: "VG-late",
          startStation: 10,
          endStation: 100,
          startElevation: 0,
          grade: 0,
          length: 90,
        },
      ],
    });

    expect(issues).toEqual([
      expect.objectContaining({
        level: "error",
        code: LINER_DIAGNOSTIC_CODES.profileCoverageGap,
      }),
    ]);
  });

  it("warns on soft grade limit and errors on hard grade limit", () => {
    const softGrade: VerticalAlignmentDraft = {
      id: "VA-soft",
      elements: [
        {
          type: "grade",
          id: "VG-soft",
          startStation: 0,
          endStation: 100,
          startElevation: 0,
          grade: VERTICAL_GRADE_SOFT_LIMIT + 0.001,
          length: 100,
        },
      ],
    };
    const hardGrade: VerticalAlignmentDraft = {
      id: "VA-hard",
      elements: [
        {
          type: "grade",
          id: "VG-hard",
          startStation: 0,
          endStation: 100,
          startElevation: 0,
          grade: VERTICAL_GRADE_HARD_LIMIT + 0.001,
          length: 100,
        },
      ],
    };

    expect(checkVerticalGradeLimits(softGrade)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          code: LINER_DIAGNOSTIC_CODES.profileGradeExceedsLimit,
        }),
      ]),
    );
    expect(checkVerticalGradeLimits(hardGrade)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: LINER_DIAGNOSTIC_CODES.profileGradeExceedsLimit,
        }),
      ]),
    );
  });

  it("allows grade breaks between grade segments but requires grade continuity at parabolic joins", () => {
    const gradeToGrade: VerticalAlignmentDraft = {
      id: "VA-grade-break",
      elements: [
        {
          type: "grade",
          id: "VG-1",
          startStation: 0,
          endStation: 50,
          startElevation: 0,
          grade: 0.02,
          length: 50,
        },
        {
          type: "grade",
          id: "VG-2",
          startStation: 50,
          endStation: 100,
          startElevation: 1,
          grade: -0.01,
          length: 50,
        },
      ],
    };

    expect(checkVerticalContinuity(gradeToGrade).map((issue) => issue.code)).not.toContain(
      LINER_DIAGNOSTIC_CODES.profileGradeDiscontinuity,
    );

    const gradeToParabolic: VerticalAlignmentDraft = {
      id: "VA-parabolic-break",
      elements: [
        {
          type: "grade",
          id: "VG-1",
          startStation: 0,
          endStation: 50,
          startElevation: 0,
          grade: 0.02,
          length: 50,
        },
        {
          type: "parabolic",
          id: "VP-1",
          startStation: 50,
          endStation: 100,
          startGrade: 0,
          endGrade: 0.01,
          length: 50,
          startElevation: 1,
        },
      ],
    };

    expect(checkVerticalContinuity(gradeToParabolic)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          code: LINER_DIAGNOSTIC_CODES.profileGradeDiscontinuity,
        }),
      ]),
    );
  });
});
